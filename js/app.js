// ============ CV Generator ============
// App de un solo archivo de estado (`estado`), sin build ni dependencias:
// el editor de la izquierda escribe directo sobre `estado` y dispara
// renderPreview(), que reconstruye el HTML de `.cv-pagina` (lo único que
// se imprime — ver @media print en css/style.css). Todo persiste solo en
// localStorage de este navegador/perfil; no hay backend.

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

// ---- idioma del CV impreso (no el del editor, que se queda en español
// siempre — esto es sólo para los títulos de sección del documento en
// sí, como "Skills"/"Habilidades") — por defecto en inglés, porque el
// contenido real (perfil, experiencia, etc.) lo escribís en inglés y
// antes quedaba mezclado con títulos de sección en español. ----
const TRADUCCIONES = {
  perfil: { es: "Perfil", en: "Profile" },
  sobreMi: { es: "Sobre mí", en: "About Me" },
  sobreAutor: { es: "Sobre el autor", en: "About the Author" },
  habilidades: { es: "Habilidades", en: "Skills" },
  blandas: { es: "Habilidades blandas", en: "Soft Skills" },
  competencias: { es: "Competencias", en: "Skills" },
  idiomas: { es: "Idiomas", en: "Languages" },
  educacion: { es: "Educación", en: "Education" },
  certificaciones: { es: "Certificaciones", en: "Certifications" },
  experiencia: { es: "Experiencia laboral", en: "Work Experience" },
  historia: { es: "La historia", en: "The Story" },
  logros: { es: "Logros", en: "Achievements" },
  referencias: { es: "Referencias", en: "References" },
  contacto: { es: "Contacto", en: "Contact" },
  capitulo: { es: "Capítulo", en: "Chapter" },
};
function t(clave) {
  const idioma = (estado && estado.idiomaCv === "es") ? "es" : "en";
  const entrada = TRADUCCIONES[clave];
  return entrada ? entrada[idioma] : clave;
}

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

// Convierte un nombre de empresa (o cualquier texto) en un link clickeable
// SI hay una URL cargada — si no, muestra el texto plano de siempre. Así
// el diseño no cambia hasta que vos cargues el link real; una vez cargado,
// queda subrayado punteado y abre en pestaña nueva. Usa `color: inherit`
// a propósito para no tener que retocar la paleta de cada uno de los 20
// modelos por separado.
function enlaceSiHay(texto, url, claseExtra) {
  const t = esc(texto);
  if (!url || !url.trim()) return t;
  return `<a href="${esc(url.trim())}" target="_blank" rel="noopener noreferrer" class="cv-enlace${claseExtra ? " " + claseExtra : ""}">${t}</a>`;
}
// Mismo mecanismo para el valor de un dato de contacto — hoy sólo se usa
// para LinkedIn (si ese ítem tiene `url` cargada, el nombre/texto se
// vuelve un link a tu perfil).
function contactoValorHTML(c) {
  if (c.tipo === "linkedin") return enlaceSiHay(c.valor, c.url, "cv-enlace-contacto");
  return esc(c.valor);
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
    modelo: "modelo1", tema: "turquesa", fuente: "jakarta", iconos: "emoji1", colorOscuro: "#16191e", colorClaro: "#ffffff", escalaFoto: 1, escalaIconos: 1, idiomaCv: "en",
    nombre: "Lorem", apellido: "Ipsum",
    puesto: "Dolor Sit Amet Engineer", subtitulo: "Consectetur+",
    foto: null,
    contacto: [
      { id: id(), tipo: "telefono", etiqueta: "US", valor: "+1 234 567 8900" },
      { id: id(), tipo: "email", etiqueta: "", valor: "lorem.ipsum@example.com" },
      { id: id(), tipo: "ubicacion", etiqueta: "", valor: "Placeholder City, Placeholderland" },
      { id: id(), tipo: "linkedin", etiqueta: "", valor: "linkedin.com/in/lorem-ipsum", url: "https://linkedin.com/in/lorem-ipsum" },
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
        id: id(), empresa: "Lorem Corp", empresaUrl: "https://example.com", fecha: "JAN 2023 - PRESENT",
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
        id: id(), empresa: "Ipsum Industries", empresaUrl: "https://example.com", fecha: "JUN 2020 - DEC 2022",
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
        id: id(), empresa: "Dolor & Sit Ltd.", empresaUrl: "https://example.com", fecha: "MAR 2017 - MAY 2020",
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
  modelo3: { nombre: "Modelo 3", render: renderModelo3 },
  modelo4: { nombre: "Modelo 4", render: renderModelo4 },
  modelo5: { nombre: "Modelo 5 — Atelier", render: renderModelo5 },
  modelo6: { nombre: "Modelo 6 — Pulse", render: renderModelo6 },
  modelo7: { nombre: "Modelo 7 — Meridian", render: renderModelo7 },
  modelo8: { nombre: "Modelo 8 — Nova", render: renderModelo8 },
  modelo9: { nombre: "Modelo 9 — Ignite", render: renderModelo9 },
  modelo10: { nombre: "Modelo 10 — Halcyon", render: renderModelo10 },
  modelo11: { nombre: "Modelo 11 — Vertex", render: renderModelo11 },
  modelo12: { nombre: "Modelo 12 — Ledger", render: renderModelo12 },
  modelo13: { nombre: "Modelo 13 — Prism", render: renderModelo13 },
  modelo14: { nombre: "Modelo 14 — Circuit", render: renderModelo14 },
  modelo15: { nombre: "Modelo 15 — Solstice", render: renderModelo15 },
  modelo16: { nombre: "Modelo 16 — Aperture", render: renderModelo16 },
  modelo17: { nombre: "Modelo 17 — Lattice", render: renderModelo17 },
  modelo18: { nombre: "Modelo 18 — Bloom", render: renderModelo18 },
  modelo19: { nombre: "Modelo 19 — Monolith", render: renderModelo19 },
  modelo20: { nombre: "Modelo 20 — Odyssey", render: renderModelo20 },
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
  igualarAlturaPar("#cv-m3-principal", "#cv-m3-lateral");
  igualarAlturaPar("#cv-m4-principal", "#cv-m4-lateral");
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
    html += `<div class="cv-lateral-bloque"><h2 class="cv-lateral-titulo">${t('contacto')}</h2><ul class="cv-contacto-lista">`;
    for (const c of estado.contacto) {
      const texto = c.etiqueta ? `${esc(c.etiqueta)}: ${contactoValorHTML(c)}` : contactoValorHTML(c);
      html += `<li class="cv-contacto-fila"><span class="cv-contacto-icono">${iconoDe(c.tipo)}</span><span>${texto}</span></li>`;
    }
    html += `</ul></div>`;
  }

  if (estado.habilidades.length) {
    html += `<div class="cv-lateral-bloque"><h2 class="cv-lateral-titulo">${t('habilidades')}</h2><ul class="cv-lista-simple">`;
    html += estado.habilidades.map((h) => `<li>${esc(h.texto)}</li>`).join("");
    html += `</ul></div>`;
  }

  if (estado.blandas.length) {
    html += `<div class="cv-lateral-bloque"><h2 class="cv-lateral-titulo">${t('blandas')}</h2><ul class="cv-lista-simple">`;
    html += estado.blandas.map((h) => `<li>${esc(h.texto)}</li>`).join("");
    html += `</ul></div>`;
  }

  if (estado.idiomas.length) {
    html += `<div class="cv-lateral-bloque"><h2 class="cv-lateral-titulo">${t('idiomas')}</h2>`;
    html += estado.idiomas.map((i) => `<div class="cv-idioma-fila"><span class="cv-idioma-nombre">${esc(i.nombre)}</span><span>${esc(i.nivel)}</span></div>`).join("");
    html += `</div>`;
  }

  if (estado.educacion.length) {
    html += `<div class="cv-lateral-bloque"><h2 class="cv-lateral-titulo">${t('educacion')}</h2>`;
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
    html += `<div class="cv-lateral-bloque"><h2 class="cv-lateral-titulo">${t('referencias')}</h2>`;
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
    html += `<div class="cv-lateral-bloque"><h2 class="cv-lateral-titulo">${t('logros')}</h2><ul class="cv-lista-simple">`;
    html += estado.logros.map((l) => `<li>${esc(l.texto)}</li>`).join("");
    html += `</ul></div>`;
  }

  return html;
}

function renderPrincipalModelo1() {
  let html = "";

  if (estado.perfil.trim()) {
    html += `<div class="cv-bloque-principal"><h2 class="cv-titulo-seccion">${t('perfil')}</h2><p class="cv-perfil-texto">${escPárrafo(estado.perfil)}</p></div>`;
  }

  if (estado.experiencia.length) {
    html += `<div class="cv-bloque-principal"><h2 class="cv-titulo-seccion">${t('experiencia')}</h2><div class="cv-lista-experiencia">`;
    for (const x of estado.experiencia) {
      html += `<div class="cv-experiencia">
        <div class="cv-experiencia-fila">
          <span class="cv-experiencia-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa")}</span>
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
    html += `<div class="cv-bloque-principal"><h2 class="cv-titulo-seccion">${t('certificaciones')}</h2>`;
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
    const texto = c.etiqueta ? `${esc(c.etiqueta)}: ${contactoValorHTML(c)}` : contactoValorHTML(c);
    return `<li><span>${texto}</span><span class="cv-m2-contacto-icono">${iconoDe(c.tipo)}</span></li>`;
  }).join("");

  $("#cv-m2-col-izq").innerHTML = renderColIzqModelo2();
  $("#cv-m2-col-der").innerHTML = renderColDerModelo2();
  igualarAlturaLateral();
}

// Orden pedido explícitamente: Skills, Languages, Soft Skills y recién al
// final About Me (el perfil) — antes el perfil iba primero, arriba de
// todo, sin título propio.
function renderColIzqModelo2() {
  let html = "";
  if (estado.habilidades.length) {
    html += `<div class="cv-m2-bloque"><h2 class="cv-m2-banner">${t('habilidades')}</h2><ul class="cv-lista-simple">${estado.habilidades.map((h) => `<li>${esc(h.texto)}</li>`).join("")}</ul></div>`;
  }
  if (estado.idiomas.length) {
    html += `<div class="cv-m2-bloque"><h2 class="cv-m2-banner">${t('idiomas')}</h2><ul class="cv-lista-simple">${estado.idiomas.map((i) => `<li>${esc(i.nombre)}${i.nivel ? ` – ${esc(i.nivel)}` : ""}</li>`).join("")}</ul></div>`;
  }
  // "Hobbies" en la imagen de referencia — acá no hay un campo de hobbies
  // en el editor, así que se usa Habilidades blandas con su nombre real
  // en vez de etiquetarlas como algo que no son.
  if (estado.blandas.length) {
    html += `<div class="cv-m2-bloque"><h2 class="cv-m2-banner">${t('blandas')}</h2><ul class="cv-lista-simple">${estado.blandas.map((h) => `<li>${esc(h.texto)}</li>`).join("")}</ul></div>`;
  }
  if (estado.perfil.trim()) {
    html += `<div class="cv-m2-bloque"><h2 class="cv-m2-banner">${t('sobreMi')}</h2><p class="cv-m2-intro">${escPárrafo(estado.perfil)}</p></div>`;
  }
  return html;
}

function renderColDerModelo2() {
  let html = "";
  if (estado.experiencia.length) {
    html += `<div class="cv-m2-bloque"><h2 class="cv-m2-banner cv-m2-banner-ancho">${t('experiencia')}</h2>`;
    for (const x of estado.experiencia) {
      html += `<div class="cv-m2-item">
        <p class="cv-m2-item-titulo">${esc(x.rol || x.empresa)}</p>
        <p class="cv-m2-item-sub">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa")}${x.fecha ? ` | ${esc(x.fecha)}` : ""}</p>
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
    html += `<div class="cv-m2-bloque"><h2 class="cv-m2-banner cv-m2-banner-ancho">${t('educacion')}</h2>`;
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

// ---- Modelo 3: foto en arco, barras de progreso en Skills/Languages,
// línea de tiempo con fecha + título + descripción a la derecha ----
//
// Las barras de "Work Skills" no representan una medición real (el
// editor no tiene un campo de "nivel" para habilidades, sólo texto) —
// son puramente decorativas, con un ancho derivado de un hash del propio
// texto (siempre el mismo para la misma habilidad, no cambian solas en
// cada render). Es el mismo criterio que ya usa la plantilla de
// referencia: sus placeholders también traen porcentajes de ejemplo
// (79%, 85%, 90%...) sin que representen nada medido. Las barras de
// "Languages" sí están ancladas a un dato real (el nivel que el usuario
// escribió, ej. "B2+"), mapeado a un porcentaje aproximado.
function anchoBarraPorTexto(texto, min = 55, max = 95) {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}
const NIVEL_IDIOMA_A_PORCENTAJE = {
  "nativo": 96, "native": 96, "lengua materna": 96,
  "c2": 92, "fluido": 88, "fluent": 88,
  "c1": 82, "avanzado": 78, "advanced": 78,
  "b2+": 72, "b2": 64,
  "intermedio": 55, "intermediate": 55, "b1": 52,
  "a2": 38, "básico": 35, "basico": 35, "principiante": 28, "beginner": 28, "a1": 25,
};
function porcentajeIdioma(nivelTexto) {
  const clave = (nivelTexto || "").trim().toLowerCase();
  return NIVEL_IDIOMA_A_PORCENTAJE[clave] ?? anchoBarraPorTexto(clave || "idioma", 50, 85);
}

function tituloIconoM3(icono, texto, oscuro) {
  return `<div class="cv-m3-seccion-titulo${oscuro ? " cv-m3-seccion-titulo-oscura" : ""}"><span class="cv-m3-seccion-icono">${icono}</span><span>${esc(texto)}</span></div>`;
}
function barraM3(etiqueta, porcentaje) {
  return `<div class="cv-m3-barra-fila">
    <div class="cv-m3-barra-etiqueta">${esc(etiqueta)}</div>
    <div class="cv-m3-barra-linea">
      <div class="cv-m3-barra-pista"><div class="cv-m3-barra-relleno" style="width:${porcentaje}%"></div></div>
      <span class="cv-m3-barra-pct">${porcentaje}%</span>
    </div>
  </div>`;
}

function asegurarEsqueletoModelo3() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo3") return;
  pagina.dataset.esqueleto = "modelo3";
  pagina.innerHTML = `
    <div class="cv-m3-lateral" id="cv-m3-lateral">
      <div class="cv-m3-foto-marco">
        <img class="cv-m3-foto" id="cv-m3-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m3-foto-placeholder" id="cv-m3-foto-placeholder">🙂</div>
      </div>
      <div class="cv-m3-lateral-bloques" id="cv-m3-lateral-bloques"></div>
    </div>
    <div class="cv-m3-principal" id="cv-m3-principal">
      <div class="cv-m3-encabezado">
        <h1 class="cv-m3-nombre"><span id="cv-m3-nombre-nombre">Nombre</span> <span class="cv-nombre-acento" id="cv-m3-nombre-apellido">Apellido</span><span class="cv-m3-punto">.</span></h1>
        <p class="cv-m3-puesto"><span id="cv-m3-puesto-texto">Puesto</span><span id="cv-m3-puesto-sub-envoltorio"> | <span id="cv-m3-puesto-sub"></span></span></p>
      </div>
      <div id="cv-m3-principal-bloques"></div>
    </div>
  `;
}

function renderModelo3() {
  asegurarEsqueletoModelo3();
  $("#cv-m3-nombre-nombre").textContent = estado.nombre || "Nombre";
  $("#cv-m3-nombre-apellido").textContent = estado.apellido || "Apellido";
  $("#cv-m3-puesto-texto").textContent = estado.puesto || "Puesto";
  $("#cv-m3-puesto-sub").textContent = estado.subtitulo || "";
  $("#cv-m3-puesto-sub-envoltorio").classList.toggle("cv-oculto", !estado.subtitulo);

  const foto = $("#cv-m3-foto"), placeholder = $("#cv-m3-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m3-lateral-bloques").innerHTML = renderLateralModelo3();
  $("#cv-m3-principal-bloques").innerHTML = renderPrincipalModelo3();
  igualarAlturaLateral();
}

function renderLateralModelo3() {
  let html = "";
  if (estado.habilidades.length) {
    html += `<div class="cv-m3-bloque">${tituloIconoM3("◆", t('habilidades'))}`;
    html += estado.habilidades.map((h) => barraM3(h.texto, anchoBarraPorTexto(h.texto))).join("");
    html += `</div>`;
  }
  if (estado.idiomas.length) {
    html += `<div class="cv-m3-bloque">${tituloIconoM3("◎", t('idiomas'))}`;
    html += estado.idiomas.map((i) => barraM3(i.nivel ? `${i.nombre} (${i.nivel})` : i.nombre, porcentajeIdioma(i.nivel))).join("");
    html += `</div>`;
  }
  if (estado.contacto.length) {
    html += `<div class="cv-m3-bloque">${tituloIconoM3("☎", t('contacto'))}<ul class="cv-lista-simple">`;
    html += estado.contacto.map((c) => `<li>${c.etiqueta ? esc(c.etiqueta) + ": " : ""}${contactoValorHTML(c)}</li>`).join("");
    html += `</ul></div>`;
  }
  if (estado.referencias.length) {
    html += `<div class="cv-m3-bloque">${tituloIconoM3("●", t('referencias'))}`;
    for (const r of estado.referencias) {
      html += `<div class="cv-ref-item">
        <span class="cv-ref-nombre">${esc(r.nombre)}</span>
        ${r.rol ? `<span class="cv-ref-rol">${esc(r.rol)}</span>` : ""}
        ${r.email ? `<span class="cv-ref-rol">${esc(r.email)}</span>` : ""}
      </div>`;
    }
    html += `</div>`;
  }
  return html;
}

// items: [{fecha, titulo, sub, desc}] — cualquiera de los 4 campos puede
// venir vacío, cada uno se omite solo si no hay nada que mostrar. Cada
// entrada es una fila de dos columnas (fecha angosta a la izquierda,
// contenido a la derecha con un puntito antes del título) — no una línea
// de tiempo vertical con línea+punto en el margen como el Modelo 1.
function seccionTimelineM3(icono, titulo, items) {
  if (!items.length) return "";
  let html = `<div class="cv-m3-bloque-principal">${tituloIconoM3(icono, titulo, true)}<div class="cv-m3-timeline">`;
  for (const it of items) {
    html += `<div class="cv-m3-timeline-item">
      <span class="cv-m3-timeline-fecha">${it.fecha ? esc(it.fecha) : ""}</span>
      <div class="cv-m3-timeline-contenido">
        ${it.titulo ? `<p class="cv-m3-timeline-titulo-fila"><span class="cv-m3-timeline-punto"></span>${esc(it.titulo)}</p>` : ""}
        ${it.sub ? `<p class="cv-m3-timeline-sub">${esc(it.sub)}</p>` : ""}
        ${it.desc ? `<p class="cv-m3-timeline-desc">${esc(it.desc)}</p>` : ""}
      </div>
    </div>`;
  }
  html += `</div></div>`;
  return html;
}

function renderPrincipalModelo3() {
  let html = "";
  if (estado.perfil.trim()) html += `<p class="cv-m3-intro">${escPárrafo(estado.perfil)}</p>`;

  const educacion = [
    ...estado.educacion.map((e) => ({ fecha: e.fecha, titulo: e.institucion, sub: "", desc: e.bullets.map((b) => b.texto).join(" · ") })),
    ...estado.certificaciones.map((c) => ({ fecha: "", titulo: c.titulo, sub: "", desc: c.subtitulo })),
  ];
  html += seccionTimelineM3("▲", t('educacion'), educacion);

  const experiencia = estado.experiencia.map((x) => ({
    fecha: x.fecha, titulo: x.rol || x.empresa, sub: x.rol ? x.empresa : "",
    desc: [x.descripcion, ...x.bullets.map((b) => b.texto)].filter(Boolean).join(" "),
  }));
  html += seccionTimelineM3("■", t('experiencia'), experiencia);

  const logros = estado.logros.map((l) => ({ fecha: "", titulo: "", sub: "", desc: l.texto }));
  html += seccionTimelineM3("★", t('logros'), logros);

  return html;
}

// ---- Modelo 4: blanco y negro, franja lateral con el canto "escalopado"
// (una fila de círculos oscuros fundiéndose en un borde ondulado, en vez
// de un corte recto) — el detalle que se pidió remarcar explícitamente de
// la referencia. Se genera con un degradé radial repetido verticalmente
// (ver .cv-m4-lateral-borde en css/style.css), no con un trazo fijo tipo
// el de la ola del Modelo 2: así se adapta solo a cualquier alto de
// franja lateral, sin tener que recalcular el patrón a mano. ----
function tituloM4(icono, texto, oscuro) {
  return `<div class="cv-m4-titulo${oscuro ? " cv-m4-titulo-oscura" : ""}"><span class="cv-m4-titulo-icono">${icono}</span><span>${esc(texto)}</span></div>`;
}

function asegurarEsqueletoModelo4() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo4") return;
  pagina.dataset.esqueleto = "modelo4";
  pagina.innerHTML = `
    <div class="cv-m4-lateral" id="cv-m4-lateral">
      <div class="cv-m4-header-panel">
        <div class="cv-m4-encabezado">
          <h1 class="cv-m4-nombre"><span id="cv-m4-nombre-nombre">Nombre</span> <span class="cv-nombre-acento" id="cv-m4-nombre-apellido">Apellido</span></h1>
          <p class="cv-m4-puesto"><span id="cv-m4-puesto-texto">Puesto</span><span id="cv-m4-puesto-sub-envoltorio"> | <span id="cv-m4-puesto-sub"></span></span></p>
        </div>
        <div class="cv-m4-foto-marco">
          <img class="cv-m4-foto" id="cv-m4-foto" src="" alt="Foto de perfil" hidden>
          <div class="cv-m4-foto-placeholder" id="cv-m4-foto-placeholder">🙂</div>
        </div>
      </div>
      <div class="cv-m4-panel-b" id="cv-m4-panel-b"></div>
    </div>
    <div class="cv-m4-principal" id="cv-m4-principal">
      <div id="cv-m4-principal-bloques"></div>
    </div>
  `;
}

function renderModelo4() {
  asegurarEsqueletoModelo4();
  $("#cv-m4-nombre-nombre").textContent = estado.nombre || "Nombre";
  $("#cv-m4-nombre-apellido").textContent = estado.apellido || "Apellido";
  $("#cv-m4-puesto-texto").textContent = estado.puesto || "Puesto";
  $("#cv-m4-puesto-sub").textContent = estado.subtitulo || "";
  $("#cv-m4-puesto-sub-envoltorio").classList.toggle("cv-oculto", !estado.subtitulo);

  const foto = $("#cv-m4-foto"), placeholder = $("#cv-m4-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m4-panel-b").innerHTML = renderLateralModelo4PanelB();
  $("#cv-m4-principal-bloques").innerHTML = renderPrincipalModelo4();
  igualarAlturaLateral();
}

// La franja lateral son dos rectángulos, no uno solo ni una ola/textura
// repetida (los dos primeros intentos, corregidos después de no
// parecerse en nada a la referencia): el de arriba es el de la foto +
// nombre, termina en curva justo debajo — la curva "de arriba" queda
// pegada a la foto, agrupada con ella, en vez de aparecer recién después
// de Educación. Después hay un espacio en blanco (separación real, ver
// margin-bottom en css/style.css) y el segundo rectángulo (contacto +
// educación + referencias, todo junto) empieza en curva arriba a la
// derecha y crece para seguir llenando de oscuro hasta el final de la
// página — sólo dos curvas en total, con aire entre ambas.
function renderLateralModelo4PanelB() {
  let html = "";

  if (estado.contacto.length) {
    html += `<div class="cv-m4-bloque">${tituloM4("☎", t('contacto'))}<ul class="cv-lista-simple">`;
    html += estado.contacto.map((c) => `<li>${c.etiqueta ? esc(c.etiqueta) + ": " : ""}${contactoValorHTML(c)}</li>`).join("");
    html += `</ul></div>`;
  }

  // Educación + certificaciones fundidas en una sola lista, mismo criterio
  // que ya se usa en el Modelo 3 (la referencia no tiene un bloque propio
  // para certificaciones separado de educación).
  const educacion = [
    ...estado.educacion.map((e) => ({ titulo: e.institucion, fecha: e.fecha, bullets: e.bullets.map((b) => b.texto) })),
    ...estado.certificaciones.map((c) => ({ titulo: c.titulo, fecha: "", bullets: c.subtitulo ? [c.subtitulo] : [] })),
  ];
  if (educacion.length) {
    html += `<div class="cv-m4-bloque">${tituloM4("◈", t('educacion'))}`;
    for (const e of educacion) {
      html += `<div class="cv-edu-item">
        <span class="cv-edu-titulo">${esc(e.titulo)}</span>
        ${e.fecha ? `<span class="cv-edu-fecha">${esc(e.fecha)}</span>` : ""}
        ${e.bullets.length ? `<ul class="cv-lista-simple">${e.bullets.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      </div>`;
    }
    html += `</div>`;
  }

  if (estado.referencias.length) {
    html += `<div class="cv-m4-bloque">${tituloM4("❝", t('referencias'))}`;
    for (const r of estado.referencias) {
      html += `<div class="cv-ref-item">
        <span class="cv-ref-nombre">${esc(r.nombre)}</span>
        ${r.rol ? `<span class="cv-ref-rol">${esc(r.rol)}</span>` : ""}
        ${r.email ? `<span class="cv-ref-rol">${esc(r.email)}</span>` : ""}
      </div>`;
    }
    html += `</div>`;
  }

  return html;
}

function renderPrincipalModelo4() {
  let html = "";

  if (estado.perfil.trim()) {
    html += `<div class="cv-m4-bloque-principal">${tituloM4("●", t('sobreMi'), true)}<p class="cv-m4-about-texto">${escPárrafo(estado.perfil)}</p></div>`;
  }

  if (estado.experiencia.length) {
    html += `<div class="cv-m4-bloque-principal">${tituloM4("▣", t('experiencia'), true)}`;
    for (const x of estado.experiencia) {
      html += `<div class="cv-m4-exp-item">
        <div class="cv-m4-exp-fila">
          <span class="cv-m4-exp-titulo">${esc(x.rol || x.empresa)}</span>
          ${x.fecha ? `<span class="cv-m4-exp-fecha">${esc(x.fecha)}</span>` : ""}
        </div>
        ${x.rol ? `<p class="cv-m4-exp-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa")}</p>` : ""}
        ${x.descripcion.trim() ? `<p class="cv-m4-exp-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${x.bullets.length ? `<ul class="cv-bullets">${x.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
      </div>`;
    }
    html += `</div>`;
  }

  // Barras decorativas, no un puntaje real — mismo criterio que
  // anchoBarraPorTexto() ya documenta en el Modelo 3: acá no hay un dato
  // de "qué tan bueno sos" para cada habilidad, así que el ancho es un
  // hash determinístico del propio texto (mismo look que la referencia,
  // que también usa porcentajes de ejemplo arbitrarios).
  if (estado.habilidades.length) {
    html += `<div class="cv-m4-bloque-principal">${tituloM4("◆", t('habilidades'), true)}<div class="cv-m4-skills-grid">`;
    html += estado.habilidades.map((h) => `<div class="cv-m4-skill">
      <span class="cv-m4-skill-nombre">${esc(h.texto)}</span>
      <div class="cv-m4-skill-linea"><div class="cv-m4-skill-relleno" style="width:${anchoBarraPorTexto(h.texto)}%"></div></div>
    </div>`).join("");
    html += `</div></div>`;
  }

  if (estado.idiomas.length || estado.blandas.length) {
    html += `<div class="cv-m4-fila-dos">`;
    if (estado.idiomas.length) {
      html += `<div class="cv-m4-bloque-principal">${tituloM4("◎", t('idiomas'), true)}<ul class="cv-lista-simple cv-m4-lista-clara">`;
      html += estado.idiomas.map((i) => `<li>${esc(i.nombre)}${i.nivel ? ` — ${esc(i.nivel)}` : ""}</li>`).join("");
      html += `</ul></div>`;
    }
    if (estado.blandas.length) {
      html += `<div class="cv-m4-bloque-principal">${tituloM4("✦", t('blandas'), true)}<ul class="cv-lista-simple cv-m4-lista-clara">`;
      html += estado.blandas.map((b) => `<li>${esc(b.texto)}</li>`).join("");
      html += `</ul></div>`;
    }
    html += `</div>`;
  }

  return html;
}

// ---- Modelo 5 "Atelier": pensado para un perfil creativo/artístico —
// una sola columna editorial (nada de franja lateral tipo currículum
// clásico), tipografía serif grande, foto en un blob orgánico (no un
// círculo — border-radius asimétrico, la técnica clásica de "blob" CSS)
// y divisores finos tipo trazo a mano en vez de líneas rectas. ----
function tituloM5(texto) {
  return `<h2 class="cv-m5-titulo">${esc(texto)}</h2>`;
}

function asegurarEsqueletoModelo5() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo5") return;
  pagina.dataset.esqueleto = "modelo5";
  const ondaDivisor = trazoOnda(1000, 2.2, 3.2, 10, 0, 120);
  pagina.innerHTML = `
    <div class="cv-m5-header">
      <div class="cv-m5-header-texto">
        <p class="cv-m5-eyebrow"><span id="cv-m5-puesto-texto">Puesto</span><span id="cv-m5-puesto-sub-envoltorio"> · <span id="cv-m5-puesto-sub"></span></span></p>
        <h1 class="cv-m5-nombre"><span id="cv-m5-nombre-nombre">Nombre</span><br><span class="cv-nombre-acento" id="cv-m5-nombre-apellido">Apellido</span></h1>
      </div>
      <div class="cv-m5-foto-marco">
        <img class="cv-m5-foto" id="cv-m5-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m5-foto-placeholder" id="cv-m5-foto-placeholder">🙂</div>
      </div>
    </div>
    <svg class="cv-m5-divisor" viewBox="0 0 1000 20" preserveAspectRatio="none">
      <path d="M${ondaDivisor}" style="fill:none; stroke:var(--cv-acento); stroke-width:1.6; stroke-linecap:round;"></path>
    </svg>
    <div class="cv-m5-cuerpo">
      <div id="cv-m5-perfil"></div>
      <div id="cv-m5-meta"></div>
      <div id="cv-m5-experiencia"></div>
      <div id="cv-m5-cierre"></div>
    </div>
  `;
}

function renderModelo5() {
  asegurarEsqueletoModelo5();
  $("#cv-m5-nombre-nombre").textContent = estado.nombre || "Nombre";
  $("#cv-m5-nombre-apellido").textContent = estado.apellido || "Apellido";
  $("#cv-m5-puesto-texto").textContent = estado.puesto || "Puesto";
  $("#cv-m5-puesto-sub").textContent = estado.subtitulo || "";
  $("#cv-m5-puesto-sub-envoltorio").classList.toggle("cv-oculto", !estado.subtitulo);

  const foto = $("#cv-m5-foto"), placeholder = $("#cv-m5-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m5-perfil").innerHTML = estado.perfil.trim()
    ? `<p class="cv-m5-perfil-texto">${escPárrafo(estado.perfil)}</p>` : "";
  $("#cv-m5-meta").innerHTML = renderMetaModelo5();
  $("#cv-m5-experiencia").innerHTML = renderExperienciaModelo5();
  $("#cv-m5-cierre").innerHTML = renderCierreModelo5();
}

// fila de "chips" (etiquetas redondeadas) en vez de listas con viñeta o
// barras de progreso — más liviano y editorial, a tono con el resto del
// modelo (nada de porcentajes decorativos acá).
function chipsM5(items) {
  return `<div class="cv-m5-chips">${items.map((t) => `<span class="cv-m5-chip">${esc(t)}</span>`).join("")}</div>`;
}

function renderMetaModelo5() {
  let html = `<div class="cv-m5-meta-grid">`;

  if (estado.contacto.length) {
    html += `<div class="cv-m5-meta-col">${tituloM5(t('contacto'))}<ul class="cv-m5-lista-clara">`;
    html += estado.contacto.map((c) => `<li>${c.etiqueta ? esc(c.etiqueta) + ": " : ""}${contactoValorHTML(c)}</li>`).join("");
    html += `</ul></div>`;
  }

  if (estado.habilidades.length) {
    html += `<div class="cv-m5-meta-col">${tituloM5(t('habilidades'))}${chipsM5(estado.habilidades.map((h) => h.texto))}</div>`;
  }

  if (estado.idiomas.length) {
    html += `<div class="cv-m5-meta-col">${tituloM5(t('idiomas'))}${chipsM5(estado.idiomas.map((i) => i.nivel ? `${i.nombre} — ${i.nivel}` : i.nombre))}</div>`;
  }

  if (estado.blandas.length) {
    html += `<div class="cv-m5-meta-col">${tituloM5(t('blandas'))}${chipsM5(estado.blandas.map((b) => b.texto))}</div>`;
  }

  const educacion = [
    ...estado.educacion.map((e) => `${e.institucion}${e.fecha ? ` (${e.fecha})` : ""}`),
    ...estado.certificaciones.map((c) => c.titulo),
  ];
  if (educacion.length) {
    html += `<div class="cv-m5-meta-col">${tituloM5(t('educacion'))}<ul class="cv-m5-lista-clara">${educacion.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>`;
  }

  html += `</div>`;
  return html;
}

// experiencia como lista editorial numerada (01, 02, 03…) en vez de una
// línea de tiempo con puntos/barras — el número grande y tenue es el
// elemento decorativo acá, no un ícono ni una barra de progreso.
function renderExperienciaModelo5() {
  if (!estado.experiencia.length) return "";
  let html = `${tituloM5(t('experiencia'))}<div class="cv-m5-experiencia-lista">`;
  estado.experiencia.forEach((x, i) => {
    html += `<div class="cv-m5-experiencia-item">
      <span class="cv-m5-experiencia-num">${String(i + 1).padStart(2, "0")}</span>
      <div class="cv-m5-experiencia-contenido">
        <div class="cv-m5-experiencia-fila">
          <span class="cv-m5-experiencia-rol">${esc(x.rol || x.empresa)}</span>
          ${x.fecha ? `<span class="cv-m5-experiencia-fecha">${esc(x.fecha)}</span>` : ""}
        </div>
        ${x.rol ? `<p class="cv-m5-experiencia-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa")}</p>` : ""}
        ${x.descripcion.trim() ? `<p class="cv-m5-experiencia-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${x.bullets.length ? `<ul class="cv-m5-lista-clara">${x.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
      </div>
    </div>`;
  });
  html += `</div>`;
  return html;
}

function renderCierreModelo5() {
  if (!estado.logros.length && !estado.referencias.length) return "";
  let html = `<div class="cv-m5-cierre-grid">`;
  if (estado.logros.length) {
    html += `<div>${tituloM5(t('logros'))}<ul class="cv-m5-lista-clara">${estado.logros.map((l) => `<li>${esc(l.texto)}</li>`).join("")}</ul></div>`;
  }
  if (estado.referencias.length) {
    html += `<div>${tituloM5(t('referencias'))}`;
    for (const r of estado.referencias) {
      html += `<div class="cv-m5-ref-item"><span class="cv-m5-ref-nombre">${esc(r.nombre)}</span>${r.rol ? ` — ${esc(r.rol)}` : ""}${r.email ? `<br>${esc(r.email)}` : ""}</div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}

// ---- Modelo 6 "Pulse": inspirado en un editor de código — franja
// angosta a la izquierda con una etiqueta vertical tipo "gutter" de
// editor, foto chica como badge junto al nombre, skills como tags de
// sintaxis <Texto />, y bullets de experiencia con numeración de línea. ----
function asegurarEsqueletoModelo6() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo6") return;
  pagina.dataset.esqueleto = "modelo6";
  pagina.innerHTML = `
    <div class="cv-m6-wrap">
      <div class="cv-m6-rail"><span class="cv-m6-rail-label">PULSE // PERFIL TÉCNICO</span></div>
      <div class="cv-m6-main">
        <header class="cv-m6-header">
          <div class="cv-m6-badge-wrap" id="cv-m6-foto-wrap"><img id="cv-m6-foto" class="cv-m6-foto" alt="Foto de perfil"></div>
          <div class="cv-m6-heading">
            <h1 class="cv-m6-nombre" id="cv-m6-nombre"></h1>
            <div class="cv-m6-puesto" id="cv-m6-puesto"></div>
            <div class="cv-m6-subtitulo" id="cv-m6-subtitulo"></div>
          </div>
        </header>
        <div class="cv-m6-contacto" id="cv-m6-contacto"></div>

        <section class="cv-m6-section" id="cv-m6-sec-perfil">
          <h2 class="cv-m6-h2">// perfil</h2>
          <p class="cv-m6-perfil" id="cv-m6-perfil"></p>
        </section>

        <section class="cv-m6-section" id="cv-m6-sec-skills">
          <h2 class="cv-m6-h2">// stack</h2>
          <div class="cv-m6-chips" id="cv-m6-skills"></div>
        </section>

        <section class="cv-m6-section" id="cv-m6-sec-blandas">
          <h2 class="cv-m6-h2">// soft-skills</h2>
          <div class="cv-m6-chips cv-m6-chips-soft" id="cv-m6-blandas"></div>
        </section>

        <section class="cv-m6-section" id="cv-m6-sec-idiomas">
          <h2 class="cv-m6-h2">// idiomas</h2>
          <div class="cv-m6-idiomas" id="cv-m6-idiomas"></div>
        </section>

        <section class="cv-m6-section" id="cv-m6-sec-experiencia">
          <h2 class="cv-m6-h2">// experiencia</h2>
          <div id="cv-m6-experiencia"></div>
        </section>

        <section class="cv-m6-section" id="cv-m6-sec-educacion">
          <h2 class="cv-m6-h2">// educación</h2>
          <div id="cv-m6-educacion"></div>
        </section>

        <section class="cv-m6-section" id="cv-m6-sec-certificaciones">
          <h2 class="cv-m6-h2">// certificaciones</h2>
          <div class="cv-m6-certs" id="cv-m6-certificaciones"></div>
        </section>

        <section class="cv-m6-section" id="cv-m6-sec-logros">
          <h2 class="cv-m6-h2">// logros</h2>
          <ul class="cv-m6-logros" id="cv-m6-logros"></ul>
        </section>

        <section class="cv-m6-section" id="cv-m6-sec-referencias">
          <h2 class="cv-m6-h2">// referencias</h2>
          <div class="cv-m6-referencias" id="cv-m6-referencias"></div>
        </section>
      </div>
    </div>
  `;
}

function _m6Mostrar(id, visible) {
  const el = $(id);
  if (el) el.style.display = visible ? "" : "none";
}
function _m6Chip(texto) { return `<span class="cv-m6-chip">&lt;${esc(texto)}&nbsp;/&gt;</span>`; }
function _m6ChipSoft(texto) { return `<span class="cv-m6-chip cv-m6-chip-soft">${esc(texto)}</span>`; }
function _m6ContactoHTML(contacto) {
  return contacto.map((c) => `
    <span class="cv-m6-contacto-item">
      <span class="cv-m6-contacto-icono">${iconoDe(c.tipo)}</span>
      <span class="cv-m6-contacto-valor">${contactoValorHTML(c)}</span>
    </span>
  `).join("");
}
function _m6ExperienciaHTML(experiencia) {
  return experiencia.map((job) => {
    const bullets = (job.bullets || []).map((b, i) => `
      <div class="cv-m6-bullet-row">
        <span class="cv-m6-linenum">${String(i + 1).padStart(2, "0")}</span>
        <span class="cv-m6-bullet-text">${esc(b.texto)}</span>
      </div>
    `).join("");
    const herramientas = (job.herramientas || []).map((h) =>
      `<span class="cv-m6-tool">${esc(h.etiqueta)}${h.valor ? ": " + esc(h.valor) : ""}</span>`
    ).join("");
    return `
      <article class="cv-m6-job">
        <div class="cv-m6-job-head">
          <span class="cv-m6-job-rol">${esc(job.rol || job.empresa)}</span>
          <span class="cv-m6-job-fecha">${esc(job.fecha)}</span>
        </div>
        <div class="cv-m6-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa")}</div>
        ${job.descripcion && job.descripcion.trim() ? `<p class="cv-m6-job-desc">${escPárrafo(job.descripcion)}</p>` : ""}
        ${bullets ? `<div class="cv-m6-bullets">${bullets}</div>` : ""}
        ${herramientas ? `<div class="cv-m6-tools">${herramientas}</div>` : ""}
      </article>
    `;
  }).join("");
}
function _m6EducacionHTML(educacion) {
  return educacion.map((ed) => `
    <article class="cv-m6-edu">
      <div class="cv-m6-edu-head">
        <span class="cv-m6-edu-inst">${esc(ed.institucion)}</span>
        <span class="cv-m6-edu-fecha">${esc(ed.fecha)}</span>
      </div>
      ${(ed.bullets || []).length ? `<ul class="cv-m6-edu-bullets">${ed.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </article>
  `).join("");
}

function renderModelo6() {
  asegurarEsqueletoModelo6();
  $("#cv-m6-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m6-puesto").textContent = estado.puesto || "";
  $("#cv-m6-subtitulo").textContent = estado.subtitulo || "";

  const fotoWrap = $("#cv-m6-foto-wrap");
  if (estado.foto) { $("#cv-m6-foto").src = estado.foto; fotoWrap.style.display = ""; }
  else { fotoWrap.style.display = "none"; }

  $("#cv-m6-contacto").innerHTML = _m6ContactoHTML(estado.contacto || []);

  $("#cv-m6-perfil").innerHTML = escPárrafo(estado.perfil || "");
  _m6Mostrar("#cv-m6-sec-perfil", !!(estado.perfil && estado.perfil.trim()));

  $("#cv-m6-skills").innerHTML = (estado.habilidades || []).map((h) => _m6Chip(h.texto)).join("");
  _m6Mostrar("#cv-m6-sec-skills", (estado.habilidades || []).length > 0);

  $("#cv-m6-blandas").innerHTML = (estado.blandas || []).map((b) => _m6ChipSoft(b.texto)).join("");
  _m6Mostrar("#cv-m6-sec-blandas", (estado.blandas || []).length > 0);

  $("#cv-m6-idiomas").innerHTML = (estado.idiomas || []).map((i) =>
    `<div class="cv-m6-idioma"><span>${esc(i.nombre)}</span><span class="cv-m6-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");
  _m6Mostrar("#cv-m6-sec-idiomas", (estado.idiomas || []).length > 0);

  $("#cv-m6-experiencia").innerHTML = _m6ExperienciaHTML(estado.experiencia || []);
  _m6Mostrar("#cv-m6-sec-experiencia", (estado.experiencia || []).length > 0);

  $("#cv-m6-educacion").innerHTML = _m6EducacionHTML(estado.educacion || []);
  _m6Mostrar("#cv-m6-sec-educacion", (estado.educacion || []).length > 0);

  $("#cv-m6-certificaciones").innerHTML = (estado.certificaciones || []).map((c) =>
    `<div class="cv-m6-cert"><span class="cv-m6-cert-titulo">${esc(c.titulo)}</span>${c.subtitulo ? `<span class="cv-m6-cert-sub">${esc(c.subtitulo)}</span>` : ""}</div>`
  ).join("");
  _m6Mostrar("#cv-m6-sec-certificaciones", (estado.certificaciones || []).length > 0);

  $("#cv-m6-logros").innerHTML = (estado.logros || []).map((l) => `<li>${esc(l.texto)}</li>`).join("");
  _m6Mostrar("#cv-m6-sec-logros", (estado.logros || []).length > 0);

  $("#cv-m6-referencias").innerHTML = (estado.referencias || []).map((r) => `
    <div class="cv-m6-referencia">
      <span class="cv-m6-ref-nombre">${esc(r.nombre)}</span>
      ${r.rol ? `<span class="cv-m6-ref-rol">${esc(r.rol)}</span>` : ""}
      ${r.email ? `<span class="cv-m6-ref-dato">${esc(r.email)}</span>` : ""}
      ${r.linkedin ? `<span class="cv-m6-ref-dato">${esc(r.linkedin)}</span>` : ""}
    </div>
  `).join("");
  _m6Mostrar("#cv-m6-sec-referencias", (estado.referencias || []).length > 0);
}

// ---- Modelo 7 "Meridian": masthead centrado y simétrico, foto chica
// tipo sello sobre el nombre, columna única bien ancha, tipografía serif,
// casi monocromo — pensado para un perfil ejecutivo/consultor. ----
function asegurarEsqueletoModelo7() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo7") return;
  pagina.dataset.esqueleto = "modelo7";
  pagina.innerHTML = `
    <div class="cv-m7-page">
      <div class="cv-m7-photowrap" id="cv-m7-foto-wrap"><img id="cv-m7-foto" class="cv-m7-foto" alt="Foto de perfil"></div>
      <div class="cv-m7-rule"></div>
      <h1 class="cv-m7-nombre" id="cv-m7-nombre"></h1>
      <div class="cv-m7-rule"></div>
      <div class="cv-m7-puesto" id="cv-m7-puesto"></div>
      <div class="cv-m7-subtitulo" id="cv-m7-subtitulo"></div>
      <div class="cv-m7-contacto" id="cv-m7-contacto"></div>

      <section class="cv-m7-section" id="cv-m7-sec-perfil">
        <h2 class="cv-m7-h2">${t('perfil')}</h2>
        <p class="cv-m7-perfil" id="cv-m7-perfil"></p>
      </section>

      <section class="cv-m7-section" id="cv-m7-sec-experiencia">
        <h2 class="cv-m7-h2">${t('experiencia')}</h2>
        <div id="cv-m7-experiencia"></div>
      </section>

      <section class="cv-m7-section" id="cv-m7-sec-educacion">
        <h2 class="cv-m7-h2">${t('educacion')}</h2>
        <div id="cv-m7-educacion"></div>
      </section>

      <section class="cv-m7-section" id="cv-m7-sec-certificaciones">
        <h2 class="cv-m7-h2">${t('certificaciones')}</h2>
        <div id="cv-m7-certificaciones"></div>
      </section>

      <section class="cv-m7-section cv-m7-cols" id="cv-m7-sec-comp">
        <div class="cv-m7-col">
          <h2 class="cv-m7-h2">${t('competencias')}</h2>
          <div id="cv-m7-skills"></div>
          <div id="cv-m7-blandas"></div>
        </div>
        <div class="cv-m7-col">
          <h2 class="cv-m7-h2">${t('idiomas')}</h2>
          <div id="cv-m7-idiomas"></div>
        </div>
      </section>

      <section class="cv-m7-section" id="cv-m7-sec-logros">
        <h2 class="cv-m7-h2">${t('logros')}</h2>
        <ul id="cv-m7-logros"></ul>
      </section>

      <section class="cv-m7-section" id="cv-m7-sec-referencias">
        <h2 class="cv-m7-h2">${t('referencias')}</h2>
        <div id="cv-m7-referencias"></div>
      </section>
    </div>
  `;
}
function _m7Mostrar(id, visible) {
  const el = $(id);
  if (el) el.style.display = visible ? "" : "none";
}
function _m7ContactoHTML(contacto) {
  return contacto.map((c, i) => `${i > 0 ? '<span class="cv-m7-dot">·</span>' : ""}<span class="cv-m7-contacto-item">${contactoValorHTML(c)}</span>`).join("");
}
function _m7ExperienciaHTML(experiencia) {
  return experiencia.map((job) => {
    const bullets = (job.bullets || []).map((b) => `<li>${esc(b.texto)}</li>`).join("");
    const herramientas = (job.herramientas || []).map((h) => `${esc(h.etiqueta)}${h.valor ? ": " + esc(h.valor) : ""}`).join("  ·  ");
    return `
      <article class="cv-m7-job">
        <div class="cv-m7-job-head">
          <span class="cv-m7-job-rol">${esc(job.rol || job.empresa)}</span>
          <span class="cv-m7-job-fecha">${esc(job.fecha)}</span>
        </div>
        <div class="cv-m7-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa")}</div>
        ${job.descripcion && job.descripcion.trim() ? `<p class="cv-m7-job-desc">${escPárrafo(job.descripcion)}</p>` : ""}
        ${bullets ? `<ul class="cv-m7-job-bullets">${bullets}</ul>` : ""}
        ${herramientas ? `<div class="cv-m7-job-tools">${herramientas}</div>` : ""}
      </article>
    `;
  }).join("");
}

function renderModelo7() {
  asegurarEsqueletoModelo7();
  $("#cv-m7-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m7-puesto").textContent = estado.puesto || "";
  $("#cv-m7-subtitulo").textContent = estado.subtitulo || "";
  _m7Mostrar("#cv-m7-subtitulo", !!(estado.subtitulo && estado.subtitulo.trim()));

  const fotoWrap = $("#cv-m7-foto-wrap");
  if (estado.foto) { $("#cv-m7-foto").src = estado.foto; fotoWrap.style.display = ""; }
  else { fotoWrap.style.display = "none"; }

  $("#cv-m7-contacto").innerHTML = _m7ContactoHTML(estado.contacto || []);
  _m7Mostrar("#cv-m7-contacto", (estado.contacto || []).length > 0);

  $("#cv-m7-perfil").innerHTML = escPárrafo(estado.perfil || "");
  _m7Mostrar("#cv-m7-sec-perfil", !!(estado.perfil && estado.perfil.trim()));

  $("#cv-m7-experiencia").innerHTML = _m7ExperienciaHTML(estado.experiencia || []);
  _m7Mostrar("#cv-m7-sec-experiencia", (estado.experiencia || []).length > 0);

  $("#cv-m7-educacion").innerHTML = (estado.educacion || []).map((ed) => `
    <article class="cv-m7-edu">
      <div class="cv-m7-edu-head">
        <span class="cv-m7-edu-inst">${esc(ed.institucion)}</span>
        <span class="cv-m7-edu-fecha">${esc(ed.fecha)}</span>
      </div>
      ${(ed.bullets || []).length ? `<ul class="cv-m7-edu-bullets">${ed.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </article>
  `).join("");
  _m7Mostrar("#cv-m7-sec-educacion", (estado.educacion || []).length > 0);

  $("#cv-m7-certificaciones").innerHTML = (estado.certificaciones || []).map((c) => `
    <div class="cv-m7-cert"><span class="cv-m7-cert-titulo">${esc(c.titulo)}</span>${c.subtitulo ? ` — <span class="cv-m7-cert-sub">${esc(c.subtitulo)}</span>` : ""}</div>
  `).join("");
  _m7Mostrar("#cv-m7-sec-certificaciones", (estado.certificaciones || []).length > 0);

  $("#cv-m7-skills").innerHTML = (estado.habilidades || []).length
    ? `<p class="cv-m7-inline-list">${(estado.habilidades || []).map((h) => esc(h.texto)).join("  ·  ")}</p>` : "";
  $("#cv-m7-blandas").innerHTML = (estado.blandas || []).length
    ? `<p class="cv-m7-inline-list cv-m7-inline-soft">${(estado.blandas || []).map((b) => esc(b.texto)).join("  ·  ")}</p>` : "";
  $("#cv-m7-idiomas").innerHTML = (estado.idiomas || []).map((i) =>
    `<div class="cv-m7-idioma"><span>${esc(i.nombre)}</span><span class="cv-m7-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");
  _m7Mostrar("#cv-m7-sec-comp", (estado.habilidades || []).length > 0 || (estado.blandas || []).length > 0 || (estado.idiomas || []).length > 0);

  $("#cv-m7-logros").innerHTML = (estado.logros || []).map((l) => `<li>${esc(l.texto)}</li>`).join("");
  _m7Mostrar("#cv-m7-sec-logros", (estado.logros || []).length > 0);

  $("#cv-m7-referencias").innerHTML = (estado.referencias || []).map((r) => `
    <div class="cv-m7-referencia">
      <span class="cv-m7-ref-nombre">${esc(r.nombre)}</span>${r.rol ? ` — <span class="cv-m7-ref-rol">${esc(r.rol)}</span>` : ""}
      ${r.email ? `<br><span class="cv-m7-ref-dato">${esc(r.email)}</span>` : ""}
      ${r.linkedin ? `<span class="cv-m7-ref-dato"> · ${esc(r.linkedin)}</span>` : ""}
    </div>
  `).join("");
  _m7Mostrar("#cv-m7-sec-referencias", (estado.referencias || []).length > 0);
}

// ---- Modelo 8 "Nova": bloque diagonal de color detrás del
// nombre+foto (creativo/diseño), grid asimétrico tipo revista con
// tarjetas "recortadas" a la derecha. ----
function asegurarEsqueletoModelo8() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo8") return;
  pagina.dataset.esqueleto = "modelo8";
  pagina.innerHTML = `
    <div class="cv-m8-page">
      <div class="cv-m8-diagonal"></div>
      <header class="cv-m8-header">
        <div class="cv-m8-photo-wrap" id="cv-m8-foto-wrap"><img id="cv-m8-foto" class="cv-m8-foto" alt="Foto de perfil"></div>
        <div class="cv-m8-heading">
          <h1 class="cv-m8-nombre"><span id="cv-m8-nombre-nombre"></span> <span class="cv-m8-apellido" id="cv-m8-nombre-apellido"></span></h1>
          <div class="cv-m8-puesto" id="cv-m8-puesto"></div>
          <div class="cv-m8-subtitulo" id="cv-m8-subtitulo"></div>
        </div>
      </header>

      <div class="cv-m8-contacto" id="cv-m8-contacto"></div>

      <section class="cv-m8-section-perfil" id="cv-m8-sec-perfil">
        <h2 class="cv-m8-h2">${t('perfil')}</h2>
        <p id="cv-m8-perfil"></p>
      </section>

      <div class="cv-m8-grid">
        <div class="cv-m8-col-left">
          <section id="cv-m8-sec-experiencia">
            <h2 class="cv-m8-h2">${t('experiencia')}</h2>
            <div id="cv-m8-experiencia"></div>
          </section>
          <section id="cv-m8-sec-logros">
            <h2 class="cv-m8-h2">${t('logros')}</h2>
            <ul id="cv-m8-logros"></ul>
          </section>
          <section id="cv-m8-sec-referencias">
            <h2 class="cv-m8-h2">${t('referencias')}</h2>
            <div id="cv-m8-referencias"></div>
          </section>
        </div>
        <div class="cv-m8-col-right">
          <div class="cv-m8-card cv-m8-card-coral" id="cv-m8-sec-skills">
            <h3 class="cv-m8-h3">${t('habilidades')}</h3>
            <div id="cv-m8-skills"></div>
            <div id="cv-m8-blandas"></div>
          </div>
          <div class="cv-m8-card cv-m8-card-violet" id="cv-m8-sec-idiomas">
            <h3 class="cv-m8-h3">${t('idiomas')}</h3>
            <div id="cv-m8-idiomas"></div>
          </div>
          <div class="cv-m8-card cv-m8-card-coral" id="cv-m8-sec-educacion">
            <h3 class="cv-m8-h3">${t('educacion')}</h3>
            <div id="cv-m8-educacion"></div>
          </div>
          <div class="cv-m8-card cv-m8-card-violet" id="cv-m8-sec-certificaciones">
            <h3 class="cv-m8-h3">${t('certificaciones')}</h3>
            <div id="cv-m8-certificaciones"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function _m8Mostrar(id, visible) {
  const el = $(id);
  if (el) el.style.display = visible ? "" : "none";
}
function _m8ContactoHTML(contacto) {
  return contacto.map((c) => `
    <span class="cv-m8-contacto-item">
      <span class="cv-m8-contacto-icono">${iconoDe(c.tipo)}</span>${contactoValorHTML(c)}
    </span>
  `).join("");
}
function _m8ExperienciaHTML(experiencia) {
  return experiencia.map((job) => {
    const bullets = (job.bullets || []).map((b) => `<li>${esc(b.texto)}</li>`).join("");
    const herramientas = (job.herramientas || []).map((h) =>
      `<span class="cv-m8-tool">${esc(h.etiqueta)}${h.valor ? ": " + esc(h.valor) : ""}</span>`
    ).join("");
    return `
      <article class="cv-m8-job">
        <div class="cv-m8-job-head">
          <span class="cv-m8-job-rol">${esc(job.rol || job.empresa)}</span>
          <span class="cv-m8-job-fecha">${esc(job.fecha)}</span>
        </div>
        <div class="cv-m8-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa")}</div>
        ${job.descripcion && job.descripcion.trim() ? `<p class="cv-m8-job-desc">${escPárrafo(job.descripcion)}</p>` : ""}
        ${bullets ? `<ul class="cv-m8-job-bullets">${bullets}</ul>` : ""}
        ${herramientas ? `<div class="cv-m8-tools">${herramientas}</div>` : ""}
      </article>
    `;
  }).join("");
}

function renderModelo8() {
  asegurarEsqueletoModelo8();
  $("#cv-m8-nombre-nombre").textContent = estado.nombre || "";
  $("#cv-m8-nombre-apellido").textContent = estado.apellido || "";
  $("#cv-m8-puesto").textContent = estado.puesto || "";
  $("#cv-m8-subtitulo").textContent = estado.subtitulo || "";

  const fotoWrap = $("#cv-m8-foto-wrap");
  if (estado.foto) { $("#cv-m8-foto").src = estado.foto; fotoWrap.style.display = ""; }
  else { fotoWrap.style.display = "none"; }

  $("#cv-m8-contacto").innerHTML = _m8ContactoHTML(estado.contacto || []);

  $("#cv-m8-perfil").innerHTML = escPárrafo(estado.perfil || "");
  _m8Mostrar("#cv-m8-sec-perfil", !!(estado.perfil && estado.perfil.trim()));

  $("#cv-m8-experiencia").innerHTML = _m8ExperienciaHTML(estado.experiencia || []);
  _m8Mostrar("#cv-m8-sec-experiencia", (estado.experiencia || []).length > 0);

  $("#cv-m8-logros").innerHTML = (estado.logros || []).map((l) => `<li>${esc(l.texto)}</li>`).join("");
  _m8Mostrar("#cv-m8-sec-logros", (estado.logros || []).length > 0);

  $("#cv-m8-referencias").innerHTML = (estado.referencias || []).map((r) => `
    <div class="cv-m8-referencia">
      <span class="cv-m8-ref-nombre">${esc(r.nombre)}</span>
      ${r.rol ? `<span class="cv-m8-ref-rol">${esc(r.rol)}</span>` : ""}
      ${r.email ? `<span class="cv-m8-ref-dato">${esc(r.email)}</span>` : ""}
      ${r.linkedin ? `<span class="cv-m8-ref-dato">${esc(r.linkedin)}</span>` : ""}
    </div>
  `).join("");
  _m8Mostrar("#cv-m8-sec-referencias", (estado.referencias || []).length > 0);

  $("#cv-m8-skills").innerHTML = (estado.habilidades || []).map((h) => `<span class="cv-m8-chip">${esc(h.texto)}</span>`).join("");
  $("#cv-m8-blandas").innerHTML = (estado.blandas || []).map((b) => `<span class="cv-m8-chip cv-m8-chip-soft">${esc(b.texto)}</span>`).join("");
  _m8Mostrar("#cv-m8-sec-skills", (estado.habilidades || []).length > 0 || (estado.blandas || []).length > 0);

  $("#cv-m8-idiomas").innerHTML = (estado.idiomas || []).map((i) =>
    `<div class="cv-m8-idioma"><span>${esc(i.nombre)}</span><span class="cv-m8-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");
  _m8Mostrar("#cv-m8-sec-idiomas", (estado.idiomas || []).length > 0);

  $("#cv-m8-educacion").innerHTML = (estado.educacion || []).map((ed) => `
    <div class="cv-m8-edu">
      <div class="cv-m8-edu-inst">${esc(ed.institucion)}</div>
      <div class="cv-m8-edu-fecha">${esc(ed.fecha)}</div>
      ${(ed.bullets || []).length ? `<ul class="cv-m8-edu-bullets">${ed.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");
  _m8Mostrar("#cv-m8-sec-educacion", (estado.educacion || []).length > 0);

  $("#cv-m8-certificaciones").innerHTML = (estado.certificaciones || []).map((c) => `
    <div class="cv-m8-cert"><span class="cv-m8-cert-titulo">${esc(c.titulo)}</span>${c.subtitulo ? `<span class="cv-m8-cert-sub">${esc(c.subtitulo)}</span>` : ""}</div>
  `).join("");
  _m8Mostrar("#cv-m8-sec-certificaciones", (estado.certificaciones || []).length > 0);
}

// ---- Modelo 9 "Ignite": estética de scoreboard de gimnasio — bandas
// negras separan secciones con números grandes, foto en escudo, skills
// como barras "rep-count" segmentadas. Persona gym/personal trainer. ----
function asegurarEsqueletoModelo9() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo9") return;
  pagina.dataset.esqueleto = "modelo9";
  pagina.innerHTML = `
    <div class="cv-m9-page">
      <header class="cv-m9-header">
        <div class="cv-m9-fotowrap"><img id="cv-m9-foto" class="cv-m9-foto" alt="Foto de perfil"></div>
        <div class="cv-m9-titlewrap">
          <h1 class="cv-m9-nombretitulo">
            <span id="cv-m9-nombre" class="cv-m9-nombre"></span>
            <span id="cv-m9-apellido" class="cv-m9-apellido"></span>
          </h1>
          <div id="cv-m9-puesto" class="cv-m9-puesto"></div>
          <div id="cv-m9-subtitulo" class="cv-m9-subtitulo"></div>
        </div>
      </header>

      <ul id="cv-m9-contacto" class="cv-m9-contacto"></ul>

      <section class="cv-m9-seccion" id="cv-m9-sec-perfil">
        <div class="cv-m9-banda"><span class="cv-m9-num">01</span><h2 class="cv-m9-tituloseccion">${t('perfil').toUpperCase()}</h2></div>
        <p id="cv-m9-perfil" class="cv-m9-perfil"></p>
      </section>

      <section class="cv-m9-seccion" id="cv-m9-sec-habilidades">
        <div class="cv-m9-banda"><span class="cv-m9-num">02</span><h2 class="cv-m9-tituloseccion">${t('habilidades').toUpperCase()}</h2></div>
        <div id="cv-m9-habilidades" class="cv-m9-habilidades"></div>
      </section>

      <section class="cv-m9-seccion" id="cv-m9-sec-blandas">
        <div class="cv-m9-banda"><span class="cv-m9-num">03</span><h2 class="cv-m9-tituloseccion">${t('blandas').toUpperCase()}</h2></div>
        <div id="cv-m9-blandas" class="cv-m9-blandas"></div>
      </section>

      <section class="cv-m9-seccion" id="cv-m9-sec-idiomas">
        <div class="cv-m9-banda"><span class="cv-m9-num">04</span><h2 class="cv-m9-tituloseccion">${t('idiomas').toUpperCase()}</h2></div>
        <div id="cv-m9-idiomas" class="cv-m9-idiomas"></div>
      </section>

      <section class="cv-m9-seccion" id="cv-m9-sec-experiencia">
        <div class="cv-m9-banda"><span class="cv-m9-num">05</span><h2 class="cv-m9-tituloseccion">${t('experiencia').toUpperCase()}</h2></div>
        <div id="cv-m9-experiencia" class="cv-m9-experiencia"></div>
      </section>

      <section class="cv-m9-seccion" id="cv-m9-sec-educacion">
        <div class="cv-m9-banda"><span class="cv-m9-num">06</span><h2 class="cv-m9-tituloseccion">${t('educacion').toUpperCase()}</h2></div>
        <div id="cv-m9-educacion" class="cv-m9-educacion"></div>
      </section>

      <section class="cv-m9-seccion" id="cv-m9-sec-certificaciones">
        <div class="cv-m9-banda"><span class="cv-m9-num">07</span><h2 class="cv-m9-tituloseccion">${t('certificaciones').toUpperCase()}</h2></div>
        <div id="cv-m9-certificaciones" class="cv-m9-certificaciones"></div>
      </section>

      <section class="cv-m9-seccion" id="cv-m9-sec-logros">
        <div class="cv-m9-banda"><span class="cv-m9-num">08</span><h2 class="cv-m9-tituloseccion">${t('logros').toUpperCase()}</h2></div>
        <ul id="cv-m9-logros" class="cv-m9-logros"></ul>
      </section>

      <section class="cv-m9-seccion" id="cv-m9-sec-referencias">
        <div class="cv-m9-banda"><span class="cv-m9-num">09</span><h2 class="cv-m9-tituloseccion">${t('referencias').toUpperCase()}</h2></div>
        <div id="cv-m9-referencias" class="cv-m9-referencias"></div>
      </section>
    </div>
  `;
}
function _m9Contacto(item) {
  return `<li class="cv-m9-contacto-item">
    <span class="cv-m9-contacto-icono">${iconoDe(item.tipo)}</span>
    <span class="cv-m9-contacto-valor">${contactoValorHTML(item)}</span>
  </li>`;
}
function _m9Bar(texto) {
  return `<div class="cv-m9-skill">
    <div class="cv-m9-skill-texto">${esc(texto)}</div>
    <div class="cv-m9-skill-bar" aria-hidden="true"></div>
  </div>`;
}
function _m9Blanda(texto) { return `<div class="cv-m9-chip">${esc(texto)}</div>`; }
function _m9Idioma(idioma) {
  return `<div class="cv-m9-idioma">
    <span class="cv-m9-idioma-nombre">${esc(idioma.nombre)}</span>
    <span class="cv-m9-idioma-nivel">${esc(idioma.nivel)}</span>
  </div>`;
}
function _m9Herramienta(h) {
  const val = h.valor ? `: ${esc(h.valor)}` : "";
  return `<span class="cv-m9-tool">${esc(h.etiqueta)}${val}</span>`;
}
function _m9Experiencia(exp) {
  const bullets = (exp.bullets || []).map((b) => `<li>${esc(b.texto)}</li>`).join("");
  const bulletsHtml = bullets ? `<ul class="cv-m9-exp-bullets">${bullets}</ul>` : "";
  const tools = (exp.herramientas || []).map(_m9Herramienta).join("");
  const toolsHtml = tools ? `<div class="cv-m9-exp-tools">${tools}</div>` : "";
  return `<article class="cv-m9-exp-item">
    <div class="cv-m9-exp-head">
      <h3 class="cv-m9-exp-rol">${esc(exp.rol || exp.empresa)}</h3>
      <span class="cv-m9-exp-fecha">${esc(exp.fecha)}</span>
    </div>
    <div class="cv-m9-exp-empresa">${enlaceSiHay(exp.empresa, exp.empresaUrl, "cv-enlace-empresa")}</div>
    ${exp.descripcion && exp.descripcion.trim() ? `<div class="cv-m9-exp-desc">${escPárrafo(exp.descripcion)}</div>` : ""}
    ${bulletsHtml}
    ${toolsHtml}
  </article>`;
}
function _m9Educacion(ed) {
  const bullets = (ed.bullets || []).map((b) => `<li>${esc(b.texto)}</li>`).join("");
  return `<div class="cv-m9-edu-item">
    <div class="cv-m9-edu-head">
      <h3 class="cv-m9-edu-institucion">${esc(ed.institucion)}</h3>
      <span class="cv-m9-edu-fecha">${esc(ed.fecha)}</span>
    </div>
    ${bullets ? `<ul class="cv-m9-edu-bullets">${bullets}</ul>` : ""}
  </div>`;
}
function _m9Certificacion(c) {
  return `<div class="cv-m9-cert-item">
    <div class="cv-m9-cert-titulo">${esc(c.titulo)}</div>
    ${c.subtitulo ? `<div class="cv-m9-cert-sub">${esc(c.subtitulo)}</div>` : ""}
  </div>`;
}
function _m9Referencia(r) {
  const linea = [r.rol, r.email, r.linkedin].filter(Boolean).map((v) => esc(v)).join(" · ");
  return `<div class="cv-m9-ref-item">
    <div class="cv-m9-ref-nombre">${esc(r.nombre)}</div>
    <div class="cv-m9-ref-detalle">${linea}</div>
  </div>`;
}

function renderModelo9() {
  asegurarEsqueletoModelo9();
  $("#cv-m9-nombre").textContent = estado.nombre || "";
  $("#cv-m9-apellido").textContent = estado.apellido || "";
  $("#cv-m9-puesto").textContent = estado.puesto || "";
  $("#cv-m9-subtitulo").textContent = estado.subtitulo || "";

  const foto = $("#cv-m9-foto");
  if (estado.foto) { foto.src = estado.foto; foto.closest(".cv-m9-fotowrap").style.display = ""; }
  else { foto.closest(".cv-m9-fotowrap").style.display = "none"; }

  const contacto = $("#cv-m9-contacto");
  contacto.innerHTML = (estado.contacto || []).map(_m9Contacto).join("");
  contacto.style.display = (estado.contacto || []).length ? "" : "none";

  const perfilSec = $("#cv-m9-sec-perfil");
  if (estado.perfil && estado.perfil.trim()) { $("#cv-m9-perfil").innerHTML = escPárrafo(estado.perfil); perfilSec.style.display = ""; }
  else { perfilSec.style.display = "none"; }

  const habSec = $("#cv-m9-sec-habilidades");
  const habilidades = estado.habilidades || [];
  $("#cv-m9-habilidades").innerHTML = habilidades.map((h) => _m9Bar(h.texto)).join("");
  habSec.style.display = habilidades.length ? "" : "none";

  const blandasSec = $("#cv-m9-sec-blandas");
  const blandas = estado.blandas || [];
  $("#cv-m9-blandas").innerHTML = blandas.map((b) => _m9Blanda(b.texto)).join("");
  blandasSec.style.display = blandas.length ? "" : "none";

  const idiomasSec = $("#cv-m9-sec-idiomas");
  const idiomas = estado.idiomas || [];
  $("#cv-m9-idiomas").innerHTML = idiomas.map(_m9Idioma).join("");
  idiomasSec.style.display = idiomas.length ? "" : "none";

  const expSec = $("#cv-m9-sec-experiencia");
  const experiencia = estado.experiencia || [];
  $("#cv-m9-experiencia").innerHTML = experiencia.map(_m9Experiencia).join("");
  expSec.style.display = experiencia.length ? "" : "none";

  const eduSec = $("#cv-m9-sec-educacion");
  const educacion = estado.educacion || [];
  $("#cv-m9-educacion").innerHTML = educacion.map(_m9Educacion).join("");
  eduSec.style.display = educacion.length ? "" : "none";

  const certSec = $("#cv-m9-sec-certificaciones");
  const certificaciones = estado.certificaciones || [];
  $("#cv-m9-certificaciones").innerHTML = certificaciones.map(_m9Certificacion).join("");
  certSec.style.display = certificaciones.length ? "" : "none";

  const logrosSec = $("#cv-m9-sec-logros");
  const logros = estado.logros || [];
  $("#cv-m9-logros").innerHTML = logros.map((l) => `<li>${esc(l.texto)}</li>`).join("");
  logrosSec.style.display = logros.length ? "" : "none";

  const refSec = $("#cv-m9-sec-referencias");
  const referencias = estado.referencias || [];
  $("#cv-m9-referencias").innerHTML = referencias.map(_m9Referencia).join("");
  refSec.style.display = referencias.length ? "" : "none";
}

// ---- Modelo 10 "Halcyon": tarjetas redondeadas independientes con
// sombra suave en flujo tipo masonry — cálido, orgánico. Persona
// wellness/coach/terapeuta. ----
function asegurarEsqueletoModelo10() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo10") return;
  pagina.dataset.esqueleto = "modelo10";
  pagina.innerHTML = `
    <div class="cv-m10-page">
      <div class="cv-m10-flow">
        <div class="cv-m10-card cv-m10-card-header">
          <div class="cv-m10-fotowrap"><img id="cv-m10-foto" class="cv-m10-foto" alt="Foto de perfil"></div>
          <h1 class="cv-m10-nombretitulo">
            <span id="cv-m10-nombre" class="cv-m10-nombre"></span>
            <span id="cv-m10-apellido" class="cv-m10-apellido"></span>
          </h1>
          <div id="cv-m10-puesto" class="cv-m10-puesto"></div>
          <div id="cv-m10-subtitulo" class="cv-m10-subtitulo"></div>
        </div>

        <div class="cv-m10-card cv-m10-card-contacto" id="cv-m10-sec-contacto">
          <h2 class="cv-m10-tituloseccion">${t('contacto')}</h2>
          <ul id="cv-m10-contacto" class="cv-m10-contacto"></ul>
        </div>

        <div class="cv-m10-card cv-m10-card-perfil" id="cv-m10-sec-perfil">
          <h2 class="cv-m10-tituloseccion">${t('sobreMi')}</h2>
          <p id="cv-m10-perfil" class="cv-m10-perfil"></p>
        </div>

        <div class="cv-m10-card cv-m10-card-habilidades" id="cv-m10-sec-habilidades">
          <h2 class="cv-m10-tituloseccion">${t('habilidades')}</h2>
          <div id="cv-m10-habilidades" class="cv-m10-habilidades"></div>
        </div>

        <div class="cv-m10-card cv-m10-card-blandas" id="cv-m10-sec-blandas">
          <h2 class="cv-m10-tituloseccion">${t('blandas')}</h2>
          <div id="cv-m10-blandas" class="cv-m10-blandas"></div>
        </div>

        <div class="cv-m10-card cv-m10-card-idiomas" id="cv-m10-sec-idiomas">
          <h2 class="cv-m10-tituloseccion">${t('idiomas')}</h2>
          <div id="cv-m10-idiomas" class="cv-m10-idiomas"></div>
        </div>

        <div id="cv-m10-experiencia" class="cv-m10-flow-inject"></div>

        <div class="cv-m10-card cv-m10-card-educacion" id="cv-m10-sec-educacion">
          <h2 class="cv-m10-tituloseccion">${t('educacion')}</h2>
          <div id="cv-m10-educacion" class="cv-m10-educacion"></div>
        </div>

        <div class="cv-m10-card cv-m10-card-certificaciones" id="cv-m10-sec-certificaciones">
          <h2 class="cv-m10-tituloseccion">${t('certificaciones')}</h2>
          <div id="cv-m10-certificaciones" class="cv-m10-certificaciones"></div>
        </div>

        <div class="cv-m10-card cv-m10-card-logros" id="cv-m10-sec-logros">
          <h2 class="cv-m10-tituloseccion">${t('logros')}</h2>
          <ul id="cv-m10-logros" class="cv-m10-logros"></ul>
        </div>

        <div id="cv-m10-referencias" class="cv-m10-flow-inject"></div>
      </div>
    </div>
  `;
}
function _m10Contacto(item) {
  return `<li class="cv-m10-contacto-item">
    <span class="cv-m10-contacto-icono">${iconoDe(item.tipo)}</span>
    <span class="cv-m10-contacto-valor">${contactoValorHTML(item)}</span>
  </li>`;
}
function _m10Pill(texto) { return `<span class="cv-m10-pill">${esc(texto)}</span>`; }
function _m10Idioma(idioma) {
  return `<div class="cv-m10-idioma">
    <span class="cv-m10-idioma-nombre">${esc(idioma.nombre)}</span>
    <span class="cv-m10-idioma-nivel">${esc(idioma.nivel)}</span>
  </div>`;
}
function _m10Herramienta(h) {
  const val = h.valor ? `: ${esc(h.valor)}` : "";
  return `<span class="cv-m10-tool">${esc(h.etiqueta)}${val}</span>`;
}
function _m10Experiencia(exp) {
  const bullets = (exp.bullets || []).map((b) => `<li>${esc(b.texto)}</li>`).join("");
  const bulletsHtml = bullets ? `<ul class="cv-m10-exp-bullets">${bullets}</ul>` : "";
  const tools = (exp.herramientas || []).map(_m10Herramienta).join("");
  const toolsHtml = tools ? `<div class="cv-m10-exp-tools">${tools}</div>` : "";
  return `<div class="cv-m10-card cv-m10-card-experiencia">
    <div class="cv-m10-exp-head">
      <h3 class="cv-m10-exp-rol">${esc(exp.rol || exp.empresa)}</h3>
      <span class="cv-m10-exp-fecha">${esc(exp.fecha)}</span>
    </div>
    <div class="cv-m10-exp-empresa">${enlaceSiHay(exp.empresa, exp.empresaUrl, "cv-enlace-empresa")}</div>
    ${exp.descripcion && exp.descripcion.trim() ? `<div class="cv-m10-exp-desc">${escPárrafo(exp.descripcion)}</div>` : ""}
    ${bulletsHtml}
    ${toolsHtml}
  </div>`;
}
function _m10Educacion(ed) {
  const bullets = (ed.bullets || []).map((b) => `<li>${esc(b.texto)}</li>`).join("");
  return `<div class="cv-m10-edu-item">
    <div class="cv-m10-edu-head">
      <h3 class="cv-m10-edu-institucion">${esc(ed.institucion)}</h3>
      <span class="cv-m10-edu-fecha">${esc(ed.fecha)}</span>
    </div>
    ${bullets ? `<ul class="cv-m10-edu-bullets">${bullets}</ul>` : ""}
  </div>`;
}
function _m10Certificacion(c) {
  return `<div class="cv-m10-cert-item">
    <div class="cv-m10-cert-titulo">${esc(c.titulo)}</div>
    ${c.subtitulo ? `<div class="cv-m10-cert-sub">${esc(c.subtitulo)}</div>` : ""}
  </div>`;
}
function _m10Referencia(r) {
  const linea = [r.rol, r.email, r.linkedin].filter(Boolean).map((v) => esc(v)).join(" · ");
  return `<div class="cv-m10-card cv-m10-card-referencia">
    <div class="cv-m10-ref-nombre">${esc(r.nombre)}</div>
    <div class="cv-m10-ref-detalle">${linea}</div>
  </div>`;
}

function renderModelo10() {
  asegurarEsqueletoModelo10();
  $("#cv-m10-nombre").textContent = estado.nombre || "";
  $("#cv-m10-apellido").textContent = estado.apellido || "";
  $("#cv-m10-puesto").textContent = estado.puesto || "";
  $("#cv-m10-subtitulo").textContent = estado.subtitulo || "";

  const foto = $("#cv-m10-foto");
  if (estado.foto) { foto.src = estado.foto; foto.closest(".cv-m10-fotowrap").style.display = ""; }
  else { foto.closest(".cv-m10-fotowrap").style.display = "none"; }

  const contactoSec = $("#cv-m10-sec-contacto");
  const contacto = estado.contacto || [];
  $("#cv-m10-contacto").innerHTML = contacto.map(_m10Contacto).join("");
  contactoSec.style.display = contacto.length ? "" : "none";

  const perfilSec = $("#cv-m10-sec-perfil");
  if (estado.perfil && estado.perfil.trim()) { $("#cv-m10-perfil").innerHTML = escPárrafo(estado.perfil); perfilSec.style.display = ""; }
  else { perfilSec.style.display = "none"; }

  const habSec = $("#cv-m10-sec-habilidades");
  const habilidades = estado.habilidades || [];
  $("#cv-m10-habilidades").innerHTML = habilidades.map((h) => _m10Pill(h.texto)).join("");
  habSec.style.display = habilidades.length ? "" : "none";

  const blandasSec = $("#cv-m10-sec-blandas");
  const blandas = estado.blandas || [];
  $("#cv-m10-blandas").innerHTML = blandas.map((b) => _m10Pill(b.texto)).join("");
  blandasSec.style.display = blandas.length ? "" : "none";

  const idiomasSec = $("#cv-m10-sec-idiomas");
  const idiomas = estado.idiomas || [];
  $("#cv-m10-idiomas").innerHTML = idiomas.map(_m10Idioma).join("");
  idiomasSec.style.display = idiomas.length ? "" : "none";

  const experiencia = estado.experiencia || [];
  $("#cv-m10-experiencia").innerHTML = experiencia.map(_m10Experiencia).join("");

  const eduSec = $("#cv-m10-sec-educacion");
  const educacion = estado.educacion || [];
  $("#cv-m10-educacion").innerHTML = educacion.map(_m10Educacion).join("");
  eduSec.style.display = educacion.length ? "" : "none";

  const certSec = $("#cv-m10-sec-certificaciones");
  const certificaciones = estado.certificaciones || [];
  $("#cv-m10-certificaciones").innerHTML = certificaciones.map(_m10Certificacion).join("");
  certSec.style.display = certificaciones.length ? "" : "none";

  const logrosSec = $("#cv-m10-sec-logros");
  const logros = estado.logros || [];
  $("#cv-m10-logros").innerHTML = logros.map((l) => `<li>${esc(l.texto)}</li>`).join("");
  logrosSec.style.display = logros.length ? "" : "none";

  const referencias = estado.referencias || [];
  $("#cv-m10-referencias").innerHTML = referencias.map(_m10Referencia).join("");
}

// ---- Modelo 11 "Vertex": identidad hexagonal — skills como panal de
// abejas de chips hexagonales entrelazados, foto también hexagonal,
// fondo con crosshatch sutil detrás del header. Persona data/ML. ----
function asegurarEsqueletoModelo11() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo11") return;
  pagina.dataset.esqueleto = "modelo11";
  pagina.innerHTML = `
    <div class="cv-m11-page">
      <header class="cv-m11-header">
        <div class="cv-m11-crosshatch"></div>
        <div class="cv-m11-foto-wrap" id="cv-m11-foto-wrap"><img id="cv-m11-foto" class="cv-m11-foto" alt="Foto de perfil"></div>
        <div class="cv-m11-heading">
          <h1 class="cv-m11-nombre"><span id="cv-m11-nombre"></span> <span class="cv-m11-apellido" id="cv-m11-apellido"></span></h1>
          <div class="cv-m11-puesto" id="cv-m11-puesto"></div>
          <div class="cv-m11-subtitulo" id="cv-m11-subtitulo"></div>
          <div class="cv-m11-contacto" id="cv-m11-contacto"></div>
        </div>
      </header>

      <section class="cv-m11-section" id="cv-m11-sec-perfil">
        <h2 class="cv-m11-h2">${t('perfil')}</h2>
        <p id="cv-m11-perfil" class="cv-m11-perfil-texto"></p>
      </section>

      <section class="cv-m11-section" id="cv-m11-sec-skills">
        <h2 class="cv-m11-h2">${t('habilidades')}</h2>
        <div class="cv-m11-hive" id="cv-m11-skills"></div>
      </section>

      <div class="cv-m11-grid">
        <div class="cv-m11-col-left">
          <section id="cv-m11-sec-experiencia">
            <h2 class="cv-m11-h2">${t('experiencia')}</h2>
            <div id="cv-m11-experiencia"></div>
          </section>
          <section id="cv-m11-sec-logros">
            <h2 class="cv-m11-h2">${t('logros')}</h2>
            <ul id="cv-m11-logros" class="cv-m11-logros-list"></ul>
          </section>
        </div>
        <div class="cv-m11-col-right">
          <section id="cv-m11-sec-blandas">
            <h2 class="cv-m11-h2">${t('blandas')}</h2>
            <div class="cv-m11-hive cv-m11-hive-small" id="cv-m11-blandas"></div>
          </section>
          <section id="cv-m11-sec-idiomas">
            <h2 class="cv-m11-h2">${t('idiomas')}</h2>
            <div id="cv-m11-idiomas"></div>
          </section>
          <section id="cv-m11-sec-educacion">
            <h2 class="cv-m11-h2">${t('educacion')}</h2>
            <div id="cv-m11-educacion"></div>
          </section>
          <section id="cv-m11-sec-certificaciones">
            <h2 class="cv-m11-h2">${t('certificaciones')}</h2>
            <div id="cv-m11-certificaciones"></div>
          </section>
          <section id="cv-m11-sec-referencias">
            <h2 class="cv-m11-h2">${t('referencias')}</h2>
            <div id="cv-m11-referencias"></div>
          </section>
        </div>
      </div>
    </div>
  `;
}
function _m11Mostrar(id, visible) { const el = $(id); if (el) el.style.display = visible ? "" : "none"; }
function _m11HiveHTML(items, claseExtra) {
  const porFila = 4;
  let html = "";
  for (let i = 0; i < items.length; i += porFila) {
    const fila = items.slice(i, i + porFila);
    const esImpar = (i / porFila) % 2 === 1;
    html += `<div class="cv-m11-hive-fila${esImpar ? " cv-m11-hive-fila-offset" : ""}${i > 0 ? " cv-m11-hive-fila-solapada" : ""}">`;
    html += fila.map((it) => `<span class="cv-m11-hex${claseExtra ? " " + claseExtra : ""}"><span class="cv-m11-hex-texto">${esc(it.texto)}</span></span>`).join("");
    html += `</div>`;
  }
  return html;
}
function _m11ContactoHTML(contacto) {
  return contacto.map((c) => `
    <span class="cv-m11-contacto-item">
      <span class="cv-m11-contacto-icono">${iconoDe(c.tipo)}</span>${esc(c.etiqueta ? `${c.etiqueta}: ${c.valor}` : c.valor)}
    </span>
  `).join("");
}
function _m11ExperienciaHTML(experiencia) {
  return experiencia.map((job) => {
    const bullets = (job.bullets || []).map((b) => `<li>${esc(b.texto)}</li>`).join("");
    const herramientas = (job.herramientas || []).map((h) =>
      `<span class="cv-m11-tool">${esc(h.etiqueta)}${h.valor ? ": " + esc(h.valor) : ""}</span>`
    ).join("");
    return `
      <article class="cv-m11-job">
        <div class="cv-m11-job-head">
          <span class="cv-m11-job-rol">${esc(job.rol || job.empresa)}</span>
          <span class="cv-m11-job-fecha">${esc(job.fecha)}</span>
        </div>
        <div class="cv-m11-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa")}</div>
        ${job.descripcion && job.descripcion.trim() ? `<p class="cv-m11-job-desc">${escPárrafo(job.descripcion)}</p>` : ""}
        ${bullets ? `<ul class="cv-m11-job-bullets">${bullets}</ul>` : ""}
        ${herramientas ? `<div class="cv-m11-tools">${herramientas}</div>` : ""}
      </article>
    `;
  }).join("");
}

function renderModelo11() {
  asegurarEsqueletoModelo11();
  $("#cv-m11-nombre").textContent = estado.nombre || "Nombre";
  $("#cv-m11-apellido").textContent = estado.apellido || "Apellido";
  $("#cv-m11-puesto").textContent = estado.puesto || "";
  $("#cv-m11-subtitulo").textContent = estado.subtitulo || "";

  const fotoWrap = $("#cv-m11-foto-wrap");
  if (estado.foto) { $("#cv-m11-foto").src = estado.foto; fotoWrap.style.display = ""; }
  else { fotoWrap.style.display = "none"; }

  $("#cv-m11-contacto").innerHTML = _m11ContactoHTML(estado.contacto || []);

  $("#cv-m11-perfil").innerHTML = escPárrafo(estado.perfil || "");
  _m11Mostrar("#cv-m11-sec-perfil", !!(estado.perfil && estado.perfil.trim()));

  const habilidades = estado.habilidades || [];
  $("#cv-m11-skills").innerHTML = _m11HiveHTML(habilidades);
  _m11Mostrar("#cv-m11-sec-skills", habilidades.length > 0);

  const blandas = estado.blandas || [];
  $("#cv-m11-blandas").innerHTML = _m11HiveHTML(blandas, "cv-m11-hex-small");
  _m11Mostrar("#cv-m11-sec-blandas", blandas.length > 0);

  $("#cv-m11-experiencia").innerHTML = _m11ExperienciaHTML(estado.experiencia || []);
  _m11Mostrar("#cv-m11-sec-experiencia", (estado.experiencia || []).length > 0);

  $("#cv-m11-logros").innerHTML = (estado.logros || []).map((l) => `<li>${esc(l.texto)}</li>`).join("");
  _m11Mostrar("#cv-m11-sec-logros", (estado.logros || []).length > 0);

  $("#cv-m11-idiomas").innerHTML = (estado.idiomas || []).map((i) =>
    `<div class="cv-m11-idioma"><span>${esc(i.nombre)}</span><span class="cv-m11-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");
  _m11Mostrar("#cv-m11-sec-idiomas", (estado.idiomas || []).length > 0);

  $("#cv-m11-educacion").innerHTML = (estado.educacion || []).map((ed) => `
    <div class="cv-m11-edu">
      <div class="cv-m11-edu-inst">${esc(ed.institucion)}</div>
      <div class="cv-m11-edu-fecha">${esc(ed.fecha)}</div>
      ${(ed.bullets || []).length ? `<ul class="cv-m11-edu-bullets">${ed.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");
  _m11Mostrar("#cv-m11-sec-educacion", (estado.educacion || []).length > 0);

  $("#cv-m11-certificaciones").innerHTML = (estado.certificaciones || []).map((c) => `
    <div class="cv-m11-cert"><span class="cv-m11-cert-titulo">${esc(c.titulo)}</span>${c.subtitulo ? `<span class="cv-m11-cert-sub">${esc(c.subtitulo)}</span>` : ""}</div>
  `).join("");
  _m11Mostrar("#cv-m11-sec-certificaciones", (estado.certificaciones || []).length > 0);

  $("#cv-m11-referencias").innerHTML = (estado.referencias || []).map((r) => `
    <div class="cv-m11-referencia">
      <span class="cv-m11-ref-nombre">${esc(r.nombre)}</span>
      ${r.rol ? `<span class="cv-m11-ref-rol">${esc(r.rol)}</span>` : ""}
      ${r.email ? `<span class="cv-m11-ref-dato">${esc(r.email)}</span>` : ""}
      ${r.linkedin ? `<span class="cv-m11-ref-dato">${esc(r.linkedin)}</span>` : ""}
    </div>
  `).join("");
  _m11Mostrar("#cv-m11-sec-referencias", (estado.referencias || []).length > 0);
}

// ---- Modelo 12 "Ledger": papel de libro contable — renglones horizontales
// de fondo en toda la página, experiencia en formato de fila de tabla
// (fecha monoespaciada | rol/empresa | detalle), foto cuadrada con marcas
// de recorte en las esquinas en vez de borde. ----
function asegurarEsqueletoModelo12() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo12") return;
  pagina.dataset.esqueleto = "modelo12";
  pagina.innerHTML = `
    <div class="cv-m12-page">
      <header class="cv-m12-header">
        <div class="cv-m12-foto-marco" id="cv-m12-foto-wrap">
          <img id="cv-m12-foto" class="cv-m12-foto" alt="Foto de perfil">
          <span class="cv-m12-tick cv-m12-tick-tl"></span>
          <span class="cv-m12-tick cv-m12-tick-tr"></span>
          <span class="cv-m12-tick cv-m12-tick-bl"></span>
          <span class="cv-m12-tick cv-m12-tick-br"></span>
        </div>
        <div class="cv-m12-heading">
          <div class="cv-m12-folio">LIBRO MAYOR · FOL. 01</div>
          <h1 class="cv-m12-nombre" id="cv-m12-nombre"></h1>
          <div class="cv-m12-puesto" id="cv-m12-puesto"></div>
          <div class="cv-m12-subtitulo" id="cv-m12-subtitulo"></div>
        </div>
      </header>

      <div class="cv-m12-contacto" id="cv-m12-contacto"></div>

      <section class="cv-m12-seccion" id="cv-m12-sec-perfil">
        <h2 class="cv-m12-titulo">Resumen</h2>
        <p class="cv-m12-perfil" id="cv-m12-perfil"></p>
      </section>

      <section class="cv-m12-seccion" id="cv-m12-sec-experiencia">
        <h2 class="cv-m12-titulo">${t('experiencia')}</h2>
        <div class="cv-m12-tabla-cab"><span>Período</span><span>Puesto y detalle</span></div>
        <div id="cv-m12-experiencia"></div>
      </section>

      <section class="cv-m12-seccion" id="cv-m12-sec-educacion">
        <h2 class="cv-m12-titulo">${t('educacion')}</h2>
        <div id="cv-m12-educacion"></div>
      </section>

      <section class="cv-m12-seccion" id="cv-m12-sec-certificaciones">
        <h2 class="cv-m12-titulo">${t('certificaciones')}</h2>
        <div id="cv-m12-certificaciones"></div>
      </section>

      <div class="cv-m12-cols">
        <section class="cv-m12-seccion" id="cv-m12-sec-skills">
          <h2 class="cv-m12-titulo">${t('competencias')}</h2>
          <div id="cv-m12-skills"></div>
          <div id="cv-m12-blandas"></div>
        </section>
        <section class="cv-m12-seccion" id="cv-m12-sec-idiomas">
          <h2 class="cv-m12-titulo">${t('idiomas')}</h2>
          <div id="cv-m12-idiomas"></div>
        </section>
      </div>

      <section class="cv-m12-seccion" id="cv-m12-sec-logros">
        <h2 class="cv-m12-titulo">${t('logros')}</h2>
        <div id="cv-m12-logros"></div>
      </section>

      <section class="cv-m12-seccion" id="cv-m12-sec-referencias">
        <h2 class="cv-m12-titulo">${t('referencias')}</h2>
        <div id="cv-m12-referencias"></div>
      </section>
    </div>
  `;
}
function _m12Mostrar(id, visible) { const el = $(id); if (el) el.style.display = visible ? "" : "none"; }
function _m12Num(i) { return String(i + 1).padStart(2, "0"); }
function _m12Linea(marca, texto, valor) {
  return `
    <div class="cv-m12-linea">
      <span class="cv-m12-linea-marca">${marca}</span>
      <span class="cv-m12-linea-txt">${texto}</span>
      ${valor != null ? `<span class="cv-m12-leader"></span><span class="cv-m12-linea-val">${valor}</span>` : ""}
    </div>`;
}
function _m12ContactoHTML(contacto) {
  return contacto.map((c) => _m12Linea(
    `<span class="cv-m12-linea-icono">${iconoDe(c.tipo)}</span>`,
    esc(c.etiqueta ? `${c.etiqueta}: ${c.valor}` : c.valor)
  )).join("");
}
function _m12ListaNumerada(items) {
  return items.map((it, i) => _m12Linea(_m12Num(i), esc(it.texto))).join("");
}
function _m12IdiomasHTML(idiomas) {
  return idiomas.map((idm, i) => _m12Linea(_m12Num(i), esc(idm.nombre), esc(idm.nivel))).join("");
}
function _m12CertificacionesHTML(cert) {
  return cert.map((c, i) => `
    <div class="cv-m12-cert">
      <span class="cv-m12-cert-num">${_m12Num(i)}</span>
      <div class="cv-m12-cert-txt">
        <div class="cv-m12-cert-titulo">${esc(c.titulo)}</div>
        ${c.subtitulo ? `<div class="cv-m12-cert-sub">${esc(c.subtitulo)}</div>` : ""}
      </div>
    </div>`).join("");
}
function _m12ExperienciaHTML(experiencia) {
  return experiencia.map((job) => {
    const bullets = (job.bullets || []).map((b) => `<li>${esc(b.texto)}</li>`).join("");
    const herramientas = (job.herramientas || []).map((h) =>
      `<span class="cv-m12-tool">${esc(h.etiqueta)}${h.valor ? ": " + esc(h.valor) : ""}</span>`
    ).join("");
    return `
      <article class="cv-m12-fila">
        <div class="cv-m12-fila-fecha">${esc(job.fecha)}</div>
        <div class="cv-m12-fila-cont">
          <div class="cv-m12-fila-head">
            <span class="cv-m12-fila-rol">${esc(job.rol || job.empresa)}</span>
            <span class="cv-m12-fila-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa")}</span>
          </div>
          ${job.descripcion && job.descripcion.trim() ? `<p class="cv-m12-fila-desc">${escPárrafo(job.descripcion)}</p>` : ""}
          ${bullets ? `<ul class="cv-m12-fila-bullets">${bullets}</ul>` : ""}
          ${herramientas ? `<div class="cv-m12-fila-tools">${herramientas}</div>` : ""}
        </div>
      </article>`;
  }).join("");
}
function _m12EducacionHTML(educacion) {
  return educacion.map((ed) => `
    <article class="cv-m12-fila cv-m12-fila-edu">
      <div class="cv-m12-fila-fecha">${esc(ed.fecha)}</div>
      <div class="cv-m12-fila-cont">
        <div class="cv-m12-fila-head"><span class="cv-m12-fila-rol">${esc(ed.institucion)}</span></div>
        ${(ed.bullets || []).length ? `<ul class="cv-m12-fila-bullets">${ed.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
      </div>
    </article>`).join("");
}
function _m12ReferenciasHTML(referencias) {
  return referencias.map((r, i) => `
    <div class="cv-m12-ref">
      <span class="cv-m12-ref-num">${_m12Num(i)}</span>
      <div class="cv-m12-ref-txt">
        <span class="cv-m12-ref-nombre">${esc(r.nombre)}</span>${r.rol ? ` — ${esc(r.rol)}` : ""}
        ${r.email || r.linkedin ? `<div class="cv-m12-ref-datos">${[r.email, r.linkedin].filter(Boolean).map((v) => esc(v)).join("  ·  ")}</div>` : ""}
      </div>
    </div>`).join("");
}

function renderModelo12() {
  asegurarEsqueletoModelo12();
  $("#cv-m12-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m12-puesto").textContent = estado.puesto || "";
  $("#cv-m12-subtitulo").textContent = estado.subtitulo || "";
  _m12Mostrar("#cv-m12-subtitulo", !!(estado.subtitulo && estado.subtitulo.trim()));

  const fotoWrap = $("#cv-m12-foto-wrap");
  if (estado.foto) { $("#cv-m12-foto").src = estado.foto; fotoWrap.style.display = ""; }
  else { fotoWrap.style.display = "none"; }

  $("#cv-m12-contacto").innerHTML = _m12ContactoHTML(estado.contacto || []);
  _m12Mostrar("#cv-m12-contacto", (estado.contacto || []).length > 0);

  $("#cv-m12-perfil").innerHTML = escPárrafo(estado.perfil || "");
  _m12Mostrar("#cv-m12-sec-perfil", !!(estado.perfil && estado.perfil.trim()));

  $("#cv-m12-experiencia").innerHTML = _m12ExperienciaHTML(estado.experiencia || []);
  _m12Mostrar("#cv-m12-sec-experiencia", (estado.experiencia || []).length > 0);

  $("#cv-m12-educacion").innerHTML = _m12EducacionHTML(estado.educacion || []);
  _m12Mostrar("#cv-m12-sec-educacion", (estado.educacion || []).length > 0);

  $("#cv-m12-certificaciones").innerHTML = _m12CertificacionesHTML(estado.certificaciones || []);
  _m12Mostrar("#cv-m12-sec-certificaciones", (estado.certificaciones || []).length > 0);

  $("#cv-m12-skills").innerHTML = _m12ListaNumerada(estado.habilidades || []);
  $("#cv-m12-blandas").innerHTML = (estado.blandas || []).length
    ? `<h3 class="cv-m12-sublista">Blandas</h3>${_m12ListaNumerada(estado.blandas || [])}` : "";
  _m12Mostrar("#cv-m12-sec-skills", (estado.habilidades || []).length > 0 || (estado.blandas || []).length > 0);

  $("#cv-m12-idiomas").innerHTML = _m12IdiomasHTML(estado.idiomas || []);
  _m12Mostrar("#cv-m12-sec-idiomas", (estado.idiomas || []).length > 0);

  $("#cv-m12-logros").innerHTML = _m12ListaNumerada(estado.logros || []);
  _m12Mostrar("#cv-m12-sec-logros", (estado.logros || []).length > 0);

  $("#cv-m12-referencias").innerHTML = _m12ReferenciasHTML(estado.referencias || []);
  _m12Mostrar("#cv-m12-sec-referencias", (estado.referencias || []).length > 0);
}

// ---- Modelo 13 "Prism": campo facetado (triángulos superpuestos)
// detrás de foto+nombre, foto recortada en rombo, viñetas de sección
// dibujadas como triángulo CSS, dos columnas. Persona artista/diseño. ----
function asegurarEsqueletoModelo13() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo13") return;
  pagina.dataset.esqueleto = "modelo13";
  pagina.innerHTML = `
    <div class="cv-m13-page">
      <header class="cv-m13-header">
        <div class="cv-m13-facets">
          <span class="cv-m13-facet cv-m13-facet-a"></span>
          <span class="cv-m13-facet cv-m13-facet-b"></span>
          <span class="cv-m13-facet cv-m13-facet-c"></span>
          <span class="cv-m13-facet cv-m13-facet-d"></span>
          <div class="cv-m13-foto-marco" id="cv-m13-foto-wrap">
            <img id="cv-m13-foto" class="cv-m13-foto" alt="Foto de perfil">
          </div>
        </div>
        <div class="cv-m13-heading">
          <h1 class="cv-m13-nombre" id="cv-m13-nombre"></h1>
          <div class="cv-m13-puesto" id="cv-m13-puesto"></div>
          <div class="cv-m13-subtitulo" id="cv-m13-subtitulo"></div>
          <div class="cv-m13-contacto" id="cv-m13-contacto"></div>
        </div>
      </header>

      <div class="cv-m13-body">
        <div class="cv-m13-col-main">
          <section class="cv-m13-seccion" id="cv-m13-sec-perfil">
            <h2 class="cv-m13-titulo">${t('perfil')}</h2>
            <p id="cv-m13-perfil"></p>
          </section>
          <section class="cv-m13-seccion" id="cv-m13-sec-experiencia">
            <h2 class="cv-m13-titulo">${t('experiencia')}</h2>
            <div id="cv-m13-experiencia"></div>
          </section>
          <section class="cv-m13-seccion" id="cv-m13-sec-educacion">
            <h2 class="cv-m13-titulo">${t('educacion')}</h2>
            <div id="cv-m13-educacion"></div>
          </section>
        </div>
        <aside class="cv-m13-col-side">
          <section class="cv-m13-seccion" id="cv-m13-sec-skills">
            <h2 class="cv-m13-titulo">${t('habilidades')}</h2>
            <div id="cv-m13-skills"></div>
          </section>
          <section class="cv-m13-seccion" id="cv-m13-sec-blandas">
            <h2 class="cv-m13-titulo">Blandas</h2>
            <div id="cv-m13-blandas"></div>
          </section>
          <section class="cv-m13-seccion" id="cv-m13-sec-idiomas">
            <h2 class="cv-m13-titulo">${t('idiomas')}</h2>
            <div id="cv-m13-idiomas"></div>
          </section>
          <section class="cv-m13-seccion" id="cv-m13-sec-certificaciones">
            <h2 class="cv-m13-titulo">${t('certificaciones')}</h2>
            <div id="cv-m13-certificaciones"></div>
          </section>
          <section class="cv-m13-seccion" id="cv-m13-sec-logros">
            <h2 class="cv-m13-titulo">${t('logros')}</h2>
            <ul id="cv-m13-logros"></ul>
          </section>
          <section class="cv-m13-seccion" id="cv-m13-sec-referencias">
            <h2 class="cv-m13-titulo">${t('referencias')}</h2>
            <div id="cv-m13-referencias"></div>
          </section>
        </aside>
      </div>
    </div>
  `;
}
function _m13Mostrar(id, visible) { const el = $(id); if (el) el.style.display = visible ? "" : "none"; }
function _m13ContactoHTML(contacto) {
  return contacto.map((c) => `
    <span class="cv-m13-contacto-item">
      <span class="cv-m13-contacto-icono">${iconoDe(c.tipo)}</span>${esc(c.etiqueta ? `${c.etiqueta}: ${c.valor}` : c.valor)}
    </span>`).join("");
}
function _m13ExperienciaHTML(experiencia) {
  return experiencia.map((job) => {
    const bullets = (job.bullets || []).map((b) => `<li>${esc(b.texto)}</li>`).join("");
    const herramientas = (job.herramientas || []).map((h) =>
      `<span class="cv-m13-tool">${esc(h.etiqueta)}${h.valor ? ": " + esc(h.valor) : ""}</span>`
    ).join("");
    return `
      <article class="cv-m13-job">
        <div class="cv-m13-job-head">
          <span class="cv-m13-job-rol">${esc(job.rol || job.empresa)}</span>
          <span class="cv-m13-job-fecha">${esc(job.fecha)}</span>
        </div>
        <div class="cv-m13-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa")}</div>
        ${job.descripcion && job.descripcion.trim() ? `<p class="cv-m13-job-desc">${escPárrafo(job.descripcion)}</p>` : ""}
        ${bullets ? `<ul class="cv-m13-job-bullets">${bullets}</ul>` : ""}
        ${herramientas ? `<div class="cv-m13-job-tools">${herramientas}</div>` : ""}
      </article>`;
  }).join("");
}
function _m13EducacionHTML(educacion) {
  return educacion.map((ed) => `
    <article class="cv-m13-edu">
      <div class="cv-m13-edu-head">
        <span class="cv-m13-edu-inst">${esc(ed.institucion)}</span>
        <span class="cv-m13-edu-fecha">${esc(ed.fecha)}</span>
      </div>
      ${(ed.bullets || []).length ? `<ul class="cv-m13-edu-bullets">${ed.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </article>`).join("");
}
function _m13CertificacionesHTML(cert) {
  return cert.map((c) => `
    <div class="cv-m13-cert">
      <span class="cv-m13-cert-titulo">${esc(c.titulo)}</span>
      ${c.subtitulo ? `<span class="cv-m13-cert-sub">${esc(c.subtitulo)}</span>` : ""}
    </div>`).join("");
}
function _m13ReferenciasHTML(referencias) {
  return referencias.map((r) => `
    <div class="cv-m13-ref">
      <span class="cv-m13-ref-nombre">${esc(r.nombre)}</span>${r.rol ? ` — <span class="cv-m13-ref-rol">${esc(r.rol)}</span>` : ""}
      ${r.email ? `<div class="cv-m13-ref-dato">${esc(r.email)}</div>` : ""}
      ${r.linkedin ? `<div class="cv-m13-ref-dato">${esc(r.linkedin)}</div>` : ""}
    </div>`).join("");
}

function renderModelo13() {
  asegurarEsqueletoModelo13();
  $("#cv-m13-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m13-puesto").textContent = estado.puesto || "";
  $("#cv-m13-subtitulo").textContent = estado.subtitulo || "";
  _m13Mostrar("#cv-m13-subtitulo", !!(estado.subtitulo && estado.subtitulo.trim()));

  const fotoWrap = $("#cv-m13-foto-wrap");
  if (estado.foto) { $("#cv-m13-foto").src = estado.foto; fotoWrap.style.display = ""; }
  else { fotoWrap.style.display = "none"; }

  $("#cv-m13-contacto").innerHTML = _m13ContactoHTML(estado.contacto || []);
  _m13Mostrar("#cv-m13-contacto", (estado.contacto || []).length > 0);

  $("#cv-m13-perfil").innerHTML = escPárrafo(estado.perfil || "");
  _m13Mostrar("#cv-m13-sec-perfil", !!(estado.perfil && estado.perfil.trim()));

  $("#cv-m13-experiencia").innerHTML = _m13ExperienciaHTML(estado.experiencia || []);
  _m13Mostrar("#cv-m13-sec-experiencia", (estado.experiencia || []).length > 0);

  $("#cv-m13-educacion").innerHTML = _m13EducacionHTML(estado.educacion || []);
  _m13Mostrar("#cv-m13-sec-educacion", (estado.educacion || []).length > 0);

  $("#cv-m13-skills").innerHTML = (estado.habilidades || []).map((h) => `<span class="cv-m13-chip">${esc(h.texto)}</span>`).join("");
  _m13Mostrar("#cv-m13-sec-skills", (estado.habilidades || []).length > 0);

  $("#cv-m13-blandas").innerHTML = (estado.blandas || []).map((b) => `<span class="cv-m13-chip cv-m13-chip-soft">${esc(b.texto)}</span>`).join("");
  _m13Mostrar("#cv-m13-sec-blandas", (estado.blandas || []).length > 0);

  $("#cv-m13-idiomas").innerHTML = (estado.idiomas || []).map((i) =>
    `<div class="cv-m13-idioma"><span>${esc(i.nombre)}</span><span class="cv-m13-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");
  _m13Mostrar("#cv-m13-sec-idiomas", (estado.idiomas || []).length > 0);

  $("#cv-m13-certificaciones").innerHTML = _m13CertificacionesHTML(estado.certificaciones || []);
  _m13Mostrar("#cv-m13-sec-certificaciones", (estado.certificaciones || []).length > 0);

  $("#cv-m13-logros").innerHTML = (estado.logros || []).map((l) => `<li>${esc(l.texto)}</li>`).join("");
  _m13Mostrar("#cv-m13-sec-logros", (estado.logros || []).length > 0);

  $("#cv-m13-referencias").innerHTML = _m13ReferenciasHTML(estado.referencias || []);
  _m13Mostrar("#cv-m13-sec-referencias", (estado.referencias || []).length > 0);
}

// ---- Modelo 14 "Circuit": tarjeta oscura flotante con barra de título
// tipo ventana, contenido en "paneles" con pestaña de esquina rotulada.
// Persona IT/DevOps. ----
function asegurarEsqueletoModelo14() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo14") return;
  pagina.dataset.esqueleto = "modelo14";
  pagina.innerHTML = `
    <div class="cv-m14-outer">
      <div class="cv-m14-page">
        <div class="cv-m14-titlebar">
          <span class="cv-m14-dot cv-m14-dot-r"></span>
          <span class="cv-m14-dot cv-m14-dot-y"></span>
          <span class="cv-m14-dot cv-m14-dot-g"></span>
          <div class="cv-m14-avatar" id="cv-m14-foto-wrap"><img id="cv-m14-foto" class="cv-m14-foto" alt="Foto de perfil"></div>
          <div class="cv-m14-titlebar-text">
            <span class="cv-m14-titlebar-nombre" id="cv-m14-nombre"></span>
            <span class="cv-m14-titlebar-puesto" id="cv-m14-puesto"></span>
          </div>
        </div>

        <div class="cv-m14-body">
          <div class="cv-m14-subtitulo" id="cv-m14-subtitulo"></div>

          <div class="cv-m14-panel" id="cv-m14-sec-contacto" data-tab="contact">
            <div id="cv-m14-contacto"></div>
          </div>

          <div class="cv-m14-panel" id="cv-m14-sec-perfil" data-tab="profile.md">
            <p id="cv-m14-perfil"></p>
          </div>

          <div class="cv-m14-panel" id="cv-m14-sec-experiencia" data-tab="experience.log">
            <div id="cv-m14-experiencia"></div>
          </div>

          <div class="cv-m14-panel" id="cv-m14-sec-educacion" data-tab="education">
            <div id="cv-m14-educacion"></div>
          </div>

          <div class="cv-m14-panel" id="cv-m14-sec-certificaciones" data-tab="certs">
            <div id="cv-m14-certificaciones"></div>
          </div>

          <div class="cv-m14-grid2">
            <div class="cv-m14-panel" id="cv-m14-sec-skills" data-tab="stack">
              <div id="cv-m14-skills"></div>
              <div id="cv-m14-blandas"></div>
            </div>
            <div class="cv-m14-panel" id="cv-m14-sec-idiomas" data-tab="lang">
              <div id="cv-m14-idiomas"></div>
            </div>
          </div>

          <div class="cv-m14-panel" id="cv-m14-sec-logros" data-tab="achievements">
            <ul id="cv-m14-logros"></ul>
          </div>

          <div class="cv-m14-panel" id="cv-m14-sec-referencias" data-tab="refs">
            <div id="cv-m14-referencias"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function _m14Mostrar(id, visible) { const el = $(id); if (el) el.style.display = visible ? "" : "none"; }
function _m14ContactoHTML(contacto) {
  return contacto.map((c) => `
    <div class="cv-m14-row">
      <span class="cv-m14-row-icono">${iconoDe(c.tipo)}</span>
      ${c.etiqueta ? `<span class="cv-m14-tag">${esc(c.etiqueta)}</span>` : ""}
      <span class="cv-m14-row-txt">${contactoValorHTML(c)}</span>
    </div>`).join("");
}
function _m14ExperienciaHTML(experiencia) {
  return experiencia.map((job) => {
    const bullets = (job.bullets || []).map((b) => `<li>${esc(b.texto)}</li>`).join("");
    const herramientas = (job.herramientas || []).map((h) =>
      `<span class="cv-m14-tag">${esc(h.etiqueta)}${h.valor ? ": " + esc(h.valor) : ""}</span>`
    ).join("");
    return `
      <article class="cv-m14-job">
        <div class="cv-m14-job-head">
          <span class="cv-m14-job-rol">${esc(job.rol || job.empresa)}</span>
          <span class="cv-m14-tag cv-m14-tag-fecha">${esc(job.fecha)}</span>
        </div>
        <div class="cv-m14-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa")}</div>
        ${job.descripcion && job.descripcion.trim() ? `<p class="cv-m14-job-desc">${escPárrafo(job.descripcion)}</p>` : ""}
        ${bullets ? `<ul class="cv-m14-job-bullets">${bullets}</ul>` : ""}
        ${herramientas ? `<div class="cv-m14-job-tools">${herramientas}</div>` : ""}
      </article>`;
  }).join("");
}
function _m14EducacionHTML(educacion) {
  return educacion.map((ed) => `
    <article class="cv-m14-job">
      <div class="cv-m14-job-head">
        <span class="cv-m14-job-rol">${esc(ed.institucion)}</span>
        <span class="cv-m14-tag cv-m14-tag-fecha">${esc(ed.fecha)}</span>
      </div>
      ${(ed.bullets || []).length ? `<ul class="cv-m14-job-bullets">${ed.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </article>`).join("");
}
function _m14CertificacionesHTML(cert) {
  return cert.map((c) => `
    <div class="cv-m14-cert">
      <span class="cv-m14-cert-titulo">${esc(c.titulo)}</span>
      ${c.subtitulo ? `<span class="cv-m14-cert-sub">${esc(c.subtitulo)}</span>` : ""}
    </div>`).join("");
}
function _m14ReferenciasHTML(referencias) {
  return referencias.map((r) => `
    <div class="cv-m14-ref">
      <span class="cv-m14-ref-nombre">${esc(r.nombre)}</span>${r.rol ? ` <span class="cv-m14-ref-rol">— ${esc(r.rol)}</span>` : ""}
      ${r.email ? `<span class="cv-m14-tag">${esc(r.email)}</span>` : ""}
      ${r.linkedin ? `<span class="cv-m14-tag">${esc(r.linkedin)}</span>` : ""}
    </div>`).join("");
}

function renderModelo14() {
  asegurarEsqueletoModelo14();
  $("#cv-m14-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m14-puesto").textContent = estado.puesto || "";
  $("#cv-m14-subtitulo").textContent = estado.subtitulo || "";
  _m14Mostrar("#cv-m14-subtitulo", !!(estado.subtitulo && estado.subtitulo.trim()));

  const fotoWrap = $("#cv-m14-foto-wrap");
  if (estado.foto) { $("#cv-m14-foto").src = estado.foto; fotoWrap.style.display = ""; }
  else { fotoWrap.style.display = "none"; }

  $("#cv-m14-contacto").innerHTML = _m14ContactoHTML(estado.contacto || []);
  _m14Mostrar("#cv-m14-sec-contacto", (estado.contacto || []).length > 0);

  $("#cv-m14-perfil").innerHTML = escPárrafo(estado.perfil || "");
  _m14Mostrar("#cv-m14-sec-perfil", !!(estado.perfil && estado.perfil.trim()));

  $("#cv-m14-experiencia").innerHTML = _m14ExperienciaHTML(estado.experiencia || []);
  _m14Mostrar("#cv-m14-sec-experiencia", (estado.experiencia || []).length > 0);

  $("#cv-m14-educacion").innerHTML = _m14EducacionHTML(estado.educacion || []);
  _m14Mostrar("#cv-m14-sec-educacion", (estado.educacion || []).length > 0);

  $("#cv-m14-certificaciones").innerHTML = _m14CertificacionesHTML(estado.certificaciones || []);
  _m14Mostrar("#cv-m14-sec-certificaciones", (estado.certificaciones || []).length > 0);

  $("#cv-m14-skills").innerHTML = (estado.habilidades || []).map((h) => `<span class="cv-m14-chip">${esc(h.texto)}</span>`).join("");
  $("#cv-m14-blandas").innerHTML = (estado.blandas || []).length
    ? `<div class="cv-m14-panel-sub">soft-skills</div>${(estado.blandas || []).map((b) => `<span class="cv-m14-chip cv-m14-chip-soft">${esc(b.texto)}</span>`).join("")}` : "";
  _m14Mostrar("#cv-m14-sec-skills", (estado.habilidades || []).length > 0 || (estado.blandas || []).length > 0);

  $("#cv-m14-idiomas").innerHTML = (estado.idiomas || []).map((i) =>
    `<div class="cv-m14-row"><span class="cv-m14-row-txt">${esc(i.nombre)}</span><span class="cv-m14-tag">${esc(i.nivel)}</span></div>`
  ).join("");
  _m14Mostrar("#cv-m14-sec-idiomas", (estado.idiomas || []).length > 0);

  $("#cv-m14-logros").innerHTML = (estado.logros || []).map((l) => `<li>${esc(l.texto)}</li>`).join("");
  _m14Mostrar("#cv-m14-sec-logros", (estado.logros || []).length > 0);

  $("#cv-m14-referencias").innerHTML = _m14ReferenciasHTML(estado.referencias || []);
  _m14Mostrar("#cv-m14-sec-referencias", (estado.referencias || []).length > 0);
}

// ---- Modelo 15 "Solstice": banda degradada tipo atardecer arriba,
// foto circular ("sol") que atraviesa la línea de horizonte, fondo con
// curvas de nivel topográficas muy sutiles. Persona outdoor/guía. ----
function asegurarEsqueletoModelo15() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo15") return;
  pagina.dataset.esqueleto = "modelo15";
  pagina.innerHTML = `
    <div class="cv-m15-page">
      <div class="cv-m15-sky">
        <h1 class="cv-m15-nombre" id="cv-m15-nombre"></h1>
        <div class="cv-m15-puesto" id="cv-m15-puesto"></div>
        <div class="cv-m15-subtitulo" id="cv-m15-subtitulo"></div>
      </div>
      <div class="cv-m15-photowrap" id="cv-m15-foto-wrap"><img id="cv-m15-foto" class="cv-m15-foto" alt="Foto de perfil"></div>
      <div class="cv-m15-contacto" id="cv-m15-contacto"></div>

      <div class="cv-m15-body">
        <div class="cv-m15-inner">

          <section class="cv-m15-section" id="cv-m15-sec-perfil">
            <h2 class="cv-m15-h2">${t('perfil')}</h2>
            <p class="cv-m15-perfil" id="cv-m15-perfil"></p>
          </section>

          <section class="cv-m15-section cv-m15-strip" id="cv-m15-sec-comp">
            <div class="cv-m15-strip-col">
              <h3 class="cv-m15-h3">${t('habilidades')}</h3>
              <div id="cv-m15-skills"></div>
            </div>
            <div class="cv-m15-strip-col">
              <h3 class="cv-m15-h3">Fortalezas</h3>
              <div id="cv-m15-blandas"></div>
            </div>
            <div class="cv-m15-strip-col">
              <h3 class="cv-m15-h3">${t('idiomas')}</h3>
              <div id="cv-m15-idiomas"></div>
            </div>
          </section>

          <section class="cv-m15-section" id="cv-m15-sec-experiencia">
            <h2 class="cv-m15-h2">Ruta profesional</h2>
            <div class="cv-m15-trail" id="cv-m15-experiencia"></div>
          </section>

          <section class="cv-m15-section" id="cv-m15-sec-educacion">
            <h2 class="cv-m15-h2">${t('educacion')}</h2>
            <div id="cv-m15-educacion"></div>
          </section>

          <section class="cv-m15-section" id="cv-m15-sec-certificaciones">
            <h2 class="cv-m15-h2">${t('certificaciones')}</h2>
            <div id="cv-m15-certificaciones"></div>
          </section>

          <section class="cv-m15-section" id="cv-m15-sec-logros">
            <h2 class="cv-m15-h2">${t('logros')}</h2>
            <ul class="cv-m15-logros" id="cv-m15-logros"></ul>
          </section>

          <section class="cv-m15-section" id="cv-m15-sec-referencias">
            <h2 class="cv-m15-h2">${t('referencias')}</h2>
            <div id="cv-m15-referencias"></div>
          </section>

        </div>
      </div>
    </div>
  `;
}
function _m15Mostrar(id, visible) { const el = $(id); if (el) el.style.display = visible ? "" : "none"; }
function _m15ContactoHTML(contacto) {
  return contacto.map((c) => `
    <span class="cv-m15-contacto-item"><span class="cv-m15-contacto-icono">${iconoDe(c.tipo)}</span>${contactoValorHTML(c)}</span>
  `).join("");
}
function _m15ExperienciaHTML(experiencia) {
  return experiencia.map((job) => {
    const bullets = (job.bullets || []).map((b) => `<li>${esc(b.texto)}</li>`).join("");
    const herramientas = (job.herramientas || []).map((h) => `${esc(h.etiqueta)}${h.valor ? ": " + esc(h.valor) : ""}`).join("  ·  ");
    return `
      <article class="cv-m15-job">
        <div class="cv-m15-job-head">
          <span class="cv-m15-job-rol">${esc(job.rol || job.empresa)}</span>
          <span class="cv-m15-job-fecha">${esc(job.fecha)}</span>
        </div>
        <div class="cv-m15-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa")}</div>
        ${job.descripcion && job.descripcion.trim() ? `<p class="cv-m15-job-desc">${escPárrafo(job.descripcion)}</p>` : ""}
        ${bullets ? `<ul class="cv-m15-job-bullets">${bullets}</ul>` : ""}
        ${herramientas ? `<div class="cv-m15-job-tools">${herramientas}</div>` : ""}
      </article>
    `;
  }).join("");
}

function renderModelo15() {
  asegurarEsqueletoModelo15();
  $("#cv-m15-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m15-puesto").textContent = estado.puesto || "";
  $("#cv-m15-subtitulo").textContent = estado.subtitulo || "";
  _m15Mostrar("#cv-m15-subtitulo", !!(estado.subtitulo && estado.subtitulo.trim()));

  const fotoWrap = $("#cv-m15-foto-wrap");
  if (estado.foto) { $("#cv-m15-foto").src = estado.foto; fotoWrap.style.display = ""; }
  else { fotoWrap.style.display = "none"; }

  $("#cv-m15-contacto").innerHTML = _m15ContactoHTML(estado.contacto || []);
  _m15Mostrar("#cv-m15-contacto", (estado.contacto || []).length > 0);

  $("#cv-m15-perfil").innerHTML = escPárrafo(estado.perfil || "");
  _m15Mostrar("#cv-m15-sec-perfil", !!(estado.perfil && estado.perfil.trim()));

  $("#cv-m15-skills").innerHTML = (estado.habilidades || []).map((h) => `<span class="cv-m15-chip">${esc(h.texto)}</span>`).join("");
  $("#cv-m15-blandas").innerHTML = (estado.blandas || []).map((b) => `<span class="cv-m15-chip cv-m15-chip-soft">${esc(b.texto)}</span>`).join("");
  $("#cv-m15-idiomas").innerHTML = (estado.idiomas || []).map((i) =>
    `<div class="cv-m15-idioma"><span>${esc(i.nombre)}</span><span class="cv-m15-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");
  _m15Mostrar("#cv-m15-sec-comp", (estado.habilidades || []).length > 0 || (estado.blandas || []).length > 0 || (estado.idiomas || []).length > 0);

  $("#cv-m15-experiencia").innerHTML = _m15ExperienciaHTML(estado.experiencia || []);
  _m15Mostrar("#cv-m15-sec-experiencia", (estado.experiencia || []).length > 0);

  $("#cv-m15-educacion").innerHTML = (estado.educacion || []).map((ed) => `
    <article class="cv-m15-edu">
      <div class="cv-m15-edu-head">
        <span class="cv-m15-edu-inst">${esc(ed.institucion)}</span>
        <span class="cv-m15-edu-fecha">${esc(ed.fecha)}</span>
      </div>
      ${(ed.bullets || []).length ? `<ul class="cv-m15-edu-bullets">${ed.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </article>
  `).join("");
  _m15Mostrar("#cv-m15-sec-educacion", (estado.educacion || []).length > 0);

  $("#cv-m15-certificaciones").innerHTML = (estado.certificaciones || []).map((c) => `
    <div class="cv-m15-cert"><span class="cv-m15-cert-titulo">${esc(c.titulo)}</span>${c.subtitulo ? ` — <span class="cv-m15-cert-sub">${esc(c.subtitulo)}</span>` : ""}</div>
  `).join("");
  _m15Mostrar("#cv-m15-sec-certificaciones", (estado.certificaciones || []).length > 0);

  $("#cv-m15-logros").innerHTML = (estado.logros || []).map((l) => `<li>${esc(l.texto)}</li>`).join("");
  _m15Mostrar("#cv-m15-sec-logros", (estado.logros || []).length > 0);

  $("#cv-m15-referencias").innerHTML = (estado.referencias || []).map((r) => `
    <div class="cv-m15-referencia">
      <span class="cv-m15-ref-nombre">${esc(r.nombre)}</span>${r.rol ? ` — <span class="cv-m15-ref-rol">${esc(r.rol)}</span>` : ""}
      ${r.email ? `<br><span class="cv-m15-ref-dato">${esc(r.email)}</span>` : ""}
      ${r.linkedin ? `<span class="cv-m15-ref-dato"> · ${esc(r.linkedin)}</span>` : ""}
    </div>
  `).join("");
  _m15Mostrar("#cv-m15-sec-referencias", (estado.referencias || []).length > 0);
}

// ---- Modelo 16 "Aperture": foto en anillo tipo diafragma de cámara con
// marcas de f-stop, encabezados con etiqueta ƒ/n.n, separadores tipo
// tira de negativos. Persona fotógrafo/creativo visual. ----
function asegurarEsqueletoModelo16() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo16") return;
  pagina.dataset.esqueleto = "modelo16";
  pagina.innerHTML = `
    <div class="cv-m16-page">
      <header class="cv-m16-header">
        <div class="cv-m16-photoblock">
          <div class="cv-m16-aperture" id="cv-m16-foto-wrap">
            <div class="cv-m16-ticks" id="cv-m16-ticks"></div>
            <img id="cv-m16-foto" class="cv-m16-foto" alt="Foto de perfil">
          </div>
        </div>
        <div class="cv-m16-heading">
          <h1 class="cv-m16-nombre" id="cv-m16-nombre"></h1>
          <div class="cv-m16-puesto" id="cv-m16-puesto"></div>
          <div class="cv-m16-subtitulo" id="cv-m16-subtitulo"></div>
          <div class="cv-m16-contacto" id="cv-m16-contacto"></div>
        </div>
      </header>

      <div class="cv-m16-filmstrip"></div>

      <section class="cv-m16-section" id="cv-m16-sec-perfil">
        <h2 class="cv-m16-h2"><span class="cv-m16-tag">ƒ/1.4</span>${t('perfil')}</h2>
        <p class="cv-m16-perfil" id="cv-m16-perfil"></p>
      </section>

      <div class="cv-m16-filmstrip"></div>

      <section class="cv-m16-section" id="cv-m16-sec-experiencia">
        <h2 class="cv-m16-h2"><span class="cv-m16-tag">ƒ/2</span>${t('experiencia')}</h2>
        <div id="cv-m16-experiencia"></div>
      </section>

      <div class="cv-m16-filmstrip"></div>

      <section class="cv-m16-section cv-m16-cols" id="cv-m16-sec-eduCert">
        <div>
          <h2 class="cv-m16-h2"><span class="cv-m16-tag">ƒ/2.8</span>${t('educacion')}</h2>
          <div id="cv-m16-educacion"></div>
        </div>
        <div>
          <h2 class="cv-m16-h2"><span class="cv-m16-tag">ƒ/4</span>${t('certificaciones')}</h2>
          <div id="cv-m16-certificaciones"></div>
        </div>
      </section>

      <div class="cv-m16-filmstrip"></div>

      <section class="cv-m16-section cv-m16-cols" id="cv-m16-sec-comp">
        <div>
          <h2 class="cv-m16-h2"><span class="cv-m16-tag">ƒ/5.6</span>${t('competencias')}</h2>
          <div id="cv-m16-skills"></div>
          <div id="cv-m16-blandas"></div>
        </div>
        <div>
          <h2 class="cv-m16-h2"><span class="cv-m16-tag">ƒ/8</span>${t('idiomas')}</h2>
          <div id="cv-m16-idiomas"></div>
        </div>
      </section>

      <div class="cv-m16-filmstrip"></div>

      <section class="cv-m16-section" id="cv-m16-sec-logros">
        <h2 class="cv-m16-h2"><span class="cv-m16-tag">ƒ/11</span>${t('logros')}</h2>
        <ul class="cv-m16-logros" id="cv-m16-logros"></ul>
      </section>

      <section class="cv-m16-section" id="cv-m16-sec-referencias">
        <h2 class="cv-m16-h2"><span class="cv-m16-tag">ƒ/16</span>${t('referencias')}</h2>
        <div id="cv-m16-referencias"></div>
      </section>
    </div>
  `;
  $("#cv-m16-ticks").innerHTML = _m16TicksHTML();
}
function _m16TicksHTML() {
  let html = "";
  for (let i = 0; i < 16; i++) {
    html += `<span class="cv-m16-tick" style="transform: rotate(${(360 / 16) * i}deg) translateY(-15mm)"></span>`;
  }
  return html;
}
function _m16Mostrar(id, visible) { const el = $(id); if (el) el.style.display = visible ? "" : "none"; }
function _m16ContactoHTML(contacto) {
  return contacto.map((c) => `<span class="cv-m16-contacto-item">${iconoDe(c.tipo)} ${contactoValorHTML(c)}</span>`).join("");
}
function _m16ExperienciaHTML(experiencia) {
  return experiencia.map((job) => {
    const bullets = (job.bullets || []).map((b) => `<li>${esc(b.texto)}</li>`).join("");
    const herramientas = (job.herramientas || []).map((h) => `${esc(h.etiqueta)}${h.valor ? ": " + esc(h.valor) : ""}`).join("  ·  ");
    return `
      <article class="cv-m16-job">
        <div class="cv-m16-job-head">
          <span class="cv-m16-job-rol">${esc(job.rol || job.empresa)}</span>
          <span class="cv-m16-job-fecha">${esc(job.fecha)}</span>
        </div>
        <div class="cv-m16-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa")}</div>
        ${job.descripcion && job.descripcion.trim() ? `<p class="cv-m16-job-desc">${escPárrafo(job.descripcion)}</p>` : ""}
        ${bullets ? `<ul class="cv-m16-job-bullets">${bullets}</ul>` : ""}
        ${herramientas ? `<div class="cv-m16-job-tools">${herramientas}</div>` : ""}
      </article>
    `;
  }).join("");
}

function renderModelo16() {
  asegurarEsqueletoModelo16();
  $("#cv-m16-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m16-puesto").textContent = estado.puesto || "";
  $("#cv-m16-subtitulo").textContent = estado.subtitulo || "";
  _m16Mostrar("#cv-m16-subtitulo", !!(estado.subtitulo && estado.subtitulo.trim()));

  const fotoWrap = $("#cv-m16-foto-wrap");
  if (estado.foto) { $("#cv-m16-foto").src = estado.foto; fotoWrap.style.display = ""; }
  else { fotoWrap.style.display = "none"; }

  $("#cv-m16-contacto").innerHTML = _m16ContactoHTML(estado.contacto || []);
  _m16Mostrar("#cv-m16-contacto", (estado.contacto || []).length > 0);

  $("#cv-m16-perfil").innerHTML = escPárrafo(estado.perfil || "");
  _m16Mostrar("#cv-m16-sec-perfil", !!(estado.perfil && estado.perfil.trim()));

  $("#cv-m16-experiencia").innerHTML = _m16ExperienciaHTML(estado.experiencia || []);
  _m16Mostrar("#cv-m16-sec-experiencia", (estado.experiencia || []).length > 0);

  $("#cv-m16-educacion").innerHTML = (estado.educacion || []).map((ed) => `
    <article class="cv-m16-edu">
      <div class="cv-m16-edu-head">
        <span class="cv-m16-edu-inst">${esc(ed.institucion)}</span>
        <span class="cv-m16-edu-fecha">${esc(ed.fecha)}</span>
      </div>
      ${(ed.bullets || []).length ? `<ul class="cv-m16-edu-bullets">${ed.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </article>
  `).join("");
  $("#cv-m16-certificaciones").innerHTML = (estado.certificaciones || []).map((c) => `
    <div class="cv-m16-cert"><span class="cv-m16-cert-titulo">${esc(c.titulo)}</span>${c.subtitulo ? ` — <span class="cv-m16-cert-sub">${esc(c.subtitulo)}</span>` : ""}</div>
  `).join("");
  _m16Mostrar("#cv-m16-sec-eduCert", (estado.educacion || []).length > 0 || (estado.certificaciones || []).length > 0);

  $("#cv-m16-skills").innerHTML = (estado.habilidades || []).map((h) => `<span class="cv-m16-chip">${esc(h.texto)}</span>`).join("");
  $("#cv-m16-blandas").innerHTML = (estado.blandas || []).map((b) => `<span class="cv-m16-chip cv-m16-chip-soft">${esc(b.texto)}</span>`).join("");
  $("#cv-m16-idiomas").innerHTML = (estado.idiomas || []).map((i) =>
    `<div class="cv-m16-idioma"><span>${esc(i.nombre)}</span><span class="cv-m16-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");
  _m16Mostrar("#cv-m16-sec-comp", (estado.habilidades || []).length > 0 || (estado.blandas || []).length > 0 || (estado.idiomas || []).length > 0);

  $("#cv-m16-logros").innerHTML = (estado.logros || []).map((l) => `<li>${esc(l.texto)}</li>`).join("");
  _m16Mostrar("#cv-m16-sec-logros", (estado.logros || []).length > 0);

  $("#cv-m16-referencias").innerHTML = (estado.referencias || []).map((r) => `
    <div class="cv-m16-referencia">
      <span class="cv-m16-ref-nombre">${esc(r.nombre)}</span>${r.rol ? ` — <span class="cv-m16-ref-rol">${esc(r.rol)}</span>` : ""}
      ${r.email ? `<br><span class="cv-m16-ref-dato">${esc(r.email)}</span>` : ""}
      ${r.linkedin ? `<span class="cv-m16-ref-dato"> · ${esc(r.linkedin)}</span>` : ""}
    </div>
  `).join("");
  _m16Mostrar("#cv-m16-sec-referencias", (estado.referencias || []).length > 0);
}

// ---- Modelo 17 "Lattice": grilla técnica de blueprint muy sutil en toda
// la página, foto octogonal con contorno punteado, secciones con
// etiqueta numerada en el margen conectada por línea guía. Persona
// arquitecto/ingeniero. ----
function asegurarEsqueletoModelo17() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo17") return;
  pagina.dataset.esqueleto = "modelo17";
  pagina.innerHTML = `
    <div class="cv-m17-page">
      <header class="cv-m17-header">
        <div class="cv-m17-photo-ring" id="cv-m17-foto-wrap"><img id="cv-m17-foto" class="cv-m17-foto" alt="Foto de perfil"></div>
        <div class="cv-m17-heading">
          <div class="cv-m17-kicker">Curriculum Vitae</div>
          <h1 class="cv-m17-nombre" id="cv-m17-nombre"></h1>
          <div class="cv-m17-puesto" id="cv-m17-puesto"></div>
          <div class="cv-m17-subtitulo" id="cv-m17-subtitulo"></div>
          <div class="cv-m17-contacto" id="cv-m17-contacto"></div>
        </div>
      </header>

      <section class="cv-m17-section" id="cv-m17-sec-perfil">
        <div class="cv-m17-tag">01<span class="cv-m17-tag-line"></span></div>
        <h2 class="cv-m17-h2">${t('perfil')}</h2>
        <p class="cv-m17-perfil" id="cv-m17-perfil"></p>
      </section>

      <section class="cv-m17-section" id="cv-m17-sec-experiencia">
        <div class="cv-m17-tag">02<span class="cv-m17-tag-line"></span></div>
        <h2 class="cv-m17-h2">${t('experiencia')}</h2>
        <div id="cv-m17-experiencia"></div>
      </section>

      <section class="cv-m17-section" id="cv-m17-sec-educacion">
        <div class="cv-m17-tag">03<span class="cv-m17-tag-line"></span></div>
        <h2 class="cv-m17-h2">${t('educacion')}</h2>
        <div id="cv-m17-educacion"></div>
      </section>

      <section class="cv-m17-section" id="cv-m17-sec-certificaciones">
        <div class="cv-m17-tag">04<span class="cv-m17-tag-line"></span></div>
        <h2 class="cv-m17-h2">${t('certificaciones')}</h2>
        <div id="cv-m17-certificaciones"></div>
      </section>

      <section class="cv-m17-section cv-m17-cols" id="cv-m17-sec-comp">
        <div class="cv-m17-tag">05<span class="cv-m17-tag-line"></span></div>
        <div class="cv-m17-col">
          <h2 class="cv-m17-h2">${t('competencias')}</h2>
          <div id="cv-m17-skills"></div>
          <div id="cv-m17-blandas"></div>
        </div>
        <div class="cv-m17-col">
          <h2 class="cv-m17-h2">${t('idiomas')}</h2>
          <div id="cv-m17-idiomas"></div>
        </div>
      </section>

      <section class="cv-m17-section" id="cv-m17-sec-logros">
        <div class="cv-m17-tag">06<span class="cv-m17-tag-line"></span></div>
        <h2 class="cv-m17-h2">${t('logros')}</h2>
        <ul class="cv-m17-logros" id="cv-m17-logros"></ul>
      </section>

      <section class="cv-m17-section" id="cv-m17-sec-referencias">
        <div class="cv-m17-tag">07<span class="cv-m17-tag-line"></span></div>
        <h2 class="cv-m17-h2">${t('referencias')}</h2>
        <div id="cv-m17-referencias"></div>
      </section>
    </div>
  `;
}
function _m17Mostrar(id, visible) { const el = $(id); if (el) el.style.display = visible ? "" : "none"; }
function _m17ContactoHTML(contacto) {
  return contacto.map((c) => `<span class="cv-m17-contacto-item">${iconoDe(c.tipo)} ${contactoValorHTML(c)}</span>`).join("");
}
function _m17ExperienciaHTML(experiencia) {
  return experiencia.map((job) => {
    const bullets = (job.bullets || []).map((b) => `<li>${esc(b.texto)}</li>`).join("");
    const herramientas = (job.herramientas || []).map((h) => `${esc(h.etiqueta)}${h.valor ? ": " + esc(h.valor) : ""}`).join("  ·  ");
    return `
      <article class="cv-m17-job">
        <div class="cv-m17-job-head">
          <span class="cv-m17-job-rol">${esc(job.rol || job.empresa)}</span>
          <span class="cv-m17-job-fecha">${esc(job.fecha)}</span>
        </div>
        <div class="cv-m17-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa")}</div>
        ${job.descripcion && job.descripcion.trim() ? `<p class="cv-m17-job-desc">${escPárrafo(job.descripcion)}</p>` : ""}
        ${bullets ? `<ul class="cv-m17-job-bullets">${bullets}</ul>` : ""}
        ${herramientas ? `<div class="cv-m17-job-tools">${herramientas}</div>` : ""}
      </article>
    `;
  }).join("");
}

function renderModelo17() {
  asegurarEsqueletoModelo17();
  $("#cv-m17-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m17-puesto").textContent = estado.puesto || "";
  $("#cv-m17-subtitulo").textContent = estado.subtitulo || "";
  _m17Mostrar("#cv-m17-subtitulo", !!(estado.subtitulo && estado.subtitulo.trim()));

  const fotoWrap = $("#cv-m17-foto-wrap");
  if (estado.foto) { $("#cv-m17-foto").src = estado.foto; fotoWrap.style.display = ""; }
  else { fotoWrap.style.display = "none"; }

  $("#cv-m17-contacto").innerHTML = _m17ContactoHTML(estado.contacto || []);
  _m17Mostrar("#cv-m17-contacto", (estado.contacto || []).length > 0);

  $("#cv-m17-perfil").innerHTML = escPárrafo(estado.perfil || "");
  _m17Mostrar("#cv-m17-sec-perfil", !!(estado.perfil && estado.perfil.trim()));

  $("#cv-m17-experiencia").innerHTML = _m17ExperienciaHTML(estado.experiencia || []);
  _m17Mostrar("#cv-m17-sec-experiencia", (estado.experiencia || []).length > 0);

  $("#cv-m17-educacion").innerHTML = (estado.educacion || []).map((ed) => `
    <article class="cv-m17-edu">
      <div class="cv-m17-edu-head">
        <span class="cv-m17-edu-inst">${esc(ed.institucion)}</span>
        <span class="cv-m17-edu-fecha">${esc(ed.fecha)}</span>
      </div>
      ${(ed.bullets || []).length ? `<ul class="cv-m17-edu-bullets">${ed.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </article>
  `).join("");
  _m17Mostrar("#cv-m17-sec-educacion", (estado.educacion || []).length > 0);

  $("#cv-m17-certificaciones").innerHTML = (estado.certificaciones || []).map((c) => `
    <div class="cv-m17-cert"><span class="cv-m17-cert-titulo">${esc(c.titulo)}</span>${c.subtitulo ? ` — <span class="cv-m17-cert-sub">${esc(c.subtitulo)}</span>` : ""}</div>
  `).join("");
  _m17Mostrar("#cv-m17-sec-certificaciones", (estado.certificaciones || []).length > 0);

  $("#cv-m17-skills").innerHTML = (estado.habilidades || []).map((h) => `<span class="cv-m17-chip">${esc(h.texto)}</span>`).join("");
  $("#cv-m17-blandas").innerHTML = (estado.blandas || []).map((b) => `<span class="cv-m17-chip cv-m17-chip-soft">${esc(b.texto)}</span>`).join("");
  $("#cv-m17-idiomas").innerHTML = (estado.idiomas || []).map((i) =>
    `<div class="cv-m17-idioma"><span>${esc(i.nombre)}</span><span class="cv-m17-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");
  _m17Mostrar("#cv-m17-sec-comp", (estado.habilidades || []).length > 0 || (estado.blandas || []).length > 0 || (estado.idiomas || []).length > 0);

  $("#cv-m17-logros").innerHTML = (estado.logros || []).map((l) => `<li>${esc(l.texto)}</li>`).join("");
  _m17Mostrar("#cv-m17-sec-logros", (estado.logros || []).length > 0);

  $("#cv-m17-referencias").innerHTML = (estado.referencias || []).map((r) => `
    <div class="cv-m17-referencia">
      <span class="cv-m17-ref-nombre">${esc(r.nombre)}</span>${r.rol ? ` — <span class="cv-m17-ref-rol">${esc(r.rol)}</span>` : ""}
      ${r.email ? `<br><span class="cv-m17-ref-dato">${esc(r.email)}</span>` : ""}
      ${r.linkedin ? `<span class="cv-m17-ref-dato"> · ${esc(r.linkedin)}</span>` : ""}
    </div>
  `).join("");
  _m17Mostrar("#cv-m17-sec-referencias", (estado.referencias || []).length > 0);
}

// ---- Modelo 18 "Bloom": halo orgánico detrás de la foto + acentos de
// pétalos en cada encabezado de sección — cálido, redondeado. Persona
// marketing/comunidad. ----
function asegurarEsqueletoModelo18() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo18") return;
  pagina.dataset.esqueleto = "modelo18";
  pagina.innerHTML = `
    <div class="cv-m18-page">
      <header class="cv-m18-header">
        <div class="cv-m18-halo-wrap" id="cv-m18-foto-wrap">
          <div class="cv-m18-halo"></div>
          <img id="cv-m18-foto" class="cv-m18-foto" alt="Foto de perfil">
        </div>
        <div class="cv-m18-heading">
          <h1 class="cv-m18-nombre" id="cv-m18-nombre"></h1>
          <div class="cv-m18-puesto" id="cv-m18-puesto"></div>
          <div class="cv-m18-subtitulo" id="cv-m18-subtitulo"></div>
          <div class="cv-m18-contacto" id="cv-m18-contacto"></div>
        </div>
      </header>

      <section class="cv-m18-section" id="cv-m18-sec-perfil">
        <h2 class="cv-m18-h2">${t('sobreMi')}</h2>
        <p class="cv-m18-perfil" id="cv-m18-perfil"></p>
      </section>

      <section class="cv-m18-section" id="cv-m18-sec-experiencia">
        <h2 class="cv-m18-h2">${t('experiencia')}</h2>
        <div id="cv-m18-experiencia"></div>
      </section>

      <div class="cv-m18-grid">
        <div class="cv-m18-col">
          <section id="cv-m18-sec-educacion">
            <h2 class="cv-m18-h2">${t('educacion')}</h2>
            <div id="cv-m18-educacion"></div>
          </section>
          <section id="cv-m18-sec-certificaciones">
            <h2 class="cv-m18-h2">${t('certificaciones')}</h2>
            <div id="cv-m18-certificaciones"></div>
          </section>
          <section id="cv-m18-sec-logros">
            <h2 class="cv-m18-h2">${t('logros')}</h2>
            <ul class="cv-m18-logros" id="cv-m18-logros"></ul>
          </section>
        </div>
        <div class="cv-m18-col">
          <section id="cv-m18-sec-skills">
            <h2 class="cv-m18-h2">${t('habilidades')}</h2>
            <div class="cv-m18-chips" id="cv-m18-skills"></div>
          </section>
          <section id="cv-m18-sec-blandas">
            <h2 class="cv-m18-h2">Blandas</h2>
            <div class="cv-m18-chips cv-m18-chips-soft" id="cv-m18-blandas"></div>
          </section>
          <section id="cv-m18-sec-idiomas">
            <h2 class="cv-m18-h2">${t('idiomas')}</h2>
            <div id="cv-m18-idiomas"></div>
          </section>
          <section id="cv-m18-sec-referencias">
            <h2 class="cv-m18-h2">${t('referencias')}</h2>
            <div id="cv-m18-referencias"></div>
          </section>
        </div>
      </div>
    </div>
  `;
}
function _m18Mostrar(id, visible) { const el = $(id); if (el) el.style.display = visible ? "" : "none"; }
function _m18ContactoHTML(contacto) {
  return contacto.map((c) => `
    <span class="cv-m18-contacto-item">
      <span class="cv-m18-contacto-icono">${iconoDe(c.tipo)}</span>${contactoValorHTML(c)}
    </span>
  `).join("");
}
function _m18ExperienciaHTML(experiencia) {
  return experiencia.map((job) => {
    const bullets = (job.bullets || []).map((b) => `<li>${esc(b.texto)}</li>`).join("");
    const herramientas = (job.herramientas || []).map((h) =>
      `<span class="cv-m18-tool">${esc(h.etiqueta)}${h.valor ? ": " + esc(h.valor) : ""}</span>`
    ).join("");
    return `
      <article class="cv-m18-job">
        <div class="cv-m18-job-head">
          <span class="cv-m18-job-rol">${esc(job.rol || job.empresa)}</span>
          <span class="cv-m18-job-fecha">${esc(job.fecha)}</span>
        </div>
        <div class="cv-m18-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa")}</div>
        ${job.descripcion && job.descripcion.trim() ? `<p class="cv-m18-job-desc">${escPárrafo(job.descripcion)}</p>` : ""}
        ${bullets ? `<ul class="cv-m18-job-bullets">${bullets}</ul>` : ""}
        ${herramientas ? `<div class="cv-m18-tools">${herramientas}</div>` : ""}
      </article>
    `;
  }).join("");
}

function renderModelo18() {
  asegurarEsqueletoModelo18();
  $("#cv-m18-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m18-puesto").textContent = estado.puesto || "";
  $("#cv-m18-subtitulo").textContent = estado.subtitulo || "";
  _m18Mostrar("#cv-m18-subtitulo", !!(estado.subtitulo && estado.subtitulo.trim()));

  const fotoWrap = $("#cv-m18-foto-wrap");
  if (estado.foto) { $("#cv-m18-foto").src = estado.foto; fotoWrap.style.display = ""; }
  else { fotoWrap.style.display = "none"; }

  $("#cv-m18-contacto").innerHTML = _m18ContactoHTML(estado.contacto || []);
  _m18Mostrar("#cv-m18-contacto", (estado.contacto || []).length > 0);

  $("#cv-m18-perfil").innerHTML = escPárrafo(estado.perfil || "");
  _m18Mostrar("#cv-m18-sec-perfil", !!(estado.perfil && estado.perfil.trim()));

  $("#cv-m18-experiencia").innerHTML = _m18ExperienciaHTML(estado.experiencia || []);
  _m18Mostrar("#cv-m18-sec-experiencia", (estado.experiencia || []).length > 0);

  $("#cv-m18-educacion").innerHTML = (estado.educacion || []).map((ed) => `
    <article class="cv-m18-edu">
      <div class="cv-m18-edu-head">
        <span class="cv-m18-edu-inst">${esc(ed.institucion)}</span>
        <span class="cv-m18-edu-fecha">${esc(ed.fecha)}</span>
      </div>
      ${(ed.bullets || []).length ? `<ul class="cv-m18-edu-bullets">${ed.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </article>
  `).join("");
  _m18Mostrar("#cv-m18-sec-educacion", (estado.educacion || []).length > 0);

  $("#cv-m18-certificaciones").innerHTML = (estado.certificaciones || []).map((c) => `
    <div class="cv-m18-cert"><span class="cv-m18-cert-titulo">${esc(c.titulo)}</span>${c.subtitulo ? ` <span class="cv-m18-cert-sub">${esc(c.subtitulo)}</span>` : ""}</div>
  `).join("");
  _m18Mostrar("#cv-m18-sec-certificaciones", (estado.certificaciones || []).length > 0);

  $("#cv-m18-logros").innerHTML = (estado.logros || []).map((l) => `<li>${esc(l.texto)}</li>`).join("");
  _m18Mostrar("#cv-m18-sec-logros", (estado.logros || []).length > 0);

  $("#cv-m18-skills").innerHTML = (estado.habilidades || []).map((h) => `<span class="cv-m18-chip">${esc(h.texto)}</span>`).join("");
  _m18Mostrar("#cv-m18-sec-skills", (estado.habilidades || []).length > 0);

  $("#cv-m18-blandas").innerHTML = (estado.blandas || []).map((b) => `<span class="cv-m18-chip cv-m18-chip-soft">${esc(b.texto)}</span>`).join("");
  _m18Mostrar("#cv-m18-sec-blandas", (estado.blandas || []).length > 0);

  $("#cv-m18-idiomas").innerHTML = (estado.idiomas || []).map((i) =>
    `<div class="cv-m18-idioma"><span>${esc(i.nombre)}</span><span class="cv-m18-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");
  _m18Mostrar("#cv-m18-sec-idiomas", (estado.idiomas || []).length > 0);

  $("#cv-m18-referencias").innerHTML = (estado.referencias || []).map((r) => `
    <div class="cv-m18-referencia">
      <span class="cv-m18-ref-nombre">${esc(r.nombre)}</span>${r.rol ? ` — <span class="cv-m18-ref-rol">${esc(r.rol)}</span>` : ""}
      ${r.email ? `<br><span class="cv-m18-ref-dato">${esc(r.email)}</span>` : ""}
      ${r.linkedin ? `<span class="cv-m18-ref-dato"> · ${esc(r.linkedin)}</span>` : ""}
    </div>
  `).join("");
  _m18Mostrar("#cv-m18-sec-referencias", (estado.referencias || []).length > 0);
}

// ---- Modelo 19 "Monolith": nombre gigantesco arriba, una sola línea
// vertical fina separa identidad/contenido — el más minimalista del
// set. Persona principal/senior. ----
function asegurarEsqueletoModelo19() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo19") return;
  pagina.dataset.esqueleto = "modelo19";
  pagina.innerHTML = `
    <div class="cv-m19-page">
      <header class="cv-m19-hero">
        <h1 class="cv-m19-nombre" id="cv-m19-nombre"></h1>
        <div class="cv-m19-puesto" id="cv-m19-puesto"></div>
      </header>

      <div class="cv-m19-body">
        <aside class="cv-m19-identity">
          <div class="cv-m19-foto-wrap" id="cv-m19-foto-wrap"><img id="cv-m19-foto" class="cv-m19-foto" alt="Foto de perfil"></div>
          <div class="cv-m19-subtitulo" id="cv-m19-subtitulo"></div>
          <div class="cv-m19-contacto" id="cv-m19-contacto"></div>

          <div class="cv-m19-aside-block" id="cv-m19-sec-skills">
            <h3 class="cv-m19-h3">${t('habilidades')}</h3>
            <div id="cv-m19-skills"></div>
          </div>
          <div class="cv-m19-aside-block" id="cv-m19-sec-blandas">
            <h3 class="cv-m19-h3">Blandas</h3>
            <div id="cv-m19-blandas"></div>
          </div>
          <div class="cv-m19-aside-block" id="cv-m19-sec-idiomas">
            <h3 class="cv-m19-h3">${t('idiomas')}</h3>
            <div id="cv-m19-idiomas"></div>
          </div>
          <div class="cv-m19-aside-block" id="cv-m19-sec-educacion">
            <h3 class="cv-m19-h3">${t('educacion')}</h3>
            <div id="cv-m19-educacion"></div>
          </div>
          <div class="cv-m19-aside-block" id="cv-m19-sec-certificaciones">
            <h3 class="cv-m19-h3">${t('certificaciones')}</h3>
            <div id="cv-m19-certificaciones"></div>
          </div>
          <div class="cv-m19-aside-block" id="cv-m19-sec-referencias">
            <h3 class="cv-m19-h3">${t('referencias')}</h3>
            <div id="cv-m19-referencias"></div>
          </div>
        </aside>

        <div class="cv-m19-rule"></div>

        <main class="cv-m19-content">
          <section id="cv-m19-sec-perfil">
            <h2 class="cv-m19-h2">${t('perfil')}</h2>
            <p id="cv-m19-perfil"></p>
          </section>
          <section id="cv-m19-sec-experiencia">
            <h2 class="cv-m19-h2">${t('experiencia')}</h2>
            <div id="cv-m19-experiencia"></div>
          </section>
          <section id="cv-m19-sec-logros">
            <h2 class="cv-m19-h2">${t('logros')}</h2>
            <ul id="cv-m19-logros"></ul>
          </section>
        </main>
      </div>
    </div>
  `;
}
function _m19Mostrar(id, visible) { const el = $(id); if (el) el.style.display = visible ? "" : "none"; }
function _m19ExperienciaHTML(experiencia) {
  return experiencia.map((job) => {
    const bullets = (job.bullets || []).map((b) => `<li>${esc(b.texto)}</li>`).join("");
    const herramientas = (job.herramientas || []).map((h) => `${esc(h.etiqueta)}${h.valor ? ": " + esc(h.valor) : ""}`).join("  /  ");
    return `
      <article class="cv-m19-job">
        <div class="cv-m19-job-head">
          <span class="cv-m19-job-rol">${esc(job.rol || job.empresa)}</span>
          <span class="cv-m19-job-fecha">${esc(job.fecha)}</span>
        </div>
        <div class="cv-m19-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa")}</div>
        ${job.descripcion && job.descripcion.trim() ? `<p class="cv-m19-job-desc">${escPárrafo(job.descripcion)}</p>` : ""}
        ${bullets ? `<ul class="cv-m19-job-bullets">${bullets}</ul>` : ""}
        ${herramientas ? `<div class="cv-m19-tools">${herramientas}</div>` : ""}
      </article>
    `;
  }).join("");
}

function renderModelo19() {
  asegurarEsqueletoModelo19();
  $("#cv-m19-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m19-puesto").textContent = estado.puesto || "";
  $("#cv-m19-subtitulo").textContent = estado.subtitulo || "";
  _m19Mostrar("#cv-m19-subtitulo", !!(estado.subtitulo && estado.subtitulo.trim()));

  const fotoWrap = $("#cv-m19-foto-wrap");
  if (estado.foto) { $("#cv-m19-foto").src = estado.foto; fotoWrap.style.display = ""; }
  else { fotoWrap.style.display = "none"; }

  $("#cv-m19-contacto").innerHTML = (estado.contacto || []).map((c) =>
    `<div class="cv-m19-contacto-item">${contactoValorHTML(c)}</div>`
  ).join("");
  _m19Mostrar("#cv-m19-contacto", (estado.contacto || []).length > 0);

  $("#cv-m19-perfil").innerHTML = escPárrafo(estado.perfil || "");
  _m19Mostrar("#cv-m19-sec-perfil", !!(estado.perfil && estado.perfil.trim()));

  $("#cv-m19-experiencia").innerHTML = _m19ExperienciaHTML(estado.experiencia || []);
  _m19Mostrar("#cv-m19-sec-experiencia", (estado.experiencia || []).length > 0);

  $("#cv-m19-logros").innerHTML = (estado.logros || []).map((l) => `<li>${esc(l.texto)}</li>`).join("");
  _m19Mostrar("#cv-m19-sec-logros", (estado.logros || []).length > 0);

  $("#cv-m19-skills").innerHTML = (estado.habilidades || []).map((h) => `<div class="cv-m19-tag">${esc(h.texto)}</div>`).join("");
  _m19Mostrar("#cv-m19-sec-skills", (estado.habilidades || []).length > 0);

  $("#cv-m19-blandas").innerHTML = (estado.blandas || []).map((b) => `<div class="cv-m19-tag">${esc(b.texto)}</div>`).join("");
  _m19Mostrar("#cv-m19-sec-blandas", (estado.blandas || []).length > 0);

  $("#cv-m19-idiomas").innerHTML = (estado.idiomas || []).map((i) =>
    `<div class="cv-m19-idioma"><span>${esc(i.nombre)}</span><span class="cv-m19-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");
  _m19Mostrar("#cv-m19-sec-idiomas", (estado.idiomas || []).length > 0);

  $("#cv-m19-educacion").innerHTML = (estado.educacion || []).map((ed) => `
    <div class="cv-m19-edu">
      <div class="cv-m19-edu-inst">${esc(ed.institucion)}</div>
      <div class="cv-m19-edu-fecha">${esc(ed.fecha)}</div>
      ${(ed.bullets || []).length ? `<ul class="cv-m19-edu-bullets">${ed.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");
  _m19Mostrar("#cv-m19-sec-educacion", (estado.educacion || []).length > 0);

  $("#cv-m19-certificaciones").innerHTML = (estado.certificaciones || []).map((c) => `
    <div class="cv-m19-cert">${esc(c.titulo)}${c.subtitulo ? `<div class="cv-m19-cert-sub">${esc(c.subtitulo)}</div>` : ""}</div>
  `).join("");
  _m19Mostrar("#cv-m19-sec-certificaciones", (estado.certificaciones || []).length > 0);

  $("#cv-m19-referencias").innerHTML = (estado.referencias || []).map((r) => `
    <div class="cv-m19-referencia">
      <div class="cv-m19-ref-nombre">${esc(r.nombre)}</div>
      ${r.rol ? `<div class="cv-m19-ref-rol">${esc(r.rol)}</div>` : ""}
      ${r.email ? `<div class="cv-m19-ref-dato">${esc(r.email)}</div>` : ""}
      ${r.linkedin ? `<div class="cv-m19-ref-dato">${esc(r.linkedin)}</div>` : ""}
    </div>
  `).join("");
  _m19Mostrar("#cv-m19-sec-referencias", (estado.referencias || []).length > 0);
}

// ---- Modelo 20 "Odyssey": experiencia como "Capítulos" conectados por
// una línea de viaje SVG ondulada; foto en un bloque "sobre el autor".
// Paleta literaria cálida (tinta/papel). ----
function asegurarEsqueletoModelo20() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo20") return;
  pagina.dataset.esqueleto = "modelo20";
  pagina.innerHTML = `
    <div class="cv-m20-page">
      <header class="cv-m20-title-block">
        <h1 class="cv-m20-nombre" id="cv-m20-nombre"></h1>
        <div class="cv-m20-puesto" id="cv-m20-puesto"></div>
      </header>

      <section class="cv-m20-bio" id="cv-m20-sec-bio">
        <div class="cv-m20-bio-foto-wrap" id="cv-m20-foto-wrap"><img id="cv-m20-foto" class="cv-m20-bio-foto" alt="Foto de perfil"></div>
        <div class="cv-m20-bio-text">
          <div class="cv-m20-bio-label">${t('sobreAutor')}</div>
          <div class="cv-m20-subtitulo" id="cv-m20-subtitulo"></div>
          <p class="cv-m20-perfil" id="cv-m20-perfil"></p>
          <div class="cv-m20-contacto" id="cv-m20-contacto"></div>
        </div>
      </section>

      <section class="cv-m20-chapters-section" id="cv-m20-sec-experiencia">
        <h2 class="cv-m20-h2">${t('historia')}</h2>
        <div class="cv-m20-chapters-wrap">
          <svg class="cv-m20-journey" id="cv-m20-journey" preserveAspectRatio="none"></svg>
          <div id="cv-m20-experiencia"></div>
        </div>
      </section>

      <div class="cv-m20-grid">
        <div class="cv-m20-col">
          <section id="cv-m20-sec-educacion">
            <h2 class="cv-m20-h2">${t('educacion')}</h2>
            <div id="cv-m20-educacion"></div>
          </section>
          <section id="cv-m20-sec-certificaciones">
            <h2 class="cv-m20-h2">${t('certificaciones')}</h2>
            <div id="cv-m20-certificaciones"></div>
          </section>
          <section id="cv-m20-sec-logros">
            <h2 class="cv-m20-h2">${t('logros')}</h2>
            <ul id="cv-m20-logros"></ul>
          </section>
        </div>
        <div class="cv-m20-col">
          <section id="cv-m20-sec-skills">
            <h2 class="cv-m20-h2">${t('habilidades')}</h2>
            <div id="cv-m20-skills"></div>
          </section>
          <section id="cv-m20-sec-blandas">
            <h2 class="cv-m20-h2">Blandas</h2>
            <div id="cv-m20-blandas"></div>
          </section>
          <section id="cv-m20-sec-idiomas">
            <h2 class="cv-m20-h2">${t('idiomas')}</h2>
            <div id="cv-m20-idiomas"></div>
          </section>
          <section id="cv-m20-sec-referencias">
            <h2 class="cv-m20-h2">${t('referencias')}</h2>
            <div id="cv-m20-referencias"></div>
          </section>
        </div>
      </div>
    </div>
  `;
}
function _m20Mostrar(id, visible) { const el = $(id); if (el) el.style.display = visible ? "" : "none"; }
// Genera un path SVG ondulado (muestrea una función seno) para simular
// una línea de río/camino dibujada a mano, del alto que se le pida.
function _m20JourneyPath(alturaPx, amplitud = 14, periodo = 220) {
  const puntos = [];
  const paso = 12;
  for (let y = 0; y <= alturaPx; y += paso) {
    const x = 20 + amplitud * Math.sin((y / periodo) * Math.PI * 2);
    puntos.push([x, y]);
  }
  let d = `M ${puntos[0][0].toFixed(1)} ${puntos[0][1].toFixed(1)}`;
  for (let i = 1; i < puntos.length; i++) {
    const [x, y] = puntos[i];
    const [px, py] = puntos[i - 1];
    const cx = (px + x) / 2;
    const cy = (py + y) / 2;
    d += ` Q ${px.toFixed(1)} ${py.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
  }
  return d;
}
function _m20ExperienciaHTML(experiencia) {
  return experiencia.map((job, idx) => {
    const bullets = (job.bullets || []).map((b) => `<li>${esc(b.texto)}</li>`).join("");
    const herramientas = (job.herramientas || []).map((h) =>
      `<span class="cv-m20-tool">${esc(h.etiqueta)}${h.valor ? ": " + esc(h.valor) : ""}</span>`
    ).join("");
    const num = String(idx + 1).padStart(2, "0");
    return `
      <article class="cv-m20-chapter">
        <div class="cv-m20-chapter-marker"></div>
        <div class="cv-m20-chapter-head">
          <div class="cv-m20-chapter-num">${t('capitulo')} ${num}</div>
          <div class="cv-m20-chapter-titles">
            <div class="cv-m20-chapter-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa")}</div>
            <div class="cv-m20-chapter-rol">${esc(job.rol)}</div>
          </div>
          <div class="cv-m20-chapter-fecha">${esc(job.fecha)}</div>
        </div>
        ${job.descripcion && job.descripcion.trim() ? `<p class="cv-m20-chapter-desc">${escPárrafo(job.descripcion)}</p>` : ""}
        ${bullets ? `<ul class="cv-m20-chapter-bullets">${bullets}</ul>` : ""}
        ${herramientas ? `<div class="cv-m20-tools">${herramientas}</div>` : ""}
      </article>
    `;
  }).join("");
}

function renderModelo20() {
  asegurarEsqueletoModelo20();
  $("#cv-m20-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m20-puesto").textContent = estado.puesto || "";
  $("#cv-m20-subtitulo").textContent = estado.subtitulo || "";
  _m20Mostrar("#cv-m20-subtitulo", !!(estado.subtitulo && estado.subtitulo.trim()));

  const fotoWrap = $("#cv-m20-foto-wrap");
  if (estado.foto) { $("#cv-m20-foto").src = estado.foto; fotoWrap.style.display = ""; }
  else { fotoWrap.style.display = "none"; }

  $("#cv-m20-perfil").innerHTML = escPárrafo(estado.perfil || "");
  _m20Mostrar("#cv-m20-sec-bio", !!(estado.perfil && estado.perfil.trim()) || !!estado.foto);

  $("#cv-m20-contacto").innerHTML = (estado.contacto || []).map((c) =>
    `<span class="cv-m20-contacto-item"><span class="cv-m20-contacto-icono">${iconoDe(c.tipo)}</span>${contactoValorHTML(c)}</span>`
  ).join("");
  _m20Mostrar("#cv-m20-contacto", (estado.contacto || []).length > 0);

  const experiencia = estado.experiencia || [];
  $("#cv-m20-experiencia").innerHTML = _m20ExperienciaHTML(experiencia);
  _m20Mostrar("#cv-m20-sec-experiencia", experiencia.length > 0);

  // dibuja la línea de viaje del alto real del contenedor de capítulos,
  // se recalcula en cada render (después de que el DOM tiene el HTML)
  const journeySvg = $("#cv-m20-journey");
  if (journeySvg && experiencia.length > 0) {
    requestAnimationFrame(() => {
      const wrap = $(".cv-m20-chapters-wrap");
      const alturaPx = wrap ? wrap.getBoundingClientRect().height : 800;
      journeySvg.setAttribute("viewBox", `0 0 40 ${Math.max(alturaPx, 1)}`);
      journeySvg.innerHTML = `<path d="${_m20JourneyPath(alturaPx)}" class="cv-m20-journey-path" />`;
    });
  } else if (journeySvg) {
    journeySvg.innerHTML = "";
  }

  $("#cv-m20-educacion").innerHTML = (estado.educacion || []).map((ed) => `
    <article class="cv-m20-edu">
      <div class="cv-m20-edu-head">
        <span class="cv-m20-edu-inst">${esc(ed.institucion)}</span>
        <span class="cv-m20-edu-fecha">${esc(ed.fecha)}</span>
      </div>
      ${(ed.bullets || []).length ? `<ul class="cv-m20-edu-bullets">${ed.bullets.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </article>
  `).join("");
  _m20Mostrar("#cv-m20-sec-educacion", (estado.educacion || []).length > 0);

  $("#cv-m20-certificaciones").innerHTML = (estado.certificaciones || []).map((c) => `
    <div class="cv-m20-cert"><span class="cv-m20-cert-titulo">${esc(c.titulo)}</span>${c.subtitulo ? ` — <span class="cv-m20-cert-sub">${esc(c.subtitulo)}</span>` : ""}</div>
  `).join("");
  _m20Mostrar("#cv-m20-sec-certificaciones", (estado.certificaciones || []).length > 0);

  $("#cv-m20-logros").innerHTML = (estado.logros || []).map((l) => `<li>${esc(l.texto)}</li>`).join("");
  _m20Mostrar("#cv-m20-sec-logros", (estado.logros || []).length > 0);

  $("#cv-m20-skills").innerHTML = (estado.habilidades || []).length
    ? `<p class="cv-m20-inline-list">${(estado.habilidades || []).map((h) => esc(h.texto)).join("  ·  ")}</p>` : "";
  _m20Mostrar("#cv-m20-sec-skills", (estado.habilidades || []).length > 0);

  $("#cv-m20-blandas").innerHTML = (estado.blandas || []).length
    ? `<p class="cv-m20-inline-list">${(estado.blandas || []).map((b) => esc(b.texto)).join("  ·  ")}</p>` : "";
  _m20Mostrar("#cv-m20-sec-blandas", (estado.blandas || []).length > 0);

  $("#cv-m20-idiomas").innerHTML = (estado.idiomas || []).map((i) =>
    `<div class="cv-m20-idioma"><span>${esc(i.nombre)}</span><span class="cv-m20-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");
  _m20Mostrar("#cv-m20-sec-idiomas", (estado.idiomas || []).length > 0);

  $("#cv-m20-referencias").innerHTML = (estado.referencias || []).map((r) => `
    <div class="cv-m20-referencia">
      <span class="cv-m20-ref-nombre">${esc(r.nombre)}</span>${r.rol ? ` — <span class="cv-m20-ref-rol">${esc(r.rol)}</span>` : ""}
      ${r.email ? `<br><span class="cv-m20-ref-dato">${esc(r.email)}</span>` : ""}
      ${r.linkedin ? `<span class="cv-m20-ref-dato"> · ${esc(r.linkedin)}</span>` : ""}
    </div>
  `).join("");
  _m20Mostrar("#cv-m20-sec-referencias", (estado.referencias || []).length > 0);
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
  fila.className = "fila-editable fila-editable-envoltorio";
  fila.innerHTML = `
    <div class="fila-editable-linea">
      <select class="c-tipo">
        ${Object.entries(ETIQUETA_TIPO_CONTACTO).map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}
      </select>
      <input type="text" class="c-etiqueta" placeholder="Etiqueta (ej. AR)" style="max-width:84px">
      <input type="text" class="c-valor" placeholder="Valor">
      <button class="fila-quitar" title="Quitar">✕</button>
    </div>
    <input type="text" class="c-url" placeholder="Link de LinkedIn (opcional) — así tu nombre queda clickeable">`;
  $(".c-tipo", fila).value = item.tipo;
  $(".c-etiqueta", fila).value = item.etiqueta || "";
  $(".c-valor", fila).value = item.valor || "";
  $(".c-url", fila).value = item.url || "";
  const actualizarVisibilidadUrl = () => { $(".c-url", fila).classList.toggle("cv-oculto", item.tipo !== "linkedin"); };
  actualizarVisibilidadUrl();
  $(".c-tipo", fila).addEventListener("change", (e) => { item.tipo = e.target.value; actualizarVisibilidadUrl(); renderPreview(); guardar(); });
  $(".c-etiqueta", fila).addEventListener("input", (e) => { item.etiqueta = e.target.value; renderPreview(); guardar(); });
  $(".c-valor", fila).addEventListener("input", (e) => { item.valor = e.target.value; renderPreview(); guardar(); });
  $(".c-url", fila).addEventListener("input", (e) => { item.url = e.target.value; renderPreview(); guardar(); });
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
  tarjeta.appendChild(campoTarjeta("Sitio web de la empresa (opcional) — el nombre queda clickeable", item.empresaUrl, (v) => { item.empresaUrl = v; }));
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
function actualizarBotonIdiomaCv() {
  const btn = $("#btn-idioma-cv");
  const esEspanol = estado.idiomaCv === "es";
  btn.textContent = esEspanol ? "🌐 ES" : "🌐 EN";
  btn.title = esEspanol
    ? "Los títulos de sección del CV están en español — clic para pasarlos a inglés"
    : "Los títulos de sección del CV están en inglés — clic para pasarlos a español";
}

function bindearControlesEstaticos() {
  actualizarBotonIdiomaCv();
  $("#btn-idioma-cv").addEventListener("click", () => {
    estado.idiomaCv = estado.idiomaCv === "es" ? "en" : "es";
    actualizarBotonIdiomaCv();
    // los títulos de sección se arman una sola vez por modelo (esqueleto),
    // no en cada render — forzar que se reconstruya es la única forma de
    // que tomen el idioma nuevo sin tener que ir a mano por los 20.
    $("#cv-pagina").dataset.esqueleto = "";
    renderPreview(); guardar();
  });

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
      // "_instrucciones" es la guía que trae la plantilla en blanco (ver
      // docs/plantilla-datos-cv.json) para quien la completa con un
      // asistente de IA — no es un dato del CV, así que no debe quedar
      // pegada en el estado (ni reexportarse después como si lo fuera).
      delete datos._instrucciones;
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
