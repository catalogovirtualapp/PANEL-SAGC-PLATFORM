'use strict';

const STORAGE_KEY = 'sagc_productos_v2';
const DEFAULT_DATA = {
  products: [
    {codigo:'S0001',nombre:'Lápiz Técnico Rojo',marca:'Faber Castell',categoria:'Librería',precio:4.5,descuento:0,imagen:'',video:'',descripcion:'Lápiz técnico rojo para dibujo y oficina.',destacado:'',estado:'Activo',palabrasClave:'lapiz tecnico rojo dibujo oficina',variantes:[],mayoreo:[{desde:12,precio:4.1},{desde:24,precio:3.8}]},
    {codigo:'S0002',nombre:'Bolsa de Regalo Grande',marca:'',categoria:'Bolsas',precio:3.5,descuento:0.5,imagen:'',video:'',descripcion:'Bolsa decorativa grande.',destacado:'Oferta',estado:'Activo',palabrasClave:'bolsa regalo obsequio grande',variantes:[{id:cryptoId(),opcion1:'Rojo',opcion2:'Grande',imagen:'',stock:8,activo:true},{id:cryptoId(),opcion1:'Azul',opcion2:'Grande',imagen:'',stock:5,activo:true}],mayoreo:[{desde:6,precio:3.0},{desde:12,precio:2.7}]},
    {codigo:'S0003',nombre:'Bolsa de Mercado Reforzada',marca:'',categoria:'Bolsas',precio:8,descuento:0,imagen:'',video:'',descripcion:'Bolsa reutilizable.',destacado:'Nuevo',estado:'Activo',palabrasClave:'bolsa mercado compras reutilizable reforzada',variantes:[],mayoreo:[]}
  ]
};

let db = loadDb();
let currentView = 'dashboard';
let editingCode = null;
let draftVariants = [];
let draftWholesale = [];
const state = {search:'',category:'',status:'',variant:'',wholesale:'',section:'products',page:1,pageSize:10};

const content = document.getElementById('appContent');
const pageTitle = document.getElementById('pageTitle');
const breadcrumb = document.getElementById('breadcrumbCurrent');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
const nav = document.getElementById('sidebarNav');

function cryptoId(){ return (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`); }
function loadDb(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(DEFAULT_DATA); } catch { return structuredClone(DEFAULT_DATA); } }
function saveDb(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
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
  if(view==='productos') renderProductsShell(); else if(view==='dashboard') renderDashboard(); else renderPlaceholder(title);
  sidebar.classList.remove('open'); overlay.classList.remove('show');
}

function renderDashboard(){
  const active=db.products.filter(p=>p.estado==='Activo').length;
  content.innerHTML=`<section class="module-page"><div class="page-actions"><div><p class="eyebrow">Panel SAGC</p><h2 class="module-heading">Centro de control</h2><p class="module-description">Base empresarial preparada para crecer por módulos.</p></div><button class="btn btn-primary" data-go="productos">Abrir Productos</button></div><div class="product-kpis"><article class="product-kpi"><small>Productos</small><strong>${db.products.length}</strong></article><article class="product-kpi"><small>Activos</small><strong>${active}</strong></article><article class="product-kpi"><small>Con variantes</small><strong>${db.products.filter(p=>p.variantes?.length).length}</strong></article><article class="product-kpi"><small>Con mayoreo</small><strong>${db.products.filter(p=>p.mayoreo?.length).length}</strong></article></div></section>`;
}
function renderPlaceholder(title){ content.innerHTML=`<section class="module-page"><div class="data-card"><div class="empty-state"><h3>${escapeHtml(title)}</h3><p>Este módulo se construirá después de terminar PRODUCTOS.</p></div></div></section>`; }

function renderProductsShell(){
  const categories=[...new Set(db.products.map(p=>p.categoria).filter(Boolean))].sort();
  const totalVariants=db.products.reduce((n,p)=>n+(p.variantes?.length||0),0);
  const totalWholesale=db.products.reduce((n,p)=>n+(p.mayoreo?.length||0),0);
  content.innerHTML=`<section class="module-page products-module">
    <div class="page-actions compact-head">
      <div><p class="eyebrow">Catálogo</p><h2 class="module-heading">Productos</h2><p class="module-description">Administra productos, variantes y precios por cantidad desde una sola pantalla.</p></div>
      <div class="action-row">
        <div class="more-menu"><button class="btn btn-secondary compact-btn" id="moreBtn" aria-expanded="false">Más ▾</button><div class="more-popover" id="morePopover"><button id="exportBtn">Exportar respaldo JSON</button><label>Importar respaldo JSON<input id="importFile" type="file" accept="application/json"></label></div></div>
        <button class="btn btn-primary" id="newProductBtn">+ Nuevo producto</button>
      </div>
    </div>
    <div class="module-tabs" role="tablist" aria-label="Secciones de productos">
      <button class="module-tab ${state.section==='products'?'active':''}" data-section="products"><span>Productos</span><b>${db.products.length}</b></button>
      <button class="module-tab ${state.section==='variants'?'active':''}" data-section="variants"><span>Variantes</span><b>${totalVariants}</b></button>
      <button class="module-tab ${state.section==='wholesale'?'active':''}" data-section="wholesale"><span>Mayoreo</span><b>${totalWholesale}</b></button>
    </div>
    <div class="product-kpis" id="productKpis"></div>
    <div class="product-toolbar sticky-tools">
      <div class="search-field grow"><span>⌕</span><input id="productSearch" type="search" autocomplete="off" placeholder="Ej.: lap roj, bol reg, S0002, azul grande"></div>
      <select class="filter-select" id="categoryFilter"><option value="">Todas las categorías</option>${categories.map(c=>`<option>${escapeHtml(c)}</option>`).join('')}</select>
      <select class="filter-select" id="statusFilter"><option value="">Todos los estados</option><option>Activo</option><option>Inactivo</option></select>
      <select class="filter-select" id="variantFilter"><option value="">Variantes: todos</option><option value="si">Con variantes</option><option value="no">Sin variantes</option></select>
      <select class="filter-select" id="wholesaleFilter"><option value="">Mayoreo: todos</option><option value="si">Con mayoreo</option><option value="no">Sin mayoreo</option></select>
      <button class="btn btn-secondary" id="clearFilters">Limpiar</button>
    </div>
    <div class="data-card"><div class="table-wrap"><table class="product-table"><thead><tr><th>Imagen</th><th>Código</th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Variantes</th><th>Mayoreo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="productRows"></tbody></table></div><div class="product-footer"><span id="productCount"></span><div class="pagination" id="productPagination"></div></div></div>
  </section>${drawerHtml()}`;
  bindProductShell(); updateProductResults();
}
function filteredProducts(){
  return db.products.filter(p=>smartMatch(p,state.search)
    &&(state.section==='products'||(state.section==='variants'?(p.variantes?.length>0):(p.mayoreo?.length>0)))
    &&(!state.category||p.categoria===state.category)
    &&(!state.status||p.estado===state.status)
    &&(!state.variant||(state.variant==='si'?p.variantes?.length:!p.variantes?.length))
    &&(!state.wholesale||(state.wholesale==='si'?p.mayoreo?.length:!p.mayoreo?.length)));
}
function updateProductResults(){
  const rows=filteredProducts(); const totalPages=Math.max(1,Math.ceil(rows.length/state.pageSize)); state.page=Math.min(state.page,totalPages);
  const start=(state.page-1)*state.pageSize; const visible=rows.slice(start,start+state.pageSize);
  document.getElementById('productKpis').innerHTML=`<article class="product-kpi"><small>Total</small><strong>${db.products.length}</strong></article><article class="product-kpi"><small>Activos</small><strong>${db.products.filter(p=>p.estado==='Activo').length}</strong></article><article class="product-kpi"><small>Con variantes</small><strong>${db.products.filter(p=>p.variantes?.length).length}</strong></article><article class="product-kpi"><small>Con mayoreo</small><strong>${db.products.filter(p=>p.mayoreo?.length).length}</strong></article><article class="product-kpi"><small>Ofertas</small><strong>${db.products.filter(p=>Number(p.descuento)>0).length}</strong></article>`;
  document.getElementById('productRows').innerHTML=visible.length?visible.map(p=>`<tr>
    <td>${p.imagen?`<img class="product-thumb" src="${escapeHtml(p.imagen)}" alt="">`:'<div class="product-thumb placeholder">▦</div>'}</td>
    <td><strong>${escapeHtml(p.codigo)}</strong></td><td><div class="product-name">${escapeHtml(p.nombre)}</div><div class="product-sub">${escapeHtml(p.marca||'Sin marca')}</div></td><td>${escapeHtml(p.categoria||'—')}</td>
    <td>${p.descuento?`<div class="old-price">${money(p.precio)}</div>`:''}<div class="money">${money(finalPrice(p))}</div></td><td>${stockOf(p)===null?'—':stockOf(p)}</td><td>${p.variantes?.length||0}</td><td>${p.mayoreo?.length||0}</td>
    <td><span class="status-pill ${p.estado==='Activo'?'active':'inactive'}">● ${escapeHtml(p.estado)}</span></td><td><div class="action-menu"><button class="table-action edit-product" data-code="${escapeHtml(p.codigo)}" title="Editar">✎</button><button class="table-action duplicate-product" data-code="${escapeHtml(p.codigo)}" title="Duplicar">⧉</button><button class="table-action toggle-product" data-code="${escapeHtml(p.codigo)}" title="Activar/Inactivar">◐</button><button class="table-action danger delete-product" data-code="${escapeHtml(p.codigo)}" title="Eliminar">×</button></div></td></tr>`).join(''):`<tr><td colspan="10"><div class="empty-state"><h3>No encontramos productos</h3><p>Prueba con menos palabras o limpia los filtros.</p></div></td></tr>`;
  document.getElementById('productCount').textContent=`Mostrando ${visible.length?start+1:0}–${Math.min(start+visible.length,rows.length)} de ${rows.length}`;
  document.getElementById('productPagination').innerHTML=`<button class="page-btn" data-page="${Math.max(1,state.page-1)}">‹</button>${Array.from({length:Math.min(totalPages,7)},(_,i)=>i+1).map(n=>`<button class="page-btn ${n===state.page?'active':''}" data-page="${n}">${n}</button>`).join('')}<button class="page-btn" data-page="${Math.min(totalPages,state.page+1)}">›</button>`;
}

function bindProductShell(){
  const search=document.getElementById('productSearch'); search.value=state.search;
  search.addEventListener('input',e=>{state.search=e.target.value;state.page=1;updateProductResults();});
  [['categoryFilter','category'],['statusFilter','status'],['variantFilter','variant'],['wholesaleFilter','wholesale']].forEach(([id,key])=>{const el=document.getElementById(id);el.value=state[key];el.addEventListener('change',()=>{state[key]=el.value;state.page=1;updateProductResults();});});
  document.getElementById('clearFilters').onclick=()=>{Object.assign(state,{search:'',category:'',status:'',variant:'',wholesale:'',page:1});renderProductsShell();};
  document.getElementById('newProductBtn').onclick=()=>openProduct();
  document.getElementById('exportBtn').onclick=exportJson;
  document.getElementById('importFile').addEventListener('change',importJson);
  document.getElementById('moreBtn').onclick=e=>{e.stopPropagation();const pop=document.getElementById('morePopover');const open=pop.classList.toggle('show');e.currentTarget.setAttribute('aria-expanded',String(open));};
  document.querySelectorAll('.module-tab').forEach(tab=>tab.onclick=()=>{state.section=tab.dataset.section;state.page=1;renderProductsShell();});
}
function drawerHtml(){ return `<div class="drawer-overlay" id="productDrawerOverlay"></div><aside class="product-drawer wide" id="productDrawer"><div class="drawer-head"><div><h2 id="drawerTitle">Nuevo producto</h2><p>Producto + variantes + mayoreo en una sola ficha.</p></div><button class="drawer-close" id="drawerClose">×</button></div>
  <div class="drawer-tabs"><button class="drawer-tab active" data-tab="general">General</button><button class="drawer-tab" data-tab="variants">Variantes <span id="variantBadge">0</span></button><button class="drawer-tab" data-tab="wholesale">Mayoreo <span id="wholesaleBadge">0</span></button></div>
  <form id="productForm" class="drawer-body">
    <section class="tab-panel active" data-panel="general"><div class="form-section"><h3>Información principal</h3><div class="form-grid"><div class="form-group"><label>Código *</label><input name="codigo" required maxlength="40"></div><div class="form-group"><label>Estado</label><select name="estado"><option>Activo</option><option>Inactivo</option></select></div><div class="form-group full"><label>Nombre *</label><input name="nombre" required maxlength="180"></div><div class="form-group"><label>Marca</label><input name="marca"></div><div class="form-group"><label>Categoría</label><input name="categoria"></div><div class="form-group"><label>Precio *</label><input name="precio" type="number" min="0" step="0.01" required></div><div class="form-group"><label>Descuento en soles</label><input name="descuento" type="number" min="0" step="0.01" value="0"></div><div class="form-group full"><label>Palabras clave</label><input name="palabrasClave" placeholder="corrector, liquid paper, blanco, oficina"><span class="help-text">No se muestran al cliente; mejoran la búsqueda.</span></div><div class="form-group"><label>Destacado</label><input name="destacado" placeholder="Nuevo, Oferta..."></div><div class="form-group full"><label>Imagen principal</label><input name="imagen" type="url"></div><div class="form-group full"><label>Video</label><input name="video" type="url"></div><div class="form-group full"><label>Descripción</label><textarea name="descripcion"></textarea></div></div></div></section>
    <section class="tab-panel" data-panel="variants"><div class="section-head"><div><h3>Variantes</h3><p>Color, talla, modelo, capacidad u otra combinación.</p></div><button type="button" class="btn btn-primary" id="addVariant">+ Agregar variante</button></div><div class="editable-list" id="variantList"></div></section>
    <section class="tab-panel" data-panel="wholesale"><div class="section-head"><div><h3>Precios por cantidad</h3><p>El sistema aplicará el mayor tramo alcanzado.</p></div><button type="button" class="btn btn-primary" id="addWholesale">+ Agregar tramo</button></div><div class="editable-list" id="wholesaleList"></div><div class="price-preview" id="wholesalePreview"></div></section>
  </form><div class="drawer-footer"><button class="btn btn-secondary" id="cancelProduct">Cancelar</button><button class="btn btn-primary" id="saveProduct">Guardar producto</button></div></aside>`; }

function openProduct(code=null){
  editingCode=code; const p=code?db.products.find(x=>x.codigo===code):null; draftVariants=structuredClone(p?.variantes||[]); draftWholesale=structuredClone(p?.mayoreo||[]);
  const form=document.getElementById('productForm'); form.reset(); document.getElementById('drawerTitle').textContent=p?'Editar producto':'Nuevo producto';
  if(p) Object.entries(p).forEach(([k,v])=>{if(form.elements[k] && !Array.isArray(v)) form.elements[k].value=v??'';}); else form.elements.estado.value='Activo';
  form.elements.codigo.readOnly=Boolean(p); renderVariantList(); renderWholesaleList(); switchTab('general');
  document.getElementById('productDrawer').classList.add('open'); document.getElementById('productDrawerOverlay').classList.add('show');
}
function closeDrawer(){ document.getElementById('productDrawer').classList.remove('open');document.getElementById('productDrawerOverlay').classList.remove('show');editingCode=null; }
function switchTab(tab){ document.querySelectorAll('.drawer-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===tab)); }

function renderVariantList(){
  const el=document.getElementById('variantList'); document.getElementById('variantBadge').textContent=draftVariants.length;
  el.innerHTML=draftVariants.length?draftVariants.map((v,i)=>`<div class="edit-row variant-row" data-index="${i}"><input data-field="opcion1" value="${escapeHtml(v.opcion1)}" placeholder="Color / Modelo"><input data-field="opcion2" value="${escapeHtml(v.opcion2)}" placeholder="Talla / Capacidad"><input data-field="imagen" value="${escapeHtml(v.imagen||'')}" placeholder="URL imagen"><input data-field="stock" type="number" min="0" value="${Number(v.stock||0)}" placeholder="Stock"><label class="switch-label"><input data-field="activo" type="checkbox" ${v.activo!==false?'checked':''}> Activo</label><button type="button" class="table-action duplicate-variant">⧉</button><button type="button" class="table-action danger remove-variant">×</button></div>`).join(''):'<div class="mini-empty">Este producto no tiene variantes. El stock podrá administrarse después desde Inventario.</div>';
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
function saveProduct(){
  syncDraftFromDom(); const fd=new FormData(document.getElementById('productForm')); const data=Object.fromEntries(fd.entries()); data.precio=Number(data.precio||0);data.descuento=Number(data.descuento||0);data.variantes=structuredClone(draftVariants);data.mayoreo=structuredClone(draftWholesale).sort((a,b)=>a.desde-b.desde);
  const error=validateDraft(data); if(error){alert(error);return;}
  if(editingCode){const idx=db.products.findIndex(p=>p.codigo===editingCode);db.products[idx]=data;}else db.products.unshift(data);
  saveDb();closeDrawer();renderProductsShell();
}
function duplicateProduct(code){ const p=structuredClone(db.products.find(x=>x.codigo===code)); let n=1,newCode=`${p.codigo}-COPIA`; while(db.products.some(x=>x.codigo===newCode))newCode=`${p.codigo}-COPIA${++n}`;p.codigo=newCode;p.nombre+= ' (copia)';p.variantes=(p.variantes||[]).map(v=>({...v,id:cryptoId()}));db.products.unshift(p);saveDb();updateProductResults(); }
function exportJson(){ const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='SAGC-PRODUCTOS.json';a.click();URL.revokeObjectURL(a.href); }
function importJson(e){ const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const parsed=JSON.parse(r.result);if(!Array.isArray(parsed.products))throw new Error();db=parsed;saveDb();renderProductsShell();}catch{alert('El archivo JSON no es válido.');}};r.readAsText(file); }

document.addEventListener('click',e=>{
  if(!e.target.closest('.more-menu')){const pop=document.getElementById('morePopover');const btn=document.getElementById('moreBtn');if(pop)pop.classList.remove('show');if(btn)btn.setAttribute('aria-expanded','false');}
});

content.addEventListener('click',e=>{
  const go=e.target.closest('[data-go]');if(go)return navigate(go.dataset.go);
  if(currentView!=='productos')return;
  if(e.target.closest('#drawerClose')||e.target.closest('#cancelProduct')||e.target.id==='productDrawerOverlay')return closeDrawer();
  const tab=e.target.closest('.drawer-tab');if(tab)return switchTab(tab.dataset.tab);
  if(e.target.closest('#saveProduct'))return saveProduct();
  if(e.target.closest('#addVariant')){syncDraftFromDom();draftVariants.push({id:cryptoId(),opcion1:'',opcion2:'',imagen:'',stock:0,activo:true});renderVariantList();return;}
  if(e.target.closest('#addWholesale')){syncDraftFromDom();draftWholesale.push({desde:Math.max(2,...draftWholesale.map(x=>Number(x.desde)+1)),precio:0});renderWholesaleList();return;}
  const page=e.target.closest('[data-page]');if(page){state.page=Number(page.dataset.page);updateProductResults();return;}
  const edit=e.target.closest('.edit-product');if(edit)return openProduct(edit.dataset.code);
  const dup=e.target.closest('.duplicate-product');if(dup)return duplicateProduct(dup.dataset.code);
  const toggle=e.target.closest('.toggle-product');if(toggle){const p=db.products.find(x=>x.codigo===toggle.dataset.code);p.estado=p.estado==='Activo'?'Inactivo':'Activo';saveDb();updateProductResults();return;}
  const del=e.target.closest('.delete-product');if(del&&confirm('¿Eliminar este producto y sus variantes/mayoreo?')){db.products=db.products.filter(x=>x.codigo!==del.dataset.code);saveDb();updateProductResults();return;}
  const rv=e.target.closest('.remove-variant');if(rv){syncDraftFromDom();draftVariants.splice(Number(rv.closest('.variant-row').dataset.index),1);renderVariantList();return;}
  const dv=e.target.closest('.duplicate-variant');if(dv){syncDraftFromDom();const i=Number(dv.closest('.variant-row').dataset.index);draftVariants.splice(i+1,0,{...structuredClone(draftVariants[i]),id:cryptoId()});renderVariantList();return;}
  const rw=e.target.closest('.remove-wholesale');if(rw){syncDraftFromDom();draftWholesale.splice(Number(rw.closest('.wholesale-row').dataset.index),1);renderWholesaleList();return;}
});
content.addEventListener('input',e=>{ if(e.target.closest('.variant-row')||e.target.closest('.wholesale-row')){syncDraftFromDom(); if(e.target.closest('.wholesale-row'))renderWholesaleList();} });

nav.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)navigate(b.dataset.view);});
document.getElementById('mobileMenu').onclick=()=>{sidebar.classList.add('open');overlay.classList.add('show');};
document.getElementById('sidebarClose').onclick=()=>{sidebar.classList.remove('open');overlay.classList.remove('show');};overlay.onclick=()=>{sidebar.classList.remove('open');overlay.classList.remove('show');};

navigate('productos');
