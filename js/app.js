'use strict';

const STORAGE_KEY = 'sagc_productos_v1_0';
const SIDEBAR_KEY = 'sagc_sidebar_collapsed';
const API_URL_KEY = 'sagc_apps_script_url';
const DEFAULT_DATA = {
  colors: [
    {id:'c-negro',nombre:'Negro',hex:'#000000'},{id:'c-rosa',nombre:'Rosa',hex:'#ff7aa2'},
    {id:'c-azul',nombre:'Azul',hex:'#2563eb'},{id:'c-blanco',nombre:'Blanco',hex:'#ffffff'},
    {id:'c-rojo',nombre:'Rojo',hex:'#ff0000'},{id:'c-verde',nombre:'Verde',hex:'#16a34a'},
    {id:'c-dorado',nombre:'Dorado',hex:'#d4af37'},{id:'c-beige-claro',nombre:'Beige Claro',hex:'#f5f5dc'},
    {id:'c-beige-oscuro',nombre:'Beige Oscuro',hex:'#b37a5e'},{id:'c-rosa-claro',nombre:'Rosa Claro',hex:'#f4cccc'},
    {id:'c-celeste',nombre:'Celeste claro',hex:'#46bdc6'},{id:'c-plata',nombre:'Plata',hex:'#C0C0C0'}
  ],
  products: [],
  categories: [],
  brands: []
};
let db = loadDb();
let currentView = 'dashboard';
let editingCode = null;
let draftVariants = [];
let draftWholesale = [];
const state = {search:'',category:'',status:'',variant:'',wholesale:'',section:'products',page:1,pageSize:50,total:0,totalPages:1,kpis:{total:0,active:0,variants:0,wholesale:0,offers:0},loading:false};
let searchTimer=null;
let productRequestId=0;

const content = document.getElementById('appContent');
const pageTitle = document.getElementById('pageTitle');
const breadcrumb = document.getElementById('breadcrumbCurrent');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
const nav = document.getElementById('sidebarNav');

function cryptoId(){ return (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`); }
function loadDb(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    const data=saved || structuredClone(DEFAULT_DATA);
    if(!Array.isArray(data.products)) data.products=[];
    if(!Array.isArray(data.colors) || !data.colors.length) data.colors=structuredClone(DEFAULT_DATA.colors);
    if(!Array.isArray(data.categories)) data.categories=[];
    if(!Array.isArray(data.brands)) data.brands=[];
    return data;
  }catch{return structuredClone(DEFAULT_DATA);}
}
function saveDb(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
function getApiUrl(){ return (localStorage.getItem(API_URL_KEY)||'').trim(); }
function setApiUrl(v){ localStorage.setItem(API_URL_KEY,(v||'').trim()); }
async function apiRequest(action,payload=null,query={}){
  const url=getApiUrl();
  if(!url) throw new Error('Primero pega la URL /exec de Apps Script en Configuración.');
  if(!/\/exec(?:\?|$)/.test(url)) throw new Error('La URL debe terminar en /exec.');
  const isPost=payload!==null;
  const attempts=isPost?1:3;
  let lastError=null;
  for(let attempt=1;attempt<=attempts;attempt++){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),45000);
    try{
      const options=isPost
        ?{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...payload}),signal:controller.signal}
        :{signal:controller.signal,cache:'no-store'};
      const qs=new URLSearchParams({action,t:String(Date.now()),...query});
      const res=await fetch(isPost?url:`${url}?${qs.toString()}`,options);
      if(!res.ok) throw new Error(`Apps Script respondió HTTP ${res.status}.`);
      const text=await res.text();
      let data;
      try{data=JSON.parse(text);}catch{throw new Error('Apps Script no devolvió JSON. Verifica la URL /exec.');}
      if(!data.ok) throw new Error(data.error||'Error de conexión');
      localStorage.setItem('sagc_last_connection_ok',new Date().toISOString());
      return data;
    }catch(err){
      lastError=err?.name==='AbortError'?new Error('La solicitud superó 45 segundos.'):err;
      if(attempt<attempts) await new Promise(r=>setTimeout(r,500*attempt));
    }finally{clearTimeout(timeout);}
  }
  throw lastError||new Error('No se pudo conectar con Apps Script.');
}
async function loadCatalogs(){
  if(!getApiUrl())return;
  const data=await apiRequest('catalogs');
  db.colors=Array.isArray(data.colors)&&data.colors.length?data.colors:structuredClone(DEFAULT_DATA.colors);
  db.categories=Array.isArray(data.categories)?data.categories:[];
  db.brands=Array.isArray(data.brands)?data.brands:[];
  saveDb();
}
async function syncFromSheets(){
  const btn=document.getElementById('syncSheetsBtn');if(btn){btn.disabled=true;btn.textContent='Actualizando…';}
  try{await loadCatalogs();state.page=1;await loadProductsPage();}
  catch(err){alert('No se pudo actualizar: '+err.message);}
  finally{const b=document.getElementById('syncSheetsBtn');if(b){b.disabled=false;b.textContent='↻ Actualizar';}}
}
async function pushProductToSheets(product){ if(!getApiUrl()) return; await apiRequest('saveProduct',{product}); }
async function removeProductFromSheets(codigo){ if(!getApiUrl()) return; await apiRequest('deleteProduct',{codigo}); }
async function pushColorToSheets(color){ if(!getApiUrl()) return; await apiRequest('saveColor',{color}); }

async function requestNextProductCode(){
  if(getApiUrl()){
    try{const data=await apiRequest('nextProductCode');if(data.codigo)return data.codigo;}catch(err){console.warn(err);}
  }
  const nums=db.products.map(p=>String(p.codigo||'').match(/(\d+)$/)).filter(Boolean).map(m=>Number(m[1]));
  return `PRD-${String((nums.length?Math.max(...nums):0)+1).padStart(6,'0')}`;
}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('No se pudo leer la imagen.'));reader.readAsDataURL(file);});}
async function uploadImageFile(file,productCode){
  if(!getApiUrl()) throw new Error('Configura primero la URL /exec de Apps Script.');
  if(!file) throw new Error('Selecciona una imagen.');
  if(!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.');
  if(file.size>8*1024*1024) throw new Error('La imagen supera 8 MB.');
  const dataUrl=await fileToDataUrl(file);
  const data=await apiRequest('uploadImage',{file:{name:file.name,mimeType:file.type,dataUrl},productCode});
  return data.url;
}
async function uploadVideoFile(file,productCode){
  if(!getApiUrl()) throw new Error('Configura primero la URL /exec de Apps Script.');
  if(!file) throw new Error('Selecciona un video.');
  if(!/^video\/(mp4|webm|quicktime)$/i.test(file.type)) throw new Error('Usa MP4, WEBM o MOV.');
  if(file.size>10*1024*1024) throw new Error('El video supera 10 MB.');
  const dataUrl=await fileToDataUrl(file);
  const data=await apiRequest('uploadVideo',{file:{name:file.name,mimeType:file.type,dataUrl},productCode});
  return data.url;
}
function optionList(values,current,placeholder){
  const unique=[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  return `<option value="">${placeholder}</option>${unique.map(v=>`<option value="${escapeHtml(v)}" ${normalize(v)===normalize(current)?'selected':''}>${escapeHtml(v)}</option>`).join('')}`;
}

function escapeHtml(v){ return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function normalize(v){ return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
function money(v){ return new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(Number(v||0)); }
function finalPrice(p){ return Math.max(0, Number(p.precio||0)-Number(p.descuento||0)); }
function stockOf(p){ return p.variantes?.length ? p.variantes.filter(v=>v.activo).reduce((a,v)=>a+Number(v.stock||0),0) : null; }
function searchable(p){ return normalize([p.codigo,p.nombre,p.marca,p.categoria,p.descripcion,p.palabrasClave,...(p.variantes||[]).flatMap(v=>[v.opcion1,v.opcion2])].join(' ')); }
function smartMatch(p,q){ const words=normalize(q).split(/\s+/).filter(Boolean); const hay=searchable(p); return words.every(w=>hay.includes(w)); }

function navigate(view){
  currentView=view; const title=view==='productos'?'Productos':view==='dashboard'?'Dashboard':view[0].toUpperCase()+view.slice(1);
  pageTitle.textContent=title; breadcrumb.textContent=title;
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  if(view==='productos') renderProductsShell(); else if(view==='dashboard') renderDashboard(); else if(view==='configuracion') renderConfiguration(); else renderPlaceholder(title);
  sidebar.classList.remove('open'); overlay.classList.remove('show');
}

function renderDashboard(){
  const active=state.kpis.active||0;
  content.innerHTML=`<section class="module-page"><div class="page-actions"><div><p class="eyebrow">Panel SAGC</p><h2 class="module-heading">Centro de control</h2><p class="module-description">Base empresarial preparada para crecer por módulos.</p></div><button class="btn btn-primary" data-go="productos">Abrir Productos</button></div><div class="product-kpis"><article class="product-kpi"><small>Productos</small><strong>${state.kpis.total||0}</strong></article><article class="product-kpi"><small>Activos</small><strong>${active}</strong></article><article class="product-kpi"><small>Con variantes</small><strong>${state.kpis.variants||0}</strong></article><article class="product-kpi"><small>Con mayoreo</small><strong>${state.kpis.wholesale||0}</strong></article></div></section>`;
}
function renderPlaceholder(title){ content.innerHTML=`<section class="module-page"><div class="data-card"><div class="empty-state"><h3>${escapeHtml(title)}</h3><p>Este módulo se construirá después de terminar PRODUCTOS.</p></div></div></section>`; }

function renderConfiguration(){
  content.innerHTML=`<section class="module-page settings-module">
    <div class="page-actions">
      <div><p class="eyebrow">Configuración</p><h2 class="module-heading">Conexiones y datos maestros</h2><p class="module-description">Configura Google Sheets, Google Drive y la paleta de colores sin editar código.</p></div>
    </div>
    <section class="data-card connection-card">
      <div class="card-head"><h3>Conexión con Google Sheets</h3><span id="connectionStatus">${getApiUrl()?(localStorage.getItem('sagc_last_connection_ok')?'Conectado permanentemente':'URL guardada'):'Sin conectar'}</span></div>
      <div class="connection-row"><input id="appsScriptUrl" type="url" value="${escapeHtml(getApiUrl())}" placeholder="https://script.google.com/macros/s/...../exec"><button class="btn btn-secondary" id="saveApiUrl">Guardar enlace</button><button class="btn btn-primary" id="testApiUrl">Probar conexión</button></div>
      <p class="help-text">Usa una sola implementación de Apps Script para Productos, Variantes, Mayoreo, Colores e imágenes.</p>
    </section>
    <section class="data-card connection-card drive-card">
      <div class="card-head"><h3>Google Drive · Imágenes</h3><span id="driveStatus">Cargando configuración…</span></div>
      <div class="drive-options">
        <label class="radio-option"><input type="radio" name="driveMode" value="existing" checked> Usar una carpeta existente</label>
        <label class="radio-option"><input type="radio" name="driveMode" value="automatic"> Crear carpeta automáticamente</label>
      </div>
      <div id="existingDriveFields">
        <label class="field-label" for="driveFolderUrl">Enlace o ID de la carpeta</label>
        <div class="connection-row"><input id="driveFolderUrl" type="text" placeholder="https://drive.google.com/drive/folders/..."><button class="btn btn-secondary" id="testDriveFolder">Probar</button><button class="btn btn-primary" id="saveDriveFolder">Guardar carpeta</button></div>
      </div>
      <div id="automaticDriveFields" hidden>
        <p class="help-text">Apps Script creará una carpeta principal <strong>PANEL SAGC</strong> y dentro una carpeta <strong>IMAGENES PRODUCTOS</strong>.</p>
        <button class="btn btn-primary" id="createDriveFolder">Crear y conectar carpeta</button>
      </div>
      <div class="drive-result" id="driveResult">La carpeta se guardará en las propiedades del proyecto; no tendrás que modificar Configuracion.gs.</div>
    </section>
    <div class="settings-grid">
      <section class="data-card color-form-card">
        <div class="card-head"><h3>Nuevo color</h3><span>Nombre y código hexadecimal</span></div>
        <div class="color-form">
          <div class="form-group"><label>Nombre</label><input id="colorName" maxlength="40" placeholder="Ej.: Rojo encendido"></div>
          <div class="form-group"><label>Color</label><div class="color-picker-row"><input id="colorHex" type="color" value="#2563eb"><input id="colorHexText" value="#2563EB" maxlength="7"></div></div>
          <div class="live-color-preview"><span id="liveColorSwatch"></span><strong id="liveColorName">Vista previa</strong></div>
          <button class="btn btn-primary" id="saveColorBtn">+ Agregar color</button>
        </div>
      </section>
      <section class="data-card">
        <div class="card-head"><h3>Paleta disponible</h3><span>${db.colors.length} colores enlazados a Variantes</span></div>
        <div class="color-library" id="colorLibrary">
          ${db.colors.map(c=>`<article class="color-chip-card"><span class="color-swatch large" style="--swatch:${escapeHtml(c.hex)}"></span><div><strong>${escapeHtml(c.nombre)}</strong><small>${escapeHtml(c.hex)}</small></div><button class="table-action danger delete-color" data-color-id="${escapeHtml(c.id)}" title="Eliminar">×</button></article>`).join('')}
        </div>
      </section>
    </div>
  </section>`;
  bindConfiguration();
}
function extractDriveFolderId(value){
  const text=String(value||'').trim();
  const match=text.match(/\/folders\/([a-zA-Z0-9_-]+)/) || text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match?match[1]:(/^[a-zA-Z0-9_-]{15,}$/.test(text)?text:'');
}
async function loadDriveConfiguration(){
  const status=document.getElementById('driveStatus'),input=document.getElementById('driveFolderUrl'),result=document.getElementById('driveResult');
  if(!getApiUrl()){status.textContent='Primero configura Apps Script';return;}
  try{
    const data=await apiRequest('getDriveConfig');
    if(data.configured){status.textContent='Conectado';input.value=data.folderUrl||data.folderId||'';result.textContent=`Carpeta activa: ${data.folderName||'Google Drive'}${data.folderId?' · '+data.folderId:''}`;}
    else {status.textContent='Sin configurar';result.textContent='Pega el enlace de una carpeta o créala automáticamente.';}
  }catch(err){status.textContent='No disponible';result.textContent=err.message;}
}
function bindConfiguration(){
  const picker=document.getElementById('colorHex');
  const text=document.getElementById('colorHexText');
  const name=document.getElementById('colorName');
  const swatch=document.getElementById('liveColorSwatch');
  const previewName=document.getElementById('liveColorName');
  document.getElementById('saveApiUrl').onclick=async()=>{
    const btn=document.getElementById('saveApiUrl');
    setApiUrl(document.getElementById('appsScriptUrl').value);
    try{
      btn.disabled=true;btn.textContent='Conectando…';
      const d=await apiRequest('ping');
      document.getElementById('connectionStatus').textContent='Conectado · '+(d.version||'SAGC');
      await loadDriveConfiguration();
      alert('Conexión guardada y comprobada correctamente.');
    }catch(err){document.getElementById('connectionStatus').textContent='Error de conexión';alert(err.message);}
    finally{btn.disabled=false;btn.textContent='Guardar enlace';}
  };
  document.getElementById('testApiUrl').onclick=async()=>{
    const btn=document.getElementById('testApiUrl');setApiUrl(document.getElementById('appsScriptUrl').value);
    try{btn.disabled=true;btn.textContent='Probando…';const d=await apiRequest('ping');document.getElementById('connectionStatus').textContent='Conectado · '+(d.version||'SAGC');alert(`Conexión correcta: ${d.message||'Google Sheets listo'}`);await loadDriveConfiguration();}
    catch(err){document.getElementById('connectionStatus').textContent='Error de conexión';alert(err.message);}
    finally{btn.disabled=false;btn.textContent='Probar conexión';}
  };
  document.querySelectorAll('input[name="driveMode"]').forEach(r=>r.onchange=()=>{const auto=r.value==='automatic'&&r.checked;document.getElementById('existingDriveFields').hidden=auto;document.getElementById('automaticDriveFields').hidden=!auto;});
  document.getElementById('testDriveFolder').onclick=async()=>{
    try{const folderId=extractDriveFolderId(document.getElementById('driveFolderUrl').value);if(!folderId)throw new Error('Pega un enlace válido de carpeta de Drive o su ID.');const d=await apiRequest('testDriveFolder',null,{folderId});document.getElementById('driveResult').textContent=`Correcto: ${d.folderName} · permisos de escritura verificados.`;document.getElementById('driveStatus').textContent='Carpeta válida';}catch(err){alert(err.message);}
  };
  document.getElementById('saveDriveFolder').onclick=async()=>{
    try{const raw=document.getElementById('driveFolderUrl').value,folderId=extractDriveFolderId(raw);if(!folderId)throw new Error('Pega un enlace válido de carpeta de Drive o su ID.');const d=await apiRequest('saveDriveConfig',{folderId});document.getElementById('driveResult').textContent=`Guardado: ${d.folderName}. Las próximas imágenes se subirán aquí.`;document.getElementById('driveStatus').textContent='Conectado';alert('Carpeta de imágenes guardada correctamente.');}catch(err){alert(err.message);}
  };
  document.getElementById('createDriveFolder').onclick=async()=>{
    try{const d=await apiRequest('createDriveFolder',{});document.getElementById('driveFolderUrl').value=d.folderUrl||d.folderId;document.getElementById('driveResult').textContent=`Carpeta creada y conectada: ${d.folderName}.`;document.getElementById('driveStatus').textContent='Conectado';alert('Carpeta creada y conectada correctamente.');}catch(err){alert(err.message);}
  };
  const sync=(source)=>{let value=(source==='picker'?picker.value:text.value).trim();if(/^#[0-9a-fA-F]{6}$/.test(value)){picker.value=value;text.value=value.toUpperCase();swatch.style.background=value;}previewName.textContent=name.value.trim()||'Vista previa';};
  picker.addEventListener('input',()=>sync('picker'));text.addEventListener('input',()=>sync('text'));name.addEventListener('input',()=>sync('name'));sync('picker');
  document.getElementById('saveColorBtn').onclick=async()=>{const nombre=name.value.trim(),hex=text.value.trim().toUpperCase();if(!nombre)return alert('Escribe el nombre del color.');if(!/^#[0-9A-F]{6}$/.test(hex))return alert('El color debe tener formato hexadecimal, por ejemplo #2563EB.');if(db.colors.some(c=>normalize(c.nombre)===normalize(nombre)))return alert('Ya existe un color con ese nombre.');const color={id:cryptoId(),nombre,hex};db.colors.push(color);saveDb();try{await pushColorToSheets(color);}catch(err){alert('Color guardado localmente, pero no se pudo enviar a Sheets: '+err.message);}renderConfiguration();};
  loadDriveConfiguration();
}

function renderProductsShell(){
  const categories=[...new Set([...(db.categories||[]),...db.products.map(p=>p.categoria)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  content.innerHTML=`<section class="module-page products-module">
    <div class="page-actions compact-head"><div><p class="eyebrow">Catálogo</p><h2 class="module-heading">Productos</h2><p class="module-description">Diseñado para 20 000–30 000 productos: búsqueda en servidor, 50 por página y detalle bajo demanda.</p></div>
      <div class="action-row"><button class="btn btn-secondary compact-btn" id="connectionBtn">⚙ Conexión</button><button class="btn btn-secondary compact-btn" id="syncSheetsBtn">↻ Actualizar</button><button class="btn btn-primary" id="newProductBtn">+ Nuevo producto</button></div></div>
    <div class="module-tabs"><button class="module-tab ${state.section==='products'?'active':''}" data-section="products"><span>Productos</span><b>${state.kpis.total||0}</b></button><button class="module-tab ${state.section==='variants'?'active':''}" data-section="variants"><span>Con variantes</span><b>${state.kpis.variants||0}</b></button><button class="module-tab ${state.section==='wholesale'?'active':''}" data-section="wholesale"><span>Con mayoreo</span><b>${state.kpis.wholesale||0}</b></button></div>
    <div class="product-kpis" id="productKpis"></div>
    <div class="product-toolbar sticky-tools"><div class="search-field grow"><span>⌕</span><input id="productSearch" type="search" autocomplete="off" placeholder="Buscar código, nombre, marca, categoría o palabras clave"></div>
      <select class="filter-select" id="categoryFilter"><option value="">Todas las categorías</option>${categories.map(c=>`<option>${escapeHtml(c)}</option>`).join('')}</select>
      <select class="filter-select" id="statusFilter"><option value="">Todos los estados</option><option>Activo</option><option>Inactivo</option></select>
      <select class="filter-select" id="variantFilter"><option value="">Variantes: todos</option><option value="si">Con variantes</option><option value="no">Sin variantes</option></select>
      <select class="filter-select" id="wholesaleFilter"><option value="">Mayoreo: todos</option><option value="si">Con mayoreo</option><option value="no">Sin mayoreo</option></select><button class="btn btn-secondary" id="clearFilters">Limpiar</button></div>
    <div class="data-card"><div class="table-wrap"><table class="product-table"><thead><tr><th>Imagen</th><th>Código</th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Variantes</th><th>Mayoreo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="productRows"></tbody></table></div><div class="product-footer"><span id="productCount"></span><div class="pagination" id="productPagination"></div></div></div>
  </section>${drawerHtml()}`;
  bindProductShell(); loadProductsPage();
}
async function loadProductsPage(){
  if(!getApiUrl()){updateProductResultsLocal();return;}
  const requestId=++productRequestId;state.loading=true;renderLoadingRows();
  try{
    const effectiveVariant=state.section==='variants'?'si':state.variant;
    const effectiveWholesale=state.section==='wholesale'?'si':state.wholesale;
    const data=await apiRequest('listProducts',null,{page:state.page,pageSize:state.pageSize,search:state.search,category:state.category,status:state.status,variant:effectiveVariant,wholesale:effectiveWholesale});
    if(requestId!==productRequestId)return;
    db.products=Array.isArray(data.items)?data.items:[];state.page=data.page||1;state.total=data.total||0;state.totalPages=data.totalPages||1;state.kpis=data.kpis||state.kpis;saveDb();updateProductResultsServer(data.truncated);
  }catch(err){document.getElementById('productRows').innerHTML=`<tr><td colspan="10"><div class="empty-state"><h3>No se pudo cargar</h3><p>${escapeHtml(err.message)}</p></div></td></tr>`;}
  finally{if(requestId===productRequestId)state.loading=false;}
}
function renderLoadingRows(){const rows=document.getElementById('productRows');if(rows)rows.innerHTML='<tr><td colspan="10"><div class="loading-products">Cargando 50 productos…</div></td></tr>';}
function updateProductResultsLocal(){state.total=db.products.length;state.totalPages=Math.max(1,Math.ceil(state.total/state.pageSize));updateProductResultsServer(false);}
function updateProductResultsServer(truncated=false){
  const visible=db.products,start=(state.page-1)*state.pageSize;
  document.getElementById('productKpis').innerHTML=`<article class="product-kpi"><small>Total</small><strong>${state.kpis.total||state.total}</strong></article><article class="product-kpi"><small>Activos</small><strong>${state.kpis.active||0}</strong></article><article class="product-kpi"><small>Con variantes</small><strong>${state.kpis.variants||0}</strong></article><article class="product-kpi"><small>Con mayoreo</small><strong>${state.kpis.wholesale||0}</strong></article><article class="product-kpi"><small>Ofertas</small><strong>${state.kpis.offers||0}</strong></article>`;
  document.getElementById('productRows').innerHTML=visible.length?visible.map(p=>`<tr><td>${p.imagen?`<img class="product-thumb" loading="lazy" src="${escapeHtml(p.imagen)}" alt="">`:'<div class="product-thumb placeholder">▦</div>'}</td><td><strong>${escapeHtml(p.codigo)}</strong></td><td><div class="product-name">${escapeHtml(p.nombre)}</div><div class="product-sub">${escapeHtml(p.marca||'Sin marca')} ${p.video?' · 🎥 Video':''}</div></td><td>${escapeHtml(p.categoria||'—')}</td><td>${p.descuento?`<div class="old-price">${money(p.precio)}</div>`:''}<div class="money">${money(finalPrice(p))}</div></td><td>${p.stock===null?'—':p.stock}</td><td>${p.variantCount||0}</td><td>${p.wholesaleCount||0}</td><td><span class="status-pill ${p.estado==='Activo'?'active':'inactive'}">● ${escapeHtml(p.estado)}</span></td><td><div class="action-menu"><button class="table-action edit-product" data-code="${escapeHtml(p.codigo)}" title="Editar">✎</button><button class="table-action danger delete-product" data-code="${escapeHtml(p.codigo)}" title="Eliminar">×</button></div></td></tr>`).join(''):`<tr><td colspan="10"><div class="empty-state"><h3>No encontramos productos</h3><p>Prueba con otra búsqueda o limpia los filtros.</p></div></td></tr>`;
  document.getElementById('productCount').textContent=`Mostrando ${visible.length?start+1:0}–${start+visible.length} de ${state.total}${truncated?' (búsqueda limitada a 1000 resultados)':''}`;
  const pages=[];const from=Math.max(1,state.page-3),to=Math.min(state.totalPages,from+6);for(let n=from;n<=to;n++)pages.push(n);
  document.getElementById('productPagination').innerHTML=`<button class="page-btn" data-page="${Math.max(1,state.page-1)}">‹</button>${pages.map(n=>`<button class="page-btn ${n===state.page?'active':''}" data-page="${n}">${n}</button>`).join('')}<button class="page-btn" data-page="${Math.min(state.totalPages,state.page+1)}">›</button>`;
}
function bindProductShell(){
  const search=document.getElementById('productSearch');search.value=state.search;
  search.addEventListener('input',e=>{state.search=e.target.value.trim();state.page=1;clearTimeout(searchTimer);searchTimer=setTimeout(loadProductsPage,420);});
  [['categoryFilter','category'],['statusFilter','status'],['variantFilter','variant'],['wholesaleFilter','wholesale']].forEach(([id,key])=>{const el=document.getElementById(id);el.value=state[key];el.addEventListener('change',()=>{state[key]=el.value;state.page=1;loadProductsPage();});});
  document.getElementById('clearFilters').onclick=()=>{Object.assign(state,{search:'',category:'',status:'',variant:'',wholesale:'',page:1});renderProductsShell();};
  document.getElementById('newProductBtn').onclick=()=>openProduct();document.getElementById('syncSheetsBtn').onclick=syncFromSheets;document.getElementById('connectionBtn').onclick=()=>navigate('configuracion');
  document.querySelectorAll('.module-tab').forEach(tab=>tab.onclick=()=>{state.section=tab.dataset.section;state.page=1;renderProductsShell();});
}
function drawerHtml(){
  const imageCards=[1,2,3,4,5].map((n,i)=>{const key=i===0?'imagen':`imagen${n}`;return `<div class="multi-image-card"><label>${i===0?'Imagen principal':`Imagen ${n}`}</label><div class="image-preview mini" id="preview-${key}"><span>Sin imagen</span></div><input name="${key}" id="url-${key}" type="url" placeholder="Enlace automático"><input id="file-${key}" data-image-key="${key}" type="file" accept="image/*"><button type="button" class="btn btn-secondary upload-slot" data-image-key="${key}">Subir a Drive</button><small id="status-${key}">JPG, PNG o WEBP.</small></div>`}).join('');
  return `<div class="drawer-overlay" id="productDrawerOverlay"></div><aside class="product-drawer wide" id="productDrawer"><div class="drawer-head"><div><h2 id="drawerTitle">Nuevo producto</h2><p>Carga solo el detalle del producto abierto para mantener máxima velocidad.</p></div><button class="drawer-close" id="drawerClose">×</button></div>
  <div class="drawer-tabs"><button class="drawer-tab active" data-tab="general">General</button><button class="drawer-tab" data-tab="variants">Variantes <span id="variantBadge">0</span></button><button class="drawer-tab" data-tab="wholesale">Mayoreo <span id="wholesaleBadge">0</span></button></div>
  <form id="productForm" class="drawer-body"><section class="tab-panel active" data-panel="general"><div class="form-section"><h3>Información principal</h3><div class="form-grid"><div class="form-group"><label>Código *</label><div class="code-field"><input name="codigo" required readonly><button type="button" class="btn btn-secondary compact-btn" id="regenerateCode">Generar</button></div></div><div class="form-group"><label>Estado</label><select name="estado"><option>Activo</option><option>Inactivo</option></select></div><div class="form-group full"><label>Nombre *</label><input name="nombre" required maxlength="180"></div><div class="form-group"><label>Marca</label><select name="marca" id="brandSelect"></select><input name="marcaNueva" id="brandNew" class="inline-new-field" placeholder="Nueva marca" hidden></div><div class="form-group"><label>Categoría</label><select name="categoria" id="categorySelect"></select><input name="categoriaNueva" id="categoryNew" class="inline-new-field" placeholder="Nueva categoría" hidden></div><div class="form-group"><label>Precio *</label><input name="precio" type="number" min="0" step="0.01" required></div><div class="form-group"><label>Descuento</label><input name="descuento" type="number" min="0" step="0.01" value="0"></div><div class="form-group"><label>Stock simple</label><input name="stock" type="number" min="0" step="1" placeholder="Vacío = sin límite"><span class="help-text">Se usa solo cuando el producto no tiene variantes.</span></div><div class="form-group full"><label>Palabras clave</label><input name="palabrasClave" placeholder="martillo, herramienta, carpintería"></div><div class="form-group"><label>Destacado</label><input name="destacado" placeholder="Nuevo, Oferta"></div></div></div>
  <div class="form-section"><h3>Galería · máximo 5 imágenes</h3><p class="help-text">En la tabla se carga solo la principal. Las cinco se cargan únicamente al abrir la ficha.</p><div class="multi-image-grid">${imageCards}</div></div>
  <div class="form-section"><h3>Video corto</h3><div class="form-grid"><div class="form-group full"><label>Enlace del video</label><input name="video" type="url" placeholder="YouTube, Drive o MP4 directo"><div class="video-upload-row"><input id="videoFile" type="file" accept="video/mp4,video/webm,video/quicktime"><button type="button" class="btn btn-secondary" id="uploadVideoBtn">Subir video a Drive</button></div><span class="help-text" id="videoStatus">Recomendado: 5–30 segundos, 720p y menos de 10 MB. No se reproduce automáticamente.</span></div><div class="form-group full"><label>Descripción</label><textarea name="descripcion"></textarea></div></div></div></section>
  <section class="tab-panel" data-panel="variants"><div class="section-head"><div><h3>Variantes</h3><p>Cada variante puede usar una de las 5 imágenes o una URL propia.</p></div><button type="button" class="btn btn-primary" id="addVariant">+ Agregar variante</button></div><div class="editable-list" id="variantList"></div></section>
  <section class="tab-panel" data-panel="wholesale"><div class="section-head"><div><h3>Precios por cantidad</h3></div><button type="button" class="btn btn-primary" id="addWholesale">+ Agregar tramo</button></div><div class="editable-list" id="wholesaleList"></div><div class="price-preview" id="wholesalePreview"></div></section></form>
  <div class="drawer-footer"><span id="saveProgress"></span><button class="btn btn-secondary" id="cancelProduct">Cancelar</button><button class="btn btn-primary" id="saveProduct">Guardar producto</button></div></aside>`;
}
async function openProduct(code=null){
  editingCode=code;let p=null;
  document.getElementById('productDrawer').classList.add('open');document.getElementById('productDrawerOverlay').classList.add('show');
  const form=document.getElementById('productForm');form.reset();document.getElementById('drawerTitle').textContent=code?'Cargando producto…':'Nuevo producto';
  try{
    if(code&&getApiUrl()){const data=await apiRequest('getProductDetail',null,{codigo:code});p=data.product;}
    else if(code)p=db.products.find(x=>x.codigo===code);
    draftVariants=structuredClone(p?.variantes||[]);draftWholesale=structuredClone(p?.mayoreo||[]);
    const brands=[...(db.brands||[]),p?.marca].filter(Boolean),categories=[...(db.categories||[]),p?.categoria].filter(Boolean);
    document.getElementById('brandSelect').innerHTML=optionList(brands,p?.marca||'','Selecciona una marca')+'<option value="__NEW__">+ Agregar nueva marca</option>';
    document.getElementById('categorySelect').innerHTML=optionList(categories,p?.categoria||'','Selecciona una categoría')+'<option value="__NEW__">+ Agregar nueva categoría</option>';
    if(p)Object.entries(p).forEach(([k,v])=>{if(form.elements[k]&&!Array.isArray(v))form.elements[k].value=v??'';});else{form.elements.estado.value='Activo';form.elements.codigo.value=await requestNextProductCode();}
    document.getElementById('drawerTitle').textContent=p?'Editar producto':'Nuevo producto';
    ['imagen','imagen2','imagen3','imagen4','imagen5'].forEach(k=>updateSlotPreview(k,form.elements[k]?.value||''));
    renderVariantList();renderWholesaleList();switchTab('general');
  }catch(err){alert(err.message);closeDrawer();}
}
function updateSlotPreview(key,url){const preview=document.getElementById('preview-'+key);if(!preview)return;preview.innerHTML=url?`<img src="${escapeHtml(url)}" loading="lazy" alt="Vista previa">`:'<span>Sin imagen</span>';}
async function handleSlotUpload(key){
  const file=document.getElementById('file-'+key)?.files[0],btn=document.querySelector(`.upload-slot[data-image-key="${key}"]`),status=document.getElementById('status-'+key),form=document.getElementById('productForm');
  try{btn.disabled=true;btn.textContent='Subiendo…';status.textContent='Comprimiendo y enviando…';const url=await uploadImageFile(file,form.elements.codigo.value);form.elements[key].value=url;updateSlotPreview(key,url);status.textContent='Imagen lista para guardar.';}
  catch(err){status.textContent=err.message;alert(err.message);}finally{btn.disabled=false;btn.textContent='Subir a Drive';}
}
function closeDrawer(){ document.getElementById('productDrawer').classList.remove('open');document.getElementById('productDrawerOverlay').classList.remove('show');editingCode=null; }
function switchTab(tab){ document.querySelectorAll('.drawer-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===tab)); }

function renderVariantList(){
  const el=document.getElementById('variantList');document.getElementById('variantBadge').textContent=draftVariants.length;
  const form=document.getElementById('productForm');const imageOptions=[['','Sin imagen propia'],['__imagen','Usar imagen principal'],['__imagen2','Usar imagen 2'],['__imagen3','Usar imagen 3'],['__imagen4','Usar imagen 4'],['__imagen5','Usar imagen 5']];
  el.innerHTML=draftVariants.length?draftVariants.map((v,i)=>{const selected=db.colors.find(c=>normalize(c.nombre)===normalize(v.opcion1));const colorOptions=db.colors.map(c=>`<option value="${escapeHtml(c.nombre)}" ${normalize(v.opcion1)===normalize(c.nombre)?'selected':''}>${escapeHtml(c.nombre)}</option>`).join('');const currentImage=v.imagen||'';const special=imageOptions.find(x=>form.elements[x[0].replace('__','')]?.value===currentImage)?.[0]||'';
    return `<div class="edit-row variant-row" data-index="${i}"><div class="variant-color-control"><span class="color-swatch" style="--swatch:${escapeHtml(selected?.hex||'#d7dee8')}"></span><select data-field="opcion1"><option value="">Color / modelo</option>${colorOptions}</select></div><input data-field="opcion2" value="${escapeHtml(v.opcion2||'')}" placeholder="Talla / capacidad"><select class="variant-image-source" data-special="${special}">${imageOptions.map(([val,label])=>`<option value="${val}" ${val===special?'selected':''}>${label}</option>`).join('')}<option value="__custom" ${currentImage&&!special?'selected':''}>URL propia</option></select><input data-field="imagen" value="${escapeHtml(currentImage)}" placeholder="URL imagen variante"><input data-field="stock" type="number" min="0" value="${Number(v.stock||0)}"><label class="switch-label"><input data-field="activo" type="checkbox" ${v.activo!==false?'checked':''}> Activo</label><button type="button" class="table-action duplicate-variant">⧉</button><button type="button" class="table-action danger remove-variant">×</button></div>`;}).join(''):'<div class="mini-empty">Sin variantes. Agrégalas solo cuando el producto realmente las necesite.</div>';
}
function renderWholesaleList(){
  draftWholesale.sort((a,b)=>Number(a.desde)-Number(b.desde)); document.getElementById('wholesaleBadge').textContent=draftWholesale.length;
  document.getElementById('wholesaleList').innerHTML=draftWholesale.length?draftWholesale.map((r,i)=>`<div class="edit-row wholesale-row" data-index="${i}"><label>Desde <input data-field="desde" type="number" min="2" value="${Number(r.desde||2)}"></label><label>Precio unitario <input data-field="precio" type="number" min="0" step="0.01" value="${Number(r.precio||0)}"></label><button type="button" class="table-action danger remove-wholesale">×</button></div>`).join(''):'<div class="mini-empty">Sin precios mayoristas.</div>';
  document.getElementById('wholesalePreview').innerHTML=draftWholesale.length?`<strong>Vista previa:</strong> ${draftWholesale.map(r=>`Desde ${r.desde}: ${money(r.precio)}`).join(' · ')}`:'';
}
function syncDraftFromDom(){
  document.querySelectorAll('.variant-row').forEach(row=>{const i=Number(row.dataset.index),v=draftVariants[i];row.querySelectorAll('[data-field]').forEach(x=>{v[x.dataset.field]=x.type==='checkbox'?x.checked:x.type==='number'?Number(x.value):x.value.trim();});});
  document.querySelectorAll('.wholesale-row').forEach(row=>{const i=Number(row.dataset.index),r=draftWholesale[i];row.querySelectorAll('[data-field]').forEach(x=>r[x.dataset.field]=Number(x.value));});
}
function validateDraft(data){
  if(!data.codigo.trim()) return 'El código es obligatorio.'; if(!data.nombre.trim()) return 'El nombre es obligatorio.'; if(Number(data.precio)<0) return 'El precio no puede ser negativo.';
  if(!editingCode && db.products.some(p=>normalize(p.codigo)===normalize(data.codigo))) return 'Ya existe un producto con ese código.';
  const seen=new Set(); for(const v of draftVariants){const key=normalize(`${v.opcion1}|${v.opcion2}`);if(!v.opcion1&&!v.opcion2)return 'Cada variante debe tener al menos una opción.';if(seen.has(key))return 'Hay variantes duplicadas.';seen.add(key);if(Number(v.stock)<0)return 'El stock de variantes no puede ser negativo.';}
  const levels=new Set(); let lastPrice=Infinity; for(const r of [...draftWholesale].sort((a,b)=>a.desde-b.desde)){if(r.desde<2)return 'El mayoreo debe comenzar desde 2 unidades.';if(levels.has(r.desde))return 'Hay cantidades de mayoreo repetidas.';levels.add(r.desde);if(r.precio<0)return 'El precio mayorista no puede ser negativo.';if(r.precio>lastPrice)return 'El precio mayorista no debe aumentar al subir la cantidad.';lastPrice=r.precio;}
  return '';
}
async function saveProduct(){
  syncDraftFromDom();const form=document.getElementById('productForm'),fd=new FormData(form),data=Object.fromEntries(fd.entries());if(data.marca==='__NEW__')data.marca=String(data.marcaNueva||'').trim();if(data.categoria==='__NEW__')data.categoria=String(data.categoriaNueva||'').trim();delete data.marcaNueva;delete data.categoriaNueva;data.precio=Number(data.precio||0);data.descuento=Number(data.descuento||0);data.stock=data.stock===''?null:Number(data.stock);data.variantes=structuredClone(draftVariants);data.mayoreo=structuredClone(draftWholesale).sort((a,b)=>a.desde-b.desde);
  const error=validateDraft(data);if(error){alert(error);return;}const btn=document.getElementById('saveProduct'),progress=document.getElementById('saveProgress');
  try{btn.disabled=true;btn.textContent='Guardando…';progress.textContent='Guardando solo este producto, sin recargar la base completa…';const result=await apiRequest('saveProduct',{product:data});progress.textContent='Producto guardado.';closeDrawer();await loadProductsPage();}
  catch(err){alert('No se pudo guardar: '+err.message);progress.textContent=err.message;}
  finally{const b=document.getElementById('saveProduct');if(b){b.disabled=false;b.textContent='Guardar producto';}}
}
function duplicateProduct(code){ const p=structuredClone(db.products.find(x=>x.codigo===code)); let n=1,newCode=`${p.codigo}-COPIA`; while(db.products.some(x=>x.codigo===newCode))newCode=`${p.codigo}-COPIA${++n}`;p.codigo=newCode;p.nombre+= ' (copia)';p.variantes=(p.variantes||[]).map(v=>({...v,id:cryptoId()}));db.products.unshift(p);saveDb();updateProductResults(); }
function exportJson(){ const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='SAGC-PRODUCTOS.json';a.click();URL.revokeObjectURL(a.href); }
function importJson(e){ const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const parsed=JSON.parse(r.result);if(!Array.isArray(parsed.products))throw new Error();db=parsed;saveDb();renderProductsShell();}catch{alert('El archivo JSON no es válido.');}};r.readAsText(file); }

document.addEventListener('click',e=>{
  if(!e.target.closest('.more-menu')){const pop=document.getElementById('morePopover');const btn=document.getElementById('moreBtn');if(pop)pop.classList.remove('show');if(btn)btn.setAttribute('aria-expanded','false');}
});

content.addEventListener('click',async e=>{
  const go=e.target.closest('[data-go]');if(go)return navigate(go.dataset.go);
  const deleteColor=e.target.closest('.delete-color');
  if(deleteColor){
    const id=deleteColor.dataset.colorId, color=db.colors.find(c=>c.id===id);
    if(color && confirm(`¿Eliminar el color "${color.nombre}"? Los productos existentes conservarán el nombre guardado.`)){
      db.colors=db.colors.filter(c=>c.id!==id);saveDb();renderConfiguration();
    }
    return;
  }
  if(currentView!=='productos')return;
  if(e.target.closest('#drawerClose')||e.target.closest('#cancelProduct')||e.target.id==='productDrawerOverlay')return closeDrawer();
  const tab=e.target.closest('.drawer-tab');if(tab)return switchTab(tab.dataset.tab);
  if(e.target.closest('#saveProduct'))return saveProduct();
  if(e.target.closest('#regenerateCode')){document.getElementById('productForm').elements.codigo.value=await requestNextProductCode();return;}
  const uploadSlot=e.target.closest('.upload-slot');if(uploadSlot)return handleSlotUpload(uploadSlot.dataset.imageKey);
  if(e.target.closest('#uploadVideoBtn')){
    const file=document.getElementById('videoFile')?.files[0],form=document.getElementById('productForm'),btn=document.getElementById('uploadVideoBtn'),status=document.getElementById('videoStatus');
    try{btn.disabled=true;btn.textContent='Subiendo…';status.textContent='Enviando video a Google Drive…';const url=await uploadVideoFile(file,form.elements.codigo.value);form.elements.video.value=url;status.textContent='Video listo para guardar.';}
    catch(err){status.textContent=err.message;alert(err.message);}
    finally{btn.disabled=false;btn.textContent='Subir video a Drive';}
    return;
  }
  if(e.target.closest('#addVariant')){syncDraftFromDom();draftVariants.push({id:cryptoId(),opcion1:'',opcion2:'',imagen:'',stock:0,activo:true});renderVariantList();return;}
  if(e.target.closest('#addWholesale')){syncDraftFromDom();draftWholesale.push({desde:Math.max(2,...draftWholesale.map(x=>Number(x.desde)+1)),precio:0});renderWholesaleList();return;}
  const page=e.target.closest('[data-page]');if(page){state.page=Number(page.dataset.page);loadProductsPage();return;}
  const edit=e.target.closest('.edit-product');if(edit)return openProduct(edit.dataset.code);
  const dup=e.target.closest('.duplicate-product');if(dup)return duplicateProduct(dup.dataset.code);
  const toggle=e.target.closest('.toggle-product');if(toggle){const p=db.products.find(x=>x.codigo===toggle.dataset.code);p.estado=p.estado==='Activo'?'Inactivo':'Activo';saveDb();updateProductResults();return;}
  const del=e.target.closest('.delete-product');if(del&&confirm('¿Eliminar este producto y sus variantes/mayoreo?')){try{await removeProductFromSheets(del.dataset.code);await loadProductsPage();}catch(err){alert(err.message);}return;}
  const rv=e.target.closest('.remove-variant');if(rv){syncDraftFromDom();draftVariants.splice(Number(rv.closest('.variant-row').dataset.index),1);renderVariantList();return;}
  const dv=e.target.closest('.duplicate-variant');if(dv){syncDraftFromDom();const i=Number(dv.closest('.variant-row').dataset.index);draftVariants.splice(i+1,0,{...structuredClone(draftVariants[i]),id:cryptoId()});renderVariantList();return;}
  const rw=e.target.closest('.remove-wholesale');if(rw){syncDraftFromDom();draftWholesale.splice(Number(rw.closest('.wholesale-row').dataset.index),1);renderWholesaleList();return;}
});
content.addEventListener('input',e=>{ if(e.target.closest('.variant-row')||e.target.closest('.wholesale-row')){syncDraftFromDom(); if(e.target.closest('.wholesale-row'))renderWholesaleList();} });
content.addEventListener('change',e=>{
  if(e.target.id==='brandSelect'){const isNew=e.target.value==='__NEW__';document.getElementById('brandNew').hidden=!isNew;if(isNew)document.getElementById('brandNew').focus();}
  if(e.target.id==='categorySelect'){const isNew=e.target.value==='__NEW__';document.getElementById('categoryNew').hidden=!isNew;if(isNew)document.getElementById('categoryNew').focus();}
  if(e.target.matches('[id^=url-]'))updateSlotPreview(e.target.id.replace('url-',''),e.target.value);
  if(e.target.matches('[data-image-key]')&&e.target.files?.[0]){const key=e.target.dataset.imageKey;updateSlotPreview(key,URL.createObjectURL(e.target.files[0]));document.getElementById('status-'+key).textContent=`Lista: ${e.target.files[0].name}`;}
  if(e.target.matches('.variant-image-source')){const row=e.target.closest('.variant-row'),input=row.querySelector('[data-field=imagen]'),key=e.target.value.replace('__',''),form=document.getElementById('productForm');if(e.target.value&&e.target.value!=='__custom')input.value=form.elements[key]?.value||'';else if(!e.target.value)input.value='';syncDraftFromDom();}
  if(e.target.matches('.variant-row select[data-field="opcion1"]')){
    syncDraftFromDom();
    const color=db.colors.find(c=>normalize(c.nombre)===normalize(e.target.value));
    e.target.closest('.variant-color-control').querySelector('.color-swatch').style.setProperty('--swatch',color?.hex||'#d7dee8');
  }
});

nav.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)navigate(b.dataset.view);});
const sidebarCollapse=document.getElementById('sidebarCollapse');
const setSidebarCollapsed=(collapsed)=>{
  document.body.classList.toggle('sidebar-collapsed',collapsed);
  sidebarCollapse.setAttribute('aria-label',collapsed?'Expandir menú':'Contraer menú');
  sidebarCollapse.title=collapsed?'Expandir menú':'Contraer menú';
  localStorage.setItem(SIDEBAR_KEY,String(collapsed));
};
setSidebarCollapsed(localStorage.getItem(SIDEBAR_KEY)==='true');
sidebarCollapse.onclick=()=>setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
document.getElementById('mobileMenu').onclick=()=>{sidebar.classList.add('open');overlay.classList.add('show');};
document.getElementById('sidebarClose').onclick=()=>{sidebar.classList.remove('open');overlay.classList.remove('show');};overlay.onclick=()=>{sidebar.classList.remove('open');overlay.classList.remove('show');};

navigate('productos');
if(getApiUrl()){
  // Carga los catálogos auxiliares en segundo plano sin volver a solicitar
  // la página de productos. Evita la doble carga inicial que hacía lento el panel.
  setTimeout(async()=>{
    try{
      await loadCatalogs();
    }catch(err){console.warn('Conexión temporalmente no disponible:',err.message);}
  },250);
}
