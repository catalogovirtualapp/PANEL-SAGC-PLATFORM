
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
  if(key === "dashboard") renderDashboard(); else renderModule(key);
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
