
const MODULES = {
  dashboard: { title: "Dashboard" },
  productos: {
    title: "Productos",
    description: "Administra el catálogo, precios, imágenes, stock, variantes y visibilidad de cada producto.",
    action: "+ Nuevo producto",
    columns: ["Imagen","Código","Producto","Categoría","Precio","Stock","Estado","Acciones"]
  },
  categorias: {
    title: "Categorías",
    description: "Organiza los productos en categorías y subcategorías fáciles de administrar.",
    action: "+ Nueva categoría",
    columns: ["Nombre","Slug","Productos","Orden","Estado","Acciones"]
  },
  marcas: {
    title: "Marcas",
    description: "Administra las marcas comerciales utilizadas en el catálogo.",
    action: "+ Nueva marca",
    columns: ["Logo","Marca","Productos","Estado","Acciones"]
  },
  inventario: {
    title: "Inventario",
    description: "Controla existencias, movimientos, alertas de reposición y ubicaciones.",
    action: "+ Ajuste de stock",
    columns: ["Código","Producto","Stock actual","Stock mínimo","Ubicación","Estado","Acciones"]
  },
  ventas: {
    title: "Ventas",
    description: "Registra y consulta ventas, comprobantes, estados y métodos de pago.",
    action: "+ Nueva venta",
    columns: ["Venta","Fecha","Cliente","Total","Pago","Estado","Acciones"]
  },
  compras: {
    title: "Compras",
    description: "Gestiona compras, ingresos de mercadería y cuentas con proveedores.",
    action: "+ Nueva compra",
    columns: ["Compra","Proveedor","Fecha","Total","Estado","Acciones"]
  },
  clientes: {
    title: "Clientes",
    description: "Centraliza la información comercial e historial de cada cliente.",
    action: "+ Nuevo cliente",
    columns: ["Cliente","Documento","Teléfono","Correo","Compras","Estado","Acciones"]
  },
  proveedores: {
    title: "Proveedores",
    description: "Gestiona proveedores, contactos, condiciones comerciales y compras.",
    action: "+ Nuevo proveedor",
    columns: ["Proveedor","Documento","Contacto","Teléfono","Compras","Estado","Acciones"]
  },
  caja: {
    title: "Caja",
    description: "Controla aperturas, cierres, ingresos, egresos y conciliaciones.",
    action: "+ Abrir caja",
    columns: ["Caja","Apertura","Cierre","Ingresos","Egresos","Saldo","Estado"]
  },
  reportes: {
    title: "Reportes",
    description: "Analiza ventas, productos, inventario, clientes, rentabilidad y crecimiento.",
    action: "Generar reporte",
    columns: ["Reporte","Periodo","Generado por","Fecha","Formato","Acciones"]
  },
  usuarios: {
    title: "Usuarios y roles",
    description: "Administra accesos, permisos y responsabilidades de cada usuario.",
    action: "+ Nuevo usuario",
    columns: ["Usuario","Correo","Rol","Último acceso","Estado","Acciones"]
  },
  auditoria: {
    title: "Auditoría",
    description: "Consulta el historial completo de acciones realizadas dentro del sistema.",
    action: "Exportar auditoría",
    columns: ["Fecha","Usuario","Módulo","Acción","Detalle","Dispositivo"]
  },
  configuracion: {
    title: "Configuración",
    description: "Personaliza el negocio, integraciones, catálogo, seguridad y parámetros generales.",
    action: "Guardar cambios",
    columns: ["Sección","Configuración","Estado","Última actualización","Acciones"]
  }
};


const PRODUCT_COLUMNS = ["CODIGO","NOMBRE","MARCA","CATEGORIA","PRECIO","DESCUENTO","IMAGEN","IMAGEN_2","IMAGEN_3","IMAGEN_4","IMAGEN_5","VIDEO","DESCRIPCION","DESTACADO","ESTADO"];
let products = [{"codigo": "S0001", "nombre": "VESTIDO LARGO CASUAL", "marca": "Karitos Urban", "categoria": "👗Vestido", "precio": 30, "descuento": 5, "imagen": "https://drive.google.com/thumbnail?id=1Trp27HKz7XihpiSxL7Gw3YNIfhMocVCh&sz=w500", "destacado": "", "estado": "Activo"}, {"codigo": "S0002", "nombre": "FALDA DEPORTIVA", "marca": "Generico", "categoria": "Ropa", "precio": 50, "descuento": null, "imagen": "https://drive.google.com/thumbnail?id=10G8PUzFNvPbBlrcbD5pKZuuAkb57h5hX&sz=w500", "destacado": "", "estado": "Activo"}, {"codigo": "S0003", "nombre": "PRUEBA ETERNA", "marca": "Generico", "categoria": "Perfumes", "precio": 3500, "descuento": null, "imagen": "https://drive.google.com/thumbnail?id=1MPzwedatCiCbKilrZbK5eJk_7fdail6c&sz=w500", "destacado": "", "estado": "Activo"}, {"codigo": "S0004", "nombre": "PRUEBA 1", "marca": "Generico", "categoria": "", "precio": 20, "descuento": null, "imagen": "https://drive.google.com/thumbnail?id=14kftaPAkTBqLoO37x_iPuTZav6aVSeHg&sz=w500", "destacado": "", "estado": "Activo"}, {"codigo": "S0005", "nombre": "JEAN CLASICO", "marca": "Monina", "categoria": "", "precio": 60, "descuento": 15, "imagen": "https://drive.google.com/thumbnail?id=1SyagsIQI4Ye4qkjfzCsc-CqVpRIE8ohl&sz=w500", "destacado": "Nuevo Ingreso", "estado": "Activo"}, {"codigo": "S0006", "nombre": "PRUEBA 1", "marca": "Generico", "categoria": "", "precio": 20, "descuento": null, "imagen": "https://drive.google.com/thumbnail?id=14kftaPAkTBqLoO37x_iPuTZav6aVSeHg&sz=w500", "destacado": "", "estado": "Activo"}, {"codigo": "S0007", "nombre": "POLO MENSAJES", "marca": "New Hu", "categoria": "", "precio": 50, "descuento": 10, "imagen": "https://drive.google.com/thumbnail?id=1wAz2sXkbPwgf7_EdoUv7GrvXhS7gf1m1&sz=w500", "destacado": "Nuevo Ingreso", "estado": "Activo"}, {"codigo": "S0008", "nombre": "PRODUCTO DEMOSTRACIÓN", "marca": "SAGC", "categoria": "General", "precio": 25, "descuento": null, "imagen": "", "destacado": "", "estado": "Inactivo"}, {"codigo": "S0009", "nombre": "ARTÍCULO DE TEMPORADA", "marca": "SAGC", "categoria": "General", "precio": 79.9, "descuento": 10, "imagen": "", "destacado": "Oferta", "estado": "Activo"}];
let productState = { search:"", category:"", status:"", page:1, pageSize:6, editingCode:null };

const content = document.getElementById("appContent");
const pageTitle = document.getElementById("pageTitle");
const breadcrumb = document.getElementById("breadcrumbCurrent");
const nav = document.getElementById("sidebarNav");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebarOverlay");

function renderDashboard(){
  content.innerHTML = `
    <section>
      <div class="page-actions">
        <div>
          <p class="eyebrow">Vista general</p>
          <h2 class="module-heading">Bienvenido al Panel SAGC</h2>
          <p class="module-description">Maqueta empresarial preparada para conectar productos, ventas, inventario, clientes y reportes.</p>
        </div>
        <button class="btn btn-primary" data-go="productos">+ Nuevo producto</button>
      </div>

      <div class="stats-grid">
        ${[
          ["Productos","0","Sincronización pendiente","▦"],
          ["Ventas del mes","S/ 0.00","Aún sin movimientos","↗"],
          ["Stock bajo","0","Sin alertas activas","!"],
          ["Clientes","0","Base de clientes vacía","◉"]
        ].map(item => `
          <article class="stat-card">
            <div class="stat-head"><span>${item[0]}</span><span class="stat-icon">${item[3]}</span></div>
            <div class="stat-value">${item[1]}</div>
            <div class="stat-note">${item[2]}</div>
          </article>
        `).join("")}
      </div>

      <div class="dashboard-grid">
        <article class="panel-card">
          <div class="card-head"><h3>Actividad comercial</h3><span>Últimos 7 días</span></div>
          <div class="chart-placeholder">
            ${[35,50,42,70,58,88,64].map(v => `<div class="bar" style="height:${v}%"></div>`).join("")}
          </div>
        </article>

        <article class="panel-card">
          <div class="card-head"><h3>Actividad reciente</h3><span>Hoy</span></div>
          <div class="activity-list">
            ${[
              ["Sistema","Maqueta visual cargada","Ahora","✓"],
              ["Productos","Módulo listo para conexión","Ahora","▦"],
              ["Seguridad","Firebase pendiente","Pendiente","⚙"],
              ["Datos","Google Sheets pendiente","Pendiente","≡"]
            ].map(item => `
              <div class="activity-item">
                <span class="activity-icon">${item[3]}</span>
                <div><strong>${item[0]}</strong><small>${item[1]}</small></div>
                <span class="activity-time">${item[2]}</span>
              </div>
            `).join("")}
          </div>
        </article>
      </div>

      <article class="panel-card" style="margin-top:18px">
        <div class="card-head"><h3>Accesos rápidos</h3><span>Módulos principales</span></div>
        <div class="quick-grid">
          <button class="quick-card" data-go="productos"><strong>Productos</strong><span>Catálogo, variantes, precios e imágenes</span></button>
          <button class="quick-card" data-go="ventas"><strong>Ventas</strong><span>Registro rápido y seguimiento comercial</span></button>
          <button class="quick-card" data-go="inventario"><strong>Inventario</strong><span>Stock, movimientos y alertas</span></button>
        </div>
      </article>
    </section>`;
}

function renderModule(key){
  const data = MODULES[key];
  const tpl = document.getElementById("emptyModuleTemplate").content.cloneNode(true);
  tpl.querySelector(".module-heading").textContent = data.title;
  tpl.querySelector(".module-description").textContent = data.description;
  tpl.querySelector(".module-primary-action").textContent = data.action;
  tpl.querySelector(".module-empty-action").textContent = data.action.replace("+ ","");
  const head = tpl.querySelector(".module-table-head");
  data.columns.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    head.appendChild(th);
  });
  tpl.querySelector(".empty-state-cell").colSpan = data.columns.length;
  content.innerHTML = "";
  content.appendChild(tpl);
}

function navigate(key){
  const data = MODULES[key] || MODULES.dashboard;
  pageTitle.textContent = data.title;
  breadcrumb.textContent = data.title;
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.view === key));
  if(key === "dashboard") renderDashboard(); else if(key === "productos") renderProducts(); else renderModule(key);
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
  window.scrollTo({top:0,behavior:"smooth"});
}

nav.addEventListener("click", e => {
  const btn = e.target.closest("[data-view]");
  if(btn) navigate(btn.dataset.view);
});

content.addEventListener("click", e => {
  const btn = e.target.closest("[data-go]");
  if(btn) navigate(btn.dataset.go);
});

document.getElementById("mobileMenu").addEventListener("click", () => {
  sidebar.classList.add("open");
  overlay.classList.add("show");
});
document.getElementById("sidebarClose").addEventListener("click", () => {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
});
overlay.addEventListener("click", () => {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
});

navigate("dashboard");


function money(value){
  return new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"}).format(Number(value || 0));
}
function productFinalPrice(p){
  return p.descuento ? Math.max(0, Number(p.precio) - Number(p.descuento)) : Number(p.precio);
}
function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
}
function filteredProducts(){
  const q = productState.search.trim().toLowerCase();
  return products.filter(p => {
    const searchable = [p.codigo,p.nombre,p.marca,p.categoria].join(" ").toLowerCase();
    return (!q || searchable.includes(q))
      && (!productState.category || p.categoria === productState.category)
      && (!productState.status || p.estado === productState.status);
  });
}
function renderProducts(){
  const categories = [...new Set(products.map(p => p.categoria).filter(Boolean))].sort();
  const rows = filteredProducts();
  const totalPages = Math.max(1, Math.ceil(rows.length / productState.pageSize));
  if(productState.page > totalPages) productState.page = totalPages;
  const start = (productState.page - 1) * productState.pageSize;
  const visible = rows.slice(start,start + productState.pageSize);
  const active = products.filter(p => p.estado === "Activo").length;
  const discounted = products.filter(p => Number(p.descuento) > 0).length;
  const featured = products.filter(p => p.destacado).length;

  content.innerHTML = `
  <section class="module-page">
    <div class="page-actions">
      <div>
        <p class="eyebrow">Catálogo conectado</p>
        <h2 class="module-heading">Administración de productos</h2>
        <p class="module-description">Diseñado sobre las columnas reales de tu hoja PRODUCTOS. En esta primera versión los cambios se guardan en modo demostración local.</p>
      </div>
      <button class="btn btn-primary" id="newProductBtn">+ Nuevo producto</button>
    </div>

    <div class="product-kpis">
      <article class="product-kpi"><small>Total productos</small><strong>${products.length}</strong></article>
      <article class="product-kpi"><small>Activos</small><strong>${active}</strong></article>
      <article class="product-kpi"><small>Inactivos</small><strong>${products.length-active}</strong></article>
      <article class="product-kpi"><small>Con descuento</small><strong>${discounted}</strong></article>
      <article class="product-kpi"><small>Destacados</small><strong>${featured}</strong></article>
    </div>

    <div class="product-toolbar">
      <div class="search-field"><span>⌕</span><input id="productSearch" type="search" value="${escapeHtml(productState.search)}" placeholder="Buscar por código, nombre, marca o categoría..." /></div>
      <select class="filter-select" id="categoryFilter">
        <option value="">Todas las categorías</option>
        ${categories.map(c => `<option value="${escapeHtml(c)}" ${productState.category===c?"selected":""}>${escapeHtml(c)}</option>`).join("")}
      </select>
      <select class="filter-select" id="statusFilter">
        <option value="">Todos los estados</option>
        <option value="Activo" ${productState.status==="Activo"?"selected":""}>Activos</option>
        <option value="Inactivo" ${productState.status==="Inactivo"?"selected":""}>Inactivos</option>
      </select>
      <button class="btn btn-secondary" id="clearProductFilters">Limpiar</button>
    </div>

    <div class="data-card">
      <div class="table-wrap">
        <table class="product-table">
          <thead><tr>
            <th>Imagen</th><th>Código</th><th>Producto</th><th>Categoría</th>
            <th>Precio</th><th>Destacado</th><th>Estado</th><th>Acciones</th>
          </tr></thead>
          <tbody>
            ${visible.length ? visible.map(p => `
              <tr>
                <td>${p.imagen ? `<img class="product-thumb" src="${escapeHtml(p.imagen)}" alt="">` : `<div class="product-thumb"></div>`}</td>
                <td><strong>${escapeHtml(p.codigo)}</strong></td>
                <td><div class="product-name">${escapeHtml(p.nombre)}</div><div class="product-sub">${escapeHtml(p.marca || "Sin marca")}</div></td>
                <td>${escapeHtml(p.categoria || "Sin categoría")}</td>
                <td>
                  ${p.descuento ? `<div class="old-price">${money(p.precio)}</div>` : ""}
                  <div class="money">${money(productFinalPrice(p))}</div>
                </td>
                <td>${escapeHtml(p.destacado || "—")}</td>
                <td><span class="status-pill ${p.estado==="Activo"?"active":"inactive"}">● ${escapeHtml(p.estado)}</span></td>
                <td><div class="action-menu">
                  <button class="table-action edit-product" data-code="${escapeHtml(p.codigo)}" title="Editar">✎</button>
                  <button class="table-action toggle-product" data-code="${escapeHtml(p.codigo)}" title="Activar o desactivar">◐</button>
                </div></td>
              </tr>`).join("") :
              `<tr><td colspan="8" class="empty-state-cell"><div class="empty-state"><h3>No encontramos productos</h3><p>Modifica los filtros o registra un producto nuevo.</p></div></td></tr>`
            }
          </tbody>
        </table>
      </div>
      <div class="product-footer">
        <span>Mostrando ${visible.length ? start+1 : 0}–${Math.min(start+visible.length,rows.length)} de ${rows.length} resultados</span>
        <div class="pagination">
          <button class="page-btn" data-page="${Math.max(1,productState.page-1)}">‹</button>
          ${Array.from({length:totalPages},(_,i)=>i+1).map(n=>`<button class="page-btn ${n===productState.page?"active":""}" data-page="${n}">${n}</button>`).join("")}
          <button class="page-btn" data-page="${Math.min(totalPages,productState.page+1)}">›</button>
        </div>
      </div>
    </div>
  </section>
  ${productDrawerHtml()}`;

  bindProductEvents();
}

function productDrawerHtml(){
  return `
  <div class="drawer-overlay" id="productDrawerOverlay"></div>
  <aside class="product-drawer" id="productDrawer">
    <div class="drawer-head">
      <div><h2 id="drawerTitle">Nuevo producto</h2><p>Columnas compatibles con la hoja PRODUCTOS actual.</p></div>
      <button class="drawer-close" id="drawerClose">×</button>
    </div>
    <form id="productForm" class="drawer-body">
      <div class="form-section">
        <h3>Información principal</h3>
        <div class="form-grid">
          <div class="form-group"><label>Código *</label><input name="codigo" required placeholder="Ejemplo: S0010"><span class="help-text">Identificador único utilizado por PRODUCTOS, VARIANTES y MAYOREO.</span></div>
          <div class="form-group"><label>Estado</label><select name="estado"><option>Activo</option><option>Inactivo</option></select></div>
          <div class="form-group full"><label>Nombre *</label><input name="nombre" required maxlength="160"></div>
          <div class="form-group"><label>Marca</label><input name="marca"></div>
          <div class="form-group"><label>Categoría</label><input name="categoria"></div>
          <div class="form-group"><label>Precio *</label><input name="precio" type="number" min="0" step="0.01" required></div>
          <div class="form-group"><label>Descuento en soles</label><input name="descuento" type="number" min="0" step="0.01"></div>
          <div class="form-group"><label>Destacado</label><input name="destacado" placeholder="Nuevo Ingreso, Oferta..."></div>
        </div>
      </div>
      <div class="form-section">
        <h3>Multimedia</h3>
        <div class="form-grid">
          <div class="form-group full"><label>Imagen principal</label><input name="imagen" type="url" placeholder="https://drive.google.com/thumbnail?..."></div>
          <div class="form-group full"><label>Video</label><input name="video" type="url"></div>
        </div>
      </div>
      <div class="form-section">
        <h3>Descripción</h3>
        <div class="form-grid"><div class="form-group full"><label>Descripción del producto</label><textarea name="descripcion"></textarea></div></div>
      </div>
    </form>
    <div class="drawer-footer">
      <button class="btn btn-secondary" id="cancelProduct">Cancelar</button>
      <button class="btn btn-primary" id="saveProduct">Guardar producto</button>
    </div>
  </aside>
  <div class="toast" id="productToast">Producto guardado correctamente</div>`;
}

function bindProductEvents(){
  const search = document.getElementById("productSearch");
  search?.addEventListener("input", e => {productState.search=e.target.value;productState.page=1;renderProducts();});
  document.getElementById("categoryFilter")?.addEventListener("change", e => {productState.category=e.target.value;productState.page=1;renderProducts();});
  document.getElementById("statusFilter")?.addEventListener("change", e => {productState.status=e.target.value;productState.page=1;renderProducts();});
  document.getElementById("clearProductFilters")?.addEventListener("click", () => {productState={...productState,search:"",category:"",status:"",page:1};renderProducts();});
  document.querySelectorAll(".page-btn").forEach(b => b.addEventListener("click",()=>{productState.page=Number(b.dataset.page);renderProducts();}));
  document.getElementById("newProductBtn")?.addEventListener("click",()=>openProductDrawer());
  document.getElementById("drawerClose")?.addEventListener("click",closeProductDrawer);
  document.getElementById("cancelProduct")?.addEventListener("click",closeProductDrawer);
  document.getElementById("productDrawerOverlay")?.addEventListener("click",closeProductDrawer);
  document.getElementById("saveProduct")?.addEventListener("click",saveProductFromForm);
  document.querySelectorAll(".edit-product").forEach(b=>b.addEventListener("click",()=>openProductDrawer(b.dataset.code)));
  document.querySelectorAll(".toggle-product").forEach(b=>b.addEventListener("click",()=>toggleProduct(b.dataset.code)));
}
function openProductDrawer(code=null){
  productState.editingCode=code;
  const drawer=document.getElementById("productDrawer"), overlay=document.getElementById("productDrawerOverlay");
  const form=document.getElementById("productForm");
  form.reset();
  document.getElementById("drawerTitle").textContent=code?"Editar producto":"Nuevo producto";
  if(code){
    const p=products.find(x=>x.codigo===code);
    if(p) Object.keys(p).forEach(k=>{if(form.elements[k]) form.elements[k].value=p[k]??"";});
    form.elements.codigo.readOnly=true;
  }else{
    form.elements.codigo.readOnly=false;
    const next=Math.max(0,...products.map(p=>Number((p.codigo.match(/\d+/)||["0"])[0])))+1;
    form.elements.codigo.value=`S${String(next).padStart(4,"0")}`;
  }
  drawer.classList.add("open");overlay.classList.add("show");
}
function closeProductDrawer(){
  document.getElementById("productDrawer")?.classList.remove("open");
  document.getElementById("productDrawerOverlay")?.classList.remove("show");
}
function saveProductFromForm(){
  const form=document.getElementById("productForm");
  if(!form.reportValidity()) return;
  const data=Object.fromEntries(new FormData(form).entries());
  data.precio=Number(data.precio||0);
  data.descuento=data.descuento?Number(data.descuento):null;
  if(productState.editingCode){
    const index=products.findIndex(p=>p.codigo===productState.editingCode);
    products[index]={...products[index],...data};
  }else{
    if(products.some(p=>p.codigo===data.codigo)){showToast("Ese código ya existe");return;}
    products.unshift({...data});
  }
  localStorage.setItem("sagc_demo_products",JSON.stringify(products));
  closeProductDrawer();renderProducts();setTimeout(()=>showToast("Producto guardado en modo demostración"),30);
}
function toggleProduct(code){
  const p=products.find(x=>x.codigo===code);
  if(!p)return;
  p.estado=p.estado==="Activo"?"Inactivo":"Activo";
  localStorage.setItem("sagc_demo_products",JSON.stringify(products));
  renderProducts();setTimeout(()=>showToast(`Producto ${p.estado.toLowerCase()}`),30);
}
function showToast(message){
  const t=document.getElementById("productToast");
  if(!t)return;
  t.textContent=message;t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2200);
}

const savedDemoProducts=localStorage.getItem("sagc_demo_products");
if(savedDemoProducts){
  try{products=JSON.parse(savedDemoProducts);}catch(e){}
}

document.querySelectorAll(".nav-item").forEach(btn=>{
  btn.dataset.label=btn.querySelector("span:last-child")?.textContent?.trim() || "";
});
const sidebarCollapse=document.getElementById("sidebarCollapse");
const collapsedSaved=localStorage.getItem("sagc_sidebar_collapsed")==="1";
if(collapsedSaved)document.body.classList.add("sidebar-collapsed");
sidebarCollapse?.addEventListener("click",()=>{
  document.body.classList.toggle("sidebar-collapsed");
  localStorage.setItem("sagc_sidebar_collapsed",document.body.classList.contains("sidebar-collapsed")?"1":"0");
});
