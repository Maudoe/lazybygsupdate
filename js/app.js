// ============ CV Generator ============
// App de un solo archivo de estado (`estado`), sin build ni dependencias:
// el editor de la izquierda escribe directo sobre `estado` y dispara
// renderPreview(), que reconstruye el HTML de `.cv-pagina` (lo único que
// se imprime — ver @media print en css/style.css). Todo persiste solo en
// localStorage de este navegador/perfil; no hay backend.

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

function nuevoId() {
  return "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Escapa texto de usuario antes de meterlo en innerHTML — el contenido es
// siempre local/propio, pero así un "<" suelto en una descripción no rompe
// el layout ni se interpreta como markup.
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
// Igual que esc(), pero además convierte saltos de línea en <br> — para
// párrafos largos (perfil, descripción de un puesto) donde el usuario
// separó ideas con Enter en el <textarea>.
function escPárrafo(str) {
  return esc(str).replace(/\n+/g, "<br>");
}

const ICONO_CONTACTO = {
  telefono: "📞", email: "✉️", ubicacion: "📍", linkedin: "🔗", web: "🌐",
};
const ETIQUETA_TIPO_CONTACTO = {
  telefono: "Teléfono", email: "Email", ubicacion: "Ubicación", linkedin: "LinkedIn", web: "Sitio web",
};

// ---------------- estado por defecto: ejemplo lorem ipsum ----------------
// A propósito NO tiene datos reales de nadie — esto es lo que ve
// cualquiera que clone el repo público. Si existe js/datos-privados.js
// (ignorado por git, ver .gitignore), datosIniciales() usa eso en vez de
// esto — ahí es donde vive tu CV real, sólo en tu copia local.
function estadoPorDefecto() {
  const id = nuevoId;
  const LOREM = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
  const LOREM2 = "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
  return {
    modelo: "modelo1", tema: "turquesa", fuente: "jakarta",
    nombre: "Lorem", apellido: "Ipsum",
    puesto: "Dolor Sit Amet Engineer", subtitulo: "Consectetur+",
    foto: null,
    contacto: [
      { id: id(), tipo: "telefono", etiqueta: "US", valor: "+1 234 567 8900" },
      { id: id(), tipo: "email", etiqueta: "", valor: "lorem.ipsum@example.com" },
      { id: id(), tipo: "ubicacion", etiqueta: "", valor: "Placeholder City, Placeholderland" },
      { id: id(), tipo: "linkedin", etiqueta: "", valor: "linkedin.com/in/lorem-ipsum" },
    ],
    perfil: LOREM + " " + LOREM2,
    habilidades: ["Lorem", "Ipsum Dolor", "Sit Amet", "Consectetur", "Adipiscing Elit", "Sed Do Eiusmod", "Tempor Incididunt", "Ut Labore", "Et Dolore Magna", "Aliqua"].map((texto) => ({ id: id(), texto })),
    blandas: ["Magna Aliqua", "Enim Ad Minim", "Veniam", "Quis Nostrud", "Exercitation", "Ullamco Laboris"].map((texto) => ({ id: id(), texto })),
    idiomas: [
      { id: id(), nombre: "Lorem", nivel: "Native" },
      { id: id(), nombre: "Ipsum", nivel: "Fluent" },
    ],
    educacion: [
      { id: id(), institucion: "Universitas Lorem Ipsum", fecha: "2016 - 2020", bullets: ["Consectetur Adipiscing Elit, cum laude", "Sed do eiusmod tempor incididunt"].map((texto) => ({ id: id(), texto })) },
      { id: id(), institucion: "Instituto Dolor Sit Amet", fecha: "2013 - 2016", bullets: ["Ut enim ad minim veniam"].map((texto) => ({ id: id(), texto })) },
    ],
    referencias: [
      { id: id(), nombre: "Nomen Nescio", rol: "Lorem Corp / Product Owner", email: "nomen.nescio@example.com", linkedin: "linkedin.com/in/nomen-nescio" },
      { id: id(), nombre: "Primus Secundus", rol: "Ipsum Industries / CTO", email: "primus.secundus@example.com", linkedin: "linkedin.com/in/primus-secundus" },
    ],
    logros: [
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.",
      "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt.",
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium.",
      "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.",
    ].map((texto) => ({ id: id(), texto })),
    experiencia: [
      {
        id: id(), empresa: "Lorem Corp", fecha: "JAN 2023 - PRESENT",
        rol: "Senior Consectetur Engineer | Adipiscing & Elit",
        descripcion: LOREM,
        bullets: [
          "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
          "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
          "Nisi ut aliquip ex ea commodo consequat duis aute irure dolor.",
          "In reprehenderit in voluptate velit esse cillum dolore eu fugiat.",
          "Nulla pariatur excepteur sint occaecat cupidatat non proident.",
        ].map((texto) => ({ id: id(), texto })),
        herramientas: [
          { id: id(), etiqueta: "Lorem Tools", valor: "Ipsum, Dolor, Sit" },
          { id: id(), etiqueta: "Amet Frameworks", valor: "Consectetur, Adipiscing" },
          { id: id(), etiqueta: "Collaboration", valor: "Elit, Sed, Eiusmod" },
        ],
      },
      {
        id: id(), empresa: "Ipsum Industries", fecha: "JUN 2020 - DEC 2022",
        rol: "Dolor Sit Amet Specialist",
        descripcion: LOREM2,
        bullets: [
          "Sunt in culpa qui officia deserunt mollit anim id est laborum.",
          "Sed ut perspiciatis unde omnis iste natus error sit voluptatem.",
          "Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis.",
          "Et quasi architecto beatae vitae dicta sunt explicabo nemo enim.",
        ].map((texto) => ({ id: id(), texto })),
        herramientas: [
          { id: id(), etiqueta: "Testing", valor: "Quia, Voluptas, Aspernatur" },
          { id: id(), etiqueta: "Collaboration", valor: "Odit, Fugit, Consequuntur" },
        ],
      },
      {
        id: id(), empresa: "Dolor & Sit Ltd.", fecha: "MAR 2017 - MAY 2020",
        rol: "Junior Amet Analyst",
        descripcion: "Magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet consectetur.",
        bullets: [
          "Adipisci velit, sed quia non numquam eius modi tempora incidunt.",
          "Ut labore et dolore magnam aliquam quaerat voluptatem ut enim.",
          "Ad minima veniam, quis nostrum exercitationem ullam corporis.",
        ].map((texto) => ({ id: id(), texto })),
        herramientas: [
          { id: id(), etiqueta: "Suscipit Laboriosam", valor: "Nisi Ut Aliquid" },
          { id: id(), etiqueta: "Collaboration", valor: "Ex Ea Commodi" },
        ],
      },
    ],
    certificaciones: [
      { id: id(), titulo: "Consilium Lorem Ipsum | 2024", subtitulo: "Certificatio Fundamentorum Dolor Sit Amet" },
      { id: id(), titulo: "Instituto Consectetur | 2021", subtitulo: "Adipiscing Elit Practitioner" },
    ],
  };
}

// Real (js/datos-privados.js, no versionado) si existe, si no el ejemplo
// lorem-ipsum de arriba. Usado tanto en la carga inicial como en
// "Restablecer", así ese botón vuelve al punto de partida correcto según
// dónde se esté corriendo la app (tu copia local vs. el repo público).
function datosIniciales() {
  return window.DATOS_PRIVADOS || estadoPorDefecto();
}

const CLAVE_STORAGE = "cvgen-estado-v1";
let estado = cargarEstado() || datosIniciales();

function cargarEstado() {
  try {
    const crudo = localStorage.getItem(CLAVE_STORAGE);
    return crudo ? JSON.parse(crudo) : null;
  } catch { return null; }
}

let _guardarPendiente = null;
function guardar() {
  const indicador = $("#autoguardado");
  indicador.classList.add("guardando");
  indicador.textContent = "Guardando…";
  clearTimeout(_guardarPendiente);
  _guardarPendiente = setTimeout(() => {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(estado));
    indicador.classList.remove("guardando");
    indicador.textContent = "Guardado";
  }, 260);
}

// ============================================================
// VISTA PREVIA — reconstruye el HTML imprimible desde `estado`.
// Se llama después de CUALQUIER cambio (editor o foto).
// ============================================================
// ---------------- registro de modelos (plantillas) ----------------
// Cada modelo es un layout completo, no sólo un color — por eso cada uno
// tiene su propia función de render en vez de una sola con ifs adentro.
// El editor de la izquierda es SIEMPRE el mismo (ver index.html): un
// modelo nuevo sólo agrega una función acá + su entrada en el <select>
// de index.html — no hace falta tocar ningún campo del editor.
const MODELOS = {
  modelo1: { nombre: "Modelo 1", render: renderModelo1 },
};

function renderPreview() {
  const pagina = $("#cv-pagina");
  pagina.dataset.modelo = estado.modelo || "modelo1";
  pagina.dataset.tema = estado.tema || "turquesa";
  pagina.dataset.fuente = estado.fuente || "jakarta";
  const modelo = MODELOS[estado.modelo] || MODELOS.modelo1;
  modelo.render();
}

// ---- Modelo 1: el layout original (franja lateral + timeline) ----
function renderModelo1() {
  $("#cv-nombre-nombre").textContent = estado.nombre || "Nombre";
  $("#cv-nombre-apellido").textContent = estado.apellido || "Apellido";
  $("#cv-puesto-texto").textContent = estado.puesto || "Puesto";
  $("#cv-puesto-sub").textContent = estado.subtitulo || "";
  $("#cv-puesto-sub-envoltorio").classList.toggle("cv-oculto", !estado.subtitulo);

  const foto = $("#cv-foto"), placeholder = $("#cv-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-lateral-bloques").innerHTML = renderLateralModelo1();
  $("#cv-principal-bloques").innerHTML = renderPrincipalModelo1();
  igualarAlturaLateral();
}

// La franja oscura (columna lateral) casi siempre tiene MENOS contenido
// que la columna principal (la experiencia laboral es mucho más larga que
// contacto+habilidades+idiomas+educación+referencias+logros juntos). En
// pantalla eso no se nota: el grid estira la columna corta para llenar la
// fila. Pero al paginar para imprimir, confirmado con una impresión de
// prueba real (Page.printToPDF), Chrome NO extiende ese estiramiento más
// allá de la página donde el contenido de la columna corta se termina —
// las páginas siguientes quedan con un vacío blanco en vez de franja
// oscura, exactamente donde el CV original la sigue mostrando vacía pero
// oscura. La solución que sí sobrevive la paginación: fijarle un
// min-height EXPLÍCITO en píxeles, igual a la altura real de la columna
// principal — así la caja de la lateral es alta de verdad (no depende de
// que el motor de impresión "adivine" que debería estirarse).
function igualarAlturaLateral() {
  const principal = $("#cv-principal");
  const lateral = $("#cv-lateral");
  lateral.style.minHeight = principal.scrollHeight + "px";
}
// Recalcular una vez más justo antes de imprimir: las fuentes (Google
// Fonts) pueden terminar de cargar después del primer render y cambiar
// levemente la altura del texto — este es el momento que de verdad
// importa (es el que termina en el PDF), así que se vuelve a medir ahí.
window.addEventListener("beforeprint", igualarAlturaLateral);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(igualarAlturaLateral);

function renderLateralModelo1() {
  let html = "";

  if (estado.contacto.length) {
    html += `<div class="cv-lateral-bloque"><h2 class="cv-lateral-titulo">Contacto</h2><ul class="cv-contacto-lista">`;
    for (const c of estado.contacto) {
      const texto = c.etiqueta ? `${esc(c.etiqueta)}: ${esc(c.valor)}` : esc(c.valor);
      html += `<li class="cv-contacto-fila"><span class="cv-contacto-icono">${ICONO_CONTACTO[c.tipo] || "•"}</span><span>${texto}</span></li>`;
    }
    html += `</ul></div>`;
  }

  if (estado.habilidades.length) {
    html += `<div class="cv-lateral-bloque"><h2 class="cv-lateral-titulo">Habilidades</h2><ul class="cv-lista-simple">`;
    html += estado.habilidades.map((h) => `<li>${esc(h.texto)}</li>`).join("");
    html += `</ul></div>`;
  }

  if (estado.blandas.length) {
    html += `<div class="cv-lateral-bloque"><h2 class="cv-lateral-titulo">Habilidades blandas</h2><ul class="cv-lista-simple">`;
    html += estado.blandas.map((h) => `<li>${esc(h.texto)}</li>`).join("");
    html += `</ul></div>`;
  }

  if (estado.idiomas.length) {
    html += `<div class="cv-lateral-bloque"><h2 class="cv-lateral-titulo">Idiomas</h2>`;
    html += estado.idiomas.map((i) => `<div class="cv-idioma-fila"><span class="cv-idioma-nombre">${esc(i.nombre)}</span><span>${esc(i.nivel)}</span></div>`).join("");
    html += `</div>`;
  }

  if (estado.educacion.length) {
    html += `<div class="cv-lateral-bloque"><h2 class="cv-lateral-titulo">Educación</h2>`;
    for (const e of estado.educacion) {
      html += `<div class="cv-edu-item">
        <span class="cv-edu-titulo">${esc(e.institucion)}</span>
        <span class="cv-edu-fecha">${esc(e.fecha)}</span>
        ${e.bullets.length ? `<ul class="cv-lista-simple">${e.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
      </div>`;
    }
    html += `</div>`;
  }

  if (estado.referencias.length) {
    html += `<div class="cv-lateral-bloque"><h2 class="cv-lateral-titulo">Referencias</h2>`;
    for (const r of estado.referencias) {
      html += `<div class="cv-ref-item">
        <span class="cv-ref-nombre">${esc(r.nombre)}</span>
        ${r.rol ? `<span class="cv-ref-rol">${esc(r.rol)}</span>` : ""}
        ${r.email ? `<span class="cv-ref-rol">${esc(r.email)}</span>` : ""}
        ${r.linkedin ? `<span class="cv-ref-rol">${esc(r.linkedin)}</span>` : ""}
      </div>`;
    }
    html += `</div>`;
  }

  if (estado.logros.length) {
    html += `<div class="cv-lateral-bloque"><h2 class="cv-lateral-titulo">Logros</h2><ul class="cv-lista-simple">`;
    html += estado.logros.map((l) => `<li>${esc(l.texto)}</li>`).join("");
    html += `</ul></div>`;
  }

  return html;
}

function renderPrincipalModelo1() {
  let html = "";

  if (estado.perfil.trim()) {
    html += `<div class="cv-bloque-principal"><h2 class="cv-titulo-seccion">Perfil</h2><p class="cv-perfil-texto">${escPárrafo(estado.perfil)}</p></div>`;
  }

  if (estado.experiencia.length) {
    html += `<div class="cv-bloque-principal"><h2 class="cv-titulo-seccion">Experiencia laboral</h2><div class="cv-lista-experiencia">`;
    for (const x of estado.experiencia) {
      html += `<div class="cv-experiencia">
        <div class="cv-experiencia-fila">
          <span class="cv-experiencia-empresa">${esc(x.empresa)}</span>
          ${x.fecha ? `<span class="cv-experiencia-fecha">${esc(x.fecha)}</span>` : ""}
        </div>
        ${x.rol ? `<p class="cv-experiencia-rol">${esc(x.rol)}</p>` : ""}
        ${x.descripcion.trim() ? `<p class="cv-experiencia-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${x.bullets.length ? `<p class="cv-subetiqueta">Key Responsibilities &amp; Achievements:</p><ul class="cv-bullets">${x.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
        ${x.herramientas.length ? `<p class="cv-subetiqueta">Tools &amp; Technologies:</p><ul class="cv-bullets cv-bullets-tools">${x.herramientas.map((h) => `<li>${esc(h.etiqueta)}: <strong>${esc(h.valor)}</strong></li>`).join("")}</ul>` : ""}
      </div>`;
    }
    html += `</div></div>`;
  }

  if (estado.certificaciones.length) {
    html += `<div class="cv-bloque-principal"><h2 class="cv-titulo-seccion">Certificaciones</h2>`;
    for (const c of estado.certificaciones) {
      html += `<div class="cv-cert-item"><span class="cv-cert-titulo">${esc(c.titulo)}</span>${c.subtitulo ? `<span class="cv-cert-sub">${esc(c.subtitulo)}</span>` : ""}</div>`;
    }
    html += `</div>`;
  }

  return html;
}

// ============================================================
// EDITOR — construcción imperativa de cada fila/tarjeta (no se
// re-renderiza todo desde `estado` en cada tecla: eso le haría perder el
// foco al input activo en medio de la escritura). Cada nodo se crea UNA
// vez, sus listeners mutan `estado` directo y disparan renderPreview()+guardar().
// ============================================================

// ---- filas de texto simple (habilidades, blandas, logros) ----
function crearFilaTexto(coleccion, item, contenedor, placeholder) {
  const nodo = $("#tpl-fila-texto").content.firstElementChild.cloneNode(true);
  const input = $(".fila-input", nodo);
  input.value = item.texto;
  input.placeholder = placeholder || "";
  input.addEventListener("input", () => { item.texto = input.value; renderPreview(); guardar(); });
  $(".fila-quitar", nodo).addEventListener("click", () => {
    const i = coleccion.indexOf(item);
    if (i >= 0) coleccion.splice(i, 1);
    nodo.remove();
    renderPreview(); guardar();
  });
  contenedor.appendChild(nodo);
  return nodo;
}

function montarListaSimple(contenedorId, coleccion, placeholder) {
  const contenedor = $(contenedorId);
  contenedor.innerHTML = "";
  coleccion.forEach((item) => crearFilaTexto(coleccion, item, contenedor, placeholder));
}

// ---- contacto: select de tipo + etiqueta opcional + valor ----
function crearFilaContacto(item, contenedor) {
  const fila = document.createElement("div");
  fila.className = "fila-editable";
  fila.innerHTML = `
    <select class="c-tipo">
      ${Object.entries(ETIQUETA_TIPO_CONTACTO).map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}
    </select>
    <input type="text" class="c-etiqueta" placeholder="Etiqueta (ej. AR)" style="max-width:84px">
    <input type="text" class="c-valor" placeholder="Valor">
    <button class="fila-quitar" title="Quitar">✕</button>`;
  $(".c-tipo", fila).value = item.tipo;
  $(".c-etiqueta", fila).value = item.etiqueta || "";
  $(".c-valor", fila).value = item.valor || "";
  $(".c-tipo", fila).addEventListener("change", (e) => { item.tipo = e.target.value; renderPreview(); guardar(); });
  $(".c-etiqueta", fila).addEventListener("input", (e) => { item.etiqueta = e.target.value; renderPreview(); guardar(); });
  $(".c-valor", fila).addEventListener("input", (e) => { item.valor = e.target.value; renderPreview(); guardar(); });
  $(".fila-quitar", fila).addEventListener("click", () => {
    const i = estado.contacto.indexOf(item);
    if (i >= 0) estado.contacto.splice(i, 1);
    fila.remove(); renderPreview(); guardar();
  });
  contenedor.appendChild(fila);
}

// ---- idiomas: nombre + nivel ----
function crearFilaIdioma(item, contenedor) {
  const fila = document.createElement("div");
  fila.className = "fila-editable";
  fila.innerHTML = `
    <input type="text" class="i-nombre" placeholder="Idioma">
    <input type="text" class="i-nivel" placeholder="Nivel" style="max-width:110px">
    <button class="fila-quitar" title="Quitar">✕</button>`;
  $(".i-nombre", fila).value = item.nombre;
  $(".i-nivel", fila).value = item.nivel;
  $(".i-nombre", fila).addEventListener("input", (e) => { item.nombre = e.target.value; renderPreview(); guardar(); });
  $(".i-nivel", fila).addEventListener("input", (e) => { item.nivel = e.target.value; renderPreview(); guardar(); });
  $(".fila-quitar", fila).addEventListener("click", () => {
    const i = estado.idiomas.indexOf(item);
    if (i >= 0) estado.idiomas.splice(i, 1);
    fila.remove(); renderPreview(); guardar();
  });
  contenedor.appendChild(fila);
}

// ---- helper genérico: campo de texto dentro de una tarjeta ----
function campoTarjeta(etiqueta, valor, onInput, multilinea) {
  const envoltorio = document.createElement("div");
  envoltorio.className = "campo";
  const label = document.createElement("label");
  label.textContent = etiqueta;
  const input = document.createElement(multilinea ? "textarea" : "input");
  if (!multilinea) input.type = "text";
  else input.rows = 3;
  input.value = valor || "";
  input.addEventListener("input", () => { onInput(input.value); renderPreview(); guardar(); });
  envoltorio.append(label, input);
  return envoltorio;
}

function botonAgregarSublista(texto, onClick) {
  const btn = document.createElement("button");
  btn.className = "btn btn-linea"; btn.style.marginTop = "6px";
  btn.textContent = texto;
  btn.addEventListener("click", onClick);
  return btn;
}

function encabezadoTarjeta(titulo, onSubir, onBajar, onQuitar) {
  const cab = document.createElement("div");
  cab.className = "tarjeta-entrada-cabecera";
  const t = document.createElement("span");
  t.className = "tarjeta-entrada-titulo";
  t.textContent = titulo;
  const acciones = document.createElement("div");
  acciones.className = "tarjeta-entrada-acciones";
  if (onSubir) { const b = document.createElement("button"); b.textContent = "↑"; b.title = "Subir"; b.addEventListener("click", onSubir); acciones.appendChild(b); }
  if (onBajar) { const b = document.createElement("button"); b.textContent = "↓"; b.title = "Bajar"; b.addEventListener("click", onBajar); acciones.appendChild(b); }
  const bq = document.createElement("button"); bq.textContent = "✕"; bq.title = "Quitar"; bq.className = "quitar"; bq.addEventListener("click", onQuitar);
  acciones.appendChild(bq);
  cab.append(t, acciones);
  return cab;
}

// ---- tarjeta: experiencia laboral (la más completa) ----
function crearTarjetaExperiencia(item, contenedor) {
  const tarjeta = document.createElement("div");
  tarjeta.className = "tarjeta-entrada";

  const refrescarTitulo = () => { titulo.textContent = item.empresa || "Nueva experiencia"; };
  let titulo;

  const mover = (delta) => {
    const arr = estado.experiencia;
    const i = arr.indexOf(item);
    const j = i + delta;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    montarListaExperiencia();
    renderPreview(); guardar();
  };
  const cab = encabezadoTarjeta("", () => mover(-1), () => mover(1), () => {
    const i = estado.experiencia.indexOf(item);
    if (i >= 0) estado.experiencia.splice(i, 1);
    tarjeta.remove(); renderPreview(); guardar();
  });
  titulo = $(".tarjeta-entrada-titulo", cab);
  refrescarTitulo();
  tarjeta.appendChild(cab);

  tarjeta.appendChild(campoTarjeta("Empresa", item.empresa, (v) => { item.empresa = v; refrescarTitulo(); }));
  tarjeta.appendChild(campoTarjeta("Fechas (texto libre, ej. MAY 2021 - MAY 2025)", item.fecha, (v) => { item.fecha = v; }));
  tarjeta.appendChild(campoTarjeta("Rol / subtítulo", item.rol, (v) => { item.rol = v; }));
  tarjeta.appendChild(campoTarjeta("Descripción", item.descripcion, (v) => { item.descripcion = v; }, true));

  const etBullets = document.createElement("p"); etBullets.className = "sublista-etiqueta"; etBullets.textContent = "Responsabilidades y logros";
  const contBullets = document.createElement("div"); contBullets.className = "editor-lista";
  tarjeta.append(etBullets, contBullets);
  item.bullets.forEach((b) => crearFilaTexto(item.bullets, b, contBullets, "Responsabilidad o logro"));
  tarjeta.appendChild(botonAgregarSublista("+ Agregar responsabilidad", () => {
    const b = { id: nuevoId(), texto: "" };
    item.bullets.push(b);
    const nodo = crearFilaTexto(item.bullets, b, contBullets, "Responsabilidad o logro");
    $(".fila-input", nodo).focus();
    renderPreview(); guardar();
  }));

  const etHerr = document.createElement("p"); etHerr.className = "sublista-etiqueta"; etHerr.textContent = "Herramientas y tecnologías";
  const contHerr = document.createElement("div"); contHerr.className = "editor-lista";
  tarjeta.append(etHerr, contHerr);
  const crearFilaHerr = (h) => {
    const fila = document.createElement("div"); fila.className = "fila-editable";
    fila.innerHTML = `<input type="text" class="h-etq" placeholder="Categoría (ej. API Testing)" style="max-width:150px"><input type="text" class="h-val" placeholder="Herramientas"><button class="fila-quitar" title="Quitar">✕</button>`;
    $(".h-etq", fila).value = h.etiqueta; $(".h-val", fila).value = h.valor;
    $(".h-etq", fila).addEventListener("input", (e) => { h.etiqueta = e.target.value; renderPreview(); guardar(); });
    $(".h-val", fila).addEventListener("input", (e) => { h.valor = e.target.value; renderPreview(); guardar(); });
    $(".fila-quitar", fila).addEventListener("click", () => {
      const i = item.herramientas.indexOf(h);
      if (i >= 0) item.herramientas.splice(i, 1);
      fila.remove(); renderPreview(); guardar();
    });
    contHerr.appendChild(fila);
    return fila;
  };
  item.herramientas.forEach(crearFilaHerr);
  tarjeta.appendChild(botonAgregarSublista("+ Agregar categoría de herramientas", () => {
    const h = { id: nuevoId(), etiqueta: "", valor: "" };
    item.herramientas.push(h);
    const fila = crearFilaHerr(h);
    $(".h-etq", fila).focus();
    renderPreview(); guardar();
  }));

  contenedor.appendChild(tarjeta);
}

function montarListaExperiencia() {
  const cont = $("#lista-experiencia");
  cont.innerHTML = "";
  estado.experiencia.forEach((item) => crearTarjetaExperiencia(item, cont));
}

// ---- tarjeta: educación (institución + fecha + bullets) ----
function crearTarjetaEducacion(item, contenedor) {
  const tarjeta = document.createElement("div"); tarjeta.className = "tarjeta-entrada";
  let titulo;
  const refrescarTitulo = () => { titulo.textContent = item.institucion || "Nuevo estudio"; };
  const cab = encabezadoTarjeta("", null, null, () => {
    const i = estado.educacion.indexOf(item);
    if (i >= 0) estado.educacion.splice(i, 1);
    tarjeta.remove(); renderPreview(); guardar();
  });
  titulo = $(".tarjeta-entrada-titulo", cab); refrescarTitulo();
  tarjeta.appendChild(cab);
  tarjeta.appendChild(campoTarjeta("Institución", item.institucion, (v) => { item.institucion = v; refrescarTitulo(); }));
  tarjeta.appendChild(campoTarjeta("Fecha (ej. 2016 - 2018)", item.fecha, (v) => { item.fecha = v; }));

  const et = document.createElement("p"); et.className = "sublista-etiqueta"; et.textContent = "Detalle (opcional)";
  const cont = document.createElement("div"); cont.className = "editor-lista";
  tarjeta.append(et, cont);
  item.bullets.forEach((b) => crearFilaTexto(item.bullets, b, cont, "Detalle"));
  tarjeta.appendChild(botonAgregarSublista("+ Agregar detalle", () => {
    const b = { id: nuevoId(), texto: "" };
    item.bullets.push(b);
    const nodo = crearFilaTexto(item.bullets, b, cont, "Detalle");
    $(".fila-input", nodo).focus();
    renderPreview(); guardar();
  }));
  contenedor.appendChild(tarjeta);
}
function montarListaEducacion() {
  const cont = $("#lista-educacion"); cont.innerHTML = "";
  estado.educacion.forEach((item) => crearTarjetaEducacion(item, cont));
}

// ---- tarjeta: certificación (título + subtítulo) ----
function crearTarjetaCertificacion(item, contenedor) {
  const tarjeta = document.createElement("div"); tarjeta.className = "tarjeta-entrada";
  let titulo;
  const refrescarTitulo = () => { titulo.textContent = item.titulo || "Nueva certificación"; };
  const cab = encabezadoTarjeta("", null, null, () => {
    const i = estado.certificaciones.indexOf(item);
    if (i >= 0) estado.certificaciones.splice(i, 1);
    tarjeta.remove(); renderPreview(); guardar();
  });
  titulo = $(".tarjeta-entrada-titulo", cab); refrescarTitulo();
  tarjeta.appendChild(cab);
  tarjeta.appendChild(campoTarjeta("Título (institución | año)", item.titulo, (v) => { item.titulo = v; refrescarTitulo(); }));
  tarjeta.appendChild(campoTarjeta("Subtítulo / detalle", item.subtitulo, (v) => { item.subtitulo = v; }));
  contenedor.appendChild(tarjeta);
}
function montarListaCertificaciones() {
  const cont = $("#lista-certificaciones"); cont.innerHTML = "";
  estado.certificaciones.forEach((item) => crearTarjetaCertificacion(item, cont));
}

// ---- tarjeta: referencia ----
function crearTarjetaReferencia(item, contenedor) {
  const tarjeta = document.createElement("div"); tarjeta.className = "tarjeta-entrada";
  let titulo;
  const refrescarTitulo = () => { titulo.textContent = item.nombre || "Nueva referencia"; };
  const cab = encabezadoTarjeta("", null, null, () => {
    const i = estado.referencias.indexOf(item);
    if (i >= 0) estado.referencias.splice(i, 1);
    tarjeta.remove(); renderPreview(); guardar();
  });
  titulo = $(".tarjeta-entrada-titulo", cab); refrescarTitulo();
  tarjeta.appendChild(cab);
  tarjeta.appendChild(campoTarjeta("Nombre", item.nombre, (v) => { item.nombre = v; refrescarTitulo(); }));
  tarjeta.appendChild(campoTarjeta("Rol / empresa", item.rol, (v) => { item.rol = v; }));
  tarjeta.appendChild(campoTarjeta("Email", item.email, (v) => { item.email = v; }));
  tarjeta.appendChild(campoTarjeta("LinkedIn", item.linkedin, (v) => { item.linkedin = v; }));
  contenedor.appendChild(tarjeta);
}
function montarListaReferencias() {
  const cont = $("#lista-referencias"); cont.innerHTML = "";
  estado.referencias.forEach((item) => crearTarjetaReferencia(item, cont));
}

// ============================================================
// arranque: enlazar campos simples del encabezado, montar listas,
// botones "+ Agregar", foto (drag&drop + click), imprimir, restablecer.
//
// poblarDesdeEstado() reconstruye TODO el editor a partir de `estado` —
// se llama al cargar la página y de nuevo tras "Restablecer" (que
// reemplaza `estado` entero). Los listeners de los controles ESTÁTICOS
// (botones "+ Agregar", dropzone de foto, imprimir, restablecer) se
// bindean una sola vez al final del archivo: si vivieran adentro de
// poblarDesdeEstado(), cada "Restablecer" agregaría un listener nuevo
// encima de los viejos y un click terminaría disparando la acción varias
// veces.
// ============================================================
function enlazarCampoSimple(inputId, clave) {
  const input = $(inputId);
  input.value = estado[clave] || "";
  input.oninput = () => { estado[clave] = input.value; renderPreview(); guardar(); };
}

function poblarDesdeEstado() {
  enlazarCampoSimple("#in-modelo", "modelo");
  enlazarCampoSimple("#in-tema", "tema");
  enlazarCampoSimple("#in-fuente", "fuente");
  enlazarCampoSimple("#in-nombre", "nombre");
  enlazarCampoSimple("#in-apellido", "apellido");
  enlazarCampoSimple("#in-titulo", "puesto");
  enlazarCampoSimple("#in-subtitulo", "subtitulo");
  enlazarCampoSimple("#in-perfil", "perfil");

  montarListaSimple("#lista-habilidades", estado.habilidades, "Habilidad");
  montarListaSimple("#lista-blandas", estado.blandas, "Habilidad blanda");
  montarListaSimple("#lista-logros", estado.logros, "Logro");

  const contCont = $("#lista-contacto"); contCont.innerHTML = "";
  estado.contacto.forEach((c) => crearFilaContacto(c, contCont));

  const contIdi = $("#lista-idiomas"); contIdi.innerHTML = "";
  estado.idiomas.forEach((i) => crearFilaIdioma(i, contIdi));

  montarListaExperiencia();
  montarListaEducacion();
  montarListaCertificaciones();
  montarListaReferencias();

  // la vista previa de la foto y su botón "Quitar" dependen del estado
  // actual — se resincronizan acá porque poblarDesdeEstado() también
  // corre después de "Restablecer" (foto = null en el CV de ejemplo).
  const vistaFoto = $("#foto-vista-previa"), btnQuitarFoto = $("#btn-quitar-foto");
  if (estado.foto) { vistaFoto.innerHTML = `<img src="${estado.foto}" alt="">`; btnQuitarFoto.classList.remove("oculto"); }
  else { vistaFoto.innerHTML = `<span class="campo-dropzone-icono">🖼️</span>`; btnQuitarFoto.classList.add("oculto"); }

  renderPreview();
}

// ---- controles estáticos: se bindean UNA sola vez, nunca dentro de
// poblarDesdeEstado() (ver comentario más arriba). ----
function bindearControlesEstaticos() {
  $$("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      switch (btn.dataset.add) {
        case "habilidades": { const it = { id: nuevoId(), texto: "" }; estado.habilidades.push(it); const n = crearFilaTexto(estado.habilidades, it, $("#lista-habilidades"), "Habilidad"); $(".fila-input", n).focus(); break; }
        case "blandas": { const it = { id: nuevoId(), texto: "" }; estado.blandas.push(it); const n = crearFilaTexto(estado.blandas, it, $("#lista-blandas"), "Habilidad blanda"); $(".fila-input", n).focus(); break; }
        case "logros": { const it = { id: nuevoId(), texto: "" }; estado.logros.push(it); const n = crearFilaTexto(estado.logros, it, $("#lista-logros"), "Logro"); $(".fila-input", n).focus(); break; }
        case "contacto": { const it = { id: nuevoId(), tipo: "telefono", etiqueta: "", valor: "" }; estado.contacto.push(it); crearFilaContacto(it, $("#lista-contacto")); break; }
        case "idiomas": { const it = { id: nuevoId(), nombre: "", nivel: "" }; estado.idiomas.push(it); crearFilaIdioma(it, $("#lista-idiomas")); break; }
        case "experiencia": { estado.experiencia.push({ id: nuevoId(), empresa: "", fecha: "", rol: "", descripcion: "", bullets: [], herramientas: [] }); montarListaExperiencia(); break; }
        case "educacion": { estado.educacion.push({ id: nuevoId(), institucion: "", fecha: "", bullets: [] }); montarListaEducacion(); break; }
        case "certificaciones": { estado.certificaciones.push({ id: nuevoId(), titulo: "", subtitulo: "" }); montarListaCertificaciones(); break; }
        case "referencias": { estado.referencias.push({ id: nuevoId(), nombre: "", rol: "", email: "", linkedin: "" }); montarListaReferencias(); break; }
      }
      renderPreview(); guardar();
    });
  });

  // ---- foto: drag&drop + click para elegir archivo ----
  const dropzone = $("#foto-dropzone"), inputFoto = $("#foto-input"), vistaFoto = $("#foto-vista-previa"), btnQuitarFoto = $("#btn-quitar-foto");
  const cargarArchivoFoto = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const lector = new FileReader();
    lector.onload = () => {
      estado.foto = lector.result;
      vistaFoto.innerHTML = `<img src="${lector.result}" alt="">`;
      btnQuitarFoto.classList.remove("oculto");
      renderPreview(); guardar();
    };
    lector.readAsDataURL(file);
  };
  inputFoto.addEventListener("change", () => cargarArchivoFoto(inputFoto.files[0]));
  ["dragenter", "dragover"].forEach((ev) => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("sobre-arrastre"); }));
  ["dragleave", "drop"].forEach((ev) => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove("sobre-arrastre"); }));
  dropzone.addEventListener("drop", (e) => cargarArchivoFoto(e.dataTransfer.files[0]));
  btnQuitarFoto.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    estado.foto = null;
    vistaFoto.innerHTML = `<span class="campo-dropzone-icono">🖼️</span>`;
    btnQuitarFoto.classList.add("oculto");
    inputFoto.value = "";
    renderPreview(); guardar();
  });

  $("#btn-imprimir").addEventListener("click", () => window.print());
  $("#btn-restablecer").addEventListener("click", () => {
    if (!confirm("Esto reemplaza todo el contenido actual por el CV de ejemplo. ¿Seguir?")) return;
    localStorage.removeItem(CLAVE_STORAGE);
    estado = datosIniciales();
    poblarDesdeEstado();
    guardar();
  });
}

bindearControlesEstaticos();
poblarDesdeEstado();
