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

function iconoDe(tipo) {
  const pack = PAQUETES_ICONOS[estado.iconos] || PAQUETES_ICONOS.emoji1;
  return pack.iconos[tipo] ?? "•";
}

const ETIQUETA_TIPO_CONTACTO = {
  telefono: "Teléfono", email: "Email", ubicacion: "Ubicación", linkedin: "LinkedIn", web: "Sitio web",
};

// ---------------- packs de íconos de contacto (10 opciones) ----------------
// Ojo con un límite real: los emoji son glifos a todo color (no son
// vectores monocromos) — CSS `color` no les pega nada, así que NO seguían
// el tema elegido (se quedaban rosa/celeste "de fábrica" aunque el tema
// fuera bordó). Los packs "Símbolo" de acá abajo usan caracteres Unicode
// de texto (sin variante emoji) en vez de emoji — esos SÍ heredan el
// color del tema porque el navegador los dibuja como texto normal.
const PAQUETES_ICONOS = {
  emoji1: { nombre: "Emoji clásico", iconos: { telefono: "📞", email: "✉️", ubicacion: "📍", linkedin: "🔗", web: "🌐" } },
  emoji2: { nombre: "Emoji teléfono fijo", iconos: { telefono: "☎️", email: "📧", ubicacion: "📌", linkedin: "💼", web: "🌍" } },
  emoji3: { nombre: "Emoji chat", iconos: { telefono: "💬", email: "📨", ubicacion: "🏠", linkedin: "👤", web: "🔗" } },
  emoji4: { nombre: "Emoji redondeado", iconos: { telefono: "📱", email: "📩", ubicacion: "🗺️", linkedin: "🌐", web: "💻" } },
  simbolo1: { nombre: "Símbolo — se adapta al tema", iconos: { telefono: "☎", email: "✉", ubicacion: "⚑", linkedin: "in", web: "◎" } },
  simbolo2: { nombre: "Símbolo geométrico", iconos: { telefono: "◆", email: "▣", ubicacion: "●", linkedin: "in", web: "◈" } },
  simbolo3: { nombre: "Símbolo minimal", iconos: { telefono: "—", email: "@", ubicacion: "•", linkedin: "in", web: "www" } },
  simbolo4: { nombre: "Símbolo flechas", iconos: { telefono: "▸", email: "▸", ubicacion: "▸", linkedin: "▸", web: "▸" } },
  letras: { nombre: "Iniciales (Tel / Mail / Dir)", iconos: { telefono: "Tel", email: "Mail", ubicacion: "Dir", linkedin: "in", web: "Web" } },
  sinIcono: { nombre: "Sin ícono", iconos: { telefono: "", email: "", ubicacion: "", linkedin: "", web: "" } },
};

// ---------------- combinaciones de fuente (30 opciones) ----------------
// Cada valor de titulos/cuerpo es directamente lo que termina en
// --cv-font-titulos/--cv-font-cuerpo (JS las pisa en renderPreview, no
// hay una regla CSS por combinación — con 30 sería un quilombo de
// mantener en paralelo). `familias` son los segmentos que arman la URL de
// Google Fonts — se juntan TODOS (de las 30) en un único <link>, cargado
// una sola vez al arrancar, así cambiar de combinación es instantáneo.
const FUENTES = {
  jakarta:      { nombre: "Plus Jakarta Sans + Inter — moderna", titulos: '"Plus Jakarta Sans", sans-serif', cuerpo: '"Inter", sans-serif', familias: ["Plus+Jakarta+Sans:wght@700;800", "Inter:wght@400;500;600;700"] },
  montserrat:   { nombre: "Montserrat + Source Sans 3 — clásica", titulos: '"Montserrat", sans-serif', cuerpo: '"Source Sans 3", sans-serif', familias: ["Montserrat:wght@700;800", "Source+Sans+3:wght@400;500;600;700"] },
  editorial:    { nombre: "Playfair Display + Karla — editorial", titulos: '"Playfair Display", serif', cuerpo: '"Karla", sans-serif', familias: ["Playfair+Display:wght@700;800", "Karla:wght@400;500;600;700"] },
  sora:         { nombre: "Sora + IBM Plex Sans — técnica", titulos: '"Sora", sans-serif', cuerpo: '"IBM Plex Sans", sans-serif', familias: ["Sora:wght@600;700", "IBM+Plex+Sans:wght@400;500;600;700"] },
  poppins:      { nombre: "Poppins + Mulish — redondeada", titulos: '"Poppins", sans-serif', cuerpo: '"Mulish", sans-serif', familias: ["Poppins:wght@700;800", "Mulish:wght@400;500;600;700"] },
  raleway:      { nombre: "Raleway + Lato — elegante", titulos: '"Raleway", sans-serif', cuerpo: '"Lato", sans-serif', familias: ["Raleway:wght@700;800", "Lato:wght@400;700"] },
  oswald:       { nombre: "Oswald + Open Sans — condensada", titulos: '"Oswald", sans-serif', cuerpo: '"Open Sans", sans-serif', familias: ["Oswald:wght@600;700", "Open+Sans:wght@400;600;700"] },
  merriweather: { nombre: "Merriweather + Work Sans — cálida", titulos: '"Merriweather", serif', cuerpo: '"Work Sans", sans-serif', familias: ["Merriweather:wght@700;900", "Work+Sans:wght@400;500;600;700"] },
  archivo:      { nombre: "Archivo Black + Archivo — bold", titulos: '"Archivo Black", sans-serif', cuerpo: '"Archivo", sans-serif', familias: ["Archivo+Black", "Archivo:wght@400;500;600;700"] },
  dmserif:      { nombre: "DM Serif Display + DM Sans — contemporánea", titulos: '"DM Serif Display", serif', cuerpo: '"DM Sans", sans-serif', familias: ["DM+Serif+Display", "DM+Sans:wght@400;500;600;700"] },
  spacegrotesk: { nombre: "Space Grotesk + Inter — startup", titulos: '"Space Grotesk", sans-serif', cuerpo: '"Inter", sans-serif', familias: ["Space+Grotesk:wght@600;700"] },
  lora:         { nombre: "Lora + Nunito Sans — editorial cálida", titulos: '"Lora", serif', cuerpo: '"Nunito Sans", sans-serif', familias: ["Lora:wght@600;700", "Nunito+Sans:wght@400;500;600;700"] },
  bitter:       { nombre: "Bitter + Rubik — seria y amigable", titulos: '"Bitter", serif', cuerpo: '"Rubik", sans-serif', familias: ["Bitter:wght@700;800", "Rubik:wght@400;500;600;700"] },
  baskerville:  { nombre: "Libre Baskerville + PT Sans — académica", titulos: '"Libre Baskerville", serif', cuerpo: '"PT Sans", sans-serif', familias: ["Libre+Baskerville:wght@700", "PT+Sans:wght@400;700"] },
  josefin:      { nombre: "Josefin Sans + Quicksand — amigable", titulos: '"Josefin Sans", sans-serif', cuerpo: '"Quicksand", sans-serif', familias: ["Josefin+Sans:wght@600;700", "Quicksand:wght@400;500;600;700"] },
  anton:        { nombre: "Anton + Roboto — alto impacto", titulos: '"Anton", sans-serif', cuerpo: '"Roboto", sans-serif', familias: ["Anton", "Roboto:wght@400;500;700"] },
  cormorant:    { nombre: "Cormorant Garamond + Jost — lujo", titulos: '"Cormorant Garamond", serif', cuerpo: '"Jost", sans-serif', familias: ["Cormorant+Garamond:wght@600;700", "Jost:wght@400;500;600;700"] },
  barlow:       { nombre: "Barlow Semi Condensed + Barlow — uniforme", titulos: '"Barlow Semi Condensed", sans-serif', cuerpo: '"Barlow", sans-serif', familias: ["Barlow+Semi+Condensed:wght@600;700", "Barlow:wght@400;500;600;700"] },
  abril:        { nombre: "Abril Fatface + Mulish — dramática", titulos: '"Abril Fatface", serif', cuerpo: '"Mulish", sans-serif', familias: ["Abril+Fatface"] },
  teko:         { nombre: "Teko + Noto Sans — deportiva", titulos: '"Teko", sans-serif', cuerpo: '"Noto Sans", sans-serif', familias: ["Teko:wght@600;700", "Noto+Sans:wght@400;500;600;700"] },
  crimson:      { nombre: "Crimson Text + Karla — literaria", titulos: '"Crimson Text", serif', cuerpo: '"Karla", sans-serif', familias: ["Crimson+Text:wght@600;700"] },
  exo2:         { nombre: "Exo 2 — futurista", titulos: '"Exo 2", sans-serif', cuerpo: '"Exo 2", sans-serif', familias: ["Exo+2:wght@400;500;600;700;800"] },
  redhat:       { nombre: "Red Hat Display + Red Hat Text — corporativa", titulos: '"Red Hat Display", sans-serif', cuerpo: '"Red Hat Text", sans-serif', familias: ["Red+Hat+Display:wght@700;800", "Red+Hat+Text:wght@400;500;600;700"] },
  syne:         { nombre: "Syne + Inter — creativa", titulos: '"Syne", sans-serif', cuerpo: '"Inter", sans-serif', familias: ["Syne:wght@700;800"] },
  manrope:      { nombre: "Manrope — minimal moderna", titulos: '"Manrope", sans-serif', cuerpo: '"Manrope", sans-serif', familias: ["Manrope:wght@400;500;600;700;800"] },
  fraunces:     { nombre: "Fraunces + Inter — editorial con carácter", titulos: '"Fraunces", serif', cuerpo: '"Inter", sans-serif', familias: ["Fraunces:wght@600;700"] },
  bebas:        { nombre: "Bebas Neue + Roboto — marketing", titulos: '"Bebas Neue", sans-serif', cuerpo: '"Roboto", sans-serif', familias: ["Bebas+Neue"] },
  outfit:       { nombre: "Outfit — SaaS moderno", titulos: '"Outfit", sans-serif', cuerpo: '"Outfit", sans-serif', familias: ["Outfit:wght@400;500;600;700;800"] },
  cabin:        { nombre: "Cabin — amigable simple", titulos: '"Cabin", sans-serif', cuerpo: '"Cabin", sans-serif', familias: ["Cabin:wght@400;500;600;700"] },
  zillaslab:    { nombre: "Zilla Slab + Work Sans — slab profesional", titulos: '"Zilla Slab", serif', cuerpo: '"Work Sans", sans-serif', familias: ["Zilla+Slab:wght@600;700"] },
};

// Todas las familias de las 30 combinaciones, en un único <link> inyectado
// una sola vez al cargar — así cambiar de combinación en el dropdown es
// instantáneo (la fuente ya está cargada), sin ir a buscar nada a la red
// en el momento. Es un proyecto chico de un solo usuario: no vale la pena
// la complejidad de cargar fuentes bajo demanda para ahorrar unos KB.
(function inyectarGoogleFonts() {
  const familias = new Set();
  Object.values(FUENTES).forEach((f) => f.familias.forEach((seg) => familias.add(seg)));
  const href = "https://fonts.googleapis.com/css2?" + [...familias].map((f) => `family=${f}`).join("&") + "&display=swap";
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
})();

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
    modelo: "modelo1", tema: "turquesa", fuente: "jakarta", iconos: "emoji1", colorOscuro: "#16191e", colorClaro: "#ffffff", escalaFoto: 1, escalaIconos: 1,
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
  modelo2: { nombre: "Modelo 2", render: renderModelo2 },
};

function renderPreview() {
  const pagina = $("#cv-pagina");
  pagina.dataset.modelo = estado.modelo || "modelo1";
  pagina.dataset.tema = estado.tema || "turquesa";
  pagina.dataset.fuente = estado.fuente || "jakarta"; // sólo para inspeccionar en devtools, el efecto real es el setProperty de abajo
  const fdata = FUENTES[estado.fuente] || FUENTES.jakarta;
  pagina.style.setProperty("--cv-font-titulos", fdata.titulos);
  pagina.style.setProperty("--cv-font-cuerpo", fdata.cuerpo);
  // color de fondo oscuro/claro: a diferencia de tema (presets fijos por
  // atributo), acá el usuario puede elegir CUALQUIER color, así que se
  // pisa la variable directo por JS en vez de necesitar una regla CSS
  // nueva por cada color posible. Aplica a todos los modelos por igual
  // (los dos usan las mismas variables para su franja oscura/cuerpo claro).
  pagina.style.setProperty("--cv-lateral-fondo", estado.colorOscuro || "#16191e");
  pagina.style.setProperty("--cv-fondo-cuerpo", estado.colorClaro || "#ffffff");
  // agrandar/achicar de verdad (cambia el tamaño real de la foto/ícono en
  // el documento, no es un zoom de cámara/recorte) — ver los botones +/-
  // en el editor y ajustarEscala() más abajo.
  pagina.style.setProperty("--cv-escala-foto", estado.escalaFoto ?? 1);
  pagina.style.setProperty("--cv-escala-iconos", estado.escalaIconos ?? 1);
  const modelo = MODELOS[estado.modelo] || MODELOS.modelo1;
  modelo.render();
}

// ---- Modelo 1: el layout original (franja lateral + timeline) ----
// El esqueleto (los contenedores con id fijo que el resto de las
// funciones de este modelo van llenando) se arma UNA sola vez — no en
// cada tecla que se tipea — y sólo se vuelve a armar si el modelo activo
// cambió (por ejemplo, si el usuario estaba en el Modelo 2 y volvió a
// este). Recrear el <img> de la foto en cada letra tipeada haría
// parpadear la imagen sin necesidad.
function asegurarEsqueletoModelo1() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo1") return;
  pagina.dataset.esqueleto = "modelo1";
  pagina.innerHTML = `
    <div class="cv-columna-lateral" id="cv-lateral">
      <div class="cv-foto-marco">
        <img class="cv-foto" id="cv-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-foto-placeholder" id="cv-foto-placeholder">🙂</div>
      </div>
      <div class="cv-lateral-bloques" id="cv-lateral-bloques"></div>
    </div>
    <div class="cv-columna-principal" id="cv-principal">
      <div class="cv-encabezado">
        <h1 class="cv-nombre">
          <span id="cv-nombre-nombre">Nombre</span> <span class="cv-nombre-acento" id="cv-nombre-apellido">Apellido</span>
        </h1>
        <p class="cv-puesto"><span id="cv-puesto-texto">Puesto</span><span id="cv-puesto-sub-envoltorio"> | <span id="cv-puesto-sub"></span></span></p>
      </div>
      <div id="cv-principal-bloques"></div>
    </div>
  `;
}

function renderModelo1() {
  asegurarEsqueletoModelo1();
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
// Misma lógica para cualquier par columna-corta/columna-larga — el
// Modelo 2 también tiene una columna oscura (la de la izquierda, con
// Skills/Languages) que necesita el mismo arreglo: sin esto, en la
// segunda página en adelante esa columna se corta a blanco apenas se le
// termina el contenido, en vez de seguir oscura como el Modelo 1
// (mismo bug, mismo fix — ver el comentario largo de arriba... movido
// acá abajo para no repetirlo dos veces).
function igualarAlturaLateral() {
  igualarAlturaPar("#cv-principal", "#cv-lateral");
  igualarAlturaPar("#cv-m2-col-der", "#cv-m2-col-izq");
}
function igualarAlturaPar(idLargo, idCorto) {
  const largo = $(idLargo);
  const corto = $(idCorto);
  // Sólo existen si ese modelo está activo (el otro modelo arma su
  // propio esqueleto, sin estos ids) — sin este guard, imprimir estando
  // en otro modelo tiraba un error acá.
  if (!largo || !corto) return;
  corto.style.minHeight = largo.scrollHeight + "px";
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
      html += `<li class="cv-contacto-fila"><span class="cv-contacto-icono">${iconoDe(c.tipo)}</span><span>${texto}</span></li>`;
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

// ---- Modelo 2: banner oscuro arriba (foto + nombre + contacto) con
// borde ondulado, dos columnas blancas debajo (skills/idiomas a la
// izquierda, experiencia/educación a la derecha con títulos en cápsula
// de color) ----
//
// No todas las secciones del editor tienen un lugar en este layout —
// "Referencias" y "Logros" no aparecen acá (el diseño de referencia no
// tiene espacio para eso) — es esperable que cada modelo muestre un
// subconjunto distinto de tus datos, no un error. Nada se pierde: sigue
// estando en el editor y en el Modelo 1.
// Traza una onda sinusoidal como puntos "L" de SVG. Se probaron versiones
// con más amplitud y con "cintas" de ancho variable — pedido explícito
// después de verlas: quedaban demasiado agresivas/en zigzag, "tiene que
// ser más sutil". Esta es la versión calma: 3 ciclos (como se pidió) pero
// con poca amplitud y muchos puntos (160) para que la curva se vea
// redondeada de verdad y no facetada.
function trazoOnda(ancho, ciclos, amplitud, centro, fase = 0, pasos = 160) {
  const puntos = [];
  for (let i = 0; i <= pasos; i++) {
    const x = (ancho / pasos) * i;
    const y = centro + amplitud * Math.sin((i / pasos) * ciclos * Math.PI * 2 + fase);
    puntos.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return puntos.join(" L");
}

function asegurarEsqueletoModelo2() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo2") return;
  pagina.dataset.esqueleto = "modelo2";
  // La onda principal define el recorte blanco (el límite real entre la
  // franja oscura y el cuerpo). Las otras dos son puramente decorativas,
  // encimadas encima — cada una con su propio ciclo/amplitud/fase (no
  // copias idénticas: "tienen que ser irregulares") y bien menos opacas
  // hacia atrás, para que se lea como niebla de varias ondas superpuestas
  // en vez de una sola línea gruesa.
  const ondaPrincipal = trazoOnda(1000, 3, 9, 16);
  const ondaFondo1 = trazoOnda(1000, 2.4, 7, 13, 1.1);
  const ondaFondo2 = trazoOnda(1000, 3.6, 11, 20, -0.7);
  pagina.innerHTML = `
    <div class="cv-m2-header">
      <div class="cv-m2-foto-marco">
        <img class="cv-m2-foto" id="cv-m2-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m2-foto-placeholder" id="cv-m2-foto-placeholder">🙂</div>
      </div>
      <div class="cv-m2-nombre-bloque">
        <h1 class="cv-m2-nombre">
          <span class="cv-m2-nombre-1" id="cv-m2-nombre-nombre">Nombre</span><br>
          <span class="cv-m2-nombre-2" id="cv-m2-nombre-apellido">Apellido</span>
        </h1>
        <p class="cv-m2-puesto" id="cv-m2-puesto">Puesto</p>
      </div>
      <ul class="cv-m2-contacto" id="cv-m2-contacto"></ul>
    </div>
    <div class="cv-m2-cuerpo">
      <div class="cv-m2-col-izq" id="cv-m2-col-izq"></div>
      <div class="cv-m2-col-der-envoltorio">
        <!-- La ola sólo cubre el ancho de esta columna, no la página
             entera — pedido explícito: la columna de la izquierda tiene
             que seguir oscura como el header (misma franja continua, sin
             costura), la ola separa nada más el header de la columna
             BLANCA de la derecha. -->
        <svg class="cv-m2-ola" viewBox="0 0 1000 50" preserveAspectRatio="none">
          <path d="M${ondaPrincipal} L1000,50 L0,50 Z" style="fill:var(--cv-fondo-cuerpo);"></path>
          <path d="M${ondaFondo2}" style="fill:none; stroke:var(--cv-acento); stroke-width:1.2; stroke-linecap:round; opacity:0.28;"></path>
          <path d="M${ondaFondo1}" style="fill:none; stroke:var(--cv-acento); stroke-width:2.6; stroke-linecap:round; opacity:0.5;"></path>
          <path d="M${ondaPrincipal}" style="fill:none; stroke:var(--cv-acento); stroke-width:4; stroke-linecap:round;"></path>
        </svg>
        <div class="cv-m2-col-der" id="cv-m2-col-der"></div>
      </div>
    </div>
  `;
}

function renderModelo2() {
  asegurarEsqueletoModelo2();
  $("#cv-m2-nombre-nombre").textContent = (estado.nombre || "Nombre").toUpperCase();
  $("#cv-m2-nombre-apellido").textContent = (estado.apellido || "Apellido").toUpperCase();
  $("#cv-m2-puesto").textContent = [estado.puesto, estado.subtitulo].filter(Boolean).join(" | ") || "Puesto";

  const foto = $("#cv-m2-foto"), placeholder = $("#cv-m2-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m2-contacto").innerHTML = estado.contacto.map((c) => {
    const texto = c.etiqueta ? `${esc(c.etiqueta)}: ${esc(c.valor)}` : esc(c.valor);
    return `<li><span>${texto}</span><span class="cv-m2-contacto-icono">${iconoDe(c.tipo)}</span></li>`;
  }).join("");

  $("#cv-m2-col-izq").innerHTML = renderColIzqModelo2();
  $("#cv-m2-col-der").innerHTML = renderColDerModelo2();
  igualarAlturaLateral();
}

function renderColIzqModelo2() {
  let html = "";
  if (estado.perfil.trim()) html += `<p class="cv-m2-intro">${escPárrafo(estado.perfil)}</p>`;
  if (estado.habilidades.length) {
    html += `<div class="cv-m2-bloque"><h2 class="cv-m2-banner">Skills</h2><ul class="cv-lista-simple">${estado.habilidades.map((h) => `<li>${esc(h.texto)}</li>`).join("")}</ul></div>`;
  }
  if (estado.idiomas.length) {
    html += `<div class="cv-m2-bloque"><h2 class="cv-m2-banner">Languages</h2><ul class="cv-lista-simple">${estado.idiomas.map((i) => `<li>${esc(i.nombre)}${i.nivel ? ` – ${esc(i.nivel)}` : ""}</li>`).join("")}</ul></div>`;
  }
  // "Hobbies" en la imagen de referencia — acá no hay un campo de hobbies
  // en el editor, así que se usa Habilidades blandas con su nombre real
  // en vez de etiquetarlas como algo que no son.
  if (estado.blandas.length) {
    html += `<div class="cv-m2-bloque"><h2 class="cv-m2-banner">Soft Skills</h2><ul class="cv-lista-simple">${estado.blandas.map((h) => `<li>${esc(h.texto)}</li>`).join("")}</ul></div>`;
  }
  return html;
}

function renderColDerModelo2() {
  let html = "";
  if (estado.experiencia.length) {
    html += `<div class="cv-m2-bloque"><h2 class="cv-m2-banner cv-m2-banner-ancho">Experience</h2>`;
    for (const x of estado.experiencia) {
      html += `<div class="cv-m2-item">
        <p class="cv-m2-item-titulo">${esc(x.rol || x.empresa)}</p>
        <p class="cv-m2-item-sub">${esc(x.empresa)}${x.fecha ? ` | ${esc(x.fecha)}` : ""}</p>
        <ul class="cv-bullets">
          ${x.descripcion.trim() ? `<li>${esc(x.descripcion)}</li>` : ""}
          ${x.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}
          ${x.herramientas.map((h) => `<li>${esc(h.etiqueta)}: <strong>${esc(h.valor)}</strong></li>`).join("")}
        </ul>
      </div>`;
    }
    html += `</div>`;
  }
  // Educación + certificaciones comparten la misma cápsula "Education" —
  // el diseño de referencia no tiene un bloque aparte para certificados.
  const items = [
    ...estado.educacion.map((e) => ({ titulo: e.institucion, fecha: e.fecha, bullets: e.bullets.map((b) => b.texto) })),
    ...estado.certificaciones.map((c) => ({ titulo: c.titulo, fecha: "", bullets: c.subtitulo ? [c.subtitulo] : [] })),
  ];
  if (items.length) {
    html += `<div class="cv-m2-bloque"><h2 class="cv-m2-banner cv-m2-banner-ancho">Education</h2>`;
    for (const it of items) {
      html += `<div class="cv-m2-item">
        <p class="cv-m2-item-titulo">${esc(it.titulo)}</p>
        ${it.fecha ? `<p class="cv-m2-item-sub">${esc(it.fecha)}</p>` : ""}
        ${it.bullets.length ? `<ul class="cv-bullets">${it.bullets.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      </div>`;
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

// Cada color libre (oscuro, claro) tiene DOS inputs para el mismo valor
// (el swatch nativo <input type=color> y un campo de texto para pegar un
// hex a mano) — hay que mantenerlos sincronizados entre sí, por eso no
// alcanza con enlazarCampoSimple() dos veces. Genérica para no repetir
// esta lógica por cada color libre que se agregue.
function enlazarColorLibre(idPicker, idTexto, clave, porDefecto) {
  const HEX_VALIDO = /^#[0-9a-fA-F]{6}$/;
  const picker = $(idPicker), texto = $(idTexto);
  const valorInicial = HEX_VALIDO.test(estado[clave]) ? estado[clave] : porDefecto;
  picker.value = valorInicial;
  texto.value = valorInicial;
  picker.oninput = () => {
    estado[clave] = picker.value;
    texto.value = picker.value;
    renderPreview(); guardar();
  };
  texto.oninput = () => {
    if (!HEX_VALIDO.test(texto.value)) return; // deja seguir escribiendo sin aplicar todavía
    estado[clave] = texto.value;
    picker.value = texto.value;
    renderPreview(); guardar();
  };
}

// Los <select> de fuente/íconos arrancan vacíos en el HTML — se llenan acá
// desde el registro (FUENTES/PAQUETES_ICONOS) en vez de tenerlos
// hardcodeados en index.html, para no mantener la lista en dos lugares.
// Repoblar en cada poblarDesdeEstado() (por ej. tras "Restablecer") no
// hace daño: es la misma lista siempre, sólo se pisa el <option> elegido.
function poblarSelectorDesdeRegistro(idSelect, registro) {
  const select = $(idSelect);
  select.innerHTML = Object.entries(registro).map(([id, d]) => `<option value="${esc(id)}">${esc(d.nombre)}</option>`).join("");
}

function poblarDesdeEstado() {
  enlazarCampoSimple("#in-modelo", "modelo");
  enlazarCampoSimple("#in-tema", "tema");
  enlazarColorLibre("#in-color-oscuro", "#in-color-oscuro-texto", "colorOscuro", "#16191e");
  enlazarColorLibre("#in-color-claro", "#in-color-claro-texto", "colorClaro", "#ffffff");
  poblarSelectorDesdeRegistro("#in-fuente", FUENTES);
  enlazarCampoSimple("#in-fuente", "fuente");
  poblarSelectorDesdeRegistro("#in-iconos", PAQUETES_ICONOS);
  enlazarCampoSimple("#in-iconos", "iconos");
  actualizarTextosEscala();
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

// ---- ajustador +/- de tamaño (foto, íconos) ----
const ESCALA_PASO = 0.1, ESCALA_MIN = 0.5, ESCALA_MAX_FOTO = 1.8, ESCALA_MAX_ICONOS = 2.2;
function ajustarEscala(clave, delta, maximo) {
  const actual = estado[clave] ?? 1;
  estado[clave] = Math.min(maximo, Math.max(ESCALA_MIN, Math.round((actual + delta) * 100) / 100));
  actualizarTextosEscala();
  renderPreview(); guardar();
}
function actualizarTextosEscala() {
  $("#foto-escala-texto").textContent = Math.round((estado.escalaFoto ?? 1) * 100) + "%";
  $("#iconos-escala-texto").textContent = Math.round((estado.escalaIconos ?? 1) * 100) + "%";
}

// ---- controles estáticos: se bindean UNA sola vez, nunca dentro de
// poblarDesdeEstado() (ver comentario más arriba). ----
function bindearControlesEstaticos() {
  $("#btn-foto-menos").addEventListener("click", () => ajustarEscala("escalaFoto", -ESCALA_PASO, ESCALA_MAX_FOTO));
  $("#btn-foto-mas").addEventListener("click", () => ajustarEscala("escalaFoto", ESCALA_PASO, ESCALA_MAX_FOTO));
  $("#btn-iconos-menos").addEventListener("click", () => ajustarEscala("escalaIconos", -ESCALA_PASO, ESCALA_MAX_ICONOS));
  $("#btn-iconos-mas").addEventListener("click", () => ajustarEscala("escalaIconos", ESCALA_PASO, ESCALA_MAX_ICONOS));

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

  // ---- exportar/importar: respaldo real de tus datos como .json, fuera
  // del localStorage del navegador — sirve para guardarlo en otro lado
  // (nube, pendrive) o pasarlo a otra compu/navegador. ----
  $("#btn-exportar").addEventListener("click", () => {
    const nombreArchivo = [estado.nombre, estado.apellido].filter(Boolean).join("-").toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "cv";
    const blob = new Blob([JSON.stringify(estado, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nombreArchivo}-datos.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
  $("#importar-input").addEventListener("change", (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
      let datos;
      try { datos = JSON.parse(lector.result); }
      catch { alert("Ese archivo no es un .json válido."); e.target.value = ""; return; }
      // chequeo mínimo de forma, no una validación exhaustiva — si falta
      // algo puntual el resto de la app igual sigue andando (los campos
      // ausentes quedan vacíos, no rompen nada).
      if (typeof datos !== "object" || datos === null || !Array.isArray(datos.experiencia)) {
        alert("Ese .json no tiene la forma esperada (¿es un export de esta misma herramienta?).");
        e.target.value = "";
        return;
      }
      if (!confirm("Esto reemplaza todo el contenido actual por lo que hay en el archivo. ¿Seguir?")) { e.target.value = ""; return; }
      estado = datos;
      poblarDesdeEstado();
      guardar();
      e.target.value = "";
    };
    lector.readAsText(archivo);
  });
}

bindearControlesEstaticos();
poblarDesdeEstado();
