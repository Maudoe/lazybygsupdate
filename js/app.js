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
// Ciudad/país junto al nombre de la empresa en cada experiencia — opcional,
// no se muestra nada si no cargaste el campo. `item` es la experiencia
// completa (necesita `.ubicacion`), no sólo el string.
function ubicacionSufijo(item) {
  if (!item.ubicacion || !item.ubicacion.trim()) return "";
  return ` <span class="cv-ubicacion">· ${esc(item.ubicacion)}</span>`;
}

function iconoDe(tipo) {
  const pack = PAQUETES_ICONOS[estado.iconos] || PAQUETES_ICONOS.emoji1;
  const valor = pack.iconos[tipo] ?? "•";
  // los packs "Material" no son un carácter Unicode sino el NOMBRE de una
  // ligadura (ej. "call") que sólo se dibuja como ícono si el elemento
  // tiene la fuente de Google "Material Symbols" aplicada — por eso van
  // envueltos en su propio span con esa fuente, a diferencia de los demás
  // packs que son texto plano y heredan la tipografía del CV.
  if (pack.fuenteMaterial) {
    return `<span class="cv-icono-material" style="font-family:'${pack.fuenteMaterial}';">${valor}</span>`;
  }
  return valor;
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
// Color de fondo de la franja oscura (colorOscuro) y del cuerpo
// (colorClaro) que combina con cada tema — ver .cv-pagina[data-tema=...]
// en style.css para los --cv-acento/--cv-acento-2 de cada uno. Elegir un
// tema actualiza estos dos colores automáticamente (ver
// aplicarFondosDeTema() más abajo); el usuario los puede seguir ajustando
// a mano después con los selectores de color libre, como siempre.
// --cv-lateral-fondo/--cv-fondo-cuerpo SIEMPRE se usan como valor de
// "background" (nunca como color de texto, borde, ni adentro de un
// color-mix()) — ver los usos en style.css — así que un degradé acá es
// 100% seguro: no rompe nada, y varios temas de abajo lo aprovechan para
// tener onda propia además del color plano.
const TEMAS_FONDOS = {
  turquesa: { oscuro: "#16191e", claro: "#ffffff" },
  azul: { oscuro: "#12203a", claro: "#ffffff" },
  verde: { oscuro: "#12241c", claro: "#ffffff" },
  bordo: { oscuro: "#2a1216", claro: "#ffffff" },
  violeta: { oscuro: "#1e1430", claro: "#ffffff" },
  coral: { oscuro: "#1a2624", claro: "#fffaf7" },

  "grafito-dorado": { oscuro: "#1c2024", claro: "#ffffff" },
  "rosa-dorado": { oscuro: "#241019", claro: "#fff7fa" },
  "cian-dorado": { oscuro: "#0f2229", claro: "#f5fbfd" },
  "oliva-dorado": { oscuro: "#1c2013", claro: "#fdfdf5" },
  "granate-dorado": { oscuro: "#200a0d", claro: "#fff8f8" },
  "marino-dorado": { oscuro: "#0f1830", claro: "#f7f9ff" },

  "lima-violeta": { oscuro: "linear-gradient(160deg, #182b06 0%, #0e0c1e 100%)", claro: "#fbfff2" },
  "mandarina-azul": { oscuro: "#0f2038", claro: "#fff8f0" },
  "fucsia-verde": { oscuro: "#200c1a", claro: "#f7fff9" },
  "amarillo-morado": { oscuro: "linear-gradient(160deg, #241c04 0%, #160a2e 100%)", claro: "#fffdf0" },
  "rojo-cian": { oscuro: "#1c0a0d", claro: "#f2fffd" },
  "rosa-azul": { oscuro: "#200c16", claro: "#f2faff" },
  "naranja-verde": { oscuro: "#1f1206", claro: "#f5fff2" },

  /* familia "degradé" de verdad: sidebar con un degradé de 3 paradas que
     se hunde hacia el negro, cuerpo con un lavado sutil del mismo tono
     que se disuelve en blanco a mitad de página (no compite con el
     texto). */
  atardecer: { oscuro: "linear-gradient(160deg, #2b0f24 0%, #170a1c 60%, #0d0714 100%)", claro: "linear-gradient(180deg, #fff5f8 0%, #ffffff 45%)" },
  fuego: { oscuro: "linear-gradient(160deg, #2b0f00 0%, #180800 60%, #0d0400 100%)", claro: "linear-gradient(180deg, #fffaf0 0%, #ffffff 45%)" },
  mango: { oscuro: "linear-gradient(160deg, #2b1200 0%, #190a02 60%, #0d0501 100%)", claro: "linear-gradient(180deg, #fff7f2 0%, #ffffff 45%)" },
  lava: { oscuro: "linear-gradient(160deg, #260404 0%, #140202 60%, #0a0101 100%)", claro: "linear-gradient(180deg, #fff5ee 0%, #ffffff 45%)" },
  brasa: { oscuro: "linear-gradient(160deg, #210303 0%, #120101 60%, #090000 100%)", claro: "linear-gradient(180deg, #fff3e8 0%, #ffffff 45%)" },

  glaciar: { oscuro: "linear-gradient(160deg, #062338 0%, #041420 60%, #020a12 100%)", claro: "linear-gradient(180deg, #f0fbff 0%, #ffffff 45%)" },
  abismo: { oscuro: "linear-gradient(160deg, #060a3a 0%, #04051f 60%, #020310 100%)", claro: "linear-gradient(180deg, #f2f7ff 0%, #ffffff 45%)" },
  "menta-azul": { oscuro: "linear-gradient(160deg, #062b26 0%, #041a17 60%, #020d0b 100%)", claro: "linear-gradient(180deg, #f0fffb 0%, #ffffff 45%)" },
  aurora: { oscuro: "linear-gradient(160deg, #0d1850 0%, #080f30 60%, #040718 100%)", claro: "linear-gradient(180deg, #f0fbff 0%, #ffffff 45%)" },
  nocturno: { oscuro: "linear-gradient(160deg, #160532 0%, #0d031f 60%, #06010f 100%)", claro: "linear-gradient(180deg, #f8f2ff 0%, #ffffff 45%)" },
  polar: { oscuro: "linear-gradient(160deg, #0c1224 0%, #070a16 60%, #04050c 100%)", claro: "linear-gradient(180deg, #f2f7ff 0%, #ffffff 45%)" },

  /* degradé "de piedra pulida" — más contenido, sin las 3 paradas */
  esmeralda: { oscuro: "linear-gradient(160deg, #0d2b1f 0%, #06140e 60%, #030a07 100%)", claro: "#f5fdf9" },
  rubi: { oscuro: "linear-gradient(160deg, #2b0810 0%, #140407 60%, #0a0203 100%)", claro: "#fff5f6" },
  zafiro: { oscuro: "linear-gradient(160deg, #0a2340 0%, #051020 60%, #020810 100%)", claro: "#f2f8ff" },
  amatista: { oscuro: "linear-gradient(160deg, #1e0d31 0%, #0e0619 60%, #07030d 100%)", claro: "#faf5ff" },
  topacio: { oscuro: "#1c1608", claro: "#fffdf5" },
  peridoto: { oscuro: "linear-gradient(160deg, #1a2410 0%, #0e1309 60%, #070a05 100%)", claro: "#f9fff2" },

  /* pastel: cuerpo con un lavado de color muy suave (casi imperceptible
     al imprimir, pero se nota en pantalla) en vez de blanco plano */
  lavanda: { oscuro: "#241d33", claro: "linear-gradient(180deg, #f5f0ff 0%, #fdfbff 60%)" },
  "durazno-suave": { oscuro: "#2e1f16", claro: "linear-gradient(180deg, #fff0e8 0%, #fffaf5 60%)" },
  "cielo-suave": { oscuro: "#16222e", claro: "linear-gradient(180deg, #eef6ff 0%, #f5faff 60%)" },
  "menta-suave": { oscuro: "#16261f", claro: "linear-gradient(180deg, #eafff5 0%, #f5fffa 60%)" },
  "rosa-polvo": { oscuro: "#2b1a20", claro: "linear-gradient(180deg, #fff0f4 0%, #fff8fa 60%)" },
  arena: { oscuro: "#241d14", claro: "linear-gradient(180deg, #fbf3e4 0%, #fffdf7 60%)" },

  /* neón: resplandor radial en la esquina superior de la franja oscura,
     como un panel iluminado, en vez de un color plano */
  "neon-lima": { oscuro: "radial-gradient(120% 80% at 15% 0%, #1e2b06 0%, #141414 55%)", claro: "#fbfff0" },
  "neon-fucsia": { oscuro: "radial-gradient(120% 80% at 15% 0%, #2b0619 0%, #141414 55%)", claro: "#fff5fa" },
  "neon-cian": { oscuro: "radial-gradient(120% 80% at 15% 0%, #062b2e 0%, #141414 55%)", claro: "#f0feff" },
  "neon-violeta": { oscuro: "radial-gradient(120% 80% at 15% 0%, #200a33 0%, #141414 55%)", claro: "#f9f2ff" },
  "neon-naranja": { oscuro: "radial-gradient(120% 80% at 15% 0%, #331400 0%, #141414 55%)", claro: "#fff8f0" },

  grafito: { oscuro: "#20262b", claro: "#ffffff" },
  pizarra: { oscuro: "#262c36", claro: "#fafbfc" },
  carbon: { oscuro: "#18191b", claro: "#ffffff" },
  plata: { oscuro: "#2b2e33", claro: "#ffffff" },
  acero: { oscuro: "#1b2420", claro: "#f5f9f6" },

  terracota: { oscuro: "linear-gradient(160deg, #2e1710 0%, #180b07 60%, #0c0503 100%)", claro: "#fffaf5" },
  bosque: { oscuro: "linear-gradient(160deg, #1c2a20 0%, #101a14 60%, #080d0a 100%)", claro: "#f7faf5" },
  cafe: { oscuro: "linear-gradient(160deg, #241a0d 0%, #140e07 60%, #0a0704 100%)", claro: "#fff9f2" },
  arcilla: { oscuro: "linear-gradient(160deg, #2c1710 0%, #170b07 60%, #0c0503 100%)", claro: "#fff7f0" },
};

// Plantilla en blanco para el modal "Plantilla JSON" (ver
// bindearControlesEstaticos()) — misma forma que docs/plantilla-datos-cv.json,
// pero embebida acá como objeto en vez de bajarse con fetch() del archivo:
// bajo file:// (cómo corre esta app normalmente) el navegador bloquea el
// fetch de un archivo local por CORS, así que no se puede leer el .json
// hermano en tiempo de ejecución — tiene que estar en el propio JS.
// Si se edita la forma de la plantilla acá, replicar el cambio también en
// docs/plantilla-datos-cv.json (ese archivo es el que la gente puede
// descargar/inspeccionar directo, este es el que arma el prompt).
const PLANTILLA_JSON_EJEMPLO = {
  _instrucciones: "This is NOT CV data — it's just a guide for whoever fills in this file (you or an AI assistant like ChatGPT/Claude). Delete this '_instrucciones' key before importing, or leave it: the app ignores it safely either way. Fields you can leave as-is (they're design settings, changeable later from the app): modelo, modeloCarta, tema, fuente, iconos, colorOscuro, colorClaro, escalaFoto, escalaIconos, idiomaCv, tipoDocumento. Valid values — modelo: 'modelo1' through 'modelo45'. modeloCarta: 'carta1' through 'carta11' (only used if tipoDocumento is 'carta'). tema: 'turquesa', 'azul', 'verde', 'bordo', 'violeta', 'coral' (there are 50+ additional themes, see the app's picker — leave it as 'turquesa' if unsure). idiomaCv: 'en' or 'es' (the language of the printed CV's SECTION TITLES, not your content). tipoDocumento: 'cv' or 'carta'. contacto[].tipo: 'telefono', 'email', 'ubicacion', 'linkedin', 'web'. contacto[].url is optional, only has an effect on the 'linkedin' type (turns your name into a link to your profile). experiencia[].empresaUrl is optional (turns the company name into a link to its site). experiencia[].ubicacion is optional (the city and country where you worked that role, e.g. 'Buenos Aires, Argentina'; leave it empty if you don't want it shown). The 'carta' block holds the cover letter's own fields (name/contact/photo come from the rest of the file). Everything else is free text in whatever language you want (English recommended, it's the CV standard). 'foto' stays null — the photo is uploaded separately, by dragging it into the app, it doesn't go in this file.",
  modelo: "modelo1", modeloCarta: "carta1", tipoDocumento: "cv",
  tema: "turquesa", fuente: "jakarta", iconos: "emoji1",
  colorOscuro: "#16191e", colorClaro: "#ffffff", escalaFoto: 1, escalaIconos: 1, idiomaCv: "en",
  nombre: "Your first name", apellido: "Your last name",
  puesto: "Your current job title (e.g. Senior Backend Engineer)",
  subtitulo: "Optional short tag next to your title (e.g. a language level like C1, or leave empty)",
  foto: null,
  contacto: [
    { id: "c1", tipo: "telefono", etiqueta: "Optional short label (e.g. country code like US)", valor: "+1 234 567 8900" },
    { id: "c2", tipo: "email", etiqueta: "", valor: "you@example.com" },
    { id: "c3", tipo: "ubicacion", etiqueta: "", valor: "City, Country" },
    { id: "c4", tipo: "linkedin", etiqueta: "", valor: "linkedin.com/in/your-handle", url: "" },
  ],
  perfil: "A 3-5 sentence professional summary: who you are, your years of experience, your specialty/focus area, and what kind of impact or track record you bring. Write it in first-person-implied style (no 'I' — CVs usually drop the subject), like: 'Senior backend engineer with 8+ years building...'",
  habilidades: [
    { id: "h1", texto: "A hard/technical skill (e.g. Python, React, AWS, SQL) — group related tools into one line if you have many, e.g. 'CI/CD — GitHub Actions & GitLab CI'" },
  ],
  blandas: [
    { id: "b1", texto: "A soft skill (e.g. Effective communication, Critical thinking, Team leadership)" },
  ],
  idiomas: [
    { id: "i1", nombre: "Spanish", nivel: "Native" },
    { id: "i2", nombre: "English", nivel: "C1 (or B2, Fluent, etc.)" },
  ],
  educacion: [
    {
      id: "e1", institucion: "School/University name", fecha: "Free-text date range, e.g. 2016 - 2020",
      bullets: [{ id: "e1b1", texto: "Degree name, honors, or a relevant detail" }],
    },
  ],
  certificaciones: [
    { id: "cert1", titulo: "Certification name | Issuing org | Year", subtitulo: "Optional one-line detail about the certification" },
  ],
  referencias: [
    { id: "r1", nombre: "Reference full name", rol: "Company / Their role there", email: "reference@example.com", linkedin: "linkedin.com/in/reference-handle" },
  ],
  logros: [
    { id: "l1", texto: "One standout achievement, ideally with a number/result (e.g. 'Reduced deploy time by 40% by...')" },
  ],
  experiencia: [
    {
      id: "x1", empresa: "Company name", empresaUrl: "",
      ubicacion: "City, Country (e.g. Buenos Aires, Argentina) — optional, leave empty to hide it",
      fecha: "Free-text date range, e.g. JAN 2023 - PRESENT",
      rol: "Your job title at this company",
      descripcion: "1-3 sentences about the company/team context and your overall mandate in this role.",
      bullets: [
        { id: "x1b1", texto: "A specific responsibility or achievement, ideally with concrete numbers/impact." },
        { id: "x1b2", texto: "Another bullet — aim for 4-8 per job, each one a single clear sentence." },
      ],
      herramientas: [
        { id: "x1h1", etiqueta: "A category label (e.g. Automation, Cloud & Infrastructure)", valor: "Comma-separated tools/tech used in that category" },
      ],
    },
  ],
  carta: {
    empresaDestino: "Company you're applying to",
    puestoDestino: "Job title you're applying for",
    destinatario: "Optional — e.g. 'Hiring Manager' or a specific recruiter's name",
    fecha: "Optional — leave empty to use today's date automatically",
    saludo: "Dear Hiring Manager,",
    cuerpo: "The letter body — write it as one or more paragraphs separated by a blank line (each blank line becomes a new paragraph in the printed letter).",
    despedida: "Sincerely,",
  },
};

// Arma el prompt completo (instrucciones + plantilla embebida) que se
// muestra en el modal "Plantilla JSON" — un solo texto listo para pegarle
// a un asistente de IA junto con el CV viejo del usuario.
function armarPromptPlantillaJson() {
  const json = JSON.stringify(PLANTILLA_JSON_EJEMPLO, null, 2);
  return `I need you to fill in the following JSON template with my data, to generate my CV with a tool I use. I'll paste my old CV and/or my LinkedIn profile below — use it as the source to fill in each field.

Important rules:
- Follow this EXACT structure: same keys, same data types (a list stays a list, text stays text). Don't add or remove keys.
- Delete the "_instrucciones" key from the final result (it's just a guide for you, not CV data).
- Leave the design fields (modelo, modeloCarta, tipoDocumento, tema, fuente, iconos, colorOscuro, colorClaro, escalaFoto, escalaIconos, idiomaCv) exactly as they are in the template — don't touch them.
- Write the content in English (the standard for CVs), unless I ask for a different language below.
- If I didn't give you some piece of data because it wasn't in what I pasted, leave that field empty ("") instead of making information up.
- Give me the completed JSON as an actual downloadable .json file if you're able to create one (ChatGPT can do this with its file/code tool) — that's the easiest way for me to load it back into the app. If you can't create a file, reply with ONLY the complete JSON inside a \`\`\`json code block instead, no explanation before or after — I can copy that and paste it directly into the app too.

To help the content pass the automated filters (ATS) that many companies use before a human ever sees the CV:
- If I paste a specific job posting below, use the SAME terminology that posting uses (ATS systems often look for literal matches, not synonyms) and work it in early — in "perfil" and in the first bullet of each relevant experience.
- In "puesto" and in the "rol" of each experience, use the real/standard industry job title (the one a recruiter would search for, or the one the posting uses), not a creative or made-up one.
- Write tool/technology names (in "herramientas") exactly as they're officially spelled (e.g. "Adobe Creative Cloud", not your own shorthand) — so they match how an ATS searches for them.
- Spell out role/area acronyms (QA, PM, BA, etc.) in full the first time they appear, with the acronym next to it, e.g. "Quality Assurance (QA)" — after that you can just use the acronym.
- Use the same date format across ALL experience/education entries (e.g. "Jan 2023 - Present" everywhere, don't mix formats).
- Don't repeat the same keyword unnaturally over and over — a paragraph or bullet stuffed with keywords is obvious and doesn't help.
- Don't use emojis or decorative symbols inside the text (perfil, descripciones, bullets) — the visual design (icons, bullet styling, colors) is already handled by the template, so this text should stay plain.

Template to fill in:
\`\`\`json
${json}
\`\`\`

My old CV and/or my LinkedIn profile (paste it below):
[PASTE YOUR INFO HERE]

(Optional) The job posting I'm applying to, so you can tailor the terminology to that specific role:
[PASTE THE POSTING HERE, OR DELETE THIS LINE IF IT DOESN'T APPLY]
`;
}

// "Prep" prompt — for someone who doesn't have an old CV or a LinkedIn
// profile put together yet: instead of asking the assistant to fill in
// the JSON directly, it asks the assistant to INTERVIEW them (question by
// question) and compile an organized summary from the answers — that
// summary is what later gets pasted as "my old CV" into
// armarPromptPlantillaJson().
function armarPromptPreparacion() {
  return `I want to put together my resume but I don't have my data organized yet. Help me gather it: ask me questions ONE AT A TIME (not all at once), wait for my answer before moving to the next one, and cover these topics in this order:

0. If I have a specific job in mind that I want to apply to, ask me to paste the posting (or the job title and industry if I don't have the posting handy) — you'll use it later so my answers reuse that job's terminology, which helps the CV pass the automated filters (ATS) many companies use.
1. Contact info: phone, email, city and country, LinkedIn.
2. Current job title or the one I'm aiming for (the real/standard industry title, not a creative one — the one a recruiter would search for), and a short subtitle if I want one (e.g. a language level).
3. Professional summary: who I am, how many years of experience I have, my specialty, what kind of impact I make.
4. Each work experience, one at a time: company, city/country, dates (ask me to use the same date format across all of them, e.g. "Jan 2023 - Present"), my role (real job title, not a made-up one), 1-3 sentences of context about the team/mandate, and 4 to 8 concrete achievements or responsibilities (ask me for numbers or results if I have them), plus the tools/technologies I used, grouped by category — with the exact name of each tool (e.g. "Adobe Creative Cloud", not a shorthand different from how a job posting would write it).
5. Education: institution, dates, degree or relevant details.
6. Certifications.
7. Technical skills and soft skills.
8. Languages and level.
9. Standout achievements, separately (with numbers if possible).
10. References, if I want to include any.

Don't make up any data — if I have nothing to say on some topic, mark it empty and move on. Once we've gone through all the topics, put together an organized summary with ALL my answers, grouped by those same categories, in plain text (no need for JSON yet) — ready for me to paste later into another prompt that builds the final file. If I gave you a target job/posting in question 0, add it to the end of the summary too so it doesn't get lost.

Start with the first question.
`;
}

// ---------------- vista "ATS" (texto plano lineal) ----------------
// Un ATS no ve columnas, íconos, ni colores — sólo texto, en el orden en
// que aparece en el documento. Esta función arma esa misma info pero como
// texto lineal simple, DIRECTO desde `estado` (no desde el HTML
// renderizado, que trae de vuelta separado en columnas/tarjetas según el
// modelo) — así el usuario puede confirmar que ningún dato se "pierde"
// aunque el diseño visual lo acomode distinto.
function contactoTextoPlano(c) {
  const valor = c.tipo === "linkedin" && c.url ? `${c.valor} (${c.url})` : c.valor;
  return c.etiqueta ? `${c.etiqueta}: ${valor}` : valor;
}
function fechaHoyFormateada() {
  const MESES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const hoy = new Date();
  return `${MESES[hoy.getMonth()]} ${hoy.getDate()}, ${hoy.getFullYear()}`;
}
function generarTextoATS() {
  const l = [];
  const linea = (s = "") => l.push(s);
  const titulo = (s) => { linea(); linea(s.toUpperCase()); linea("-".repeat(s.length)); };

  if (estado.tipoDocumento === "carta") {
    const c = estado.carta || {};
    linea(`${estado.nombre || ""} ${estado.apellido || ""}`.trim());
    if (estado.puesto) linea(estado.puesto);
    (estado.contacto || []).forEach((x) => linea(contactoTextoPlano(x)));
    linea();
    linea((c.fecha && c.fecha.trim()) || fechaHoyFormateada());
    linea();
    [c.destinatario, c.empresaDestino, c.puestoDestino ? `Re: ${c.puestoDestino}` : ""].filter(Boolean).forEach(linea);
    linea();
    if (c.saludo) linea(c.saludo);
    linea();
    (c.cuerpo || "").split(/\n+/).filter(Boolean).forEach((p) => { linea(p); linea(); });
    if (c.despedida) linea(c.despedida);
    linea();
    linea(`${estado.nombre || ""} ${estado.apellido || ""}`.trim());
    return l.join("\n");
  }

  linea(`${estado.nombre || ""} ${estado.apellido || ""}`.trim());
  if (estado.puesto) linea(estado.puesto + (estado.subtitulo ? ` | ${estado.subtitulo}` : ""));
  (estado.contacto || []).forEach((c) => linea(contactoTextoPlano(c)));

  if (estado.perfil && estado.perfil.trim()) { titulo(t("perfil")); linea(estado.perfil.trim()); }

  if ((estado.habilidades || []).length) { titulo(t("habilidades")); linea(estado.habilidades.map((h) => h.texto).join(", ")); }
  if ((estado.blandas || []).length) { titulo(t("blandas")); linea(estado.blandas.map((b) => b.texto).join(", ")); }
  if ((estado.idiomas || []).length) { titulo(t("idiomas")); estado.idiomas.forEach((i) => linea(`${i.nombre} — ${i.nivel}`)); }

  if ((estado.experiencia || []).length) {
    titulo(t("experiencia"));
    estado.experiencia.forEach((x) => {
      linea();
      linea([x.rol, x.empresa].filter(Boolean).join(" — "));
      linea([x.ubicacion, x.fecha].filter(Boolean).join(" | "));
      if (x.descripcion && x.descripcion.trim()) linea(x.descripcion.trim());
      (x.bullets || []).forEach((b) => linea(`- ${b.texto}`));
      if ((x.herramientas || []).length) linea("Tools: " + x.herramientas.map((h) => (h.etiqueta ? `${h.etiqueta}: ${h.valor}` : h.valor)).join(" | "));
    });
  }

  if ((estado.educacion || []).length) {
    titulo(t("educacion"));
    estado.educacion.forEach((e) => {
      linea();
      linea([e.institucion, e.fecha].filter(Boolean).join(" | "));
      (e.bullets || []).forEach((b) => linea(`- ${b.texto}`));
    });
  }

  if ((estado.certificaciones || []).length) {
    titulo(t("certificaciones"));
    estado.certificaciones.forEach((c) => linea([c.titulo, c.subtitulo].filter(Boolean).join(" — ")));
  }

  if ((estado.logros || []).length) { titulo(t("logros")); estado.logros.forEach((x) => linea(`- ${x.texto}`)); }

  if ((estado.referencias || []).length) {
    titulo(t("referencias"));
    estado.referencias.forEach((r) => linea([r.nombre, r.rol, r.email, r.linkedin].filter(Boolean).join(" | ")));
  }

  return l.join("\n");
}

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
  // Material Symbols de Google — el mismo proveedor que ya usamos para las
  // 30 combinaciones de fuente, así que no suma una dependencia nueva.
  // A diferencia de los packs de arriba (texto/emoji plano), estos son
  // nombres de ligadura que necesitan la fuente "Material Symbols"
  // aplicada para dibujarse como ícono — ver iconoDe() y fuenteMaterial acá abajo.
  materialOutline: { nombre: "Material — contorno", fuenteMaterial: "Material Symbols Outlined", iconos: { telefono: "call", email: "mail", ubicacion: "location_on", linkedin: "link", web: "language" } },
  materialRound: { nombre: "Material — redondeado", fuenteMaterial: "Material Symbols Rounded", iconos: { telefono: "call", email: "mail", ubicacion: "location_on", linkedin: "link", web: "language" } },
  materialSharp: { nombre: "Material — angular", fuenteMaterial: "Material Symbols Sharp", iconos: { telefono: "call", email: "mail", ubicacion: "location_on", linkedin: "link", web: "language" } },
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

  // Atléticas: condensadas, pesadas y en mayúsculas, que es como está
  // escrito todo en un gimnasio. Van bien con los modelos 41-45.
  gym:          { nombre: "Anton + Barlow Condensed — gimnasio", titulos: '"Anton", sans-serif', cuerpo: '"Barlow Condensed", sans-serif', familias: ["Barlow+Condensed:wght@400;500;600;700"] },
  atleta:       { nombre: "Bebas Neue + Oswald — atlética", titulos: '"Bebas Neue", sans-serif', cuerpo: '"Oswald", sans-serif', familias: ["Oswald:wght@300;400;500"] },
  bigshoulders: { nombre: "Big Shoulders + Barlow — industrial deportiva", titulos: '"Big Shoulders Display", sans-serif', cuerpo: '"Barlow", sans-serif', familias: ["Big+Shoulders+Display:wght@700;800;900"] },
  saira:        { nombre: "Saira Condensed + Saira — performance", titulos: '"Saira Condensed", sans-serif', cuerpo: '"Saira", sans-serif', familias: ["Saira+Condensed:wght@600;700;800", "Saira:wght@400;500;600;700"] },
  fjalla:       { nombre: "Fjalla One + Roboto Condensed — cartel deportivo", titulos: '"Fjalla One", sans-serif', cuerpo: '"Roboto Condensed", sans-serif', familias: ["Fjalla+One", "Roboto+Condensed:wght@400;500;700"] },
  russo:        { nombre: "Russo One + Chakra Petch — deportiva tech", titulos: '"Russo One", sans-serif', cuerpo: '"Chakra Petch", sans-serif', familias: ["Russo+One", "Chakra+Petch:wght@400;500;600;700"] },
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

// Material Symbols (Google) para los 3 packs de íconos "materialOutline/
// Round/Sharp" — mismo proveedor que las fuentes de arriba, cargado una
// sola vez con las 3 variantes juntas (contorno/redondeado/angular) para
// que cambiar de pack en el dropdown sea instantáneo.
(function inyectarMaterialSymbols() {
  const href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&family=Material+Symbols+Rounded&family=Material+Symbols+Sharp&display=block";
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
/* ---------------- reencuadre de la foto ----------------
   Se arrastra la foto directamente sobre la vista previa. Lo que se mueve
   es object-position, o sea qué parte de la foto entra en el marco: el
   marco y el layout no se tocan.

   El recorrido se mide contra el tamaño del MARCO, no el de la foto: en un
   marco de 30mm, arrastrar 30mm tiene que barrer la foto de punta a punta.
   Con un factor fijo el arrastre se sentía distinto en cada modelo. */
function activarReencuadreFoto() {
  const pagina = $("#cv-pagina");
  let arrastrando = null;

  const esFoto = (el) => el && el.tagName === "IMG" && /-foto$/.test(el.id || "");

  pagina.addEventListener("pointerdown", (ev) => {
    if (!esFoto(ev.target) || ev.target.hidden) return;
    ev.preventDefault();
    const caja = ev.target.getBoundingClientRect();
    const pos = estado.fotoPos || { x: 50, y: 50 };
    arrastrando = {
      x0: ev.clientX, y0: ev.clientY,
      px: pos.x, py: pos.y,
      ancho: caja.width || 1, alto: caja.height || 1,
    };
    estado.fotoPos = { x: pos.x, y: pos.y };
    pagina.classList.add("reencuadrando");
    ev.target.setPointerCapture(ev.pointerId);
  });

  pagina.addEventListener("pointermove", (ev) => {
    if (!arrastrando) return;
    // se invierte el signo: arrastrar hacia abajo tiene que traer hacia
    // abajo lo que se ve, que es mover el encuadre hacia arriba
    const dx = ((ev.clientX - arrastrando.x0) / arrastrando.ancho) * 100;
    const dy = ((ev.clientY - arrastrando.y0) / arrastrando.alto) * 100;
    const limitar = (v) => Math.max(0, Math.min(100, v));
    estado.fotoPos = {
      x: limitar(arrastrando.px - dx),
      y: limitar(arrastrando.py - dy),
    };
    pagina.style.setProperty("--cv-foto-pos", `${estado.fotoPos.x}% ${estado.fotoPos.y}%`);
    actualizarTextoFotoPos();
  });

  const soltar = () => {
    if (!arrastrando) return;
    arrastrando = null;
    pagina.classList.remove("reencuadrando");
    guardar();
  };
  pagina.addEventListener("pointerup", soltar);
  pagina.addEventListener("pointercancel", soltar);
}

function actualizarTextoFotoPos() {
  const el = $("#foto-pos-texto");
  if (!el) return;
  const p = estado.fotoPos || { x: 50, y: 50 };
  el.textContent = (p.x === 50 && p.y === 50)
    ? "centrada"
    : `${Math.round(p.x)}% · ${Math.round(p.y)}%`;
}

function estadoPorDefecto() {
  const id = nuevoId;
  const LOREM = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
  const LOREM2 = "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
  return {
    modelo: "modelo1", tema: "turquesa", fuente: "jakarta", iconos: "emoji1", colorOscuro: "#16191e", colorClaro: "#ffffff", escalaFoto: 1, escalaIconos: 1, idiomaCv: "en",
    fotoPos: { x: 50, y: 50 },
    nombre: "Lorem", apellido: "Ipsum",
    puesto: "Dolor Sit Amet Engineer", subtitulo: "Consectetur+",
    // sólo el ejemplo público trae una foto de arranque (el logo del
    // proyecto) — es simplemente más simpático que el placeholder 🙂 vacío
    // la primera vez que alguien abre la app; se reemplaza solo al
    // arrastrar una foto propia. datos-privados.js (tu copia real) sigue
    // sin foto por defecto, como corresponde.
    foto: "img/sloth-avatar.png",
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
        id: id(), empresa: "Lorem Corp", empresaUrl: "https://example.com", ubicacion: "Placeholder City, Placeholderland", fecha: "JAN 2023 - PRESENT",
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
        id: id(), empresa: "Ipsum Industries", empresaUrl: "https://example.com", ubicacion: "Placeholder City, Placeholderland", fecha: "JUN 2020 - DEC 2022",
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
        id: id(), empresa: "Dolor & Sit Ltd.", empresaUrl: "https://example.com", ubicacion: "Placeholder City, Placeholderland", fecha: "MAR 2017 - MAY 2020",
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
    tipoDocumento: "cv", modeloCarta: "carta1",
    carta: {
      empresaDestino: "Acme Inc.",
      puestoDestino: "Senior Dolor Sit Amet Engineer",
      destinatario: "Hiring Manager",
      fecha: "",
      saludo: "Dear Hiring Manager,",
      cuerpo: "I'm writing to apply for the Senior Dolor Sit Amet Engineer position at Acme Inc. With over five years of experience in consectetur adipiscing elit, I've built a track record of shipping reliable, well-tested systems in fast-moving teams.\n\nIn my current role at Lorem Corp, I led the adoption of automated testing across three product lines, cutting regression time by 40% while mentoring two junior engineers. I'm drawn to Acme Inc. specifically because of its focus on dolor sit amet — a space where I believe my background in ipsum dolor and hands-on leadership could make an immediate impact.\n\nI'd welcome the chance to talk through how my experience lines up with what your team needs right now. Thank you for your time and consideration.",
      despedida: "Sincerely,",
    },
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
  modelo21: { nombre: "Modelo 21 — Architect", render: renderModelo21 },
  modelo22: { nombre: "Modelo 22 — Baker", render: renderModelo22 },
  modelo23: { nombre: "Modelo 23 — Security Guard", render: renderModelo23 },
  modelo24: { nombre: "Modelo 24 — Chef", render: renderModelo24 },
  modelo25: { nombre: "Modelo 25 — Nurse", render: renderModelo25 },
  modelo26: { nombre: "Modelo 26 — Firefighter", render: renderModelo26 },
  modelo27: { nombre: "Modelo 27 — Photographer", render: renderModelo27 },
  modelo28: { nombre: "Modelo 28 — Musician", render: renderModelo28 },
  modelo29: { nombre: "Modelo 29 — Personal Trainer", render: renderModelo29 },
  modelo30: { nombre: "Modelo 30 — Lawyer", render: renderModelo30 },
  modelo31: { nombre: "Modelo 31 — Teacher", render: renderModelo31 },
  modelo32: { nombre: "Modelo 32 — Pilot", render: renderModelo32 },
  modelo33: { nombre: "Modelo 33 — Gardener", render: renderModelo33 },
  modelo34: { nombre: "Modelo 34 — Barista", render: renderModelo34 },
  modelo35: { nombre: "Modelo 35 — Fashion Designer", render: renderModelo35 },
  modelo36: { nombre: "Modelo 36 — Veterinarian", render: renderModelo36 },
  modelo37: { nombre: "Modelo 37 — Electrician", render: renderModelo37 },
  modelo38: { nombre: "Modelo 38 — Real Estate", render: renderModelo38 },
  modelo39: { nombre: "Modelo 39 — DJ", render: renderModelo39 },
  modelo40: { nombre: "Modelo 40 — Farmer", render: renderModelo40 },
  modelo41: { nombre: "Modelo 41 — Coach Studio", render: renderModelo41 },
  modelo42: { nombre: "Modelo 42 — Race Bib", render: renderModelo42 },
  modelo43: { nombre: "Modelo 43 — Fitness App", render: renderModelo43 },
  modelo44: { nombre: "Modelo 44 — Iron Room", render: renderModelo44 },
  modelo45: { nombre: "Modelo 45 — Class Board", render: renderModelo45 },
};

// ---------------- registro de cartas de presentación ----------------
// Mismo patrón que MODELOS, pero para el generador de carta de
// presentación: reusa nombre/contacto/foto del CV, sólo agrega los campos
// propios de estado.carta (ver estadoPorDefecto()).
const CARTAS = {
  carta1: { nombre: "Carta 1 — Clásica", render: renderCarta1 },
  carta2: { nombre: "Carta 2 — A juego con el CV", render: renderCarta2 },
  carta3: { nombre: "Carta 3 — Encabezado moderno", render: renderCarta3 },
  carta4: { nombre: "Carta 4 — Minimalista", render: renderCarta4 },
  carta5: { nombre: "Carta 5 — Editorial", render: renderCarta5 },
  carta6: { nombre: "Carta 6 — Ejecutiva", render: renderCarta6 },
  carta7: { nombre: "Carta 7 — Coach Studio", render: renderCarta7 },
  carta8: { nombre: "Carta 8 — Race Bib", render: renderCarta8 },
  carta9: { nombre: "Carta 9 — Fitness App", render: renderCarta9 },
  carta10: { nombre: "Carta 10 — Iron Room", render: renderCarta10 },
  carta11: { nombre: "Carta 11 — Class Board", render: renderCarta11 },
};

// Si el usuario no cargó una fecha propia, usa la de hoy (formateada,
// nunca un valor inventado) — mismo criterio de "no fabricar contenido"
// que ya se usa para datos derivados en el resto de la app.
function fechaCartaFormateada() {
  if (estado.carta.fecha && estado.carta.fecha.trim()) return esc(estado.carta.fecha.trim());
  const MESES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const hoy = new Date();
  return `${MESES[hoy.getMonth()]} ${hoy.getDate()}, ${hoy.getFullYear()}`;
}

// Línea de contacto compacta (usada en el encabezado de las 6 cartas) —
// mismos datos que el CV, separados por "·", sin ícono ni etiqueta.
function contactoLineaCarta() {
  return estado.contacto.map((c) => contactoValorHTML(c)).join(' <span class="cv-carta-punto">·</span> ');
}

function renderPreview() {
  const pagina = $("#cv-pagina");
  const esCarta = estado.tipoDocumento === "carta";
  pagina.dataset.modelo = esCarta ? (estado.modeloCarta || "carta1") : (estado.modelo || "modelo1");
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
  // Reencuadre: las fotos van con object-fit cover, así que object-position
  // decide QUÉ parte de la foto se ve dentro del marco. Es para las fotos
  // donde la cara queda cortada arriba o corrida a un costado.
  const fpos = estado.fotoPos || { x: 50, y: 50 };
  pagina.style.setProperty("--cv-foto-pos", `${fpos.x}% ${fpos.y}%`);
  if (esCarta) {
    const carta = CARTAS[estado.modeloCarta] || CARTAS.carta1;
    carta.render();
  } else {
    const modelo = MODELOS[estado.modelo] || MODELOS.modelo1;
    modelo.render();
  }
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
  igualarAlturaPar(".cv-carta2-principal", "#cv-c2-lateral");
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
          <span class="cv-experiencia-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}</span>
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
        <p class="cv-m2-item-sub">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}${x.fecha ? ` | ${esc(x.fecha)}` : ""}</p>
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
    fecha: x.fecha, titulo: x.rol || x.empresa,
    sub: x.rol ? `${x.empresa}${x.ubicacion && x.ubicacion.trim() ? ` · ${x.ubicacion}` : ""}` : "",
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
        ${x.rol ? `<p class="cv-m4-exp-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}</p>` : ""}
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
        ${x.rol ? `<p class="cv-m5-experiencia-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}</p>` : ""}
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
        <div class="cv-m6-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(job)}</div>
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
        <div class="cv-m7-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(job)}</div>
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
      <div class="cv-m8-header-wrap">
        <div class="cv-m8-diagonal"></div>
        <header class="cv-m8-header">
          <div class="cv-m8-photo-wrap" id="cv-m8-foto-wrap"><img id="cv-m8-foto" class="cv-m8-foto" alt="Foto de perfil" hidden><div class="cv-m8-foto-placeholder" id="cv-m8-foto-placeholder">🙂</div></div>
          <div class="cv-m8-heading">
            <h1 class="cv-m8-nombre"><span id="cv-m8-nombre-nombre"></span> <span class="cv-m8-apellido" id="cv-m8-nombre-apellido"></span></h1>
            <div class="cv-m8-puesto" id="cv-m8-puesto"></div>
            <div class="cv-m8-subtitulo" id="cv-m8-subtitulo"></div>
          </div>
        </header>
      </div>

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
        <div class="cv-m8-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(job)}</div>
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

  const foto8 = $("#cv-m8-foto"), placeholder8 = $("#cv-m8-foto-placeholder");
  if (estado.foto) { foto8.src = estado.foto; foto8.hidden = false; placeholder8.hidden = true; }
  else { foto8.hidden = true; placeholder8.hidden = false; }

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
    <div class="cv-m9-exp-empresa">${enlaceSiHay(exp.empresa, exp.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(exp)}</div>
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
    <div class="cv-m10-exp-empresa">${enlaceSiHay(exp.empresa, exp.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(exp)}</div>
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
        <div class="cv-m11-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(job)}</div>
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
            <span class="cv-m12-fila-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(job)}</span>
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
        <div class="cv-m13-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(job)}</div>
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
        <div class="cv-m14-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(job)}</div>
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
        <div class="cv-m15-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(job)}</div>
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
        <div class="cv-m16-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(job)}</div>
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
        <div class="cv-m17-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(job)}</div>
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
        <div class="cv-m18-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(job)}</div>
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
        <div class="cv-m19-job-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(job)}</div>
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
            <div class="cv-m20-chapter-empresa">${enlaceSiHay(job.empresa, job.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(job)}</div>
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
// MODELOS 21-40 — 20 modelos más, cada uno inspirado en una profesión
// distinta (arquitecto, panadero, guardia de seguridad, etc.) con
// estructura genuinamente propia, no un reskin de color de los modelos
// 1-20. Usan las mismas variables --cv-* de siempre, así que los 56
// temas de color ya existentes se aplican automáticamente acá también.
// ============================================================

// ---- Modelo 21 — Architect (Blueprint / Drafting) ----
function asegurarEsqueletoModelo21() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo21") return;
  pagina.dataset.esqueleto = "modelo21";
  pagina.innerHTML = `
    <aside class="cv-m21-sidebar">
      <div class="cv-m21-foto-marco">
        <img class="cv-m21-foto" id="cv-m21-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m21-foto-placeholder" id="cv-m21-foto-placeholder">🙂</div>
      </div>
      <div class="cv-m21-sello">ESC. 1:1 · REV. A</div>

      <div class="cv-m21-bloque" id="cv-m21-contacto-bloque">
        <h3 class="cv-m21-tit-lateral" id="cv-m21-tit-contacto"></h3>
        <ul class="cv-m21-contacto" id="cv-m21-contacto"></ul>
      </div>
      <div class="cv-m21-bloque" id="cv-m21-habilidades-bloque">
        <h3 class="cv-m21-tit-lateral" id="cv-m21-tit-habilidades"></h3>
        <div class="cv-m21-tags" id="cv-m21-habilidades"></div>
      </div>
      <div class="cv-m21-bloque" id="cv-m21-blandas-bloque">
        <h3 class="cv-m21-tit-lateral" id="cv-m21-tit-blandas"></h3>
        <div class="cv-m21-tags" id="cv-m21-blandas"></div>
      </div>
      <div class="cv-m21-bloque" id="cv-m21-idiomas-bloque">
        <h3 class="cv-m21-tit-lateral" id="cv-m21-tit-idiomas"></h3>
        <ul class="cv-m21-idiomas" id="cv-m21-idiomas"></ul>
      </div>
      <div class="cv-m21-bloque" id="cv-m21-educacion-bloque">
        <h3 class="cv-m21-tit-lateral" id="cv-m21-tit-educacion"></h3>
        <div id="cv-m21-educacion"></div>
      </div>
    </aside>

    <div class="cv-m21-main">
      <header class="cv-m21-titleblock">
        <div class="cv-m21-tb-etiqueta">PROYECTO / NOMBRE</div>
        <h1 class="cv-m21-nombre" id="cv-m21-nombre"></h1>
        <div class="cv-m21-tb-etiqueta">ROL</div>
        <div class="cv-m21-puesto" id="cv-m21-puesto"></div>
        <div class="cv-m21-subtitulo" id="cv-m21-subtitulo"></div>
        <div class="cv-m21-regla" aria-hidden="true"></div>
      </header>

      <section class="cv-m21-bloque" id="cv-m21-perfil-bloque">
        <h2 class="cv-m21-tit" id="cv-m21-tit-perfil"></h2>
        <p class="cv-m21-nota" id="cv-m21-perfil"></p>
      </section>

      <section class="cv-m21-bloque" id="cv-m21-experiencia-bloque">
        <h2 class="cv-m21-tit" id="cv-m21-tit-experiencia"></h2>
        <div class="cv-m21-exp-list" id="cv-m21-experiencia"></div>
      </section>

      <section class="cv-m21-bloque" id="cv-m21-logros-bloque">
        <h2 class="cv-m21-tit" id="cv-m21-tit-logros"></h2>
        <ul class="cv-m21-logros" id="cv-m21-logros"></ul>
      </section>

      <section class="cv-m21-bloque" id="cv-m21-certificaciones-bloque">
        <h2 class="cv-m21-tit" id="cv-m21-tit-certificaciones"></h2>
        <div class="cv-m21-cert-grid" id="cv-m21-certificaciones"></div>
      </section>

      <section class="cv-m21-bloque" id="cv-m21-referencias-bloque">
        <h2 class="cv-m21-tit" id="cv-m21-tit-referencias"></h2>
        <div class="cv-m21-referencias" id="cv-m21-referencias"></div>
      </section>
    </div>
  `;
}

function renderModelo21() {
  asegurarEsqueletoModelo21();

  $("#cv-m21-tit-contacto").textContent = t("contacto");
  $("#cv-m21-tit-habilidades").textContent = t("habilidades");
  $("#cv-m21-tit-blandas").textContent = t("blandas");
  $("#cv-m21-tit-idiomas").textContent = t("idiomas");
  $("#cv-m21-tit-educacion").textContent = t("educacion");
  $("#cv-m21-tit-perfil").textContent = t("perfil");
  $("#cv-m21-tit-experiencia").textContent = t("experiencia");
  $("#cv-m21-tit-logros").textContent = t("logros");
  $("#cv-m21-tit-certificaciones").textContent = t("certificaciones");
  $("#cv-m21-tit-referencias").textContent = t("referencias");

  $("#cv-m21-nombre").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
  $("#cv-m21-puesto").textContent = estado.puesto || "";
  $("#cv-m21-subtitulo").textContent = estado.subtitulo || "";

  const foto = $("#cv-m21-foto"), placeholder = $("#cv-m21-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  const contactoBloque = $("#cv-m21-contacto-bloque");
  if (estado.contacto.length) {
    contactoBloque.hidden = false;
    $("#cv-m21-contacto").innerHTML = estado.contacto.map(c => `
      <li class="cv-m21-contacto-item">
        <span class="cv-m21-ico">${iconoDe(c.tipo)}</span>
        <span>${contactoValorHTML(c)}</span>
      </li>
    `).join("");
  } else contactoBloque.hidden = true;

  const habBloque = $("#cv-m21-habilidades-bloque");
  if (estado.habilidades.length) {
    habBloque.hidden = false;
    $("#cv-m21-habilidades").innerHTML = estado.habilidades.map(h => `<span class="cv-m21-chip">${esc(h.texto)}</span>`).join("");
  } else habBloque.hidden = true;

  const blandasBloque = $("#cv-m21-blandas-bloque");
  if (estado.blandas.length) {
    blandasBloque.hidden = false;
    $("#cv-m21-blandas").innerHTML = estado.blandas.map(h => `<span class="cv-m21-chip cv-m21-chip-alt">${esc(h.texto)}</span>`).join("");
  } else blandasBloque.hidden = true;

  const idiomasBloque = $("#cv-m21-idiomas-bloque");
  if (estado.idiomas.length) {
    idiomasBloque.hidden = false;
    $("#cv-m21-idiomas").innerHTML = estado.idiomas.map(i => `
      <li class="cv-m21-idioma">
        <div class="cv-m21-idioma-cab"><span>${esc(i.nombre)}</span><span class="cv-m21-idioma-nivel">${esc(i.nivel)}</span></div>
        <div class="cv-m21-regla-mini" aria-hidden="true"></div>
      </li>
    `).join("");
  } else idiomasBloque.hidden = true;

  const eduBloque = $("#cv-m21-educacion-bloque");
  if (estado.educacion.length) {
    eduBloque.hidden = false;
    $("#cv-m21-educacion").innerHTML = estado.educacion.map(e => `
      <div class="cv-m21-edu">
        <div class="cv-m21-edu-inst">${esc(e.institucion)}</div>
        <div class="cv-m21-edu-fecha">${esc(e.fecha)}</div>
        ${e.bullets.length ? `<ul class="cv-m21-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
      </div>
    `).join("");
  } else eduBloque.hidden = true;

  const expBloque = $("#cv-m21-experiencia-bloque");
  if (estado.experiencia.length) {
    expBloque.hidden = false;
    $("#cv-m21-experiencia").innerHTML = estado.experiencia.map(x => `
      <div class="cv-m21-exp-item">
        <div class="cv-m21-exp-sheet"></div>
        <div class="cv-m21-exp-body">
          <div class="cv-m21-job-head">
            <div>
              <div class="cv-m21-exp-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa")}${ubicacionSufijo(x)}</div>
              <div class="cv-m21-exp-rol">${esc(x.rol)}</div>
            </div>
            <div class="cv-m21-exp-fecha">${esc(x.fecha)}</div>
          </div>
          ${x.descripcion ? `<p class="cv-m21-exp-desc">${escPárrafo(x.descripcion)}</p>` : ""}
          ${x.bullets.length ? `<ul class="cv-m21-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
          ${x.herramientas.length ? `<div class="cv-m21-herramientas">${x.herramientas.map(h => `<span class="cv-m21-chip cv-m21-chip-tool"><strong>${esc(h.etiqueta)}:</strong> ${esc(h.valor)}</span>`).join("")}</div>` : ""}
        </div>
      </div>
    `).join("");
  } else expBloque.hidden = true;

  const logrosBloque = $("#cv-m21-logros-bloque");
  if (estado.logros.length) {
    logrosBloque.hidden = false;
    $("#cv-m21-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
  } else logrosBloque.hidden = true;

  const certBloque = $("#cv-m21-certificaciones-bloque");
  if (estado.certificaciones.length) {
    certBloque.hidden = false;
    $("#cv-m21-certificaciones").innerHTML = estado.certificaciones.map(c => `
      <div class="cv-m21-cert">
        <div class="cv-m21-cert-tit">${esc(c.titulo)}</div>
        <div class="cv-m21-cert-sub">${esc(c.subtitulo)}</div>
      </div>
    `).join("");
  } else certBloque.hidden = true;

  const refBloque = $("#cv-m21-referencias-bloque");
  if (estado.referencias.length) {
    refBloque.hidden = false;
    $("#cv-m21-referencias").innerHTML = estado.referencias.map(r => `
      <div class="cv-m21-ref">
        <div class="cv-m21-ref-nombre">${esc(r.nombre)}</div>
        <div class="cv-m21-ref-rol">${esc(r.rol)}</div>
        ${r.email ? `<div class="cv-m21-ref-dato">${esc(r.email)}</div>` : ""}
        ${r.linkedin ? `<div class="cv-m21-ref-dato">${esc(r.linkedin)}</div>` : ""}
      </div>
    `).join("");
  } else refBloque.hidden = true;
}

// ---- Modelo 22 — Baker / Pastry Chef ----
function asegurarEsqueletoModelo22() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo22") return;
  pagina.dataset.esqueleto = "modelo22";
  pagina.innerHTML = `
    <header class="cv-m22-banner">
      <div class="cv-m22-foto-marco">
        <img class="cv-m22-foto" id="cv-m22-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m22-foto-placeholder" id="cv-m22-foto-placeholder">🙂</div>
      </div>
      <div class="cv-m22-banner-texto">
        <h1 class="cv-m22-nombre" id="cv-m22-nombre"></h1>
        <div class="cv-m22-puesto" id="cv-m22-puesto"></div>
        <div class="cv-m22-subtitulo" id="cv-m22-subtitulo"></div>
      </div>
      <div class="cv-m22-scallop" aria-hidden="true"></div>
    </header>

    <div class="cv-m22-cuerpo">
      <aside class="cv-m22-columna">
        <div class="cv-m22-tarjeta" id="cv-m22-contacto-bloque">
          <h3 class="cv-m22-tit-tarjeta" id="cv-m22-tit-contacto"></h3>
          <ul class="cv-m22-contacto" id="cv-m22-contacto"></ul>
        </div>
        <div class="cv-m22-tarjeta" id="cv-m22-habilidades-bloque">
          <h3 class="cv-m22-tit-tarjeta" id="cv-m22-tit-habilidades"></h3>
          <ul class="cv-m22-ingredientes" id="cv-m22-habilidades"></ul>
        </div>
        <div class="cv-m22-tarjeta" id="cv-m22-blandas-bloque">
          <h3 class="cv-m22-tit-tarjeta" id="cv-m22-tit-blandas"></h3>
          <ul class="cv-m22-ingredientes" id="cv-m22-blandas"></ul>
        </div>
        <div class="cv-m22-tarjeta" id="cv-m22-idiomas-bloque">
          <h3 class="cv-m22-tit-tarjeta" id="cv-m22-tit-idiomas"></h3>
          <ul class="cv-m22-ingredientes" id="cv-m22-idiomas"></ul>
        </div>
        <div class="cv-m22-tarjeta" id="cv-m22-educacion-bloque">
          <h3 class="cv-m22-tit-tarjeta" id="cv-m22-tit-educacion"></h3>
          <div id="cv-m22-educacion"></div>
        </div>
        <div class="cv-m22-tarjeta" id="cv-m22-certificaciones-bloque">
          <h3 class="cv-m22-tit-tarjeta" id="cv-m22-tit-certificaciones"></h3>
          <div id="cv-m22-certificaciones"></div>
        </div>
      </aside>

      <main class="cv-m22-principal">
        <section class="cv-m22-tarjeta" id="cv-m22-perfil-bloque">
          <h2 class="cv-m22-tit-receta" id="cv-m22-tit-perfil"></h2>
          <p class="cv-m22-perfil" id="cv-m22-perfil"></p>
        </section>

        <section id="cv-m22-experiencia-bloque">
          <h2 class="cv-m22-tit-receta" id="cv-m22-tit-experiencia"></h2>
          <div id="cv-m22-experiencia"></div>
        </section>

        <section class="cv-m22-tarjeta" id="cv-m22-logros-bloque">
          <h2 class="cv-m22-tit-receta" id="cv-m22-tit-logros"></h2>
          <ul class="cv-m22-logros" id="cv-m22-logros"></ul>
        </section>

        <section class="cv-m22-tarjeta" id="cv-m22-referencias-bloque">
          <h2 class="cv-m22-tit-receta" id="cv-m22-tit-referencias"></h2>
          <div class="cv-m22-referencias" id="cv-m22-referencias"></div>
        </section>
      </main>
    </div>
  `;
}

function renderModelo22() {
  asegurarEsqueletoModelo22();

  $("#cv-m22-tit-contacto").textContent = t("contacto");
  $("#cv-m22-tit-habilidades").textContent = t("habilidades");
  $("#cv-m22-tit-blandas").textContent = t("blandas");
  $("#cv-m22-tit-idiomas").textContent = t("idiomas");
  $("#cv-m22-tit-educacion").textContent = t("educacion");
  $("#cv-m22-tit-certificaciones").textContent = t("certificaciones");
  $("#cv-m22-tit-perfil").textContent = t("perfil");
  $("#cv-m22-tit-experiencia").textContent = t("experiencia");
  $("#cv-m22-tit-logros").textContent = t("logros");
  $("#cv-m22-tit-referencias").textContent = t("referencias");

  $("#cv-m22-nombre").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
  $("#cv-m22-puesto").textContent = estado.puesto || "";
  $("#cv-m22-subtitulo").textContent = estado.subtitulo || "";

  const foto = $("#cv-m22-foto"), placeholder = $("#cv-m22-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  const contactoBloque = $("#cv-m22-contacto-bloque");
  if (estado.contacto.length) {
    contactoBloque.hidden = false;
    $("#cv-m22-contacto").innerHTML = estado.contacto.map(c => `
      <li><span class="cv-m22-ico">${iconoDe(c.tipo)}</span><span>${contactoValorHTML(c)}</span></li>
    `).join("");
  } else contactoBloque.hidden = true;

  const habBloque = $("#cv-m22-habilidades-bloque");
  if (estado.habilidades.length) {
    habBloque.hidden = false;
    $("#cv-m22-habilidades").innerHTML = estado.habilidades.map(h => `<li>${esc(h.texto)}</li>`).join("");
  } else habBloque.hidden = true;

  const blandasBloque = $("#cv-m22-blandas-bloque");
  if (estado.blandas.length) {
    blandasBloque.hidden = false;
    $("#cv-m22-blandas").innerHTML = estado.blandas.map(h => `<li>${esc(h.texto)}</li>`).join("");
  } else blandasBloque.hidden = true;

  const idiomasBloque = $("#cv-m22-idiomas-bloque");
  if (estado.idiomas.length) {
    idiomasBloque.hidden = false;
    $("#cv-m22-idiomas").innerHTML = estado.idiomas.map(i => `<li>${esc(i.nombre)} <span class="cv-m22-nivel">· ${esc(i.nivel)}</span></li>`).join("");
  } else idiomasBloque.hidden = true;

  const eduBloque = $("#cv-m22-educacion-bloque");
  if (estado.educacion.length) {
    eduBloque.hidden = false;
    $("#cv-m22-educacion").innerHTML = estado.educacion.map(e => `
      <div class="cv-m22-edu">
        <div class="cv-m22-edu-inst">${esc(e.institucion)}</div>
        <div class="cv-m22-edu-fecha">${esc(e.fecha)}</div>
        ${e.bullets.length ? `<ul class="cv-m22-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
      </div>
    `).join("");
  } else eduBloque.hidden = true;

  const certBloque = $("#cv-m22-certificaciones-bloque");
  if (estado.certificaciones.length) {
    certBloque.hidden = false;
    $("#cv-m22-certificaciones").innerHTML = estado.certificaciones.map(c => `
      <div class="cv-m22-cert">
        <div class="cv-m22-cert-tit">${esc(c.titulo)}</div>
        <div class="cv-m22-cert-sub">${esc(c.subtitulo)}</div>
      </div>
    `).join("");
  } else certBloque.hidden = true;

  const expBloque = $("#cv-m22-experiencia-bloque");
  if (estado.experiencia.length) {
    expBloque.hidden = false;
    $("#cv-m22-experiencia").innerHTML = estado.experiencia.map((x, idx) => `
      <div class="cv-m22-paso">
        <div class="cv-m22-paso-num">${idx + 1}</div>
        <div class="cv-m22-paso-tarjeta">
          <div class="cv-m22-job-head">
            <div>
              <div class="cv-m22-exp-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa")}${ubicacionSufijo(x)}</div>
              <div class="cv-m22-exp-rol">${esc(x.rol)}</div>
            </div>
            <div class="cv-m22-exp-fecha">${esc(x.fecha)}</div>
          </div>
          ${x.descripcion ? `<p class="cv-m22-exp-desc">${escPárrafo(x.descripcion)}</p>` : ""}
          ${x.bullets.length ? `<ul class="cv-m22-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
          ${x.herramientas.length ? `<div class="cv-m22-herramientas">${x.herramientas.map(h => `<span class="cv-m22-chip"><strong>${esc(h.etiqueta)}:</strong> ${esc(h.valor)}</span>`).join("")}</div>` : ""}
        </div>
      </div>
    `).join("");
  } else expBloque.hidden = true;

  const logrosBloque = $("#cv-m22-logros-bloque");
  if (estado.logros.length) {
    logrosBloque.hidden = false;
    $("#cv-m22-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
  } else logrosBloque.hidden = true;

  const refBloque = $("#cv-m22-referencias-bloque");
  if (estado.referencias.length) {
    refBloque.hidden = false;
    $("#cv-m22-referencias").innerHTML = estado.referencias.map(r => `
      <div class="cv-m22-ref">
        <div class="cv-m22-ref-nombre">${esc(r.nombre)}</div>
        <div class="cv-m22-ref-rol">${esc(r.rol)}</div>
        ${r.email ? `<div class="cv-m22-ref-dato">${esc(r.email)}</div>` : ""}
        ${r.linkedin ? `<div class="cv-m22-ref-dato">${esc(r.linkedin)}</div>` : ""}
      </div>
    `).join("");
  } else refBloque.hidden = true;
}

// ---- Modelo 23 — Security Guard (Badge / Authority) ----
function asegurarEsqueletoModelo23() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo23") return;
  pagina.dataset.esqueleto = "modelo23";
  pagina.innerHTML = `
    <div class="cv-m23-franja" aria-hidden="true"></div>
    <header class="cv-m23-header">
      <div class="cv-m23-foto-marco">
        <img class="cv-m23-foto" id="cv-m23-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m23-foto-placeholder" id="cv-m23-foto-placeholder">🙂</div>
      </div>
      <div class="cv-m23-header-texto">
        <div class="cv-m23-credencial">CREDENCIAL DE SERVICIO</div>
        <h1 class="cv-m23-nombre" id="cv-m23-nombre"></h1>
        <div class="cv-m23-puesto" id="cv-m23-puesto"></div>
        <div class="cv-m23-subtitulo" id="cv-m23-subtitulo"></div>
      </div>
    </header>

    <div class="cv-m23-franja" aria-hidden="true"></div>

    <section class="cv-m23-bloque" id="cv-m23-contacto-bloque">
      <h2 class="cv-m23-tit" id="cv-m23-tit-contacto"></h2>
      <ul class="cv-m23-contacto" id="cv-m23-contacto"></ul>
    </section>

    <section class="cv-m23-bloque" id="cv-m23-perfil-bloque">
      <h2 class="cv-m23-tit" id="cv-m23-tit-perfil"></h2>
      <p class="cv-m23-perfil" id="cv-m23-perfil"></p>
    </section>

    <div class="cv-m23-grid-2">
      <section class="cv-m23-bloque" id="cv-m23-habilidades-bloque">
        <h2 class="cv-m23-tit" id="cv-m23-tit-habilidades"></h2>
        <div class="cv-m23-tags" id="cv-m23-habilidades"></div>
      </section>
      <section class="cv-m23-bloque" id="cv-m23-blandas-bloque">
        <h2 class="cv-m23-tit" id="cv-m23-tit-blandas"></h2>
        <div class="cv-m23-tags" id="cv-m23-blandas"></div>
      </section>
    </div>

    <section class="cv-m23-bloque" id="cv-m23-experiencia-bloque">
      <h2 class="cv-m23-tit" id="cv-m23-tit-experiencia"></h2>
      <div id="cv-m23-experiencia"></div>
    </section>

    <section class="cv-m23-bloque" id="cv-m23-logros-bloque">
      <h2 class="cv-m23-tit" id="cv-m23-tit-logros"></h2>
      <ul class="cv-m23-logros" id="cv-m23-logros"></ul>
    </section>

    <div class="cv-m23-grid-2">
      <section class="cv-m23-bloque" id="cv-m23-educacion-bloque">
        <h2 class="cv-m23-tit" id="cv-m23-tit-educacion"></h2>
        <div id="cv-m23-educacion"></div>
      </section>
      <section class="cv-m23-bloque" id="cv-m23-certificaciones-bloque">
        <h2 class="cv-m23-tit" id="cv-m23-tit-certificaciones"></h2>
        <div id="cv-m23-certificaciones"></div>
      </section>
    </div>

    <section class="cv-m23-bloque" id="cv-m23-idiomas-bloque">
      <h2 class="cv-m23-tit" id="cv-m23-tit-idiomas"></h2>
      <ul class="cv-m23-idiomas" id="cv-m23-idiomas"></ul>
    </section>

    <section class="cv-m23-bloque" id="cv-m23-referencias-bloque">
      <h2 class="cv-m23-tit" id="cv-m23-tit-referencias"></h2>
      <div class="cv-m23-referencias" id="cv-m23-referencias"></div>
    </section>
  `;
}

function renderModelo23() {
  asegurarEsqueletoModelo23();

  $("#cv-m23-tit-contacto").textContent = t("contacto");
  $("#cv-m23-tit-perfil").textContent = t("perfil");
  $("#cv-m23-tit-habilidades").textContent = t("habilidades");
  $("#cv-m23-tit-blandas").textContent = t("blandas");
  $("#cv-m23-tit-experiencia").textContent = t("experiencia");
  $("#cv-m23-tit-logros").textContent = t("logros");
  $("#cv-m23-tit-educacion").textContent = t("educacion");
  $("#cv-m23-tit-certificaciones").textContent = t("certificaciones");
  $("#cv-m23-tit-idiomas").textContent = t("idiomas");
  $("#cv-m23-tit-referencias").textContent = t("referencias");

  $("#cv-m23-nombre").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
  $("#cv-m23-puesto").textContent = estado.puesto || "";
  $("#cv-m23-subtitulo").textContent = estado.subtitulo || "";

  const foto = $("#cv-m23-foto"), placeholder = $("#cv-m23-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  const contactoBloque = $("#cv-m23-contacto-bloque");
  if (estado.contacto.length) {
    contactoBloque.hidden = false;
    $("#cv-m23-contacto").innerHTML = estado.contacto.map(c => `
      <li><span class="cv-m23-ico">${iconoDe(c.tipo)}</span><span>${contactoValorHTML(c)}</span></li>
    `).join("");
  } else contactoBloque.hidden = true;

  const perfilBloque = $("#cv-m23-perfil-bloque");
  if (estado.perfil) { perfilBloque.hidden = false; $("#cv-m23-perfil").innerHTML = escPárrafo(estado.perfil); }
  else perfilBloque.hidden = true;

  const habBloque = $("#cv-m23-habilidades-bloque");
  if (estado.habilidades.length) {
    habBloque.hidden = false;
    $("#cv-m23-habilidades").innerHTML = estado.habilidades.map(h => `<span class="cv-m23-chip">${esc(h.texto)}</span>`).join("");
  } else habBloque.hidden = true;

  const blandasBloque = $("#cv-m23-blandas-bloque");
  if (estado.blandas.length) {
    blandasBloque.hidden = false;
    $("#cv-m23-blandas").innerHTML = estado.blandas.map(h => `<span class="cv-m23-chip cv-m23-chip-alt">${esc(h.texto)}</span>`).join("");
  } else blandasBloque.hidden = true;

  const expBloque = $("#cv-m23-experiencia-bloque");
  if (estado.experiencia.length) {
    expBloque.hidden = false;
    $("#cv-m23-experiencia").innerHTML = estado.experiencia.map((x, idx) => `
      <div class="cv-m23-item">
        <div class="cv-m23-item-caso">CASO N° ${String(idx + 1).padStart(3, "0")}</div>
        <div class="cv-m23-job-head">
          <div>
            <div class="cv-m23-exp-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa")}${ubicacionSufijo(x)}</div>
            <div class="cv-m23-exp-rol">${esc(x.rol)}</div>
          </div>
          <div class="cv-m23-exp-fecha">${esc(x.fecha)}</div>
        </div>
        ${x.descripcion ? `<p class="cv-m23-exp-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${x.bullets.length ? `<ul class="cv-m23-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
        ${x.herramientas.length ? `<div class="cv-m23-herramientas">${x.herramientas.map(h => `<span class="cv-m23-chip cv-m23-chip-tool"><strong>${esc(h.etiqueta)}:</strong> ${esc(h.valor)}</span>`).join("")}</div>` : ""}
        <div class="cv-m23-divisor" aria-hidden="true"></div>
      </div>
    `).join("");
  } else expBloque.hidden = true;

  const logrosBloque = $("#cv-m23-logros-bloque");
  if (estado.logros.length) {
    logrosBloque.hidden = false;
    $("#cv-m23-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
  } else logrosBloque.hidden = true;

  const eduBloque = $("#cv-m23-educacion-bloque");
  if (estado.educacion.length) {
    eduBloque.hidden = false;
    $("#cv-m23-educacion").innerHTML = estado.educacion.map(e => `
      <div class="cv-m23-edu">
        <div class="cv-m23-edu-inst">${esc(e.institucion)}</div>
        <div class="cv-m23-edu-fecha">${esc(e.fecha)}</div>
        ${e.bullets.length ? `<ul class="cv-m23-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
      </div>
    `).join("");
  } else eduBloque.hidden = true;

  const certBloque = $("#cv-m23-certificaciones-bloque");
  if (estado.certificaciones.length) {
    certBloque.hidden = false;
    $("#cv-m23-certificaciones").innerHTML = estado.certificaciones.map(c => `
      <div class="cv-m23-cert">
        <div class="cv-m23-cert-tit">${esc(c.titulo)}</div>
        <div class="cv-m23-cert-sub">${esc(c.subtitulo)}</div>
      </div>
    `).join("");
  } else certBloque.hidden = true;

  const idiomasBloque = $("#cv-m23-idiomas-bloque");
  if (estado.idiomas.length) {
    idiomasBloque.hidden = false;
    $("#cv-m23-idiomas").innerHTML = estado.idiomas.map(i => `<li><span>${esc(i.nombre)}</span><span class="cv-m23-nivel">${esc(i.nivel)}</span></li>`).join("");
  } else idiomasBloque.hidden = true;

  const refBloque = $("#cv-m23-referencias-bloque");
  if (estado.referencias.length) {
    refBloque.hidden = false;
    $("#cv-m23-referencias").innerHTML = estado.referencias.map(r => `
      <div class="cv-m23-ref">
        <div class="cv-m23-ref-nombre">${esc(r.nombre)}</div>
        <div class="cv-m23-ref-rol">${esc(r.rol)}</div>
        ${r.email ? `<div class="cv-m23-ref-dato">${esc(r.email)}</div>` : ""}
        ${r.linkedin ? `<div class="cv-m23-ref-dato">${esc(r.linkedin)}</div>` : ""}
      </div>
    `).join("");
  } else refBloque.hidden = true;
}

// ---- Modelo 24 — Chef / Culinary (Menu Card) ----
function asegurarEsqueletoModelo24() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo24") return;
  pagina.dataset.esqueleto = "modelo24";
  pagina.innerHTML = `
    <header class="cv-m24-header">
      <div class="cv-m24-foto-marco">
        <img class="cv-m24-foto" id="cv-m24-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m24-foto-placeholder" id="cv-m24-foto-placeholder">🙂</div>
      </div>
      <div class="cv-m24-flourish-top" aria-hidden="true">❖ ─────────── ❖</div>
      <h1 class="cv-m24-nombre" id="cv-m24-nombre"></h1>
      <div class="cv-m24-puesto" id="cv-m24-puesto"></div>
      <div class="cv-m24-subtitulo" id="cv-m24-subtitulo"></div>
      <div class="cv-m24-flourish-bottom" aria-hidden="true">❖ ─────────── ❖</div>
      <ul class="cv-m24-contacto" id="cv-m24-contacto"></ul>
    </header>

    <div class="cv-m24-cuerpo">
      <section class="cv-m24-bloque" id="cv-m24-perfil-bloque">
        <h2 class="cv-m24-tit-menu" id="cv-m24-tit-perfil"></h2>
        <p class="cv-m24-perfil" id="cv-m24-perfil"></p>
      </section>

      <section class="cv-m24-bloque" id="cv-m24-experiencia-bloque">
        <h2 class="cv-m24-tit-menu" id="cv-m24-tit-experiencia"></h2>
        <div id="cv-m24-experiencia"></div>
      </section>

      <div class="cv-m24-grid-2">
        <section class="cv-m24-bloque" id="cv-m24-habilidades-bloque">
          <h2 class="cv-m24-tit-menu" id="cv-m24-tit-habilidades"></h2>
          <div class="cv-m24-tags" id="cv-m24-habilidades"></div>
        </section>
        <section class="cv-m24-bloque" id="cv-m24-blandas-bloque">
          <h2 class="cv-m24-tit-menu" id="cv-m24-tit-blandas"></h2>
          <div class="cv-m24-tags" id="cv-m24-blandas"></div>
        </section>
      </div>

      <section class="cv-m24-bloque" id="cv-m24-logros-bloque">
        <h2 class="cv-m24-tit-menu" id="cv-m24-tit-logros"></h2>
        <ul class="cv-m24-logros" id="cv-m24-logros"></ul>
      </section>

      <div class="cv-m24-grid-2">
        <section class="cv-m24-bloque" id="cv-m24-educacion-bloque">
          <h2 class="cv-m24-tit-menu" id="cv-m24-tit-educacion"></h2>
          <div id="cv-m24-educacion"></div>
        </section>
        <section class="cv-m24-bloque" id="cv-m24-certificaciones-bloque">
          <h2 class="cv-m24-tit-menu" id="cv-m24-tit-certificaciones"></h2>
          <div id="cv-m24-certificaciones"></div>
        </section>
      </div>

      <section class="cv-m24-bloque" id="cv-m24-idiomas-bloque">
        <h2 class="cv-m24-tit-menu" id="cv-m24-tit-idiomas"></h2>
        <ul class="cv-m24-idiomas" id="cv-m24-idiomas"></ul>
      </section>

      <section class="cv-m24-bloque" id="cv-m24-referencias-bloque">
        <h2 class="cv-m24-tit-menu" id="cv-m24-tit-referencias"></h2>
        <div class="cv-m24-referencias" id="cv-m24-referencias"></div>
      </section>
    </div>
  `;
}

function renderModelo24() {
  asegurarEsqueletoModelo24();

  $("#cv-m24-tit-perfil").textContent = t("perfil");
  $("#cv-m24-tit-experiencia").textContent = t("experiencia");
  $("#cv-m24-tit-habilidades").textContent = t("habilidades");
  $("#cv-m24-tit-blandas").textContent = t("blandas");
  $("#cv-m24-tit-logros").textContent = t("logros");
  $("#cv-m24-tit-educacion").textContent = t("educacion");
  $("#cv-m24-tit-certificaciones").textContent = t("certificaciones");
  $("#cv-m24-tit-idiomas").textContent = t("idiomas");
  $("#cv-m24-tit-referencias").textContent = t("referencias");

  $("#cv-m24-nombre").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
  $("#cv-m24-puesto").textContent = estado.puesto || "";
  $("#cv-m24-subtitulo").textContent = estado.subtitulo || "";

  const foto = $("#cv-m24-foto"), placeholder = $("#cv-m24-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  const contactoUl = $("#cv-m24-contacto");
  if (estado.contacto.length) {
    contactoUl.hidden = false;
    contactoUl.innerHTML = estado.contacto.map(c => `
      <li><span class="cv-m24-ico">${iconoDe(c.tipo)}</span><span>${contactoValorHTML(c)}</span></li>
    `).join("");
  } else contactoUl.hidden = true;

  const perfilBloque = $("#cv-m24-perfil-bloque");
  if (estado.perfil) { perfilBloque.hidden = false; $("#cv-m24-perfil").innerHTML = escPárrafo(estado.perfil); }
  else perfilBloque.hidden = true;

  const expBloque = $("#cv-m24-experiencia-bloque");
  if (estado.experiencia.length) {
    expBloque.hidden = false;
    $("#cv-m24-experiencia").innerHTML = estado.experiencia.map(x => `
      <div class="cv-m24-plato">
        <div class="cv-m24-job-head">
          <div class="cv-m24-plato-nombre">
            <span class="cv-m24-exp-rol">${esc(x.rol)}</span>
            <span class="cv-m24-puntos" aria-hidden="true"></span>
          </div>
          <div class="cv-m24-precio">${esc(x.fecha)}</div>
        </div>
        <div class="cv-m24-exp-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa")}${ubicacionSufijo(x)}</div>
        ${x.descripcion ? `<p class="cv-m24-exp-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${x.bullets.length ? `<ul class="cv-m24-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
        ${x.herramientas.length ? `<div class="cv-m24-herramientas">${x.herramientas.map(h => `<span class="cv-m24-chip"><strong>${esc(h.etiqueta)}:</strong> ${esc(h.valor)}</span>`).join("")}</div>` : ""}
      </div>
    `).join("");
  } else expBloque.hidden = true;

  const habBloque = $("#cv-m24-habilidades-bloque");
  if (estado.habilidades.length) {
    habBloque.hidden = false;
    $("#cv-m24-habilidades").innerHTML = estado.habilidades.map(h => `<span class="cv-m24-chip">${esc(h.texto)}</span>`).join("");
  } else habBloque.hidden = true;

  const blandasBloque = $("#cv-m24-blandas-bloque");
  if (estado.blandas.length) {
    blandasBloque.hidden = false;
    $("#cv-m24-blandas").innerHTML = estado.blandas.map(h => `<span class="cv-m24-chip cv-m24-chip-alt">${esc(h.texto)}</span>`).join("");
  } else blandasBloque.hidden = true;

  const logrosBloque = $("#cv-m24-logros-bloque");
  if (estado.logros.length) {
    logrosBloque.hidden = false;
    $("#cv-m24-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
  } else logrosBloque.hidden = true;

  const eduBloque = $("#cv-m24-educacion-bloque");
  if (estado.educacion.length) {
    eduBloque.hidden = false;
    $("#cv-m24-educacion").innerHTML = estado.educacion.map(e => `
      <div class="cv-m24-edu">
        <div class="cv-m24-edu-inst">${esc(e.institucion)}</div>
        <div class="cv-m24-edu-fecha">${esc(e.fecha)}</div>
        ${e.bullets.length ? `<ul class="cv-m24-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
      </div>
    `).join("");
  } else eduBloque.hidden = true;

  const certBloque = $("#cv-m24-certificaciones-bloque");
  if (estado.certificaciones.length) {
    certBloque.hidden = false;
    $("#cv-m24-certificaciones").innerHTML = estado.certificaciones.map(c => `
      <div class="cv-m24-cert">
        <div class="cv-m24-cert-tit">${esc(c.titulo)}</div>
        <div class="cv-m24-cert-sub">${esc(c.subtitulo)}</div>
      </div>
    `).join("");
  } else certBloque.hidden = true;

  const idiomasBloque = $("#cv-m24-idiomas-bloque");
  if (estado.idiomas.length) {
    idiomasBloque.hidden = false;
    $("#cv-m24-idiomas").innerHTML = estado.idiomas.map(i => `<li><span>${esc(i.nombre)}</span><span class="cv-m24-nivel">${esc(i.nivel)}</span></li>`).join("");
  } else idiomasBloque.hidden = true;

  const refBloque = $("#cv-m24-referencias-bloque");
  if (estado.referencias.length) {
    refBloque.hidden = false;
    $("#cv-m24-referencias").innerHTML = estado.referencias.map(r => `
      <div class="cv-m24-ref">
        <div class="cv-m24-ref-nombre">${esc(r.nombre)}</div>
        <div class="cv-m24-ref-rol">${esc(r.rol)}</div>
        ${r.email ? `<div class="cv-m24-ref-dato">${esc(r.email)}</div>` : ""}
        ${r.linkedin ? `<div class="cv-m24-ref-dato">${esc(r.linkedin)}</div>` : ""}
      </div>
    `).join("");
  } else refBloque.hidden = true;
}


// ---- Modelos 25-28 ----
function asegurarEsqueletoModelo25() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo25") return;
  pagina.dataset.esqueleto = "modelo25";
  pagina.innerHTML = `
    <div class="cv-m25-shell">
      <aside class="cv-m25-sidebar">
        <div class="cv-m25-foto-marco">
          <img class="cv-m25-foto" id="cv-m25-foto" src="" alt="Foto de perfil" hidden>
          <div class="cv-m25-foto-placeholder" id="cv-m25-foto-placeholder">🙂</div>
          <div class="cv-m25-foto-badge">✚</div>
        </div>
        <div class="cv-m25-side-sec" id="cv-m25-sec-contacto">
          <h3 class="cv-m25-side-titulo" id="cv-m25-tit-contacto"></h3>
          <div class="cv-m25-contacto" id="cv-m25-contacto"></div>
        </div>
        <div class="cv-m25-side-sec" id="cv-m25-sec-habilidades">
          <h3 class="cv-m25-side-titulo" id="cv-m25-tit-habilidades"></h3>
          <div class="cv-m25-chips" id="cv-m25-habilidades"></div>
        </div>
        <div class="cv-m25-side-sec" id="cv-m25-sec-blandas">
          <h3 class="cv-m25-side-titulo" id="cv-m25-tit-blandas"></h3>
          <div class="cv-m25-chips" id="cv-m25-blandas"></div>
        </div>
        <div class="cv-m25-side-sec" id="cv-m25-sec-idiomas">
          <h3 class="cv-m25-side-titulo" id="cv-m25-tit-idiomas"></h3>
          <div class="cv-m25-idiomas" id="cv-m25-idiomas"></div>
        </div>
        <div class="cv-m25-side-sec" id="cv-m25-sec-certificaciones">
          <h3 class="cv-m25-side-titulo" id="cv-m25-tit-certificaciones"></h3>
          <div class="cv-m25-certs" id="cv-m25-certificaciones"></div>
        </div>
      </aside>
      <main class="cv-m25-main">
        <header class="cv-m25-header">
          <div class="cv-m25-nombre-wrap">
            <h1 class="cv-m25-nombre"><span id="cv-m25-nombre"></span> <span class="cv-m25-apellido" id="cv-m25-apellido"></span></h1>
            <p class="cv-m25-puesto" id="cv-m25-puesto"></p>
            <p class="cv-m25-subtitulo" id="cv-m25-subtitulo"></p>
          </div>
          <svg class="cv-m25-ekg" viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true">
            <polyline points="0,20 40,20 55,6 68,34 82,14 96,20 140,20 155,8 170,32 185,20 300,20" />
          </svg>
        </header>
        <section class="cv-m25-card" id="cv-m25-sec-perfil">
          <h2 class="cv-m25-titulo" id="cv-m25-tit-perfil"></h2>
          <p class="cv-m25-perfil" id="cv-m25-perfil"></p>
        </section>
        <section class="cv-m25-card" id="cv-m25-sec-experiencia">
          <h2 class="cv-m25-titulo" id="cv-m25-tit-experiencia"></h2>
          <div id="cv-m25-experiencia"></div>
        </section>
        <section class="cv-m25-card" id="cv-m25-sec-educacion">
          <h2 class="cv-m25-titulo" id="cv-m25-tit-educacion"></h2>
          <div id="cv-m25-educacion"></div>
        </section>
        <section class="cv-m25-card" id="cv-m25-sec-logros">
          <h2 class="cv-m25-titulo" id="cv-m25-tit-logros"></h2>
          <ul class="cv-m25-logros" id="cv-m25-logros"></ul>
        </section>
        <section class="cv-m25-card" id="cv-m25-sec-referencias">
          <h2 class="cv-m25-titulo" id="cv-m25-tit-referencias"></h2>
          <div class="cv-m25-refs" id="cv-m25-referencias"></div>
        </section>
      </main>
    </div>
  `;
}

function m25Herramientas(herramientas) {
  if (!herramientas || !herramientas.length) return "";
  const grupos = {};
  herramientas.forEach(h => { (grupos[h.etiqueta || ""] ||= []).push(h.valor); });
  return `<div class="cv-m25-job-tools">${Object.entries(grupos).map(([etq, vals]) =>
    `<span class="cv-m25-tool-grupo">${etq ? `<strong>${esc(etq)}:</strong> ` : ""}${vals.map(esc).join(", ")}</span>`
  ).join("")}</div>`;
}

function renderModelo25() {
  asegurarEsqueletoModelo25();

  $("#cv-m25-nombre").textContent = estado.nombre;
  $("#cv-m25-apellido").textContent = estado.apellido;
  $("#cv-m25-puesto").textContent = estado.puesto;
  $("#cv-m25-subtitulo").textContent = estado.subtitulo || "";
  $("#cv-m25-subtitulo").hidden = !estado.subtitulo;

  const foto = $("#cv-m25-foto"), placeholder = $("#cv-m25-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m25-tit-contacto").textContent = t("contacto");
  $("#cv-m25-contacto").innerHTML = estado.contacto.map(c =>
    `<div class="cv-m25-contacto-item"><span class="cv-m25-ico">${iconoDe(c.tipo)}</span><span class="cv-m25-valor">${contactoValorHTML(c)}</span></div>`
  ).join("");
  $("#cv-m25-sec-contacto").hidden = !estado.contacto.length;

  $("#cv-m25-tit-habilidades").textContent = t("habilidades");
  $("#cv-m25-habilidades").innerHTML = estado.habilidades.map(h => `<span class="cv-m25-chip">${esc(h.texto)}</span>`).join("");
  $("#cv-m25-sec-habilidades").hidden = !estado.habilidades.length;

  $("#cv-m25-tit-blandas").textContent = t("blandas");
  $("#cv-m25-blandas").innerHTML = estado.blandas.map(h => `<span class="cv-m25-chip cv-m25-chip-alt">${esc(h.texto)}</span>`).join("");
  $("#cv-m25-sec-blandas").hidden = !estado.blandas.length;

  $("#cv-m25-tit-idiomas").textContent = t("idiomas");
  $("#cv-m25-idiomas").innerHTML = estado.idiomas.map(i =>
    `<div class="cv-m25-idioma"><span>${esc(i.nombre)}</span><span class="cv-m25-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");
  $("#cv-m25-sec-idiomas").hidden = !estado.idiomas.length;

  $("#cv-m25-tit-certificaciones").textContent = t("certificaciones");
  $("#cv-m25-certificaciones").innerHTML = estado.certificaciones.map(c =>
    `<div class="cv-m25-cert"><strong>${esc(c.titulo)}</strong>${c.subtitulo ? `<span>${esc(c.subtitulo)}</span>` : ""}</div>`
  ).join("");
  $("#cv-m25-sec-certificaciones").hidden = !estado.certificaciones.length;

  $("#cv-m25-tit-perfil").textContent = t("perfil");
  $("#cv-m25-perfil").innerHTML = escPárrafo(estado.perfil || "");
  $("#cv-m25-sec-perfil").hidden = !estado.perfil;

  $("#cv-m25-tit-experiencia").textContent = t("experiencia");
  $("#cv-m25-experiencia").innerHTML = estado.experiencia.map(x => `
    <div class="cv-m25-job">
      <div class="cv-m25-job-head">
        <div>
          <h3 class="cv-m25-job-rol">${esc(x.rol)}</h3>
          <div class="cv-m25-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}</div>
        </div>
        <div class="cv-m25-job-fecha">${esc(x.fecha)}</div>
      </div>
      ${x.descripcion ? `<p class="cv-m25-job-desc">${escPárrafo(x.descripcion)}</p>` : ""}
      ${x.bullets && x.bullets.length ? `<ul class="cv-m25-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
      ${m25Herramientas(x.herramientas)}
    </div>
  `).join("");
  $("#cv-m25-sec-experiencia").hidden = !estado.experiencia.length;

  $("#cv-m25-tit-educacion").textContent = t("educacion");
  $("#cv-m25-educacion").innerHTML = estado.educacion.map(e => `
    <div class="cv-m25-edu">
      <div class="cv-m25-edu-head"><strong>${esc(e.institucion)}</strong><span class="cv-m25-edu-fecha">${esc(e.fecha)}</span></div>
      ${e.bullets && e.bullets.length ? `<ul>${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");
  $("#cv-m25-sec-educacion").hidden = !estado.educacion.length;

  $("#cv-m25-tit-logros").textContent = t("logros");
  $("#cv-m25-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
  $("#cv-m25-sec-logros").hidden = !estado.logros.length;

  $("#cv-m25-tit-referencias").textContent = t("referencias");
  $("#cv-m25-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m25-ref">
      <strong>${esc(r.nombre)}</strong>
      <span>${esc(r.rol)}</span>
      ${r.email ? `<span>${esc(r.email)}</span>` : ""}
      ${r.linkedin ? `<a href="${esc(r.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>` : ""}
    </div>
  `).join("");
  $("#cv-m25-sec-referencias").hidden = !estado.referencias.length;
}

function asegurarEsqueletoModelo26() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo26") return;
  pagina.dataset.esqueleto = "modelo26";
  pagina.innerHTML = `
    <div class="cv-m26-shell">
      <header class="cv-m26-banner">
        <div class="cv-m26-stripes" aria-hidden="true"></div>
        <div class="cv-m26-banner-inner">
          <div class="cv-m26-foto-marco">
            <img class="cv-m26-foto" id="cv-m26-foto" src="" alt="Foto de perfil" hidden>
            <div class="cv-m26-foto-placeholder" id="cv-m26-foto-placeholder">🙂</div>
          </div>
          <div class="cv-m26-id">
            <h1 class="cv-m26-nombre"><span id="cv-m26-nombre"></span> <span id="cv-m26-apellido"></span></h1>
            <p class="cv-m26-puesto" id="cv-m26-puesto"></p>
            <p class="cv-m26-subtitulo" id="cv-m26-subtitulo"></p>
          </div>
        </div>
      </header>
      <div class="cv-m26-body">
        <main class="cv-m26-main">
          <section class="cv-m26-sec" id="cv-m26-sec-perfil">
            <h2 class="cv-m26-titulo" id="cv-m26-tit-perfil"></h2>
            <p class="cv-m26-perfil" id="cv-m26-perfil"></p>
          </section>
          <section class="cv-m26-sec" id="cv-m26-sec-experiencia">
            <h2 class="cv-m26-titulo" id="cv-m26-tit-experiencia"></h2>
            <div class="cv-m26-timeline" id="cv-m26-experiencia"></div>
          </section>
          <section class="cv-m26-sec" id="cv-m26-sec-logros">
            <h2 class="cv-m26-titulo" id="cv-m26-tit-logros"></h2>
            <ul class="cv-m26-logros" id="cv-m26-logros"></ul>
          </section>
          <section class="cv-m26-sec" id="cv-m26-sec-referencias">
            <h2 class="cv-m26-titulo" id="cv-m26-tit-referencias"></h2>
            <div class="cv-m26-refs" id="cv-m26-referencias"></div>
          </section>
        </main>
        <aside class="cv-m26-side">
          <div class="cv-m26-side-sec" id="cv-m26-sec-contacto">
            <h3 class="cv-m26-side-titulo" id="cv-m26-tit-contacto"></h3>
            <div id="cv-m26-contacto"></div>
          </div>
          <div class="cv-m26-side-sec" id="cv-m26-sec-habilidades">
            <h3 class="cv-m26-side-titulo" id="cv-m26-tit-habilidades"></h3>
            <div class="cv-m26-badges" id="cv-m26-habilidades"></div>
          </div>
          <div class="cv-m26-side-sec" id="cv-m26-sec-blandas">
            <h3 class="cv-m26-side-titulo" id="cv-m26-tit-blandas"></h3>
            <div class="cv-m26-badges" id="cv-m26-blandas"></div>
          </div>
          <div class="cv-m26-side-sec" id="cv-m26-sec-idiomas">
            <h3 class="cv-m26-side-titulo" id="cv-m26-tit-idiomas"></h3>
            <div id="cv-m26-idiomas"></div>
          </div>
          <div class="cv-m26-side-sec" id="cv-m26-sec-educacion">
            <h3 class="cv-m26-side-titulo" id="cv-m26-tit-educacion"></h3>
            <div id="cv-m26-educacion"></div>
          </div>
          <div class="cv-m26-side-sec" id="cv-m26-sec-certificaciones">
            <h3 class="cv-m26-side-titulo" id="cv-m26-tit-certificaciones"></h3>
            <div id="cv-m26-certificaciones"></div>
          </div>
        </aside>
      </div>
    </div>
  `;
}

function m26Herramientas(herramientas) {
  if (!herramientas || !herramientas.length) return "";
  const grupos = {};
  herramientas.forEach(h => { (grupos[h.etiqueta || ""] ||= []).push(h.valor); });
  return `<div class="cv-m26-job-tools">${Object.entries(grupos).map(([etq, vals]) =>
    `<span class="cv-m26-tool-grupo">${etq ? `<strong>${esc(etq)}:</strong> ` : ""}${vals.map(esc).join(", ")}</span>`
  ).join("")}</div>`;
}

function renderModelo26() {
  asegurarEsqueletoModelo26();

  $("#cv-m26-nombre").textContent = estado.nombre;
  $("#cv-m26-apellido").textContent = estado.apellido;
  $("#cv-m26-puesto").textContent = estado.puesto;
  $("#cv-m26-subtitulo").textContent = estado.subtitulo || "";
  $("#cv-m26-subtitulo").hidden = !estado.subtitulo;

  const foto = $("#cv-m26-foto"), placeholder = $("#cv-m26-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m26-tit-contacto").textContent = t("contacto");
  $("#cv-m26-contacto").innerHTML = estado.contacto.map(c =>
    `<div class="cv-m26-contacto-item"><span class="cv-m26-ico">${iconoDe(c.tipo)}</span><span>${contactoValorHTML(c)}</span></div>`
  ).join("");
  $("#cv-m26-sec-contacto").hidden = !estado.contacto.length;

  $("#cv-m26-tit-habilidades").textContent = t("habilidades");
  $("#cv-m26-habilidades").innerHTML = estado.habilidades.map(h => `<span class="cv-m26-badge">${esc(h.texto)}</span>`).join("");
  $("#cv-m26-sec-habilidades").hidden = !estado.habilidades.length;

  $("#cv-m26-tit-blandas").textContent = t("blandas");
  $("#cv-m26-blandas").innerHTML = estado.blandas.map(h => `<span class="cv-m26-badge cv-m26-badge-alt">${esc(h.texto)}</span>`).join("");
  $("#cv-m26-sec-blandas").hidden = !estado.blandas.length;

  $("#cv-m26-tit-idiomas").textContent = t("idiomas");
  $("#cv-m26-idiomas").innerHTML = estado.idiomas.map(i =>
    `<div class="cv-m26-idioma"><span>${esc(i.nombre)}</span><span class="cv-m26-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");
  $("#cv-m26-sec-idiomas").hidden = !estado.idiomas.length;

  $("#cv-m26-tit-educacion").textContent = t("educacion");
  $("#cv-m26-educacion").innerHTML = estado.educacion.map(e => `
    <div class="cv-m26-edu">
      <strong>${esc(e.institucion)}</strong>
      <span class="cv-m26-edu-fecha">${esc(e.fecha)}</span>
      ${e.bullets && e.bullets.length ? `<ul>${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");
  $("#cv-m26-sec-educacion").hidden = !estado.educacion.length;

  $("#cv-m26-tit-certificaciones").textContent = t("certificaciones");
  $("#cv-m26-certificaciones").innerHTML = estado.certificaciones.map(c =>
    `<div class="cv-m26-cert"><strong>${esc(c.titulo)}</strong>${c.subtitulo ? `<span>${esc(c.subtitulo)}</span>` : ""}</div>`
  ).join("");
  $("#cv-m26-sec-certificaciones").hidden = !estado.certificaciones.length;

  $("#cv-m26-tit-perfil").textContent = t("perfil");
  $("#cv-m26-perfil").innerHTML = escPárrafo(estado.perfil || "");
  $("#cv-m26-sec-perfil").hidden = !estado.perfil;

  $("#cv-m26-tit-experiencia").textContent = t("experiencia");
  $("#cv-m26-experiencia").innerHTML = estado.experiencia.map(x => `
    <div class="cv-m26-job">
      <div class="cv-m26-job-marker"></div>
      <div class="cv-m26-job-body">
        <div class="cv-m26-job-head">
          <div>
            <h3 class="cv-m26-job-rol">${esc(x.rol)}</h3>
            <div class="cv-m26-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}</div>
          </div>
          <div class="cv-m26-job-fecha">${esc(x.fecha)}</div>
        </div>
        ${x.descripcion ? `<p class="cv-m26-job-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${x.bullets && x.bullets.length ? `<ul class="cv-m26-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
        ${m26Herramientas(x.herramientas)}
      </div>
    </div>
  `).join("");
  $("#cv-m26-sec-experiencia").hidden = !estado.experiencia.length;

  $("#cv-m26-tit-logros").textContent = t("logros");
  $("#cv-m26-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
  $("#cv-m26-sec-logros").hidden = !estado.logros.length;

  $("#cv-m26-tit-referencias").textContent = t("referencias");
  $("#cv-m26-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m26-ref">
      <strong>${esc(r.nombre)}</strong>
      <span>${esc(r.rol)}</span>
      ${r.email ? `<span>${esc(r.email)}</span>` : ""}
      ${r.linkedin ? `<a href="${esc(r.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>` : ""}
    </div>
  `).join("");
  $("#cv-m26-sec-referencias").hidden = !estado.referencias.length;
}

function asegurarEsqueletoModelo27() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo27") return;
  pagina.dataset.esqueleto = "modelo27";
  pagina.innerHTML = `
    <div class="cv-m27-shell">
      <aside class="cv-m27-cover">
        <div class="cv-m27-aperture">
          <img class="cv-m27-foto" id="cv-m27-foto" src="" alt="Foto de perfil" hidden>
          <div class="cv-m27-foto-placeholder" id="cv-m27-foto-placeholder">🙂</div>
        </div>
        <h1 class="cv-m27-nombre"><span id="cv-m27-nombre"></span><br><span id="cv-m27-apellido"></span></h1>
        <p class="cv-m27-puesto" id="cv-m27-puesto"></p>
        <p class="cv-m27-subtitulo" id="cv-m27-subtitulo"></p>
        <div class="cv-m27-contacto" id="cv-m27-contacto"></div>
        <div class="cv-m27-filmstrip" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
      </aside>
      <main class="cv-m27-gallery">
        <section class="cv-m27-sec" id="cv-m27-sec-perfil">
          <h2 class="cv-m27-titulo"><span class="cv-m27-num">01</span><span id="cv-m27-tit-perfil"></span></h2>
          <p class="cv-m27-perfil" id="cv-m27-perfil"></p>
        </section>
        <section class="cv-m27-sec" id="cv-m27-sec-experiencia">
          <h2 class="cv-m27-titulo"><span class="cv-m27-num">02</span><span id="cv-m27-tit-experiencia"></span></h2>
          <div id="cv-m27-experiencia"></div>
        </section>
        <section class="cv-m27-sec" id="cv-m27-sec-educacion">
          <h2 class="cv-m27-titulo"><span class="cv-m27-num">03</span><span id="cv-m27-tit-educacion"></span></h2>
          <div id="cv-m27-educacion"></div>
        </section>
        <section class="cv-m27-sec" id="cv-m27-sec-certificaciones">
          <h2 class="cv-m27-titulo"><span class="cv-m27-num">04</span><span id="cv-m27-tit-certificaciones"></span></h2>
          <div id="cv-m27-certificaciones"></div>
        </section>
        <section class="cv-m27-sec" id="cv-m27-sec-habilidades">
          <h2 class="cv-m27-titulo"><span class="cv-m27-num">05</span><span id="cv-m27-tit-habilidades"></span></h2>
          <div class="cv-m27-chips" id="cv-m27-habilidades"></div>
        </section>
        <section class="cv-m27-sec" id="cv-m27-sec-blandas">
          <h2 class="cv-m27-titulo"><span class="cv-m27-num">06</span><span id="cv-m27-tit-blandas"></span></h2>
          <div class="cv-m27-chips" id="cv-m27-blandas"></div>
        </section>
        <section class="cv-m27-sec" id="cv-m27-sec-idiomas">
          <h2 class="cv-m27-titulo"><span class="cv-m27-num">07</span><span id="cv-m27-tit-idiomas"></span></h2>
          <div id="cv-m27-idiomas"></div>
        </section>
        <section class="cv-m27-sec" id="cv-m27-sec-logros">
          <h2 class="cv-m27-titulo"><span class="cv-m27-num">08</span><span id="cv-m27-tit-logros"></span></h2>
          <ul class="cv-m27-logros" id="cv-m27-logros"></ul>
        </section>
        <section class="cv-m27-sec" id="cv-m27-sec-referencias">
          <h2 class="cv-m27-titulo"><span class="cv-m27-num">09</span><span id="cv-m27-tit-referencias"></span></h2>
          <div class="cv-m27-refs" id="cv-m27-referencias"></div>
        </section>
      </main>
    </div>
  `;
}

function m27Herramientas(herramientas) {
  if (!herramientas || !herramientas.length) return "";
  const grupos = {};
  herramientas.forEach(h => { (grupos[h.etiqueta || ""] ||= []).push(h.valor); });
  return `<div class="cv-m27-job-tools">${Object.entries(grupos).map(([etq, vals]) =>
    `<span class="cv-m27-tool-grupo">${etq ? `<strong>${esc(etq)}:</strong> ` : ""}${vals.map(esc).join(", ")}</span>`
  ).join("")}</div>`;
}

function renderModelo27() {
  asegurarEsqueletoModelo27();

  $("#cv-m27-nombre").textContent = estado.nombre;
  $("#cv-m27-apellido").textContent = estado.apellido;
  $("#cv-m27-puesto").textContent = estado.puesto;
  $("#cv-m27-subtitulo").textContent = estado.subtitulo || "";
  $("#cv-m27-subtitulo").hidden = !estado.subtitulo;

  const foto = $("#cv-m27-foto"), placeholder = $("#cv-m27-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m27-contacto").innerHTML = estado.contacto.map(c =>
    `<div class="cv-m27-contacto-item"><span class="cv-m27-ico">${iconoDe(c.tipo)}</span><span>${contactoValorHTML(c)}</span></div>`
  ).join("");

  $("#cv-m27-tit-perfil").textContent = t("perfil");
  $("#cv-m27-perfil").innerHTML = escPárrafo(estado.perfil || "");
  $("#cv-m27-sec-perfil").hidden = !estado.perfil;

  $("#cv-m27-tit-experiencia").textContent = t("experiencia");
  $("#cv-m27-experiencia").innerHTML = estado.experiencia.map(x => `
    <div class="cv-m27-job">
      <div class="cv-m27-job-head">
        <div>
          <h3 class="cv-m27-job-rol">${esc(x.rol)}</h3>
          <div class="cv-m27-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}</div>
        </div>
        <div class="cv-m27-job-fecha">${esc(x.fecha)}</div>
      </div>
      ${x.descripcion ? `<p class="cv-m27-job-desc">${escPárrafo(x.descripcion)}</p>` : ""}
      ${x.bullets && x.bullets.length ? `<ul class="cv-m27-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
      ${m27Herramientas(x.herramientas)}
    </div>
  `).join("");
  $("#cv-m27-sec-experiencia").hidden = !estado.experiencia.length;

  $("#cv-m27-tit-educacion").textContent = t("educacion");
  $("#cv-m27-educacion").innerHTML = estado.educacion.map(e => `
    <div class="cv-m27-edu">
      <div class="cv-m27-edu-head"><strong>${esc(e.institucion)}</strong><span class="cv-m27-edu-fecha">${esc(e.fecha)}</span></div>
      ${e.bullets && e.bullets.length ? `<ul>${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");
  $("#cv-m27-sec-educacion").hidden = !estado.educacion.length;

  $("#cv-m27-tit-certificaciones").textContent = t("certificaciones");
  $("#cv-m27-certificaciones").innerHTML = estado.certificaciones.map(c =>
    `<div class="cv-m27-cert"><strong>${esc(c.titulo)}</strong>${c.subtitulo ? `<span>${esc(c.subtitulo)}</span>` : ""}</div>`
  ).join("");
  $("#cv-m27-sec-certificaciones").hidden = !estado.certificaciones.length;

  $("#cv-m27-tit-habilidades").textContent = t("habilidades");
  $("#cv-m27-habilidades").innerHTML = estado.habilidades.map(h => `<span class="cv-m27-chip">${esc(h.texto)}</span>`).join("");
  $("#cv-m27-sec-habilidades").hidden = !estado.habilidades.length;

  $("#cv-m27-tit-blandas").textContent = t("blandas");
  $("#cv-m27-blandas").innerHTML = estado.blandas.map(h => `<span class="cv-m27-chip cv-m27-chip-alt">${esc(h.texto)}</span>`).join("");
  $("#cv-m27-sec-blandas").hidden = !estado.blandas.length;

  $("#cv-m27-tit-idiomas").textContent = t("idiomas");
  $("#cv-m27-idiomas").innerHTML = estado.idiomas.map(i =>
    `<div class="cv-m27-idioma"><span>${esc(i.nombre)}</span><span class="cv-m27-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");
  $("#cv-m27-sec-idiomas").hidden = !estado.idiomas.length;

  $("#cv-m27-tit-logros").textContent = t("logros");
  $("#cv-m27-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
  $("#cv-m27-sec-logros").hidden = !estado.logros.length;

  $("#cv-m27-tit-referencias").textContent = t("referencias");
  $("#cv-m27-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m27-ref">
      <strong>${esc(r.nombre)}</strong>
      <span>${esc(r.rol)}</span>
      ${r.email ? `<span>${esc(r.email)}</span>` : ""}
      ${r.linkedin ? `<a href="${esc(r.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>` : ""}
    </div>
  `).join("");
  $("#cv-m27-sec-referencias").hidden = !estado.referencias.length;
}

function asegurarEsqueletoModelo28() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo28") return;
  pagina.dataset.esqueleto = "modelo28";
  pagina.innerHTML = `
    <div class="cv-m28-shell">
      <header class="cv-m28-header">
        <div class="cv-m28-vinilo">
          <img class="cv-m28-foto" id="cv-m28-foto" src="" alt="Foto de perfil" hidden>
          <div class="cv-m28-foto-placeholder" id="cv-m28-foto-placeholder">🙂</div>
        </div>
        <div class="cv-m28-id">
          <h1 class="cv-m28-nombre"><span id="cv-m28-nombre"></span> <span id="cv-m28-apellido"></span></h1>
          <p class="cv-m28-puesto" id="cv-m28-puesto"></p>
          <p class="cv-m28-subtitulo" id="cv-m28-subtitulo"></p>
          <div class="cv-m28-contacto" id="cv-m28-contacto"></div>
        </div>
      </header>
      <div class="cv-m28-eq" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span><span></span><span></span>
      </div>
      <div class="cv-m28-body">
        <section class="cv-m28-sec" id="cv-m28-sec-perfil">
          <h2 class="cv-m28-titulo" id="cv-m28-tit-perfil"></h2>
          <p class="cv-m28-perfil" id="cv-m28-perfil"></p>
        </section>
        <section class="cv-m28-sec" id="cv-m28-sec-experiencia">
          <h2 class="cv-m28-titulo" id="cv-m28-tit-experiencia"></h2>
          <ol class="cv-m28-tracklist" id="cv-m28-experiencia"></ol>
        </section>
        <div class="cv-m28-grid2">
          <section class="cv-m28-sec" id="cv-m28-sec-educacion">
            <h2 class="cv-m28-titulo" id="cv-m28-tit-educacion"></h2>
            <div id="cv-m28-educacion"></div>
          </section>
          <section class="cv-m28-sec" id="cv-m28-sec-certificaciones">
            <h2 class="cv-m28-titulo" id="cv-m28-tit-certificaciones"></h2>
            <div id="cv-m28-certificaciones"></div>
          </section>
        </div>
        <div class="cv-m28-grid2">
          <section class="cv-m28-sec" id="cv-m28-sec-habilidades">
            <h2 class="cv-m28-titulo" id="cv-m28-tit-habilidades"></h2>
            <div class="cv-m28-chips" id="cv-m28-habilidades"></div>
          </section>
          <section class="cv-m28-sec" id="cv-m28-sec-blandas">
            <h2 class="cv-m28-titulo" id="cv-m28-tit-blandas"></h2>
            <div class="cv-m28-chips" id="cv-m28-blandas"></div>
          </section>
        </div>
        <div class="cv-m28-grid2">
          <section class="cv-m28-sec" id="cv-m28-sec-idiomas">
            <h2 class="cv-m28-titulo" id="cv-m28-tit-idiomas"></h2>
            <div id="cv-m28-idiomas"></div>
          </section>
          <section class="cv-m28-sec" id="cv-m28-sec-logros">
            <h2 class="cv-m28-titulo" id="cv-m28-tit-logros"></h2>
            <ul class="cv-m28-logros" id="cv-m28-logros"></ul>
          </section>
        </div>
        <section class="cv-m28-sec" id="cv-m28-sec-referencias">
          <h2 class="cv-m28-titulo" id="cv-m28-tit-referencias"></h2>
          <div class="cv-m28-refs" id="cv-m28-referencias"></div>
        </section>
      </div>
    </div>
  `;
}

function m28Herramientas(herramientas) {
  if (!herramientas || !herramientas.length) return "";
  const grupos = {};
  herramientas.forEach(h => { (grupos[h.etiqueta || ""] ||= []).push(h.valor); });
  return `<div class="cv-m28-job-tools">${Object.entries(grupos).map(([etq, vals]) =>
    `<span class="cv-m28-tool-grupo">${etq ? `<strong>${esc(etq)}:</strong> ` : ""}${vals.map(esc).join(", ")}</span>`
  ).join("")}</div>`;
}

function renderModelo28() {
  asegurarEsqueletoModelo28();

  $("#cv-m28-nombre").textContent = estado.nombre;
  $("#cv-m28-apellido").textContent = estado.apellido;
  $("#cv-m28-puesto").textContent = estado.puesto;
  $("#cv-m28-subtitulo").textContent = estado.subtitulo || "";
  $("#cv-m28-subtitulo").hidden = !estado.subtitulo;

  const foto = $("#cv-m28-foto"), placeholder = $("#cv-m28-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m28-contacto").innerHTML = estado.contacto.map(c =>
    `<div class="cv-m28-contacto-item"><span class="cv-m28-ico">${iconoDe(c.tipo)}</span><span>${contactoValorHTML(c)}</span></div>`
  ).join("");

  $("#cv-m28-tit-perfil").textContent = t("perfil");
  $("#cv-m28-perfil").innerHTML = escPárrafo(estado.perfil || "");
  $("#cv-m28-sec-perfil").hidden = !estado.perfil;

  $("#cv-m28-tit-experiencia").textContent = t("experiencia");
  $("#cv-m28-experiencia").innerHTML = estado.experiencia.map((x, idx) => `
    <li class="cv-m28-track">
      <span class="cv-m28-track-num">${String(idx + 1).padStart(2, "0")}</span>
      <div class="cv-m28-track-body">
        <div class="cv-m28-track-head">
          <div>
            <h3 class="cv-m28-track-title">${esc(x.rol)}</h3>
            <div class="cv-m28-track-artist">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}</div>
          </div>
          <div class="cv-m28-track-dur">${esc(x.fecha)}</div>
        </div>
        ${x.descripcion ? `<p class="cv-m28-track-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${x.bullets && x.bullets.length ? `<ul class="cv-m28-track-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
        ${m28Herramientas(x.herramientas)}
      </div>
    </li>
  `).join("");
  $("#cv-m28-sec-experiencia").hidden = !estado.experiencia.length;

  $("#cv-m28-tit-educacion").textContent = t("educacion");
  $("#cv-m28-educacion").innerHTML = estado.educacion.map(e => `
    <div class="cv-m28-edu">
      <div class="cv-m28-edu-head"><strong>${esc(e.institucion)}</strong><span class="cv-m28-edu-fecha">${esc(e.fecha)}</span></div>
      ${e.bullets && e.bullets.length ? `<ul>${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");
  $("#cv-m28-sec-educacion").hidden = !estado.educacion.length;

  $("#cv-m28-tit-certificaciones").textContent = t("certificaciones");
  $("#cv-m28-certificaciones").innerHTML = estado.certificaciones.map(c =>
    `<div class="cv-m28-cert"><strong>${esc(c.titulo)}</strong>${c.subtitulo ? `<span>${esc(c.subtitulo)}</span>` : ""}</div>`
  ).join("");
  $("#cv-m28-sec-certificaciones").hidden = !estado.certificaciones.length;

  $("#cv-m28-tit-habilidades").textContent = t("habilidades");
  $("#cv-m28-habilidades").innerHTML = estado.habilidades.map(h => `<span class="cv-m28-chip">${esc(h.texto)}</span>`).join("");
  $("#cv-m28-sec-habilidades").hidden = !estado.habilidades.length;

  $("#cv-m28-tit-blandas").textContent = t("blandas");
  $("#cv-m28-blandas").innerHTML = estado.blandas.map(h => `<span class="cv-m28-chip cv-m28-chip-alt">${esc(h.texto)}</span>`).join("");
  $("#cv-m28-sec-blandas").hidden = !estado.blandas.length;

  $("#cv-m28-tit-idiomas").textContent = t("idiomas");
  $("#cv-m28-idiomas").innerHTML = estado.idiomas.map(i =>
    `<div class="cv-m28-idioma"><span>${esc(i.nombre)}</span><span class="cv-m28-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");
  $("#cv-m28-sec-idiomas").hidden = !estado.idiomas.length;

  $("#cv-m28-tit-logros").textContent = t("logros");
  $("#cv-m28-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
  $("#cv-m28-sec-logros").hidden = !estado.logros.length;

  $("#cv-m28-tit-referencias").textContent = t("referencias");
  $("#cv-m28-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m28-ref">
      <strong>${esc(r.nombre)}</strong>
      <span>${esc(r.rol)}</span>
      ${r.email ? `<span>${esc(r.email)}</span>` : ""}
      ${r.linkedin ? `<a href="${esc(r.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>` : ""}
    </div>
  `).join("");
  $("#cv-m28-sec-referencias").hidden = !estado.referencias.length;
}

// ---- Modelos 29-32 ----
function asegurarEsqueletoModelo29() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo29") return;
  pagina.dataset.esqueleto = "modelo29";
  pagina.innerHTML = `
    <div class="cv-m29-banner">
      <div class="cv-m29-foto-marco">
        <img class="cv-m29-foto" id="cv-m29-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m29-foto-placeholder" id="cv-m29-foto-placeholder">🙂</div>
      </div>
      <div class="cv-m29-banner-texto">
        <h1 class="cv-m29-nombre"><span id="cv-m29-nombre"></span> <span id="cv-m29-apellido" class="cv-m29-apellido"></span></h1>
        <p class="cv-m29-puesto" id="cv-m29-puesto"></p>
        <p class="cv-m29-subtitulo" id="cv-m29-subtitulo"></p>
      </div>
    </div>
    <div class="cv-m29-contacto" id="cv-m29-contacto"></div>
    <div class="cv-m29-cuerpo">
      <section class="cv-m29-seccion" id="cv-m29-sec-perfil">
        <h2 class="cv-m29-titulo" id="cv-m29-titulo-perfil"></h2>
        <p class="cv-m29-perfil" id="cv-m29-perfil"></p>
      </section>
      <section class="cv-m29-seccion" id="cv-m29-sec-habilidades">
        <h2 class="cv-m29-titulo" id="cv-m29-titulo-habilidades"></h2>
        <div class="cv-m29-stats-grid" id="cv-m29-habilidades"></div>
      </section>
      <section class="cv-m29-seccion" id="cv-m29-sec-blandas">
        <h2 class="cv-m29-titulo" id="cv-m29-titulo-blandas"></h2>
        <div class="cv-m29-tags" id="cv-m29-blandas"></div>
      </section>
      <section class="cv-m29-seccion" id="cv-m29-sec-idiomas">
        <h2 class="cv-m29-titulo" id="cv-m29-titulo-idiomas"></h2>
        <div class="cv-m29-idiomas" id="cv-m29-idiomas"></div>
      </section>
      <section class="cv-m29-seccion" id="cv-m29-sec-logros">
        <h2 class="cv-m29-titulo" id="cv-m29-titulo-logros"></h2>
        <ul class="cv-m29-logros" id="cv-m29-logros"></ul>
      </section>
      <section class="cv-m29-seccion" id="cv-m29-sec-experiencia">
        <h2 class="cv-m29-titulo" id="cv-m29-titulo-experiencia"></h2>
        <div class="cv-m29-timeline" id="cv-m29-experiencia"></div>
      </section>
      <section class="cv-m29-seccion" id="cv-m29-sec-educacion">
        <h2 class="cv-m29-titulo" id="cv-m29-titulo-educacion"></h2>
        <div id="cv-m29-educacion"></div>
      </section>
      <section class="cv-m29-seccion" id="cv-m29-sec-certificaciones">
        <h2 class="cv-m29-titulo" id="cv-m29-titulo-certificaciones"></h2>
        <div id="cv-m29-certificaciones"></div>
      </section>
      <section class="cv-m29-seccion" id="cv-m29-sec-referencias">
        <h2 class="cv-m29-titulo" id="cv-m29-titulo-referencias"></h2>
        <div id="cv-m29-referencias"></div>
      </section>
    </div>
  `;
}

function renderModelo29() {
  asegurarEsqueletoModelo29();

  $("#cv-m29-nombre").textContent = estado.nombre;
  $("#cv-m29-apellido").textContent = estado.apellido;
  $("#cv-m29-puesto").textContent = estado.puesto;
  $("#cv-m29-subtitulo").textContent = estado.subtitulo;
  $("#cv-m29-subtitulo").hidden = !estado.subtitulo;

  const foto = $("#cv-m29-foto"), placeholder = $("#cv-m29-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m29-titulo-perfil").textContent = t("perfil");
  $("#cv-m29-titulo-habilidades").textContent = t("habilidades");
  $("#cv-m29-titulo-blandas").textContent = t("blandas");
  $("#cv-m29-titulo-idiomas").textContent = t("idiomas");
  $("#cv-m29-titulo-logros").textContent = t("logros");
  $("#cv-m29-titulo-experiencia").textContent = t("experiencia");
  $("#cv-m29-titulo-educacion").textContent = t("educacion");
  $("#cv-m29-titulo-certificaciones").textContent = t("certificaciones");
  $("#cv-m29-titulo-referencias").textContent = t("referencias");

  $("#cv-m29-sec-perfil").hidden = !estado.perfil;
  $("#cv-m29-perfil").innerHTML = escPárrafo(estado.perfil || "");

  const contacto = $("#cv-m29-contacto");
  $("#cv-m29-contacto").hidden = !estado.contacto.length;
  contacto.innerHTML = estado.contacto.map(c =>
    `<div class="cv-m29-contacto-item">${iconoDe(c.tipo)} ${contactoValorHTML(c)}</div>`
  ).join("");

  $("#cv-m29-sec-habilidades").hidden = !estado.habilidades.length;
  $("#cv-m29-habilidades").innerHTML = estado.habilidades.map(h =>
    `<div class="cv-m29-stat-card">${esc(h.texto)}</div>`
  ).join("");

  $("#cv-m29-sec-blandas").hidden = !estado.blandas.length;
  $("#cv-m29-blandas").innerHTML = estado.blandas.map(b =>
    `<span class="cv-m29-tag">${esc(b.texto)}</span>`
  ).join("");

  $("#cv-m29-sec-idiomas").hidden = !estado.idiomas.length;
  $("#cv-m29-idiomas").innerHTML = estado.idiomas.map(i =>
    `<div class="cv-m29-idioma"><span>${esc(i.nombre)}</span><span class="cv-m29-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");

  $("#cv-m29-sec-logros").hidden = !estado.logros.length;
  $("#cv-m29-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");

  $("#cv-m29-sec-experiencia").hidden = !estado.experiencia.length;
  $("#cv-m29-experiencia").innerHTML = estado.experiencia.map(x => {
    const bullets = x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("");
    const herramientas = x.herramientas.length
      ? `<div class="cv-m29-tools">${x.herramientas.map(h => `<span class="cv-m29-tool"><strong>${esc(h.etiqueta)}:</strong> ${esc(h.valor)}</span>`).join("")}</div>`
      : "";
    return `
      <div class="cv-m29-job">
        <div class="cv-m29-job-head">
          <div class="cv-m29-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-m29-enlace-empresa")}${ubicacionSufijo(x)}</div>
          <div class="cv-m29-job-fecha">${esc(x.fecha)}</div>
        </div>
        <div class="cv-m29-job-rol">${esc(x.rol)}</div>
        ${x.descripcion ? `<p class="cv-m29-job-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${bullets ? `<ul class="cv-m29-job-bullets">${bullets}</ul>` : ""}
        ${herramientas}
      </div>`;
  }).join("");

  $("#cv-m29-sec-educacion").hidden = !estado.educacion.length;
  $("#cv-m29-educacion").innerHTML = estado.educacion.map(e => {
    const bullets = e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("");
    return `
      <div class="cv-m29-edu">
        <div class="cv-m29-edu-head"><span class="cv-m29-edu-inst">${esc(e.institucion)}</span><span class="cv-m29-edu-fecha">${esc(e.fecha)}</span></div>
        ${bullets ? `<ul class="cv-m29-edu-bullets">${bullets}</ul>` : ""}
      </div>`;
  }).join("");

  $("#cv-m29-sec-certificaciones").hidden = !estado.certificaciones.length;
  $("#cv-m29-certificaciones").innerHTML = estado.certificaciones.map(c =>
    `<div class="cv-m29-cert"><div class="cv-m29-cert-titulo">${esc(c.titulo)}</div><div class="cv-m29-cert-sub">${esc(c.subtitulo)}</div></div>`
  ).join("");

  $("#cv-m29-sec-referencias").hidden = !estado.referencias.length;
  $("#cv-m29-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m29-ref">
      <div class="cv-m29-ref-nombre">${esc(r.nombre)}</div>
      <div class="cv-m29-ref-rol">${esc(r.rol)}</div>
      ${r.email ? `<div class="cv-m29-ref-linea">${esc(r.email)}</div>` : ""}
      ${r.linkedin ? `<div class="cv-m29-ref-linea"><a href="${esc(r.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></div>` : ""}
    </div>`).join("");
}

function asegurarEsqueletoModelo30() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo30") return;
  pagina.dataset.esqueleto = "modelo30";
  pagina.innerHTML = `
    <div class="cv-m30-letterhead">
      <div class="cv-m30-foto-marco">
        <img class="cv-m30-foto" id="cv-m30-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m30-foto-placeholder" id="cv-m30-foto-placeholder">🙂</div>
      </div>
      <h1 class="cv-m30-nombre"><span id="cv-m30-nombre"></span> <span id="cv-m30-apellido"></span></h1>
      <p class="cv-m30-puesto" id="cv-m30-puesto"></p>
      <p class="cv-m30-subtitulo" id="cv-m30-subtitulo"></p>
      <div class="cv-m30-regla"></div>
      <div class="cv-m30-contacto" id="cv-m30-contacto"></div>
    </div>
    <div class="cv-m30-cuerpo" id="cv-m30-cuerpo">
      <section class="cv-m30-articulo" id="cv-m30-sec-perfil">
        <h2 class="cv-m30-titulo" id="cv-m30-titulo-perfil"></h2>
        <p class="cv-m30-perfil" id="cv-m30-perfil"></p>
      </section>
      <section class="cv-m30-articulo" id="cv-m30-sec-habilidades">
        <h2 class="cv-m30-titulo" id="cv-m30-titulo-habilidades"></h2>
        <ul class="cv-m30-lista-skills" id="cv-m30-habilidades"></ul>
      </section>
      <section class="cv-m30-articulo" id="cv-m30-sec-blandas">
        <h2 class="cv-m30-titulo" id="cv-m30-titulo-blandas"></h2>
        <ul class="cv-m30-lista-skills" id="cv-m30-blandas"></ul>
      </section>
      <section class="cv-m30-articulo" id="cv-m30-sec-idiomas">
        <h2 class="cv-m30-titulo" id="cv-m30-titulo-idiomas"></h2>
        <div id="cv-m30-idiomas"></div>
      </section>
      <section class="cv-m30-articulo" id="cv-m30-sec-experiencia">
        <h2 class="cv-m30-titulo" id="cv-m30-titulo-experiencia"></h2>
        <div id="cv-m30-experiencia"></div>
      </section>
      <section class="cv-m30-articulo" id="cv-m30-sec-educacion">
        <h2 class="cv-m30-titulo" id="cv-m30-titulo-educacion"></h2>
        <div id="cv-m30-educacion"></div>
      </section>
      <section class="cv-m30-articulo" id="cv-m30-sec-certificaciones">
        <h2 class="cv-m30-titulo" id="cv-m30-titulo-certificaciones"></h2>
        <div id="cv-m30-certificaciones"></div>
      </section>
      <section class="cv-m30-articulo" id="cv-m30-sec-logros">
        <h2 class="cv-m30-titulo" id="cv-m30-titulo-logros"></h2>
        <ol class="cv-m30-logros" id="cv-m30-logros"></ol>
      </section>
      <section class="cv-m30-articulo" id="cv-m30-sec-referencias">
        <h2 class="cv-m30-titulo" id="cv-m30-titulo-referencias"></h2>
        <div class="cv-m30-referencias-grid" id="cv-m30-referencias"></div>
      </section>
    </div>
  `;
}

function renderModelo30() {
  asegurarEsqueletoModelo30();

  $("#cv-m30-nombre").textContent = estado.nombre;
  $("#cv-m30-apellido").textContent = estado.apellido;
  $("#cv-m30-puesto").textContent = estado.puesto;
  $("#cv-m30-subtitulo").textContent = estado.subtitulo;
  $("#cv-m30-subtitulo").hidden = !estado.subtitulo;

  const foto = $("#cv-m30-foto"), placeholder = $("#cv-m30-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m30-titulo-perfil").textContent = t("perfil");
  $("#cv-m30-titulo-habilidades").textContent = t("habilidades");
  $("#cv-m30-titulo-blandas").textContent = t("blandas");
  $("#cv-m30-titulo-idiomas").textContent = t("idiomas");
  $("#cv-m30-titulo-experiencia").textContent = t("experiencia");
  $("#cv-m30-titulo-educacion").textContent = t("educacion");
  $("#cv-m30-titulo-certificaciones").textContent = t("certificaciones");
  $("#cv-m30-titulo-logros").textContent = t("logros");
  $("#cv-m30-titulo-referencias").textContent = t("referencias");

  $("#cv-m30-sec-perfil").hidden = !estado.perfil;
  $("#cv-m30-perfil").innerHTML = escPárrafo(estado.perfil || "");

  const contacto = $("#cv-m30-contacto");
  contacto.hidden = !estado.contacto.length;
  contacto.innerHTML = estado.contacto.map(c =>
    `<div class="cv-m30-contacto-item">${iconoDe(c.tipo)} ${contactoValorHTML(c)}</div>`
  ).join("");

  $("#cv-m30-sec-habilidades").hidden = !estado.habilidades.length;
  $("#cv-m30-habilidades").innerHTML = estado.habilidades.map(h => `<li>${esc(h.texto)}</li>`).join("");

  $("#cv-m30-sec-blandas").hidden = !estado.blandas.length;
  $("#cv-m30-blandas").innerHTML = estado.blandas.map(b => `<li>${esc(b.texto)}</li>`).join("");

  $("#cv-m30-sec-idiomas").hidden = !estado.idiomas.length;
  $("#cv-m30-idiomas").innerHTML = estado.idiomas.map(i =>
    `<div class="cv-m30-idioma"><span>${esc(i.nombre)}</span><span class="cv-m30-idioma-leader"></span><span class="cv-m30-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");

  $("#cv-m30-sec-experiencia").hidden = !estado.experiencia.length;
  $("#cv-m30-experiencia").innerHTML = estado.experiencia.map(x => {
    const bullets = x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("");
    const herramientas = x.herramientas.length
      ? `<div class="cv-m30-tools">${x.herramientas.map(h => `<strong>${esc(h.etiqueta)}:</strong> ${esc(h.valor)}`).join(" &nbsp;•&nbsp; ")}</div>`
      : "";
    return `
      <div class="cv-m30-job">
        <div class="cv-m30-job-head">
          <span class="cv-m30-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-m30-enlace-empresa")}${ubicacionSufijo(x)}</span>
          <span class="cv-m30-job-fecha">${esc(x.fecha)}</span>
        </div>
        <div class="cv-m30-job-rol">${esc(x.rol)}</div>
        ${x.descripcion ? `<p class="cv-m30-job-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${bullets ? `<ol class="cv-m30-job-bullets">${bullets}</ol>` : ""}
        ${herramientas}
      </div>`;
  }).join("");

  $("#cv-m30-sec-educacion").hidden = !estado.educacion.length;
  $("#cv-m30-educacion").innerHTML = estado.educacion.map(e => {
    const bullets = e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("");
    return `
      <div class="cv-m30-edu">
        <div class="cv-m30-edu-head"><span>${esc(e.institucion)}</span><span class="cv-m30-edu-fecha">${esc(e.fecha)}</span></div>
        ${bullets ? `<ol class="cv-m30-edu-bullets">${bullets}</ol>` : ""}
      </div>`;
  }).join("");

  $("#cv-m30-sec-certificaciones").hidden = !estado.certificaciones.length;
  $("#cv-m30-certificaciones").innerHTML = estado.certificaciones.map(c =>
    `<div class="cv-m30-cert"><span class="cv-m30-cert-titulo">${esc(c.titulo)}</span><span class="cv-m30-cert-sub">${esc(c.subtitulo)}</span></div>`
  ).join("");

  $("#cv-m30-sec-logros").hidden = !estado.logros.length;
  $("#cv-m30-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");

  $("#cv-m30-sec-referencias").hidden = !estado.referencias.length;
  $("#cv-m30-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m30-ref">
      <div class="cv-m30-ref-nombre">${esc(r.nombre)}</div>
      <div class="cv-m30-ref-rol">${esc(r.rol)}</div>
      ${r.email ? `<div class="cv-m30-ref-linea">${esc(r.email)}</div>` : ""}
      ${r.linkedin ? `<div class="cv-m30-ref-linea"><a href="${esc(r.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></div>` : ""}
    </div>`).join("");
}

function asegurarEsqueletoModelo31() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo31") return;
  pagina.dataset.esqueleto = "modelo31";
  pagina.innerHTML = `
    <aside class="cv-m31-pizarra">
      <div class="cv-m31-foto-marco">
        <img class="cv-m31-foto" id="cv-m31-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m31-foto-placeholder" id="cv-m31-foto-placeholder">🙂</div>
      </div>
      <h1 class="cv-m31-nombre"><span id="cv-m31-nombre"></span><br><span id="cv-m31-apellido"></span></h1>
      <p class="cv-m31-puesto" id="cv-m31-puesto"></p>
      <p class="cv-m31-subtitulo" id="cv-m31-subtitulo"></p>
      <div class="cv-m31-pizarra-sec" id="cv-m31-sec-contacto">
        <h2 class="cv-m31-pizarra-titulo" id="cv-m31-titulo-contacto"></h2>
        <div id="cv-m31-contacto"></div>
      </div>
      <div class="cv-m31-pizarra-sec" id="cv-m31-sec-habilidades">
        <h2 class="cv-m31-pizarra-titulo" id="cv-m31-titulo-habilidades"></h2>
        <ul class="cv-m31-chalk-list" id="cv-m31-habilidades"></ul>
      </div>
      <div class="cv-m31-pizarra-sec" id="cv-m31-sec-blandas">
        <h2 class="cv-m31-pizarra-titulo" id="cv-m31-titulo-blandas"></h2>
        <ul class="cv-m31-chalk-list" id="cv-m31-blandas"></ul>
      </div>
      <div class="cv-m31-pizarra-sec" id="cv-m31-sec-idiomas">
        <h2 class="cv-m31-pizarra-titulo" id="cv-m31-titulo-idiomas"></h2>
        <div id="cv-m31-idiomas"></div>
      </div>
      <div class="cv-m31-pizarra-sec" id="cv-m31-sec-certificaciones">
        <h2 class="cv-m31-pizarra-titulo" id="cv-m31-titulo-certificaciones"></h2>
        <div id="cv-m31-certificaciones"></div>
      </div>
    </aside>
    <main class="cv-m31-cuaderno">
      <section class="cv-m31-leccion" id="cv-m31-sec-perfil">
        <h2 class="cv-m31-leccion-titulo" id="cv-m31-titulo-perfil"></h2>
        <p class="cv-m31-perfil" id="cv-m31-perfil"></p>
      </section>
      <section class="cv-m31-leccion" id="cv-m31-sec-experiencia">
        <h2 class="cv-m31-leccion-titulo" id="cv-m31-titulo-experiencia"></h2>
        <div id="cv-m31-experiencia"></div>
      </section>
      <section class="cv-m31-leccion" id="cv-m31-sec-educacion">
        <h2 class="cv-m31-leccion-titulo" id="cv-m31-titulo-educacion"></h2>
        <div id="cv-m31-educacion"></div>
      </section>
      <section class="cv-m31-leccion" id="cv-m31-sec-logros">
        <h2 class="cv-m31-leccion-titulo" id="cv-m31-titulo-logros"></h2>
        <ul class="cv-m31-logros" id="cv-m31-logros"></ul>
      </section>
      <section class="cv-m31-leccion" id="cv-m31-sec-referencias">
        <h2 class="cv-m31-leccion-titulo" id="cv-m31-titulo-referencias"></h2>
        <div class="cv-m31-referencias-grid" id="cv-m31-referencias"></div>
      </section>
    </main>
  `;
}

function renderModelo31() {
  asegurarEsqueletoModelo31();

  $("#cv-m31-nombre").textContent = estado.nombre;
  $("#cv-m31-apellido").textContent = estado.apellido;
  $("#cv-m31-puesto").textContent = estado.puesto;
  $("#cv-m31-subtitulo").textContent = estado.subtitulo;
  $("#cv-m31-subtitulo").hidden = !estado.subtitulo;

  const foto = $("#cv-m31-foto"), placeholder = $("#cv-m31-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m31-titulo-contacto").textContent = t("contacto");
  $("#cv-m31-titulo-habilidades").textContent = t("habilidades");
  $("#cv-m31-titulo-blandas").textContent = t("blandas");
  $("#cv-m31-titulo-idiomas").textContent = t("idiomas");
  $("#cv-m31-titulo-certificaciones").textContent = t("certificaciones");
  $("#cv-m31-titulo-perfil").textContent = t("perfil");
  $("#cv-m31-titulo-experiencia").textContent = t("experiencia");
  $("#cv-m31-titulo-educacion").textContent = t("educacion");
  $("#cv-m31-titulo-logros").textContent = t("logros");
  $("#cv-m31-titulo-referencias").textContent = t("referencias");

  $("#cv-m31-sec-contacto").hidden = !estado.contacto.length;
  $("#cv-m31-contacto").innerHTML = estado.contacto.map(c =>
    `<div class="cv-m31-contacto-item">${iconoDe(c.tipo)} ${contactoValorHTML(c)}</div>`
  ).join("");

  $("#cv-m31-sec-habilidades").hidden = !estado.habilidades.length;
  $("#cv-m31-habilidades").innerHTML = estado.habilidades.map(h => `<li>${esc(h.texto)}</li>`).join("");

  $("#cv-m31-sec-blandas").hidden = !estado.blandas.length;
  $("#cv-m31-blandas").innerHTML = estado.blandas.map(b => `<li>${esc(b.texto)}</li>`).join("");

  $("#cv-m31-sec-idiomas").hidden = !estado.idiomas.length;
  $("#cv-m31-idiomas").innerHTML = estado.idiomas.map(i =>
    `<div class="cv-m31-idioma"><span>${esc(i.nombre)}</span><span class="cv-m31-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");

  $("#cv-m31-sec-certificaciones").hidden = !estado.certificaciones.length;
  $("#cv-m31-certificaciones").innerHTML = estado.certificaciones.map(c =>
    `<div class="cv-m31-cert"><div class="cv-m31-cert-titulo">${esc(c.titulo)}</div><div class="cv-m31-cert-sub">${esc(c.subtitulo)}</div></div>`
  ).join("");

  $("#cv-m31-sec-perfil").hidden = !estado.perfil;
  $("#cv-m31-perfil").innerHTML = escPárrafo(estado.perfil || "");

  $("#cv-m31-sec-experiencia").hidden = !estado.experiencia.length;
  $("#cv-m31-experiencia").innerHTML = estado.experiencia.map(x => {
    const bullets = x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("");
    const herramientas = x.herramientas.length
      ? `<div class="cv-m31-tools">${x.herramientas.map(h => `<span class="cv-m31-tool"><strong>${esc(h.etiqueta)}:</strong> ${esc(h.valor)}</span>`).join("")}</div>`
      : "";
    return `
      <div class="cv-m31-job">
        <div class="cv-m31-job-head">
          <div class="cv-m31-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-m31-enlace-empresa")}${ubicacionSufijo(x)}</div>
          <div class="cv-m31-job-fecha">${esc(x.fecha)}</div>
        </div>
        <div class="cv-m31-job-rol">${esc(x.rol)}</div>
        ${x.descripcion ? `<p class="cv-m31-job-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${bullets ? `<ul class="cv-m31-job-bullets">${bullets}</ul>` : ""}
        ${herramientas}
      </div>`;
  }).join("");

  $("#cv-m31-sec-educacion").hidden = !estado.educacion.length;
  $("#cv-m31-educacion").innerHTML = estado.educacion.map(e => {
    const bullets = e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("");
    return `
      <div class="cv-m31-edu">
        <div class="cv-m31-edu-body">
          <div class="cv-m31-edu-head"><span>${esc(e.institucion)}</span><span class="cv-m31-edu-fecha">${esc(e.fecha)}</span></div>
          ${bullets ? `<ul class="cv-m31-edu-bullets">${bullets}</ul>` : ""}
        </div>
      </div>`;
  }).join("");

  $("#cv-m31-sec-logros").hidden = !estado.logros.length;
  $("#cv-m31-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");

  $("#cv-m31-sec-referencias").hidden = !estado.referencias.length;
  $("#cv-m31-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m31-ref">
      <div class="cv-m31-ref-nombre">${esc(r.nombre)}</div>
      <div class="cv-m31-ref-rol">${esc(r.rol)}</div>
      ${r.email ? `<div class="cv-m31-ref-linea">${esc(r.email)}</div>` : ""}
      ${r.linkedin ? `<div class="cv-m31-ref-linea"><a href="${esc(r.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></div>` : ""}
    </div>`).join("");
}

function asegurarEsqueletoModelo32() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo32") return;
  pagina.dataset.esqueleto = "modelo32";
  pagina.innerHTML = `
    <header class="cv-m32-banner">
      <div class="cv-m32-compass"></div>
      <div class="cv-m32-foto-marco">
        <div class="cv-m32-foto-inner">
          <img class="cv-m32-foto" id="cv-m32-foto" src="" alt="Foto de perfil" hidden>
          <div class="cv-m32-foto-placeholder" id="cv-m32-foto-placeholder">🙂</div>
        </div>
      </div>
      <div class="cv-m32-banner-texto">
        <h1 class="cv-m32-nombre"><span id="cv-m32-nombre"></span> <span id="cv-m32-apellido"></span></h1>
        <p class="cv-m32-puesto" id="cv-m32-puesto"></p>
        <p class="cv-m32-subtitulo" id="cv-m32-subtitulo"></p>
      </div>
    </header>
    <div class="cv-m32-cuerpo">
      <main class="cv-m32-principal">
        <section class="cv-m32-seccion" id="cv-m32-sec-perfil">
          <h2 class="cv-m32-titulo" id="cv-m32-titulo-perfil"></h2>
          <p class="cv-m32-perfil" id="cv-m32-perfil"></p>
        </section>
        <section class="cv-m32-seccion" id="cv-m32-sec-experiencia">
          <h2 class="cv-m32-titulo" id="cv-m32-titulo-experiencia"></h2>
          <div class="cv-m32-ruta" id="cv-m32-experiencia"></div>
        </section>
        <section class="cv-m32-seccion" id="cv-m32-sec-educacion">
          <h2 class="cv-m32-titulo" id="cv-m32-titulo-educacion"></h2>
          <div id="cv-m32-educacion"></div>
        </section>
        <section class="cv-m32-seccion" id="cv-m32-sec-logros">
          <h2 class="cv-m32-titulo" id="cv-m32-titulo-logros"></h2>
          <ul class="cv-m32-logros" id="cv-m32-logros"></ul>
        </section>
      </main>
      <aside class="cv-m32-panel">
        <div class="cv-m32-panel-sec" id="cv-m32-sec-contacto">
          <h2 class="cv-m32-panel-titulo" id="cv-m32-titulo-contacto"></h2>
          <div id="cv-m32-contacto"></div>
        </div>
        <div class="cv-m32-panel-sec" id="cv-m32-sec-habilidades">
          <h2 class="cv-m32-panel-titulo" id="cv-m32-titulo-habilidades"></h2>
          <div class="cv-m32-gauges" id="cv-m32-habilidades"></div>
        </div>
        <div class="cv-m32-panel-sec" id="cv-m32-sec-blandas">
          <h2 class="cv-m32-panel-titulo" id="cv-m32-titulo-blandas"></h2>
          <div class="cv-m32-tags" id="cv-m32-blandas"></div>
        </div>
        <div class="cv-m32-panel-sec" id="cv-m32-sec-idiomas">
          <h2 class="cv-m32-panel-titulo" id="cv-m32-titulo-idiomas"></h2>
          <div id="cv-m32-idiomas"></div>
        </div>
        <div class="cv-m32-panel-sec" id="cv-m32-sec-certificaciones">
          <h2 class="cv-m32-panel-titulo" id="cv-m32-titulo-certificaciones"></h2>
          <div id="cv-m32-certificaciones"></div>
        </div>
        <div class="cv-m32-panel-sec" id="cv-m32-sec-referencias">
          <h2 class="cv-m32-panel-titulo" id="cv-m32-titulo-referencias"></h2>
          <div id="cv-m32-referencias"></div>
        </div>
      </aside>
    </div>
  `;
}

function renderModelo32() {
  asegurarEsqueletoModelo32();

  $("#cv-m32-nombre").textContent = estado.nombre;
  $("#cv-m32-apellido").textContent = estado.apellido;
  $("#cv-m32-puesto").textContent = estado.puesto;
  $("#cv-m32-subtitulo").textContent = estado.subtitulo;
  $("#cv-m32-subtitulo").hidden = !estado.subtitulo;

  const foto = $("#cv-m32-foto"), placeholder = $("#cv-m32-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m32-titulo-perfil").textContent = t("perfil");
  $("#cv-m32-titulo-experiencia").textContent = t("experiencia");
  $("#cv-m32-titulo-educacion").textContent = t("educacion");
  $("#cv-m32-titulo-logros").textContent = t("logros");
  $("#cv-m32-titulo-contacto").textContent = t("contacto");
  $("#cv-m32-titulo-habilidades").textContent = t("habilidades");
  $("#cv-m32-titulo-blandas").textContent = t("blandas");
  $("#cv-m32-titulo-idiomas").textContent = t("idiomas");
  $("#cv-m32-titulo-certificaciones").textContent = t("certificaciones");
  $("#cv-m32-titulo-referencias").textContent = t("referencias");

  $("#cv-m32-sec-perfil").hidden = !estado.perfil;
  $("#cv-m32-perfil").innerHTML = escPárrafo(estado.perfil || "");

  $("#cv-m32-sec-contacto").hidden = !estado.contacto.length;
  $("#cv-m32-contacto").innerHTML = estado.contacto.map(c =>
    `<div class="cv-m32-contacto-item">${iconoDe(c.tipo)} ${contactoValorHTML(c)}</div>`
  ).join("");

  $("#cv-m32-sec-habilidades").hidden = !estado.habilidades.length;
  $("#cv-m32-habilidades").innerHTML = estado.habilidades.map(h =>
    `<div class="cv-m32-gauge">${esc(h.texto)}</div>`
  ).join("");

  $("#cv-m32-sec-blandas").hidden = !estado.blandas.length;
  $("#cv-m32-blandas").innerHTML = estado.blandas.map(b =>
    `<span class="cv-m32-tag">${esc(b.texto)}</span>`
  ).join("");

  $("#cv-m32-sec-idiomas").hidden = !estado.idiomas.length;
  $("#cv-m32-idiomas").innerHTML = estado.idiomas.map(i =>
    `<div class="cv-m32-idioma"><span>${esc(i.nombre)}</span><span class="cv-m32-idioma-nivel">${esc(i.nivel)}</span></div>`
  ).join("");

  $("#cv-m32-sec-certificaciones").hidden = !estado.certificaciones.length;
  $("#cv-m32-certificaciones").innerHTML = estado.certificaciones.map(c =>
    `<div class="cv-m32-cert"><div class="cv-m32-cert-titulo">${esc(c.titulo)}</div><div class="cv-m32-cert-sub">${esc(c.subtitulo)}</div></div>`
  ).join("");

  $("#cv-m32-sec-referencias").hidden = !estado.referencias.length;
  $("#cv-m32-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m32-ref">
      <div class="cv-m32-ref-nombre">${esc(r.nombre)}</div>
      <div class="cv-m32-ref-rol">${esc(r.rol)}</div>
      ${r.email ? `<div class="cv-m32-ref-linea">${esc(r.email)}</div>` : ""}
      ${r.linkedin ? `<div class="cv-m32-ref-linea"><a href="${esc(r.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></div>` : ""}
    </div>`).join("");

  $("#cv-m32-sec-experiencia").hidden = !estado.experiencia.length;
  $("#cv-m32-experiencia").innerHTML = estado.experiencia.map(x => {
    const bullets = x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("");
    const herramientas = x.herramientas.length
      ? `<div class="cv-m32-tools">${x.herramientas.map(h => `<span class="cv-m32-tool"><strong>${esc(h.etiqueta)}:</strong> ${esc(h.valor)}</span>`).join("")}</div>`
      : "";
    return `
      <div class="cv-m32-job">
        <div class="cv-m32-job-head">
          <div class="cv-m32-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-m32-enlace-empresa")}${ubicacionSufijo(x)}</div>
          <div class="cv-m32-job-fecha">${esc(x.fecha)}</div>
        </div>
        <div class="cv-m32-job-rol">${esc(x.rol)}</div>
        ${x.descripcion ? `<p class="cv-m32-job-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${bullets ? `<ul class="cv-m32-job-bullets">${bullets}</ul>` : ""}
        ${herramientas}
      </div>`;
  }).join("");

  $("#cv-m32-sec-educacion").hidden = !estado.educacion.length;
  $("#cv-m32-educacion").innerHTML = estado.educacion.map(e => {
    const bullets = e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("");
    return `
      <div class="cv-m32-edu">
        <div class="cv-m32-edu-head"><span>${esc(e.institucion)}</span><span class="cv-m32-edu-fecha">${esc(e.fecha)}</span></div>
        ${bullets ? `<ul class="cv-m32-edu-bullets">${bullets}</ul>` : ""}
      </div>`;
  }).join("");

  $("#cv-m32-sec-logros").hidden = !estado.logros.length;
  $("#cv-m32-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
}

// ---- Modelos 33-36 ----
function asegurarEsqueletoModelo33() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo33") return;
  pagina.dataset.esqueleto = "modelo33";
  pagina.innerHTML = `
    <div class="cv-m33-sidebar">
      <div class="cv-m33-foto-marco">
        <img class="cv-m33-foto" id="cv-m33-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m33-foto-placeholder" id="cv-m33-foto-placeholder">🙂</div>
      </div>
      <h1 class="cv-m33-nombre" id="cv-m33-nombre"></h1>
      <p class="cv-m33-puesto" id="cv-m33-puesto"></p>
      <p class="cv-m33-subtitulo" id="cv-m33-subtitulo"></p>

      <section class="cv-m33-side-sec" id="cv-m33-contacto-sec" hidden>
        <h2 class="cv-m33-side-titulo" id="cv-m33-titulo-contacto"></h2>
        <ul class="cv-m33-contacto" id="cv-m33-contacto-lista"></ul>
      </section>

      <section class="cv-m33-side-sec" id="cv-m33-hab-sec" hidden>
        <h2 class="cv-m33-side-titulo" id="cv-m33-titulo-hab"></h2>
        <div class="cv-m33-pills" id="cv-m33-hab-lista"></div>
      </section>

      <section class="cv-m33-side-sec" id="cv-m33-blandas-sec" hidden>
        <h2 class="cv-m33-side-titulo" id="cv-m33-titulo-blandas"></h2>
        <div class="cv-m33-pills" id="cv-m33-blandas-lista"></div>
      </section>

      <section class="cv-m33-side-sec" id="cv-m33-idiomas-sec" hidden>
        <h2 class="cv-m33-side-titulo" id="cv-m33-titulo-idiomas"></h2>
        <div id="cv-m33-idiomas-lista"></div>
      </section>

      <section class="cv-m33-side-sec" id="cv-m33-logros-sec" hidden>
        <h2 class="cv-m33-side-titulo" id="cv-m33-titulo-logros"></h2>
        <ul class="cv-m33-logros" id="cv-m33-logros-lista"></ul>
      </section>
    </div>

    <div class="cv-m33-main">
      <section class="cv-m33-seccion" id="cv-m33-perfil-sec" hidden>
        <h2 class="cv-m33-titulo" id="cv-m33-titulo-perfil"></h2>
        <p class="cv-m33-perfil-texto" id="cv-m33-perfil-texto"></p>
      </section>

      <section class="cv-m33-seccion" id="cv-m33-exp-sec" hidden>
        <h2 class="cv-m33-titulo" id="cv-m33-titulo-exp"></h2>
        <div id="cv-m33-exp-lista"></div>
      </section>

      <section class="cv-m33-seccion" id="cv-m33-edu-sec" hidden>
        <h2 class="cv-m33-titulo" id="cv-m33-titulo-edu"></h2>
        <div id="cv-m33-edu-lista"></div>
      </section>

      <section class="cv-m33-seccion" id="cv-m33-cert-sec" hidden>
        <h2 class="cv-m33-titulo" id="cv-m33-titulo-cert"></h2>
        <div id="cv-m33-cert-lista"></div>
      </section>

      <section class="cv-m33-seccion" id="cv-m33-ref-sec" hidden>
        <h2 class="cv-m33-titulo" id="cv-m33-titulo-ref"></h2>
        <div id="cv-m33-ref-lista"></div>
      </section>
    </div>
  `;
}

function renderModelo33() {
  asegurarEsqueletoModelo33();

  const foto = $("#cv-m33-foto"), placeholder = $("#cv-m33-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m33-nombre").innerHTML = `${esc(estado.nombre)} <span class="cv-m33-apellido">${esc(estado.apellido)}</span>`;
  $("#cv-m33-puesto").textContent = estado.puesto || "";
  $("#cv-m33-subtitulo").textContent = estado.subtitulo || "";

  $("#cv-m33-titulo-contacto").textContent = t('contacto');
  $("#cv-m33-titulo-hab").textContent = t('habilidades');
  $("#cv-m33-titulo-blandas").textContent = t('blandas');
  $("#cv-m33-titulo-idiomas").textContent = t('idiomas');
  $("#cv-m33-titulo-logros").textContent = t('logros');
  $("#cv-m33-titulo-perfil").textContent = t('perfil');
  $("#cv-m33-titulo-exp").textContent = t('experiencia');
  $("#cv-m33-titulo-edu").textContent = t('educacion');
  $("#cv-m33-titulo-cert").textContent = t('certificaciones');
  $("#cv-m33-titulo-ref").textContent = t('referencias');

  const contactoSec = $("#cv-m33-contacto-sec");
  contactoSec.hidden = !estado.contacto.length;
  if (estado.contacto.length) {
    $("#cv-m33-contacto-lista").innerHTML = estado.contacto.map(c => `
      <li class="cv-m33-contacto-item">
        <span class="cv-m33-contacto-icono">${iconoDe(c.tipo)}</span>
        <span class="cv-m33-contacto-valor">${contactoValorHTML(c)}</span>
      </li>
    `).join("");
  }

  const habSec = $("#cv-m33-hab-sec");
  habSec.hidden = !estado.habilidades.length;
  if (estado.habilidades.length) {
    $("#cv-m33-hab-lista").innerHTML = estado.habilidades.map(h => `<span class="cv-m33-pill">${esc(h.texto)}</span>`).join("");
  }

  const blandasSec = $("#cv-m33-blandas-sec");
  blandasSec.hidden = !estado.blandas.length;
  if (estado.blandas.length) {
    $("#cv-m33-blandas-lista").innerHTML = estado.blandas.map(b => `<span class="cv-m33-pill cv-m33-pill-alt">${esc(b.texto)}</span>`).join("");
  }

  const idiomasSec = $("#cv-m33-idiomas-sec");
  idiomasSec.hidden = !estado.idiomas.length;
  if (estado.idiomas.length) {
    $("#cv-m33-idiomas-lista").innerHTML = estado.idiomas.map(i => `
      <div class="cv-m33-idioma">
        <span class="cv-m33-idioma-nombre">${esc(i.nombre)}</span>
        <span class="cv-m33-idioma-nivel">${esc(i.nivel)}</span>
      </div>
    `).join("");
  }

  const logrosSec = $("#cv-m33-logros-sec");
  logrosSec.hidden = !estado.logros.length;
  if (estado.logros.length) {
    $("#cv-m33-logros-lista").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
  }

  const perfilSec = $("#cv-m33-perfil-sec");
  perfilSec.hidden = !estado.perfil;
  if (estado.perfil) $("#cv-m33-perfil-texto").innerHTML = escPárrafo(estado.perfil);

  const expSec = $("#cv-m33-exp-sec");
  expSec.hidden = !estado.experiencia.length;
  if (estado.experiencia.length) {
    $("#cv-m33-exp-lista").innerHTML = estado.experiencia.map(x => {
      const desc = x.descripcion ? `<p class="cv-m33-job-desc">${escPárrafo(x.descripcion)}</p>` : "";
      const bullets = (x.bullets && x.bullets.length) ? `<ul class="cv-m33-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : "";
      const herramientas = (x.herramientas && x.herramientas.length) ? `<div class="cv-m33-job-tools">${x.herramientas.map(h => `<span class="cv-m33-tool"><strong>${esc(h.etiqueta)}:</strong> ${esc(h.valor)}</span>`).join("")}</div>` : "";
      return `
        <div class="cv-m33-job">
          <div class="cv-m33-job-head">
            <div class="cv-m33-job-empresa-wrap">
              <span class="cv-m33-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa")}${ubicacionSufijo(x)}</span>
              <span class="cv-m33-job-rol">${esc(x.rol)}</span>
            </div>
            <span class="cv-m33-job-fecha">${esc(x.fecha)}</span>
          </div>
          ${desc}${bullets}${herramientas}
        </div>
      `;
    }).join("");
  }

  const eduSec = $("#cv-m33-edu-sec");
  eduSec.hidden = !estado.educacion.length;
  if (estado.educacion.length) {
    $("#cv-m33-edu-lista").innerHTML = estado.educacion.map(e => `
      <div class="cv-m33-edu">
        <div class="cv-m33-edu-head">
          <span class="cv-m33-edu-inst">${esc(e.institucion)}</span>
          <span class="cv-m33-edu-fecha">${esc(e.fecha)}</span>
        </div>
        ${(e.bullets && e.bullets.length) ? `<ul class="cv-m33-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
      </div>
    `).join("");
  }

  const certSec = $("#cv-m33-cert-sec");
  certSec.hidden = !estado.certificaciones.length;
  if (estado.certificaciones.length) {
    $("#cv-m33-cert-lista").innerHTML = estado.certificaciones.map(c => `
      <div class="cv-m33-cert">
        <span class="cv-m33-cert-titulo">${esc(c.titulo)}</span>
        ${c.subtitulo ? `<span class="cv-m33-cert-sub">${esc(c.subtitulo)}</span>` : ""}
      </div>
    `).join("");
  }

  const refSec = $("#cv-m33-ref-sec");
  refSec.hidden = !estado.referencias.length;
  if (estado.referencias.length) {
    $("#cv-m33-ref-lista").innerHTML = estado.referencias.map(r => `
      <div class="cv-m33-ref">
        <span class="cv-m33-ref-nombre">${esc(r.nombre)}</span>
        <span class="cv-m33-ref-rol">${esc(r.rol)}</span>
        ${r.email ? `<span class="cv-m33-ref-dato">${esc(r.email)}</span>` : ""}
        ${r.linkedin ? `<span class="cv-m33-ref-dato">${esc(r.linkedin)}</span>` : ""}
      </div>
    `).join("");
  }
}

function asegurarEsqueletoModelo34() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo34") return;
  pagina.dataset.esqueleto = "modelo34";
  pagina.innerHTML = `
    <header class="cv-m34-banner">
      <div class="cv-m34-foto-marco">
        <img class="cv-m34-foto" id="cv-m34-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m34-foto-placeholder" id="cv-m34-foto-placeholder">🙂</div>
      </div>
      <div class="cv-m34-banner-texto">
        <h1 class="cv-m34-nombre" id="cv-m34-nombre"></h1>
        <p class="cv-m34-puesto" id="cv-m34-puesto"></p>
        <p class="cv-m34-subtitulo" id="cv-m34-subtitulo"></p>
      </div>
    </header>

    <div class="cv-m34-cuerpo">
      <div class="cv-m34-col-izq">
        <section class="cv-m34-sec" id="cv-m34-contacto-sec" hidden>
          <h2 class="cv-m34-chalk" id="cv-m34-titulo-contacto"></h2>
          <ul class="cv-m34-contacto" id="cv-m34-contacto-lista"></ul>
        </section>

        <section class="cv-m34-sec" id="cv-m34-hab-sec" hidden>
          <h2 class="cv-m34-chalk" id="cv-m34-titulo-hab"></h2>
          <div class="cv-m34-pills" id="cv-m34-hab-lista"></div>
        </section>

        <section class="cv-m34-sec" id="cv-m34-blandas-sec" hidden>
          <h2 class="cv-m34-chalk" id="cv-m34-titulo-blandas"></h2>
          <div class="cv-m34-pills" id="cv-m34-blandas-lista"></div>
        </section>

        <section class="cv-m34-sec" id="cv-m34-idiomas-sec" hidden>
          <h2 class="cv-m34-chalk" id="cv-m34-titulo-idiomas"></h2>
          <div id="cv-m34-idiomas-lista"></div>
        </section>

        <section class="cv-m34-sec" id="cv-m34-cert-sec" hidden>
          <h2 class="cv-m34-chalk" id="cv-m34-titulo-cert"></h2>
          <div id="cv-m34-cert-lista"></div>
        </section>

        <section class="cv-m34-sec" id="cv-m34-ref-sec" hidden>
          <h2 class="cv-m34-chalk" id="cv-m34-titulo-ref"></h2>
          <div id="cv-m34-ref-lista"></div>
        </section>
      </div>

      <div class="cv-m34-col-der">
        <section class="cv-m34-sec" id="cv-m34-perfil-sec" hidden>
          <h2 class="cv-m34-chalk" id="cv-m34-titulo-perfil"></h2>
          <p class="cv-m34-perfil-texto" id="cv-m34-perfil-texto"></p>
        </section>

        <section class="cv-m34-sec" id="cv-m34-exp-sec" hidden>
          <h2 class="cv-m34-chalk" id="cv-m34-titulo-exp"></h2>
          <div id="cv-m34-exp-lista"></div>
        </section>

        <section class="cv-m34-sec" id="cv-m34-edu-sec" hidden>
          <h2 class="cv-m34-chalk" id="cv-m34-titulo-edu"></h2>
          <div id="cv-m34-edu-lista"></div>
        </section>

        <section class="cv-m34-sec" id="cv-m34-logros-sec" hidden>
          <h2 class="cv-m34-chalk" id="cv-m34-titulo-logros"></h2>
          <ul class="cv-m34-logros" id="cv-m34-logros-lista"></ul>
        </section>
      </div>
    </div>
  `;
}

function renderModelo34() {
  asegurarEsqueletoModelo34();

  const foto = $("#cv-m34-foto"), placeholder = $("#cv-m34-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m34-nombre").innerHTML = `${esc(estado.nombre)} <span class="cv-m34-apellido">${esc(estado.apellido)}</span>`;
  $("#cv-m34-puesto").textContent = estado.puesto || "";
  $("#cv-m34-subtitulo").textContent = estado.subtitulo || "";

  $("#cv-m34-titulo-contacto").textContent = t('contacto');
  $("#cv-m34-titulo-hab").textContent = t('habilidades');
  $("#cv-m34-titulo-blandas").textContent = t('blandas');
  $("#cv-m34-titulo-idiomas").textContent = t('idiomas');
  $("#cv-m34-titulo-cert").textContent = t('certificaciones');
  $("#cv-m34-titulo-ref").textContent = t('referencias');
  $("#cv-m34-titulo-perfil").textContent = t('perfil');
  $("#cv-m34-titulo-exp").textContent = t('experiencia');
  $("#cv-m34-titulo-edu").textContent = t('educacion');
  $("#cv-m34-titulo-logros").textContent = t('logros');

  const contactoSec = $("#cv-m34-contacto-sec");
  contactoSec.hidden = !estado.contacto.length;
  if (estado.contacto.length) {
    $("#cv-m34-contacto-lista").innerHTML = estado.contacto.map(c => `
      <li class="cv-m34-contacto-item">
        <span class="cv-m34-contacto-icono">${iconoDe(c.tipo)}</span>
        <span class="cv-m34-contacto-valor">${contactoValorHTML(c)}</span>
      </li>
    `).join("");
  }

  const habSec = $("#cv-m34-hab-sec");
  habSec.hidden = !estado.habilidades.length;
  if (estado.habilidades.length) {
    $("#cv-m34-hab-lista").innerHTML = estado.habilidades.map(h => `<span class="cv-m34-pill">${esc(h.texto)}</span>`).join("");
  }

  const blandasSec = $("#cv-m34-blandas-sec");
  blandasSec.hidden = !estado.blandas.length;
  if (estado.blandas.length) {
    $("#cv-m34-blandas-lista").innerHTML = estado.blandas.map(b => `<span class="cv-m34-pill cv-m34-pill-alt">${esc(b.texto)}</span>`).join("");
  }

  const idiomasSec = $("#cv-m34-idiomas-sec");
  idiomasSec.hidden = !estado.idiomas.length;
  if (estado.idiomas.length) {
    $("#cv-m34-idiomas-lista").innerHTML = estado.idiomas.map(i => `
      <div class="cv-m34-idioma">
        <span class="cv-m34-idioma-nombre">${esc(i.nombre)}</span>
        <span class="cv-m34-idioma-nivel">${esc(i.nivel)}</span>
      </div>
    `).join("");
  }

  const certSec = $("#cv-m34-cert-sec");
  certSec.hidden = !estado.certificaciones.length;
  if (estado.certificaciones.length) {
    $("#cv-m34-cert-lista").innerHTML = estado.certificaciones.map(c => `
      <div class="cv-m34-cert">
        <span class="cv-m34-cert-titulo">${esc(c.titulo)}</span>
        ${c.subtitulo ? `<span class="cv-m34-cert-sub">${esc(c.subtitulo)}</span>` : ""}
      </div>
    `).join("");
  }

  const refSec = $("#cv-m34-ref-sec");
  refSec.hidden = !estado.referencias.length;
  if (estado.referencias.length) {
    $("#cv-m34-ref-lista").innerHTML = estado.referencias.map(r => `
      <div class="cv-m34-ref">
        <span class="cv-m34-ref-nombre">${esc(r.nombre)}</span>
        <span class="cv-m34-ref-rol">${esc(r.rol)}</span>
        ${r.email ? `<span class="cv-m34-ref-dato">${esc(r.email)}</span>` : ""}
        ${r.linkedin ? `<span class="cv-m34-ref-dato">${esc(r.linkedin)}</span>` : ""}
      </div>
    `).join("");
  }

  const perfilSec = $("#cv-m34-perfil-sec");
  perfilSec.hidden = !estado.perfil;
  if (estado.perfil) $("#cv-m34-perfil-texto").innerHTML = escPárrafo(estado.perfil);

  const expSec = $("#cv-m34-exp-sec");
  expSec.hidden = !estado.experiencia.length;
  if (estado.experiencia.length) {
    $("#cv-m34-exp-lista").innerHTML = estado.experiencia.map(x => {
      const desc = x.descripcion ? `<p class="cv-m34-job-desc">${escPárrafo(x.descripcion)}</p>` : "";
      const bullets = (x.bullets && x.bullets.length) ? `<ul class="cv-m34-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : "";
      const herramientas = (x.herramientas && x.herramientas.length) ? `<div class="cv-m34-job-tools">${x.herramientas.map(h => `<span class="cv-m34-tool"><strong>${esc(h.etiqueta)}:</strong> ${esc(h.valor)}</span>`).join("")}</div>` : "";
      return `
        <div class="cv-m34-job">
          <div class="cv-m34-job-head">
            <div>
              <span class="cv-m34-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa")}${ubicacionSufijo(x)}</span>
              <span class="cv-m34-job-rol">${esc(x.rol)}</span>
            </div>
            <span class="cv-m34-job-fecha">${esc(x.fecha)}</span>
          </div>
          ${desc}${bullets}${herramientas}
        </div>
      `;
    }).join("");
  }

  const eduSec = $("#cv-m34-edu-sec");
  eduSec.hidden = !estado.educacion.length;
  if (estado.educacion.length) {
    $("#cv-m34-edu-lista").innerHTML = estado.educacion.map(e => `
      <div class="cv-m34-edu">
        <div class="cv-m34-edu-head">
          <span class="cv-m34-edu-inst">${esc(e.institucion)}</span>
          <span class="cv-m34-edu-fecha">${esc(e.fecha)}</span>
        </div>
        ${(e.bullets && e.bullets.length) ? `<ul class="cv-m34-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
      </div>
    `).join("");
  }

  const logrosSec = $("#cv-m34-logros-sec");
  logrosSec.hidden = !estado.logros.length;
  if (estado.logros.length) {
    $("#cv-m34-logros-lista").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
  }
}

function asegurarEsqueletoModelo35() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo35") return;
  pagina.dataset.esqueleto = "modelo35";
  pagina.innerHTML = `
    <header class="cv-m35-header">
      <div class="cv-m35-header-top">
        <div class="cv-m35-foto-marco">
          <img class="cv-m35-foto" id="cv-m35-foto" src="" alt="Foto de perfil" hidden>
          <div class="cv-m35-foto-placeholder" id="cv-m35-foto-placeholder">🙂</div>
        </div>
        <div class="cv-m35-nombre-wrap">
          <h1 class="cv-m35-nombre" id="cv-m35-nombre"></h1>
          <p class="cv-m35-puesto" id="cv-m35-puesto"></p>
        </div>
      </div>
      <p class="cv-m35-subtitulo" id="cv-m35-subtitulo"></p>
      <div class="cv-m35-runway"></div>
    </header>

    <div class="cv-m35-cuerpo">
      <section class="cv-m35-sec" id="cv-m35-contacto-sec" hidden>
        <h2 class="cv-m35-titulo" id="cv-m35-titulo-contacto"></h2>
        <ul class="cv-m35-contacto" id="cv-m35-contacto-lista"></ul>
      </section>

      <section class="cv-m35-sec" id="cv-m35-perfil-sec" hidden>
        <h2 class="cv-m35-titulo" id="cv-m35-titulo-perfil"></h2>
        <p class="cv-m35-perfil-texto" id="cv-m35-perfil-texto"></p>
      </section>

      <section class="cv-m35-sec" id="cv-m35-exp-sec" hidden>
        <h2 class="cv-m35-titulo" id="cv-m35-titulo-exp"></h2>
        <div id="cv-m35-exp-lista"></div>
      </section>

      <div class="cv-m35-grid2">
        <section class="cv-m35-sec" id="cv-m35-hab-sec" hidden>
          <h2 class="cv-m35-titulo" id="cv-m35-titulo-hab"></h2>
          <div class="cv-m35-pills" id="cv-m35-hab-lista"></div>
        </section>

        <section class="cv-m35-sec" id="cv-m35-blandas-sec" hidden>
          <h2 class="cv-m35-titulo" id="cv-m35-titulo-blandas"></h2>
          <div class="cv-m35-pills" id="cv-m35-blandas-lista"></div>
        </section>
      </div>

      <section class="cv-m35-sec" id="cv-m35-edu-sec" hidden>
        <h2 class="cv-m35-titulo" id="cv-m35-titulo-edu"></h2>
        <div id="cv-m35-edu-lista"></div>
      </section>

      <div class="cv-m35-grid2">
        <section class="cv-m35-sec" id="cv-m35-cert-sec" hidden>
          <h2 class="cv-m35-titulo" id="cv-m35-titulo-cert"></h2>
          <div id="cv-m35-cert-lista"></div>
        </section>

        <section class="cv-m35-sec" id="cv-m35-idiomas-sec" hidden>
          <h2 class="cv-m35-titulo" id="cv-m35-titulo-idiomas"></h2>
          <div id="cv-m35-idiomas-lista"></div>
        </section>
      </div>

      <section class="cv-m35-sec" id="cv-m35-logros-sec" hidden>
        <h2 class="cv-m35-titulo" id="cv-m35-titulo-logros"></h2>
        <ul class="cv-m35-logros" id="cv-m35-logros-lista"></ul>
      </section>

      <section class="cv-m35-sec" id="cv-m35-ref-sec" hidden>
        <h2 class="cv-m35-titulo" id="cv-m35-titulo-ref"></h2>
        <div id="cv-m35-ref-lista"></div>
      </section>
    </div>
  `;
}

function renderModelo35() {
  asegurarEsqueletoModelo35();

  const foto = $("#cv-m35-foto"), placeholder = $("#cv-m35-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m35-nombre").innerHTML = `${esc(estado.nombre)}<br><span class="cv-m35-apellido">${esc(estado.apellido)}</span>`;
  $("#cv-m35-puesto").textContent = estado.puesto || "";
  $("#cv-m35-subtitulo").textContent = estado.subtitulo || "";

  $("#cv-m35-titulo-contacto").textContent = t('contacto');
  $("#cv-m35-titulo-perfil").textContent = t('perfil');
  $("#cv-m35-titulo-exp").textContent = t('experiencia');
  $("#cv-m35-titulo-hab").textContent = t('habilidades');
  $("#cv-m35-titulo-blandas").textContent = t('blandas');
  $("#cv-m35-titulo-edu").textContent = t('educacion');
  $("#cv-m35-titulo-cert").textContent = t('certificaciones');
  $("#cv-m35-titulo-idiomas").textContent = t('idiomas');
  $("#cv-m35-titulo-logros").textContent = t('logros');
  $("#cv-m35-titulo-ref").textContent = t('referencias');

  const contactoSec = $("#cv-m35-contacto-sec");
  contactoSec.hidden = !estado.contacto.length;
  if (estado.contacto.length) {
    $("#cv-m35-contacto-lista").innerHTML = estado.contacto.map(c => `
      <li class="cv-m35-contacto-item">
        <span class="cv-m35-contacto-icono">${iconoDe(c.tipo)}</span>
        <span class="cv-m35-contacto-valor">${contactoValorHTML(c)}</span>
      </li>
    `).join("");
  }

  const perfilSec = $("#cv-m35-perfil-sec");
  perfilSec.hidden = !estado.perfil;
  if (estado.perfil) $("#cv-m35-perfil-texto").innerHTML = escPárrafo(estado.perfil);

  const expSec = $("#cv-m35-exp-sec");
  expSec.hidden = !estado.experiencia.length;
  if (estado.experiencia.length) {
    $("#cv-m35-exp-lista").innerHTML = estado.experiencia.map(x => {
      const desc = x.descripcion ? `<p class="cv-m35-job-desc">${escPárrafo(x.descripcion)}</p>` : "";
      const bullets = (x.bullets && x.bullets.length) ? `<ul class="cv-m35-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : "";
      const herramientas = (x.herramientas && x.herramientas.length) ? `<div class="cv-m35-job-tools">${x.herramientas.map(h => `<span class="cv-m35-tool"><strong>${esc(h.etiqueta)}:</strong> ${esc(h.valor)}</span>`).join("")}</div>` : "";
      return `
        <div class="cv-m35-job">
          <div class="cv-m35-job-head">
            <div>
              <span class="cv-m35-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa")}${ubicacionSufijo(x)}</span>
              <span class="cv-m35-job-rol">${esc(x.rol)}</span>
            </div>
            <span class="cv-m35-job-fecha">${esc(x.fecha)}</span>
          </div>
          ${desc}${bullets}${herramientas}
        </div>
      `;
    }).join("");
  }

  const habSec = $("#cv-m35-hab-sec");
  habSec.hidden = !estado.habilidades.length;
  if (estado.habilidades.length) {
    $("#cv-m35-hab-lista").innerHTML = estado.habilidades.map(h => `<span class="cv-m35-pill">${esc(h.texto)}</span>`).join("");
  }

  const blandasSec = $("#cv-m35-blandas-sec");
  blandasSec.hidden = !estado.blandas.length;
  if (estado.blandas.length) {
    $("#cv-m35-blandas-lista").innerHTML = estado.blandas.map(b => `<span class="cv-m35-pill cv-m35-pill-alt">${esc(b.texto)}</span>`).join("");
  }

  const eduSec = $("#cv-m35-edu-sec");
  eduSec.hidden = !estado.educacion.length;
  if (estado.educacion.length) {
    $("#cv-m35-edu-lista").innerHTML = estado.educacion.map(e => `
      <div class="cv-m35-edu">
        <div class="cv-m35-edu-head">
          <span class="cv-m35-edu-inst">${esc(e.institucion)}</span>
          <span class="cv-m35-edu-fecha">${esc(e.fecha)}</span>
        </div>
        ${(e.bullets && e.bullets.length) ? `<ul class="cv-m35-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
      </div>
    `).join("");
  }

  const certSec = $("#cv-m35-cert-sec");
  certSec.hidden = !estado.certificaciones.length;
  if (estado.certificaciones.length) {
    $("#cv-m35-cert-lista").innerHTML = estado.certificaciones.map(c => `
      <div class="cv-m35-cert">
        <span class="cv-m35-cert-titulo">${esc(c.titulo)}</span>
        ${c.subtitulo ? `<span class="cv-m35-cert-sub">${esc(c.subtitulo)}</span>` : ""}
      </div>
    `).join("");
  }

  const idiomasSec = $("#cv-m35-idiomas-sec");
  idiomasSec.hidden = !estado.idiomas.length;
  if (estado.idiomas.length) {
    $("#cv-m35-idiomas-lista").innerHTML = estado.idiomas.map(i => `
      <div class="cv-m35-idioma">
        <span class="cv-m35-idioma-nombre">${esc(i.nombre)}</span>
        <span class="cv-m35-idioma-nivel">${esc(i.nivel)}</span>
      </div>
    `).join("");
  }

  const logrosSec = $("#cv-m35-logros-sec");
  logrosSec.hidden = !estado.logros.length;
  if (estado.logros.length) {
    $("#cv-m35-logros-lista").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
  }

  const refSec = $("#cv-m35-ref-sec");
  refSec.hidden = !estado.referencias.length;
  if (estado.referencias.length) {
    $("#cv-m35-ref-lista").innerHTML = estado.referencias.map(r => `
      <div class="cv-m35-ref">
        <span class="cv-m35-ref-nombre">${esc(r.nombre)}</span>
        <span class="cv-m35-ref-rol">${esc(r.rol)}</span>
        ${r.email ? `<span class="cv-m35-ref-dato">${esc(r.email)}</span>` : ""}
        ${r.linkedin ? `<span class="cv-m35-ref-dato">${esc(r.linkedin)}</span>` : ""}
      </div>
    `).join("");
  }
}

function asegurarEsqueletoModelo36() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo36") return;
  pagina.dataset.esqueleto = "modelo36";
  pagina.innerHTML = `
    <header class="cv-m36-header">
      <div class="cv-m36-foto-marco">
        <img class="cv-m36-foto" id="cv-m36-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m36-foto-placeholder" id="cv-m36-foto-placeholder">🙂</div>
      </div>
      <div>
        <h1 class="cv-m36-nombre" id="cv-m36-nombre"></h1>
        <p class="cv-m36-puesto" id="cv-m36-puesto"></p>
        <p class="cv-m36-subtitulo" id="cv-m36-subtitulo"></p>
      </div>
    </header>

    <div class="cv-m36-cuerpo">
      <div class="cv-m36-col-izq">
        <section class="cv-m36-card" id="cv-m36-contacto-sec" hidden>
          <h2 class="cv-m36-titulo" id="cv-m36-titulo-contacto"></h2>
          <ul class="cv-m36-contacto" id="cv-m36-contacto-lista"></ul>
        </section>

        <section class="cv-m36-card" id="cv-m36-hab-sec" hidden>
          <h2 class="cv-m36-titulo" id="cv-m36-titulo-hab"></h2>
          <div class="cv-m36-pills" id="cv-m36-hab-lista"></div>
        </section>

        <section class="cv-m36-card" id="cv-m36-blandas-sec" hidden>
          <h2 class="cv-m36-titulo" id="cv-m36-titulo-blandas"></h2>
          <div class="cv-m36-pills" id="cv-m36-blandas-lista"></div>
        </section>

        <section class="cv-m36-card" id="cv-m36-idiomas-sec" hidden>
          <h2 class="cv-m36-titulo" id="cv-m36-titulo-idiomas"></h2>
          <div id="cv-m36-idiomas-lista"></div>
        </section>

        <section class="cv-m36-card" id="cv-m36-cert-sec" hidden>
          <h2 class="cv-m36-titulo" id="cv-m36-titulo-cert"></h2>
          <div id="cv-m36-cert-lista"></div>
        </section>

        <section class="cv-m36-card" id="cv-m36-ref-sec" hidden>
          <h2 class="cv-m36-titulo" id="cv-m36-titulo-ref"></h2>
          <div id="cv-m36-ref-lista"></div>
        </section>
      </div>

      <div class="cv-m36-col-der">
        <section class="cv-m36-card" id="cv-m36-perfil-sec" hidden>
          <h2 class="cv-m36-titulo" id="cv-m36-titulo-perfil"></h2>
          <p class="cv-m36-perfil-texto" id="cv-m36-perfil-texto"></p>
        </section>

        <section class="cv-m36-card" id="cv-m36-exp-sec" hidden>
          <h2 class="cv-m36-titulo" id="cv-m36-titulo-exp"></h2>
          <div id="cv-m36-exp-lista"></div>
        </section>

        <section class="cv-m36-card" id="cv-m36-edu-sec" hidden>
          <h2 class="cv-m36-titulo" id="cv-m36-titulo-edu"></h2>
          <div id="cv-m36-edu-lista"></div>
        </section>

        <section class="cv-m36-card" id="cv-m36-logros-sec" hidden>
          <h2 class="cv-m36-titulo" id="cv-m36-titulo-logros"></h2>
          <ul class="cv-m36-logros" id="cv-m36-logros-lista"></ul>
        </section>
      </div>
    </div>
  `;
}

function renderModelo36() {
  asegurarEsqueletoModelo36();

  const foto = $("#cv-m36-foto"), placeholder = $("#cv-m36-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m36-nombre").innerHTML = `${esc(estado.nombre)} <span class="cv-m36-apellido">${esc(estado.apellido)}</span>`;
  $("#cv-m36-puesto").textContent = estado.puesto || "";
  $("#cv-m36-subtitulo").textContent = estado.subtitulo || "";

  $("#cv-m36-titulo-contacto").textContent = t('contacto');
  $("#cv-m36-titulo-hab").textContent = t('habilidades');
  $("#cv-m36-titulo-blandas").textContent = t('blandas');
  $("#cv-m36-titulo-idiomas").textContent = t('idiomas');
  $("#cv-m36-titulo-cert").textContent = t('certificaciones');
  $("#cv-m36-titulo-ref").textContent = t('referencias');
  $("#cv-m36-titulo-perfil").textContent = t('perfil');
  $("#cv-m36-titulo-exp").textContent = t('experiencia');
  $("#cv-m36-titulo-edu").textContent = t('educacion');
  $("#cv-m36-titulo-logros").textContent = t('logros');

  const contactoSec = $("#cv-m36-contacto-sec");
  contactoSec.hidden = !estado.contacto.length;
  if (estado.contacto.length) {
    $("#cv-m36-contacto-lista").innerHTML = estado.contacto.map(c => `
      <li class="cv-m36-contacto-item">
        <span class="cv-m36-contacto-icono">${iconoDe(c.tipo)}</span>
        <span class="cv-m36-contacto-valor">${contactoValorHTML(c)}</span>
      </li>
    `).join("");
  }

  const habSec = $("#cv-m36-hab-sec");
  habSec.hidden = !estado.habilidades.length;
  if (estado.habilidades.length) {
    $("#cv-m36-hab-lista").innerHTML = estado.habilidades.map(h => `<span class="cv-m36-pill">${esc(h.texto)}</span>`).join("");
  }

  const blandasSec = $("#cv-m36-blandas-sec");
  blandasSec.hidden = !estado.blandas.length;
  if (estado.blandas.length) {
    $("#cv-m36-blandas-lista").innerHTML = estado.blandas.map(b => `<span class="cv-m36-pill cv-m36-pill-alt">${esc(b.texto)}</span>`).join("");
  }

  const idiomasSec = $("#cv-m36-idiomas-sec");
  idiomasSec.hidden = !estado.idiomas.length;
  if (estado.idiomas.length) {
    $("#cv-m36-idiomas-lista").innerHTML = estado.idiomas.map(i => `
      <div class="cv-m36-idioma">
        <span class="cv-m36-idioma-nombre">${esc(i.nombre)}</span>
        <span class="cv-m36-idioma-nivel">${esc(i.nivel)}</span>
      </div>
    `).join("");
  }

  const certSec = $("#cv-m36-cert-sec");
  certSec.hidden = !estado.certificaciones.length;
  if (estado.certificaciones.length) {
    $("#cv-m36-cert-lista").innerHTML = estado.certificaciones.map(c => `
      <div class="cv-m36-cert">
        <span class="cv-m36-cert-titulo">${esc(c.titulo)}</span>
        ${c.subtitulo ? `<span class="cv-m36-cert-sub">${esc(c.subtitulo)}</span>` : ""}
      </div>
    `).join("");
  }

  const refSec = $("#cv-m36-ref-sec");
  refSec.hidden = !estado.referencias.length;
  if (estado.referencias.length) {
    $("#cv-m36-ref-lista").innerHTML = estado.referencias.map(r => `
      <div class="cv-m36-ref">
        <span class="cv-m36-ref-nombre">${esc(r.nombre)}</span>
        <span class="cv-m36-ref-rol">${esc(r.rol)}</span>
        ${r.email ? `<span class="cv-m36-ref-dato">${esc(r.email)}</span>` : ""}
        ${r.linkedin ? `<span class="cv-m36-ref-dato">${esc(r.linkedin)}</span>` : ""}
      </div>
    `).join("");
  }

  const perfilSec = $("#cv-m36-perfil-sec");
  perfilSec.hidden = !estado.perfil;
  if (estado.perfil) $("#cv-m36-perfil-texto").innerHTML = escPárrafo(estado.perfil);

  const expSec = $("#cv-m36-exp-sec");
  expSec.hidden = !estado.experiencia.length;
  if (estado.experiencia.length) {
    $("#cv-m36-exp-lista").innerHTML = estado.experiencia.map(x => {
      const desc = x.descripcion ? `<p class="cv-m36-job-desc">${escPárrafo(x.descripcion)}</p>` : "";
      const bullets = (x.bullets && x.bullets.length) ? `<ul class="cv-m36-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : "";
      const herramientas = (x.herramientas && x.herramientas.length) ? `<div class="cv-m36-job-tools">${x.herramientas.map(h => `<span class="cv-m36-tool"><strong>${esc(h.etiqueta)}:</strong> ${esc(h.valor)}</span>`).join("")}</div>` : "";
      return `
        <div class="cv-m36-job">
          <div class="cv-m36-job-head">
            <div>
              <span class="cv-m36-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa")}${ubicacionSufijo(x)}</span>
              <span class="cv-m36-job-rol">${esc(x.rol)}</span>
            </div>
            <span class="cv-m36-job-fecha">${esc(x.fecha)}</span>
          </div>
          ${desc}${bullets}${herramientas}
        </div>
      `;
    }).join("");
  }

  const eduSec = $("#cv-m36-edu-sec");
  eduSec.hidden = !estado.educacion.length;
  if (estado.educacion.length) {
    $("#cv-m36-edu-lista").innerHTML = estado.educacion.map(e => `
      <div class="cv-m36-edu">
        <div class="cv-m36-edu-head">
          <span class="cv-m36-edu-inst">${esc(e.institucion)}</span>
          <span class="cv-m36-edu-fecha">${esc(e.fecha)}</span>
        </div>
        ${(e.bullets && e.bullets.length) ? `<ul class="cv-m36-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
      </div>
    `).join("");
  }

  const logrosSec = $("#cv-m36-logros-sec");
  logrosSec.hidden = !estado.logros.length;
  if (estado.logros.length) {
    $("#cv-m36-logros-lista").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
  }
}

// ---- Modelos 37-40 ----
function asegurarEsqueletoModelo37() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo37") return;
  pagina.dataset.esqueleto = "modelo37";
  pagina.innerHTML = `
    <div class="cv-m37-riel">
      <div class="cv-m37-foto-marco">
        <img class="cv-m37-foto" id="cv-m37-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m37-foto-placeholder" id="cv-m37-foto-placeholder">🙂</div>
      </div>
      <div class="cv-m37-contacto" id="cv-m37-contacto"></div>
      <div class="cv-m37-bloque" id="cv-m37-bloque-habilidades">
        <h3 class="cv-m37-subtitulo">${t('habilidades')}</h3>
        <div class="cv-m37-tags" id="cv-m37-habilidades"></div>
      </div>
      <div class="cv-m37-bloque" id="cv-m37-bloque-blandas">
        <h3 class="cv-m37-subtitulo">${t('blandas')}</h3>
        <div class="cv-m37-tags" id="cv-m37-blandas"></div>
      </div>
      <div class="cv-m37-bloque" id="cv-m37-bloque-idiomas">
        <h3 class="cv-m37-subtitulo">${t('idiomas')}</h3>
        <ul class="cv-m37-idiomas" id="cv-m37-idiomas"></ul>
      </div>
      <div class="cv-m37-bloque" id="cv-m37-bloque-educacion">
        <h3 class="cv-m37-subtitulo">${t('educacion')}</h3>
        <div id="cv-m37-educacion"></div>
      </div>
      <div class="cv-m37-bloque" id="cv-m37-bloque-cert">
        <h3 class="cv-m37-subtitulo">${t('certificaciones')}</h3>
        <div id="cv-m37-certificaciones"></div>
      </div>
      <div class="cv-m37-bloque" id="cv-m37-bloque-ref">
        <h3 class="cv-m37-subtitulo">${t('referencias')}</h3>
        <div id="cv-m37-referencias"></div>
      </div>
    </div>
    <div class="cv-m37-panel">
      <header class="cv-m37-header">
        <div class="cv-m37-rayo" aria-hidden="true">⚡</div>
        <h1 class="cv-m37-nombre" id="cv-m37-nombre"></h1>
        <div class="cv-m37-puesto" id="cv-m37-puesto"></div>
        <div class="cv-m37-subtit" id="cv-m37-subtitulo"></div>
      </header>
      <section class="cv-m37-bloque" id="cv-m37-bloque-perfil">
        <h2 class="cv-m37-titulo"><span class="cv-m37-nodo"></span>${t('perfil')}</h2>
        <p class="cv-m37-perfil" id="cv-m37-perfil"></p>
      </section>
      <section class="cv-m37-bloque" id="cv-m37-bloque-experiencia">
        <h2 class="cv-m37-titulo"><span class="cv-m37-nodo"></span>${t('experiencia')}</h2>
        <div id="cv-m37-experiencia"></div>
      </section>
      <section class="cv-m37-bloque" id="cv-m37-bloque-logros">
        <h2 class="cv-m37-titulo"><span class="cv-m37-nodo"></span>${t('logros')}</h2>
        <ul class="cv-m37-logros" id="cv-m37-logros"></ul>
      </section>
    </div>
  `;
}

function renderModelo37() {
  asegurarEsqueletoModelo37();

  const foto = $("#cv-m37-foto"), placeholder = $("#cv-m37-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m37-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m37-puesto").textContent = estado.puesto || "";
  $("#cv-m37-subtitulo").textContent = estado.subtitulo || "";
  $("#cv-m37-subtitulo").hidden = !estado.subtitulo;

  $("#cv-m37-bloque-perfil").hidden = !estado.perfil;
  $("#cv-m37-perfil").innerHTML = escPárrafo(estado.perfil || "");

  $("#cv-m37-contacto").innerHTML = estado.contacto.map(c => `
    <div class="cv-m37-contacto-item">
      <span class="cv-m37-contacto-ico">${iconoDe(c.tipo)}</span>
      <span class="cv-m37-contacto-val">${contactoValorHTML(c)}</span>
    </div>
  `).join("");

  $("#cv-m37-bloque-habilidades").hidden = !estado.habilidades.length;
  $("#cv-m37-habilidades").innerHTML = estado.habilidades.map(h =>
    `<span class="cv-m37-tag">${esc(h.texto)}</span>`).join("");

  $("#cv-m37-bloque-blandas").hidden = !estado.blandas.length;
  $("#cv-m37-blandas").innerHTML = estado.blandas.map(h =>
    `<span class="cv-m37-tag cv-m37-tag-alt">${esc(h.texto)}</span>`).join("");

  $("#cv-m37-bloque-idiomas").hidden = !estado.idiomas.length;
  $("#cv-m37-idiomas").innerHTML = estado.idiomas.map(i =>
    `<li><span>${esc(i.nombre)}</span><span class="cv-m37-nivel">${esc(i.nivel)}</span></li>`).join("");

  $("#cv-m37-bloque-educacion").hidden = !estado.educacion.length;
  $("#cv-m37-educacion").innerHTML = estado.educacion.map(e => `
    <div class="cv-m37-edu">
      <div class="cv-m37-edu-fecha">${esc(e.fecha)}</div>
      <div class="cv-m37-edu-inst">${esc(e.institucion)}</div>
      ${e.bullets.length ? `<ul class="cv-m37-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");

  $("#cv-m37-bloque-cert").hidden = !estado.certificaciones.length;
  $("#cv-m37-certificaciones").innerHTML = estado.certificaciones.map(c => `
    <div class="cv-m37-cert">
      <div class="cv-m37-cert-titulo">${esc(c.titulo)}</div>
      <div class="cv-m37-cert-sub">${esc(c.subtitulo)}</div>
    </div>
  `).join("");

  $("#cv-m37-bloque-ref").hidden = !estado.referencias.length;
  $("#cv-m37-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m37-ref">
      <div class="cv-m37-ref-nombre">${esc(r.nombre)}</div>
      <div class="cv-m37-ref-rol">${esc(r.rol)}</div>
      ${r.email ? `<div class="cv-m37-ref-dato">${esc(r.email)}</div>` : ""}
      ${r.linkedin ? `<div class="cv-m37-ref-dato">${esc(r.linkedin)}</div>` : ""}
    </div>
  `).join("");

  $("#cv-m37-bloque-experiencia").hidden = !estado.experiencia.length;
  $("#cv-m37-experiencia").innerHTML = estado.experiencia.map(x => {
    const grupos = {};
    (x.herramientas || []).forEach(h => {
      const clave = h.etiqueta || "";
      (grupos[clave] = grupos[clave] || []).push(h.valor);
    });
    const herramientasHTML = Object.keys(grupos).length ? `
      <div class="cv-m37-job-herramientas">
        ${Object.entries(grupos).map(([etq, vals]) => `
          <div class="cv-m37-herr-grupo">
            ${etq ? `<span class="cv-m37-herr-etq">${esc(etq)}:</span>` : ""}
            <span class="cv-m37-herr-val">${vals.map(v => esc(v)).join(", ")}</span>
          </div>
        `).join("")}
      </div>` : "";
    return `
      <article class="cv-m37-job">
        <div class="cv-m37-job-head">
          <div>
            <div class="cv-m37-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}</div>
            <div class="cv-m37-job-rol">${esc(x.rol)}</div>
          </div>
          <div class="cv-m37-job-fecha">${esc(x.fecha)}</div>
        </div>
        ${x.descripcion ? `<p class="cv-m37-job-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${x.bullets.length ? `<ul class="cv-m37-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
        ${herramientasHTML}
      </article>
    `;
  }).join("");

  $("#cv-m37-bloque-logros").hidden = !estado.logros.length;
  $("#cv-m37-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
}

function asegurarEsqueletoModelo38() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo38") return;
  pagina.dataset.esqueleto = "modelo38";
  pagina.innerHTML = `
    <header class="cv-m38-banner">
      <div class="cv-m38-skyline" aria-hidden="true"></div>
      <div class="cv-m38-foto-marco">
        <img class="cv-m38-foto" id="cv-m38-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m38-foto-placeholder" id="cv-m38-foto-placeholder">🙂</div>
      </div>
      <div class="cv-m38-banner-texto">
        <h1 class="cv-m38-nombre" id="cv-m38-nombre"></h1>
        <div class="cv-m38-puesto" id="cv-m38-puesto"></div>
        <div class="cv-m38-subtitulo" id="cv-m38-subtitulo"></div>
      </div>
      <div class="cv-m38-llave" aria-hidden="true">🔑</div>
    </header>
    <div class="cv-m38-cuerpo">
      <div class="cv-m38-main">
        <section id="cv-m38-bloque-perfil">
          <h2 class="cv-m38-titulo">${t('perfil')}</h2>
          <p class="cv-m38-perfil" id="cv-m38-perfil"></p>
        </section>
        <section id="cv-m38-bloque-experiencia">
          <h2 class="cv-m38-titulo">${t('experiencia')}</h2>
          <div id="cv-m38-experiencia"></div>
        </section>
        <section id="cv-m38-bloque-logros">
          <h2 class="cv-m38-titulo">${t('logros')}</h2>
          <ul class="cv-m38-logros" id="cv-m38-logros"></ul>
        </section>
      </div>
      <aside class="cv-m38-lateral">
        <div class="cv-m38-bloque" id="cv-m38-bloque-contacto">
          <h3 class="cv-m38-sub">${t('contacto')}</h3>
          <div id="cv-m38-contacto"></div>
        </div>
        <div class="cv-m38-bloque" id="cv-m38-bloque-habilidades">
          <h3 class="cv-m38-sub">${t('habilidades')}</h3>
          <div class="cv-m38-tags" id="cv-m38-habilidades"></div>
        </div>
        <div class="cv-m38-bloque" id="cv-m38-bloque-blandas">
          <h3 class="cv-m38-sub">${t('blandas')}</h3>
          <div class="cv-m38-tags" id="cv-m38-blandas"></div>
        </div>
        <div class="cv-m38-bloque" id="cv-m38-bloque-idiomas">
          <h3 class="cv-m38-sub">${t('idiomas')}</h3>
          <ul class="cv-m38-idiomas" id="cv-m38-idiomas"></ul>
        </div>
        <div class="cv-m38-bloque" id="cv-m38-bloque-educacion">
          <h3 class="cv-m38-sub">${t('educacion')}</h3>
          <div id="cv-m38-educacion"></div>
        </div>
        <div class="cv-m38-bloque" id="cv-m38-bloque-cert">
          <h3 class="cv-m38-sub">${t('certificaciones')}</h3>
          <div id="cv-m38-certificaciones"></div>
        </div>
        <div class="cv-m38-bloque" id="cv-m38-bloque-ref">
          <h3 class="cv-m38-sub">${t('referencias')}</h3>
          <div id="cv-m38-referencias"></div>
        </div>
      </aside>
    </div>
  `;
}

function renderModelo38() {
  asegurarEsqueletoModelo38();

  const foto = $("#cv-m38-foto"), placeholder = $("#cv-m38-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m38-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m38-puesto").textContent = estado.puesto || "";
  $("#cv-m38-subtitulo").textContent = estado.subtitulo || "";
  $("#cv-m38-subtitulo").hidden = !estado.subtitulo;

  $("#cv-m38-bloque-perfil").hidden = !estado.perfil;
  $("#cv-m38-perfil").innerHTML = escPárrafo(estado.perfil || "");

  $("#cv-m38-contacto").innerHTML = estado.contacto.map(c => `
    <div class="cv-m38-contacto-item">
      <span class="cv-m38-contacto-ico">${iconoDe(c.tipo)}</span>
      <span>${contactoValorHTML(c)}</span>
    </div>
  `).join("");
  $("#cv-m38-bloque-contacto").hidden = !estado.contacto.length;

  $("#cv-m38-bloque-habilidades").hidden = !estado.habilidades.length;
  $("#cv-m38-habilidades").innerHTML = estado.habilidades.map(h => `<span class="cv-m38-tag">${esc(h.texto)}</span>`).join("");

  $("#cv-m38-bloque-blandas").hidden = !estado.blandas.length;
  $("#cv-m38-blandas").innerHTML = estado.blandas.map(h => `<span class="cv-m38-tag cv-m38-tag-alt">${esc(h.texto)}</span>`).join("");

  $("#cv-m38-bloque-idiomas").hidden = !estado.idiomas.length;
  $("#cv-m38-idiomas").innerHTML = estado.idiomas.map(i =>
    `<li><span>${esc(i.nombre)}</span><span class="cv-m38-nivel">${esc(i.nivel)}</span></li>`).join("");

  $("#cv-m38-bloque-educacion").hidden = !estado.educacion.length;
  $("#cv-m38-educacion").innerHTML = estado.educacion.map(e => `
    <div class="cv-m38-edu">
      <div class="cv-m38-edu-inst">${esc(e.institucion)}</div>
      <div class="cv-m38-edu-fecha">${esc(e.fecha)}</div>
      ${e.bullets.length ? `<ul class="cv-m38-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");

  $("#cv-m38-bloque-cert").hidden = !estado.certificaciones.length;
  $("#cv-m38-certificaciones").innerHTML = estado.certificaciones.map(c => `
    <div class="cv-m38-cert">
      <div class="cv-m38-cert-titulo">${esc(c.titulo)}</div>
      <div class="cv-m38-cert-sub">${esc(c.subtitulo)}</div>
    </div>
  `).join("");

  $("#cv-m38-bloque-ref").hidden = !estado.referencias.length;
  $("#cv-m38-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m38-ref">
      <div class="cv-m38-ref-nombre">${esc(r.nombre)}</div>
      <div class="cv-m38-ref-rol">${esc(r.rol)}</div>
      ${r.email ? `<div class="cv-m38-ref-dato">${esc(r.email)}</div>` : ""}
      ${r.linkedin ? `<div class="cv-m38-ref-dato">${esc(r.linkedin)}</div>` : ""}
    </div>
  `).join("");

  $("#cv-m38-bloque-experiencia").hidden = !estado.experiencia.length;
  $("#cv-m38-experiencia").innerHTML = estado.experiencia.map(x => {
    const grupos = {};
    (x.herramientas || []).forEach(h => {
      const clave = h.etiqueta || "";
      (grupos[clave] = grupos[clave] || []).push(h.valor);
    });
    const herramientasHTML = Object.keys(grupos).length ? `
      <div class="cv-m38-job-herramientas">
        ${Object.entries(grupos).map(([etq, vals]) => `
          <span class="cv-m38-herr-grupo">${etq ? `<b>${esc(etq)}:</b> ` : ""}${vals.map(v => esc(v)).join(", ")}</span>
        `).join("")}
      </div>` : "";
    return `
      <article class="cv-m38-listing">
        <div class="cv-m38-listing-precio">${esc(x.fecha)}</div>
        <div class="cv-m38-listing-head">
          <div class="cv-m38-listing-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}</div>
          <div class="cv-m38-listing-rol">${esc(x.rol)}</div>
        </div>
        ${x.descripcion ? `<p class="cv-m38-listing-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${x.bullets.length ? `<ul class="cv-m38-listing-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
        ${herramientasHTML}
      </article>
    `;
  }).join("");

  $("#cv-m38-bloque-logros").hidden = !estado.logros.length;
  $("#cv-m38-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
}

function asegurarEsqueletoModelo39() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo39") return;
  pagina.dataset.esqueleto = "modelo39";
  pagina.innerHTML = `
    <header class="cv-m39-header">
      <div class="cv-m39-vinilo">
        <img class="cv-m39-foto" id="cv-m39-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m39-foto-placeholder" id="cv-m39-foto-placeholder">🙂</div>
      </div>
      <h1 class="cv-m39-nombre" id="cv-m39-nombre"></h1>
      <div class="cv-m39-puesto" id="cv-m39-puesto"></div>
      <div class="cv-m39-subtitulo" id="cv-m39-subtitulo"></div>
      <div class="cv-m39-eq" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
      </div>
      <div class="cv-m39-contacto" id="cv-m39-contacto"></div>
    </header>
    <div class="cv-m39-cuerpo">
      <div class="cv-m39-main">
        <section id="cv-m39-bloque-perfil">
          <h2 class="cv-m39-titulo">${t('perfil')}</h2>
          <p class="cv-m39-perfil" id="cv-m39-perfil"></p>
        </section>
        <section id="cv-m39-bloque-experiencia">
          <h2 class="cv-m39-titulo">${t('experiencia')}</h2>
          <div id="cv-m39-experiencia"></div>
        </section>
        <section id="cv-m39-bloque-logros">
          <h2 class="cv-m39-titulo">${t('logros')}</h2>
          <ul class="cv-m39-logros" id="cv-m39-logros"></ul>
        </section>
      </div>
      <aside class="cv-m39-lateral">
        <div class="cv-m39-bloque" id="cv-m39-bloque-habilidades">
          <h3 class="cv-m39-sub">${t('habilidades')}</h3>
          <div class="cv-m39-tags" id="cv-m39-habilidades"></div>
        </div>
        <div class="cv-m39-bloque" id="cv-m39-bloque-blandas">
          <h3 class="cv-m39-sub">${t('blandas')}</h3>
          <div class="cv-m39-tags" id="cv-m39-blandas"></div>
        </div>
        <div class="cv-m39-bloque" id="cv-m39-bloque-idiomas">
          <h3 class="cv-m39-sub">${t('idiomas')}</h3>
          <ul class="cv-m39-idiomas" id="cv-m39-idiomas"></ul>
        </div>
        <div class="cv-m39-bloque" id="cv-m39-bloque-educacion">
          <h3 class="cv-m39-sub">${t('educacion')}</h3>
          <div id="cv-m39-educacion"></div>
        </div>
        <div class="cv-m39-bloque" id="cv-m39-bloque-cert">
          <h3 class="cv-m39-sub">${t('certificaciones')}</h3>
          <div id="cv-m39-certificaciones"></div>
        </div>
        <div class="cv-m39-bloque" id="cv-m39-bloque-ref">
          <h3 class="cv-m39-sub">${t('referencias')}</h3>
          <div id="cv-m39-referencias"></div>
        </div>
      </aside>
    </div>
  `;
}

function renderModelo39() {
  asegurarEsqueletoModelo39();

  const foto = $("#cv-m39-foto"), placeholder = $("#cv-m39-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m39-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m39-puesto").textContent = estado.puesto || "";
  $("#cv-m39-subtitulo").textContent = estado.subtitulo || "";
  $("#cv-m39-subtitulo").hidden = !estado.subtitulo;

  $("#cv-m39-contacto").innerHTML = estado.contacto.map(c => `
    <div class="cv-m39-contacto-item">
      <span class="cv-m39-contacto-ico">${iconoDe(c.tipo)}</span>
      <span>${contactoValorHTML(c)}</span>
    </div>
  `).join("");

  $("#cv-m39-bloque-perfil").hidden = !estado.perfil;
  $("#cv-m39-perfil").innerHTML = escPárrafo(estado.perfil || "");

  $("#cv-m39-bloque-habilidades").hidden = !estado.habilidades.length;
  $("#cv-m39-habilidades").innerHTML = estado.habilidades.map(h => `<span class="cv-m39-tag">${esc(h.texto)}</span>`).join("");

  $("#cv-m39-bloque-blandas").hidden = !estado.blandas.length;
  $("#cv-m39-blandas").innerHTML = estado.blandas.map(h => `<span class="cv-m39-tag cv-m39-tag-alt">${esc(h.texto)}</span>`).join("");

  $("#cv-m39-bloque-idiomas").hidden = !estado.idiomas.length;
  $("#cv-m39-idiomas").innerHTML = estado.idiomas.map(i =>
    `<li><span>${esc(i.nombre)}</span><span class="cv-m39-nivel">${esc(i.nivel)}</span></li>`).join("");

  $("#cv-m39-bloque-educacion").hidden = !estado.educacion.length;
  $("#cv-m39-educacion").innerHTML = estado.educacion.map(e => `
    <div class="cv-m39-edu">
      <div class="cv-m39-edu-inst">${esc(e.institucion)}</div>
      <div class="cv-m39-edu-fecha">${esc(e.fecha)}</div>
      ${e.bullets.length ? `<ul class="cv-m39-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");

  $("#cv-m39-bloque-cert").hidden = !estado.certificaciones.length;
  $("#cv-m39-certificaciones").innerHTML = estado.certificaciones.map(c => `
    <div class="cv-m39-cert">
      <div class="cv-m39-cert-titulo">${esc(c.titulo)}</div>
      <div class="cv-m39-cert-sub">${esc(c.subtitulo)}</div>
    </div>
  `).join("");

  $("#cv-m39-bloque-ref").hidden = !estado.referencias.length;
  $("#cv-m39-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m39-ref">
      <div class="cv-m39-ref-nombre">${esc(r.nombre)}</div>
      <div class="cv-m39-ref-rol">${esc(r.rol)}</div>
      ${r.email ? `<div class="cv-m39-ref-dato">${esc(r.email)}</div>` : ""}
      ${r.linkedin ? `<div class="cv-m39-ref-dato">${esc(r.linkedin)}</div>` : ""}
    </div>
  `).join("");

  $("#cv-m39-bloque-experiencia").hidden = !estado.experiencia.length;
  $("#cv-m39-experiencia").innerHTML = estado.experiencia.map(x => {
    const grupos = {};
    (x.herramientas || []).forEach(h => {
      const clave = h.etiqueta || "";
      (grupos[clave] = grupos[clave] || []).push(h.valor);
    });
    const herramientasHTML = Object.keys(grupos).length ? `
      <div class="cv-m39-job-herramientas">
        ${Object.entries(grupos).map(([etq, vals]) => `
          <span class="cv-m39-herr-grupo">${etq ? `<b>${esc(etq)}:</b> ` : ""}${vals.map(v => esc(v)).join(", ")}</span>
        `).join("")}
      </div>` : "";
    return `
      <article class="cv-m39-job">
        <div class="cv-m39-job-head">
          <div>
            <div class="cv-m39-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}</div>
            <div class="cv-m39-job-rol">${esc(x.rol)}</div>
          </div>
          <div class="cv-m39-job-fecha">${esc(x.fecha)}</div>
        </div>
        ${x.descripcion ? `<p class="cv-m39-job-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${x.bullets.length ? `<ul class="cv-m39-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
        ${herramientasHTML}
      </article>
    `;
  }).join("");

  $("#cv-m39-bloque-logros").hidden = !estado.logros.length;
  $("#cv-m39-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
}

function asegurarEsqueletoModelo40() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo40") return;
  pagina.dataset.esqueleto = "modelo40";
  pagina.innerHTML = `
    <header class="cv-m40-header">
      <div class="cv-m40-horizonte" aria-hidden="true">
        <div class="cv-m40-loma cv-m40-loma-1"></div>
        <div class="cv-m40-loma cv-m40-loma-2"></div>
      </div>
      <div class="cv-m40-foto-marco">
        <img class="cv-m40-foto" id="cv-m40-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m40-foto-placeholder" id="cv-m40-foto-placeholder">🙂</div>
      </div>
      <div class="cv-m40-header-texto">
        <h1 class="cv-m40-nombre" id="cv-m40-nombre"></h1>
        <div class="cv-m40-puesto" id="cv-m40-puesto"></div>
        <div class="cv-m40-subtitulo" id="cv-m40-subtitulo"></div>
      </div>
    </header>
    <div class="cv-m40-contacto" id="cv-m40-contacto"></div>
    <div class="cv-m40-cuerpo">
      <section id="cv-m40-bloque-perfil">
        <h2 class="cv-m40-titulo">${t('perfil')}</h2>
        <p class="cv-m40-perfil" id="cv-m40-perfil"></p>
      </section>
      <section id="cv-m40-bloque-experiencia">
        <h2 class="cv-m40-titulo">${t('experiencia')}</h2>
        <div id="cv-m40-experiencia"></div>
      </section>
      <div class="cv-m40-columnas">
        <div>
          <section id="cv-m40-bloque-educacion">
            <h2 class="cv-m40-titulo">${t('educacion')}</h2>
            <div id="cv-m40-educacion"></div>
          </section>
          <section id="cv-m40-bloque-cert">
            <h2 class="cv-m40-titulo">${t('certificaciones')}</h2>
            <div id="cv-m40-certificaciones"></div>
          </section>
          <section id="cv-m40-bloque-logros">
            <h2 class="cv-m40-titulo">${t('logros')}</h2>
            <ul class="cv-m40-logros" id="cv-m40-logros"></ul>
          </section>
        </div>
        <div>
          <section id="cv-m40-bloque-habilidades">
            <h2 class="cv-m40-titulo">${t('habilidades')}</h2>
            <div class="cv-m40-tags" id="cv-m40-habilidades"></div>
          </section>
          <section id="cv-m40-bloque-blandas">
            <h2 class="cv-m40-titulo">${t('blandas')}</h2>
            <div class="cv-m40-tags" id="cv-m40-blandas"></div>
          </section>
          <section id="cv-m40-bloque-idiomas">
            <h2 class="cv-m40-titulo">${t('idiomas')}</h2>
            <ul class="cv-m40-idiomas" id="cv-m40-idiomas"></ul>
          </section>
          <section id="cv-m40-bloque-ref">
            <h2 class="cv-m40-titulo">${t('referencias')}</h2>
            <div id="cv-m40-referencias"></div>
          </section>
        </div>
      </div>
    </div>
  `;
}

function renderModelo40() {
  asegurarEsqueletoModelo40();

  const foto = $("#cv-m40-foto"), placeholder = $("#cv-m40-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }

  $("#cv-m40-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m40-puesto").textContent = estado.puesto || "";
  $("#cv-m40-subtitulo").textContent = estado.subtitulo || "";
  $("#cv-m40-subtitulo").hidden = !estado.subtitulo;

  $("#cv-m40-contacto").innerHTML = estado.contacto.map(c => `
    <div class="cv-m40-contacto-item">
      <span class="cv-m40-contacto-ico">${iconoDe(c.tipo)}</span>
      <span>${contactoValorHTML(c)}</span>
    </div>
  `).join("");

  $("#cv-m40-bloque-perfil").hidden = !estado.perfil;
  $("#cv-m40-perfil").innerHTML = escPárrafo(estado.perfil || "");

  $("#cv-m40-bloque-habilidades").hidden = !estado.habilidades.length;
  $("#cv-m40-habilidades").innerHTML = estado.habilidades.map(h => `<span class="cv-m40-tag">${esc(h.texto)}</span>`).join("");

  $("#cv-m40-bloque-blandas").hidden = !estado.blandas.length;
  $("#cv-m40-blandas").innerHTML = estado.blandas.map(h => `<span class="cv-m40-tag cv-m40-tag-alt">${esc(h.texto)}</span>`).join("");

  $("#cv-m40-bloque-idiomas").hidden = !estado.idiomas.length;
  $("#cv-m40-idiomas").innerHTML = estado.idiomas.map(i =>
    `<li><span>${esc(i.nombre)}</span><span class="cv-m40-nivel">${esc(i.nivel)}</span></li>`).join("");

  $("#cv-m40-bloque-educacion").hidden = !estado.educacion.length;
  $("#cv-m40-educacion").innerHTML = estado.educacion.map(e => `
    <div class="cv-m40-edu">
      <div class="cv-m40-edu-inst">${esc(e.institucion)}</div>
      <div class="cv-m40-edu-fecha">${esc(e.fecha)}</div>
      ${e.bullets.length ? `<ul class="cv-m40-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");

  $("#cv-m40-bloque-cert").hidden = !estado.certificaciones.length;
  $("#cv-m40-certificaciones").innerHTML = estado.certificaciones.map(c => `
    <div class="cv-m40-cert">
      <div class="cv-m40-cert-titulo">${esc(c.titulo)}</div>
      <div class="cv-m40-cert-sub">${esc(c.subtitulo)}</div>
    </div>
  `).join("");

  $("#cv-m40-bloque-ref").hidden = !estado.referencias.length;
  $("#cv-m40-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m40-ref">
      <div class="cv-m40-ref-nombre">${esc(r.nombre)}</div>
      <div class="cv-m40-ref-rol">${esc(r.rol)}</div>
      ${r.email ? `<div class="cv-m40-ref-dato">${esc(r.email)}</div>` : ""}
      ${r.linkedin ? `<div class="cv-m40-ref-dato">${esc(r.linkedin)}</div>` : ""}
    </div>
  `).join("");

  $("#cv-m40-bloque-experiencia").hidden = !estado.experiencia.length;
  $("#cv-m40-experiencia").innerHTML = estado.experiencia.map(x => {
    const grupos = {};
    (x.herramientas || []).forEach(h => {
      const clave = h.etiqueta || "";
      (grupos[clave] = grupos[clave] || []).push(h.valor);
    });
    const herramientasHTML = Object.keys(grupos).length ? `
      <div class="cv-m40-job-herramientas">
        ${Object.entries(grupos).map(([etq, vals]) => `
          <span class="cv-m40-herr-grupo">${etq ? `<b>${esc(etq)}:</b> ` : ""}${vals.map(v => esc(v)).join(", ")}</span>
        `).join("")}
      </div>` : "";
    return `
      <article class="cv-m40-entrada">
        <div class="cv-m40-entrada-head">
          <div class="cv-m40-entrada-fecha">${esc(x.fecha)}</div>
          <div class="cv-m40-entrada-datos">
            <div class="cv-m40-entrada-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}</div>
            <div class="cv-m40-entrada-rol">${esc(x.rol)}</div>
          </div>
        </div>
        ${x.descripcion ? `<p class="cv-m40-entrada-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${x.bullets.length ? `<ul class="cv-m40-entrada-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
        ${herramientasHTML}
      </article>
    `;
  }).join("");

  $("#cv-m40-bloque-logros").hidden = !estado.logros.length;
  $("#cv-m40-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");
}

// ============================================================
/* ============================================================
   MODELOS 41-45 — gimnasio / entrenamiento personal
   ============================================================ */

// ---------------- Modelo 41 — Personal Trainer (ficha de rutina) ----------------
function asegurarEsqueletoModelo41() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo41") return;
  pagina.dataset.esqueleto = "modelo41";
  pagina.innerHTML = `
    <header class="cv-m41-header">
      <div class="cv-m41-header-fondo" aria-hidden="true"></div>
      <div class="cv-m41-foto-aro">
        <img class="cv-m41-foto" id="cv-m41-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m41-foto-placeholder" id="cv-m41-foto-placeholder">🙂</div>
      </div>
      <div class="cv-m41-header-texto">
        <h1 class="cv-m41-nombre" id="cv-m41-nombre"></h1>
        <div class="cv-m41-puesto" id="cv-m41-puesto"></div>
        <div class="cv-m41-subtitulo" id="cv-m41-subtitulo"></div>
        <div class="cv-m41-contacto" id="cv-m41-contacto"></div>
      </div>
    </header>

    <section class="cv-m41-destacados" id="cv-m41-bloque-logros">
      <div class="cv-m41-destacados-rotulo">${t('logros')}</div>
      <div class="cv-m41-destacados-grilla" id="cv-m41-logros"></div>
    </section>

    <div class="cv-m41-cuerpo">
      <main class="cv-m41-principal">
        <section id="cv-m41-bloque-perfil">
          <h2 class="cv-m41-titulo"><span class="cv-m41-titulo-barra"></span>${t('perfil')}</h2>
          <p class="cv-m41-perfil" id="cv-m41-perfil"></p>
        </section>
        <section id="cv-m41-bloque-experiencia">
          <h2 class="cv-m41-titulo"><span class="cv-m41-titulo-barra"></span>${t('experiencia')}</h2>
          <div class="cv-m41-rutina" id="cv-m41-experiencia"></div>
        </section>
        <section id="cv-m41-bloque-educacion">
          <h2 class="cv-m41-titulo"><span class="cv-m41-titulo-barra"></span>${t('educacion')}</h2>
          <div id="cv-m41-educacion"></div>
        </section>
      </main>

      <aside class="cv-m41-lateral">
        <section id="cv-m41-bloque-habilidades">
          <h3 class="cv-m41-titulo-lat">${t('habilidades')}</h3>
          <div class="cv-m41-discos" id="cv-m41-habilidades"></div>
        </section>
        <section id="cv-m41-bloque-blandas">
          <h3 class="cv-m41-titulo-lat">${t('blandas')}</h3>
          <div class="cv-m41-discos" id="cv-m41-blandas"></div>
        </section>
        <section id="cv-m41-bloque-idiomas">
          <h3 class="cv-m41-titulo-lat">${t('idiomas')}</h3>
          <ul class="cv-m41-idiomas" id="cv-m41-idiomas"></ul>
        </section>
        <section id="cv-m41-bloque-cert">
          <h3 class="cv-m41-titulo-lat">${t('certificaciones')}</h3>
          <div id="cv-m41-certificaciones"></div>
        </section>
        <section id="cv-m41-bloque-ref">
          <h3 class="cv-m41-titulo-lat">${t('referencias')}</h3>
          <div id="cv-m41-referencias"></div>
        </section>
      </aside>
    </div>
  `;
}

function renderModelo41() {
  asegurarEsqueletoModelo41();

  const foto = $("#cv-m41-foto"), ph = $("#cv-m41-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; ph.hidden = true; }
  else { foto.hidden = true; ph.hidden = false; }

  $("#cv-m41-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m41-puesto").textContent = estado.puesto || "";
  $("#cv-m41-subtitulo").textContent = estado.subtitulo || "";
  $("#cv-m41-subtitulo").hidden = !estado.subtitulo;

  $("#cv-m41-contacto").innerHTML = estado.contacto.map(c => `
    <span class="cv-m41-contacto-item">
      <span class="cv-m41-contacto-ico">${iconoDe(c.tipo)}</span>${contactoValorHTML(c)}
    </span>
  `).join("");

  $("#cv-m41-bloque-perfil").hidden = !estado.perfil;
  $("#cv-m41-perfil").innerHTML = escPárrafo(estado.perfil || "");

  // los logros arriba, como las marcas que se cuelgan en la pared del gym
  $("#cv-m41-bloque-logros").hidden = !estado.logros.length;
  $("#cv-m41-logros").innerHTML = estado.logros.map(l => `
    <div class="cv-m41-destacado"><span class="cv-m41-destacado-marca"></span>${esc(l.texto)}</div>
  `).join("");

  $("#cv-m41-bloque-habilidades").hidden = !estado.habilidades.length;
  $("#cv-m41-habilidades").innerHTML = estado.habilidades.map(h => `<span class="cv-m41-disco">${esc(h.texto)}</span>`).join("");

  $("#cv-m41-bloque-blandas").hidden = !estado.blandas.length;
  $("#cv-m41-blandas").innerHTML = estado.blandas.map(h => `<span class="cv-m41-disco cv-m41-disco-alt">${esc(h.texto)}</span>`).join("");

  $("#cv-m41-bloque-idiomas").hidden = !estado.idiomas.length;
  $("#cv-m41-idiomas").innerHTML = estado.idiomas.map(i =>
    `<li><span>${esc(i.nombre)}</span><span class="cv-m41-nivel">${esc(i.nivel)}</span></li>`).join("");

  $("#cv-m41-bloque-educacion").hidden = !estado.educacion.length;
  $("#cv-m41-educacion").innerHTML = estado.educacion.map(e => `
    <div class="cv-m41-edu">
      <div class="cv-m41-edu-head">
        <span class="cv-m41-edu-inst">${esc(e.institucion)}</span>
        <span class="cv-m41-edu-fecha">${esc(e.fecha)}</span>
      </div>
      ${e.bullets.length ? `<ul class="cv-m41-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");

  $("#cv-m41-bloque-cert").hidden = !estado.certificaciones.length;
  $("#cv-m41-certificaciones").innerHTML = estado.certificaciones.map(c => `
    <div class="cv-m41-cert">
      <div class="cv-m41-cert-titulo">${esc(c.titulo)}</div>
      <div class="cv-m41-cert-sub">${esc(c.subtitulo)}</div>
    </div>
  `).join("");

  $("#cv-m41-bloque-ref").hidden = !estado.referencias.length;
  $("#cv-m41-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m41-ref">
      <div class="cv-m41-ref-nombre">${esc(r.nombre)}</div>
      <div class="cv-m41-ref-rol">${esc(r.rol)}</div>
      ${r.email ? `<div class="cv-m41-ref-dato">${esc(r.email)}</div>` : ""}
      ${r.linkedin ? `<div class="cv-m41-ref-dato">${esc(r.linkedin)}</div>` : ""}
    </div>
  `).join("");

  // cada trabajo es un bloque de la rutina, numerado como las series
  $("#cv-m41-bloque-experiencia").hidden = !estado.experiencia.length;
  $("#cv-m41-experiencia").innerHTML = estado.experiencia.map((x, i) => {
    const grupos = {};
    (x.herramientas || []).forEach(h => {
      const clave = h.etiqueta || "";
      (grupos[clave] = grupos[clave] || []).push(h.valor);
    });
    const herramientasHTML = Object.keys(grupos).length ? `
      <div class="cv-m41-job-herr">
        ${Object.entries(grupos).map(([etq, vals]) => `
          <span class="cv-m41-herr-grupo">${etq ? `<b>${esc(etq)}:</b> ` : ""}${vals.map(v => esc(v)).join(", ")}</span>
        `).join("")}
      </div>` : "";
    return `
      <article class="cv-m41-bloque">
        <div class="cv-m41-bloque-num">${String(i + 1).padStart(2, "0")}</div>
        <div class="cv-m41-bloque-cont">
          <div class="cv-m41-job-head">
            <div class="cv-m41-job-rol">${esc(x.rol)}</div>
            <div class="cv-m41-job-meta">
              <span class="cv-m41-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}</span>
              <span class="cv-m41-job-fecha">${esc(x.fecha)}</span>
            </div>
          </div>
          ${x.descripcion ? `<p class="cv-m41-job-desc">${escPárrafo(x.descripcion)}</p>` : ""}
          ${x.bullets.length ? `<ul class="cv-m41-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
          ${herramientasHTML}
        </div>
      </article>
    `;
  }).join("");
}

// ---------------- Modelo 42 — Dorsal de competencia ----------------
function asegurarEsqueletoModelo42() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo42") return;
  pagina.dataset.esqueleto = "modelo42";
  pagina.innerHTML = `
    <header class="cv-m42-header">
      <div class="cv-m42-dorsal">
        <div class="cv-m42-dorsal-marca">BIB</div>
        <div class="cv-m42-dorsal-num" id="cv-m42-iniciales"></div>
        <div class="cv-m42-dorsal-pie" id="cv-m42-dorsal-pie"></div>
      </div>
      <div class="cv-m42-header-texto">
        <h1 class="cv-m42-nombre" id="cv-m42-nombre"></h1>
        <div class="cv-m42-puesto" id="cv-m42-puesto"></div>
        <div class="cv-m42-subtitulo" id="cv-m42-subtitulo"></div>
      </div>
      <div class="cv-m42-foto-marco">
        <img class="cv-m42-foto" id="cv-m42-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m42-foto-placeholder" id="cv-m42-foto-placeholder">🙂</div>
      </div>
    </header>
    <div class="cv-m42-meta" aria-hidden="true"></div>
    <div class="cv-m42-contacto" id="cv-m42-contacto"></div>

    <div class="cv-m42-cuerpo">
      <section id="cv-m42-bloque-perfil">
        <h2 class="cv-m42-titulo">${t('perfil')}</h2>
        <p class="cv-m42-perfil" id="cv-m42-perfil"></p>
      </section>

      <section id="cv-m42-bloque-experiencia">
        <h2 class="cv-m42-titulo">${t('experiencia')}</h2>
        <div id="cv-m42-experiencia"></div>
      </section>

      <div class="cv-m42-columnas">
        <div>
          <section id="cv-m42-bloque-educacion">
            <h2 class="cv-m42-titulo">${t('educacion')}</h2>
            <div id="cv-m42-educacion"></div>
          </section>
          <section id="cv-m42-bloque-cert">
            <h2 class="cv-m42-titulo">${t('certificaciones')}</h2>
            <div id="cv-m42-certificaciones"></div>
          </section>
        </div>
        <div>
          <section id="cv-m42-bloque-habilidades">
            <h2 class="cv-m42-titulo">${t('habilidades')}</h2>
            <div class="cv-m42-tags" id="cv-m42-habilidades"></div>
          </section>
          <section id="cv-m42-bloque-blandas">
            <h2 class="cv-m42-titulo">${t('blandas')}</h2>
            <div class="cv-m42-tags" id="cv-m42-blandas"></div>
          </section>
          <section id="cv-m42-bloque-idiomas">
            <h2 class="cv-m42-titulo">${t('idiomas')}</h2>
            <ul class="cv-m42-idiomas" id="cv-m42-idiomas"></ul>
          </section>
          <section id="cv-m42-bloque-logros">
            <h2 class="cv-m42-titulo">${t('logros')}</h2>
            <ul class="cv-m42-logros" id="cv-m42-logros"></ul>
          </section>
          <section id="cv-m42-bloque-ref">
            <h2 class="cv-m42-titulo">${t('referencias')}</h2>
            <div id="cv-m42-referencias"></div>
          </section>
        </div>
      </div>
    </div>
  `;
}

function renderModelo42() {
  asegurarEsqueletoModelo42();

  const foto = $("#cv-m42-foto"), ph = $("#cv-m42-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; ph.hidden = true; }
  else { foto.hidden = true; ph.hidden = false; }

  const nombreCompleto = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m42-nombre").textContent = nombreCompleto;
  // el "número" del dorsal son las iniciales: un dato real, no un número inventado
  const iniciales = [estado.nombre, estado.apellido]
    .map(p => (p || "").trim().charAt(0).toUpperCase())
    .filter(Boolean).join("");
  $("#cv-m42-iniciales").textContent = iniciales || "—";
  $("#cv-m42-dorsal-pie").textContent = estado.subtitulo || estado.puesto || "";

  $("#cv-m42-puesto").textContent = estado.puesto || "";
  $("#cv-m42-subtitulo").textContent = estado.subtitulo || "";
  $("#cv-m42-subtitulo").hidden = !estado.subtitulo;

  $("#cv-m42-contacto").innerHTML = estado.contacto.map(c => `
    <span class="cv-m42-contacto-item">
      <span class="cv-m42-contacto-ico">${iconoDe(c.tipo)}</span>${contactoValorHTML(c)}
    </span>
  `).join("");

  $("#cv-m42-bloque-perfil").hidden = !estado.perfil;
  $("#cv-m42-perfil").innerHTML = escPárrafo(estado.perfil || "");

  $("#cv-m42-bloque-habilidades").hidden = !estado.habilidades.length;
  $("#cv-m42-habilidades").innerHTML = estado.habilidades.map(h => `<span class="cv-m42-tag">${esc(h.texto)}</span>`).join("");

  $("#cv-m42-bloque-blandas").hidden = !estado.blandas.length;
  $("#cv-m42-blandas").innerHTML = estado.blandas.map(h => `<span class="cv-m42-tag cv-m42-tag-alt">${esc(h.texto)}</span>`).join("");

  $("#cv-m42-bloque-idiomas").hidden = !estado.idiomas.length;
  $("#cv-m42-idiomas").innerHTML = estado.idiomas.map(i =>
    `<li><span>${esc(i.nombre)}</span><span class="cv-m42-nivel">${esc(i.nivel)}</span></li>`).join("");

  $("#cv-m42-bloque-logros").hidden = !estado.logros.length;
  $("#cv-m42-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");

  $("#cv-m42-bloque-educacion").hidden = !estado.educacion.length;
  $("#cv-m42-educacion").innerHTML = estado.educacion.map(e => `
    <div class="cv-m42-edu">
      <div class="cv-m42-edu-inst">${esc(e.institucion)}</div>
      <div class="cv-m42-edu-fecha">${esc(e.fecha)}</div>
      ${e.bullets.length ? `<ul class="cv-m42-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");

  $("#cv-m42-bloque-cert").hidden = !estado.certificaciones.length;
  $("#cv-m42-certificaciones").innerHTML = estado.certificaciones.map(c => `
    <div class="cv-m42-cert">
      <div class="cv-m42-cert-titulo">${esc(c.titulo)}</div>
      <div class="cv-m42-cert-sub">${esc(c.subtitulo)}</div>
    </div>
  `).join("");

  $("#cv-m42-bloque-ref").hidden = !estado.referencias.length;
  $("#cv-m42-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m42-ref">
      <div class="cv-m42-ref-nombre">${esc(r.nombre)}</div>
      <div class="cv-m42-ref-rol">${esc(r.rol)}</div>
      ${r.email ? `<div class="cv-m42-ref-dato">${esc(r.email)}</div>` : ""}
      ${r.linkedin ? `<div class="cv-m42-ref-dato">${esc(r.linkedin)}</div>` : ""}
    </div>
  `).join("");

  $("#cv-m42-bloque-experiencia").hidden = !estado.experiencia.length;
  $("#cv-m42-experiencia").innerHTML = estado.experiencia.map(x => {
    const grupos = {};
    (x.herramientas || []).forEach(h => {
      const clave = h.etiqueta || "";
      (grupos[clave] = grupos[clave] || []).push(h.valor);
    });
    const herramientasHTML = Object.keys(grupos).length ? `
      <div class="cv-m42-job-herr">
        ${Object.entries(grupos).map(([etq, vals]) => `
          <span class="cv-m42-herr-grupo">${etq ? `<b>${esc(etq)}:</b> ` : ""}${vals.map(v => esc(v)).join(", ")}</span>
        `).join("")}
      </div>` : "";
    return `
      <article class="cv-m42-vuelta">
        <div class="cv-m42-job-head">
          <div class="cv-m42-job-rol">${esc(x.rol)}</div>
          <div class="cv-m42-job-fecha">${esc(x.fecha)}</div>
        </div>
        <div class="cv-m42-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}</div>
        ${x.descripcion ? `<p class="cv-m42-job-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${x.bullets.length ? `<ul class="cv-m42-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
        ${herramientasHTML}
      </article>
    `;
  }).join("");
}

// ---------------- Modelo 43 — Panel de métricas (app de fitness) ----------------
function asegurarEsqueletoModelo43() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo43") return;
  pagina.dataset.esqueleto = "modelo43";
  pagina.innerHTML = `
    <header class="cv-m43-header">
      <div class="cv-m43-anillos" aria-hidden="true">
        <span class="cv-m43-anillo cv-m43-anillo-1"></span>
        <span class="cv-m43-anillo cv-m43-anillo-2"></span>
      </div>
      <div class="cv-m43-foto-marco">
        <img class="cv-m43-foto" id="cv-m43-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m43-foto-placeholder" id="cv-m43-foto-placeholder">🙂</div>
      </div>
      <div class="cv-m43-header-texto">
        <h1 class="cv-m43-nombre" id="cv-m43-nombre"></h1>
        <div class="cv-m43-puesto" id="cv-m43-puesto"></div>
        <div class="cv-m43-subtitulo" id="cv-m43-subtitulo"></div>
      </div>
      <div class="cv-m43-contacto" id="cv-m43-contacto"></div>
    </header>

    <div class="cv-m43-cuerpo">
      <section class="cv-m43-tarjeta cv-m43-ancha" id="cv-m43-bloque-perfil">
        <div class="cv-m43-tarjeta-rotulo">${t('perfil')}</div>
        <p class="cv-m43-perfil" id="cv-m43-perfil"></p>
      </section>

      <section class="cv-m43-tarjeta cv-m43-ancha" id="cv-m43-bloque-experiencia">
        <div class="cv-m43-tarjeta-rotulo">${t('experiencia')}</div>
        <div id="cv-m43-experiencia"></div>
      </section>

      <section class="cv-m43-tarjeta" id="cv-m43-bloque-habilidades">
        <div class="cv-m43-tarjeta-rotulo">${t('habilidades')}</div>
        <div class="cv-m43-chips" id="cv-m43-habilidades"></div>
      </section>

      <section class="cv-m43-tarjeta" id="cv-m43-bloque-blandas">
        <div class="cv-m43-tarjeta-rotulo">${t('blandas')}</div>
        <div class="cv-m43-chips" id="cv-m43-blandas"></div>
      </section>

      <section class="cv-m43-tarjeta" id="cv-m43-bloque-educacion">
        <div class="cv-m43-tarjeta-rotulo">${t('educacion')}</div>
        <div id="cv-m43-educacion"></div>
      </section>

      <section class="cv-m43-tarjeta" id="cv-m43-bloque-cert">
        <div class="cv-m43-tarjeta-rotulo">${t('certificaciones')}</div>
        <div id="cv-m43-certificaciones"></div>
      </section>

      <section class="cv-m43-tarjeta" id="cv-m43-bloque-idiomas">
        <div class="cv-m43-tarjeta-rotulo">${t('idiomas')}</div>
        <ul class="cv-m43-idiomas" id="cv-m43-idiomas"></ul>
      </section>

      <section class="cv-m43-tarjeta" id="cv-m43-bloque-logros">
        <div class="cv-m43-tarjeta-rotulo">${t('logros')}</div>
        <ul class="cv-m43-logros" id="cv-m43-logros"></ul>
      </section>

      <section class="cv-m43-tarjeta cv-m43-ancha" id="cv-m43-bloque-ref">
        <div class="cv-m43-tarjeta-rotulo">${t('referencias')}</div>
        <div class="cv-m43-refs" id="cv-m43-referencias"></div>
      </section>
    </div>
  `;
}

function renderModelo43() {
  asegurarEsqueletoModelo43();

  const foto = $("#cv-m43-foto"), ph = $("#cv-m43-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; ph.hidden = true; }
  else { foto.hidden = true; ph.hidden = false; }

  $("#cv-m43-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m43-puesto").textContent = estado.puesto || "";
  $("#cv-m43-subtitulo").textContent = estado.subtitulo || "";
  $("#cv-m43-subtitulo").hidden = !estado.subtitulo;

  $("#cv-m43-contacto").innerHTML = estado.contacto.map(c => `
    <span class="cv-m43-contacto-item">
      <span class="cv-m43-contacto-ico">${iconoDe(c.tipo)}</span>${contactoValorHTML(c)}
    </span>
  `).join("");

  $("#cv-m43-bloque-perfil").hidden = !estado.perfil;
  $("#cv-m43-perfil").innerHTML = escPárrafo(estado.perfil || "");

  $("#cv-m43-bloque-habilidades").hidden = !estado.habilidades.length;
  $("#cv-m43-habilidades").innerHTML = estado.habilidades.map(h => `<span class="cv-m43-chip">${esc(h.texto)}</span>`).join("");

  $("#cv-m43-bloque-blandas").hidden = !estado.blandas.length;
  $("#cv-m43-blandas").innerHTML = estado.blandas.map(h => `<span class="cv-m43-chip cv-m43-chip-alt">${esc(h.texto)}</span>`).join("");

  $("#cv-m43-bloque-idiomas").hidden = !estado.idiomas.length;
  $("#cv-m43-idiomas").innerHTML = estado.idiomas.map(i =>
    `<li><span>${esc(i.nombre)}</span><span class="cv-m43-nivel">${esc(i.nivel)}</span></li>`).join("");

  $("#cv-m43-bloque-logros").hidden = !estado.logros.length;
  $("#cv-m43-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");

  $("#cv-m43-bloque-educacion").hidden = !estado.educacion.length;
  $("#cv-m43-educacion").innerHTML = estado.educacion.map(e => `
    <div class="cv-m43-edu">
      <div class="cv-m43-edu-inst">${esc(e.institucion)}</div>
      <div class="cv-m43-edu-fecha">${esc(e.fecha)}</div>
      ${e.bullets.length ? `<ul class="cv-m43-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");

  $("#cv-m43-bloque-cert").hidden = !estado.certificaciones.length;
  $("#cv-m43-certificaciones").innerHTML = estado.certificaciones.map(c => `
    <div class="cv-m43-cert">
      <div class="cv-m43-cert-titulo">${esc(c.titulo)}</div>
      <div class="cv-m43-cert-sub">${esc(c.subtitulo)}</div>
    </div>
  `).join("");

  $("#cv-m43-bloque-ref").hidden = !estado.referencias.length;
  $("#cv-m43-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m43-ref">
      <div class="cv-m43-ref-nombre">${esc(r.nombre)}</div>
      <div class="cv-m43-ref-rol">${esc(r.rol)}</div>
      ${r.email ? `<div class="cv-m43-ref-dato">${esc(r.email)}</div>` : ""}
      ${r.linkedin ? `<div class="cv-m43-ref-dato">${esc(r.linkedin)}</div>` : ""}
    </div>
  `).join("");

  $("#cv-m43-bloque-experiencia").hidden = !estado.experiencia.length;
  $("#cv-m43-experiencia").innerHTML = estado.experiencia.map(x => {
    const grupos = {};
    (x.herramientas || []).forEach(h => {
      const clave = h.etiqueta || "";
      (grupos[clave] = grupos[clave] || []).push(h.valor);
    });
    const herramientasHTML = Object.keys(grupos).length ? `
      <div class="cv-m43-job-herr">
        ${Object.entries(grupos).map(([etq, vals]) => `
          <span class="cv-m43-herr-grupo">${etq ? `<b>${esc(etq)}:</b> ` : ""}${vals.map(v => esc(v)).join(", ")}</span>
        `).join("")}
      </div>` : "";
    return `
      <article class="cv-m43-sesion">
        <div class="cv-m43-job-head">
          <div class="cv-m43-job-rol">${esc(x.rol)}</div>
          <div class="cv-m43-job-pill">${esc(x.fecha)}</div>
        </div>
        <div class="cv-m43-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}</div>
        ${x.descripcion ? `<p class="cv-m43-job-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${x.bullets.length ? `<ul class="cv-m43-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
        ${herramientasHTML}
      </article>
    `;
  }).join("");
}

// ---------------- Modelo 44 — Sala de hierro (discos y placas) ----------------
function asegurarEsqueletoModelo44() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo44") return;
  pagina.dataset.esqueleto = "modelo44";
  pagina.innerHTML = `
    <header class="cv-m44-header">
      <div class="cv-m44-barra" aria-hidden="true">
        <span class="cv-m44-disco-deco cv-m44-disco-izq"></span>
        <span class="cv-m44-eje"></span>
        <span class="cv-m44-disco-deco cv-m44-disco-der"></span>
      </div>
      <div class="cv-m44-placa">
        <h1 class="cv-m44-nombre" id="cv-m44-nombre"></h1>
        <div class="cv-m44-puesto" id="cv-m44-puesto"></div>
        <div class="cv-m44-subtitulo" id="cv-m44-subtitulo"></div>
      </div>
      <div class="cv-m44-foto-marco">
        <img class="cv-m44-foto" id="cv-m44-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m44-foto-placeholder" id="cv-m44-foto-placeholder">🙂</div>
      </div>
    </header>
    <div class="cv-m44-contacto" id="cv-m44-contacto"></div>

    <div class="cv-m44-cuerpo">
      <section id="cv-m44-bloque-perfil">
        <h2 class="cv-m44-titulo">${t('perfil')}</h2>
        <p class="cv-m44-perfil" id="cv-m44-perfil"></p>
      </section>

      <section id="cv-m44-bloque-habilidades">
        <h2 class="cv-m44-titulo">${t('habilidades')}</h2>
        <div class="cv-m44-rack" id="cv-m44-habilidades"></div>
      </section>

      <section id="cv-m44-bloque-experiencia">
        <h2 class="cv-m44-titulo">${t('experiencia')}</h2>
        <div id="cv-m44-experiencia"></div>
      </section>

      <div class="cv-m44-columnas">
        <div>
          <section id="cv-m44-bloque-educacion">
            <h2 class="cv-m44-titulo">${t('educacion')}</h2>
            <div id="cv-m44-educacion"></div>
          </section>
          <section id="cv-m44-bloque-cert">
            <h2 class="cv-m44-titulo">${t('certificaciones')}</h2>
            <div id="cv-m44-certificaciones"></div>
          </section>
        </div>
        <div>
          <section id="cv-m44-bloque-blandas">
            <h2 class="cv-m44-titulo">${t('blandas')}</h2>
            <div class="cv-m44-rack" id="cv-m44-blandas"></div>
          </section>
          <section id="cv-m44-bloque-idiomas">
            <h2 class="cv-m44-titulo">${t('idiomas')}</h2>
            <ul class="cv-m44-idiomas" id="cv-m44-idiomas"></ul>
          </section>
          <section id="cv-m44-bloque-logros">
            <h2 class="cv-m44-titulo">${t('logros')}</h2>
            <ul class="cv-m44-logros" id="cv-m44-logros"></ul>
          </section>
          <section id="cv-m44-bloque-ref">
            <h2 class="cv-m44-titulo">${t('referencias')}</h2>
            <div id="cv-m44-referencias"></div>
          </section>
        </div>
      </div>
    </div>
  `;
}

function renderModelo44() {
  asegurarEsqueletoModelo44();

  const foto = $("#cv-m44-foto"), ph = $("#cv-m44-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; ph.hidden = true; }
  else { foto.hidden = true; ph.hidden = false; }

  $("#cv-m44-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m44-puesto").textContent = estado.puesto || "";
  $("#cv-m44-subtitulo").textContent = estado.subtitulo || "";
  $("#cv-m44-subtitulo").hidden = !estado.subtitulo;

  $("#cv-m44-contacto").innerHTML = estado.contacto.map(c => `
    <span class="cv-m44-contacto-item">
      <span class="cv-m44-contacto-ico">${iconoDe(c.tipo)}</span>${contactoValorHTML(c)}
    </span>
  `).join("");

  $("#cv-m44-bloque-perfil").hidden = !estado.perfil;
  $("#cv-m44-perfil").innerHTML = escPárrafo(estado.perfil || "");

  // cada skill es un disco del rack; el tamaño lo da el largo del texto,
  // no un "nivel" que nadie cargó
  $("#cv-m44-bloque-habilidades").hidden = !estado.habilidades.length;
  $("#cv-m44-habilidades").innerHTML = estado.habilidades.map(h => `
    <span class="cv-m44-placa-skill"><span class="cv-m44-placa-hueco"></span>${esc(h.texto)}</span>
  `).join("");

  $("#cv-m44-bloque-blandas").hidden = !estado.blandas.length;
  $("#cv-m44-blandas").innerHTML = estado.blandas.map(h => `
    <span class="cv-m44-placa-skill cv-m44-placa-alt"><span class="cv-m44-placa-hueco"></span>${esc(h.texto)}</span>
  `).join("");

  $("#cv-m44-bloque-idiomas").hidden = !estado.idiomas.length;
  $("#cv-m44-idiomas").innerHTML = estado.idiomas.map(i =>
    `<li><span>${esc(i.nombre)}</span><span class="cv-m44-nivel">${esc(i.nivel)}</span></li>`).join("");

  $("#cv-m44-bloque-logros").hidden = !estado.logros.length;
  $("#cv-m44-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");

  $("#cv-m44-bloque-educacion").hidden = !estado.educacion.length;
  $("#cv-m44-educacion").innerHTML = estado.educacion.map(e => `
    <div class="cv-m44-edu">
      <div class="cv-m44-edu-inst">${esc(e.institucion)}</div>
      <div class="cv-m44-edu-fecha">${esc(e.fecha)}</div>
      ${e.bullets.length ? `<ul class="cv-m44-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");

  $("#cv-m44-bloque-cert").hidden = !estado.certificaciones.length;
  $("#cv-m44-certificaciones").innerHTML = estado.certificaciones.map(c => `
    <div class="cv-m44-cert">
      <div class="cv-m44-cert-titulo">${esc(c.titulo)}</div>
      <div class="cv-m44-cert-sub">${esc(c.subtitulo)}</div>
    </div>
  `).join("");

  $("#cv-m44-bloque-ref").hidden = !estado.referencias.length;
  $("#cv-m44-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m44-ref">
      <div class="cv-m44-ref-nombre">${esc(r.nombre)}</div>
      <div class="cv-m44-ref-rol">${esc(r.rol)}</div>
      ${r.email ? `<div class="cv-m44-ref-dato">${esc(r.email)}</div>` : ""}
      ${r.linkedin ? `<div class="cv-m44-ref-dato">${esc(r.linkedin)}</div>` : ""}
    </div>
  `).join("");

  $("#cv-m44-bloque-experiencia").hidden = !estado.experiencia.length;
  $("#cv-m44-experiencia").innerHTML = estado.experiencia.map(x => {
    const grupos = {};
    (x.herramientas || []).forEach(h => {
      const clave = h.etiqueta || "";
      (grupos[clave] = grupos[clave] || []).push(h.valor);
    });
    const herramientasHTML = Object.keys(grupos).length ? `
      <div class="cv-m44-job-herr">
        ${Object.entries(grupos).map(([etq, vals]) => `
          <span class="cv-m44-herr-grupo">${etq ? `<b>${esc(etq)}:</b> ` : ""}${vals.map(v => esc(v)).join(", ")}</span>
        `).join("")}
      </div>` : "";
    return `
      <article class="cv-m44-serie">
        <div class="cv-m44-job-head">
          <div>
            <div class="cv-m44-job-rol">${esc(x.rol)}</div>
            <div class="cv-m44-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}</div>
          </div>
          <div class="cv-m44-job-fecha">${esc(x.fecha)}</div>
        </div>
        ${x.descripcion ? `<p class="cv-m44-job-desc">${escPárrafo(x.descripcion)}</p>` : ""}
        ${x.bullets.length ? `<ul class="cv-m44-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
        ${herramientasHTML}
      </article>
    `;
  }).join("");
}

// ---------------- Modelo 45 — Pizarra de clases (bootcamp) ----------------
function asegurarEsqueletoModelo45() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "modelo45") return;
  pagina.dataset.esqueleto = "modelo45";
  pagina.innerHTML = `
    <header class="cv-m45-header">
      <div class="cv-m45-header-izq">
        <div class="cv-m45-rotulo">Coach</div>
        <h1 class="cv-m45-nombre" id="cv-m45-nombre"></h1>
        <div class="cv-m45-puesto" id="cv-m45-puesto"></div>
        <div class="cv-m45-subtitulo" id="cv-m45-subtitulo"></div>
      </div>
      <div class="cv-m45-foto-marco">
        <img class="cv-m45-foto" id="cv-m45-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-m45-foto-placeholder" id="cv-m45-foto-placeholder">🙂</div>
      </div>
    </header>
    <div class="cv-m45-tiza" aria-hidden="true"></div>
    <div class="cv-m45-contacto" id="cv-m45-contacto"></div>

    <div class="cv-m45-cuerpo">
      <section class="cv-m45-panel" id="cv-m45-bloque-perfil">
        <div class="cv-m45-panel-tab">${t('perfil')}</div>
        <p class="cv-m45-perfil" id="cv-m45-perfil"></p>
      </section>

      <section class="cv-m45-panel" id="cv-m45-bloque-experiencia">
        <div class="cv-m45-panel-tab">${t('experiencia')}</div>
        <div class="cv-m45-agenda" id="cv-m45-experiencia"></div>
      </section>

      <div class="cv-m45-columnas">
        <section class="cv-m45-panel" id="cv-m45-bloque-habilidades">
          <div class="cv-m45-panel-tab">${t('habilidades')}</div>
          <div class="cv-m45-clases" id="cv-m45-habilidades"></div>
        </section>
        <section class="cv-m45-panel" id="cv-m45-bloque-blandas">
          <div class="cv-m45-panel-tab">${t('blandas')}</div>
          <div class="cv-m45-clases" id="cv-m45-blandas"></div>
        </section>
        <section class="cv-m45-panel" id="cv-m45-bloque-educacion">
          <div class="cv-m45-panel-tab">${t('educacion')}</div>
          <div id="cv-m45-educacion"></div>
        </section>
        <section class="cv-m45-panel" id="cv-m45-bloque-cert">
          <div class="cv-m45-panel-tab">${t('certificaciones')}</div>
          <div id="cv-m45-certificaciones"></div>
        </section>
        <section class="cv-m45-panel" id="cv-m45-bloque-idiomas">
          <div class="cv-m45-panel-tab">${t('idiomas')}</div>
          <ul class="cv-m45-idiomas" id="cv-m45-idiomas"></ul>
        </section>
        <section class="cv-m45-panel" id="cv-m45-bloque-logros">
          <div class="cv-m45-panel-tab">${t('logros')}</div>
          <ul class="cv-m45-logros" id="cv-m45-logros"></ul>
        </section>
        <section class="cv-m45-panel cv-m45-panel-ancho" id="cv-m45-bloque-ref">
          <div class="cv-m45-panel-tab">${t('referencias')}</div>
          <div class="cv-m45-refs" id="cv-m45-referencias"></div>
        </section>
      </div>
    </div>
  `;
}

function renderModelo45() {
  asegurarEsqueletoModelo45();

  const foto = $("#cv-m45-foto"), ph = $("#cv-m45-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; ph.hidden = true; }
  else { foto.hidden = true; ph.hidden = false; }

  $("#cv-m45-nombre").textContent = `${estado.nombre} ${estado.apellido}`.trim();
  $("#cv-m45-puesto").textContent = estado.puesto || "";
  $("#cv-m45-subtitulo").textContent = estado.subtitulo || "";
  $("#cv-m45-subtitulo").hidden = !estado.subtitulo;

  $("#cv-m45-contacto").innerHTML = estado.contacto.map(c => `
    <span class="cv-m45-contacto-item">
      <span class="cv-m45-contacto-ico">${iconoDe(c.tipo)}</span>${contactoValorHTML(c)}
    </span>
  `).join("");

  $("#cv-m45-bloque-perfil").hidden = !estado.perfil;
  $("#cv-m45-perfil").innerHTML = escPárrafo(estado.perfil || "");

  $("#cv-m45-bloque-habilidades").hidden = !estado.habilidades.length;
  $("#cv-m45-habilidades").innerHTML = estado.habilidades.map(h => `<span class="cv-m45-clase">${esc(h.texto)}</span>`).join("");

  $("#cv-m45-bloque-blandas").hidden = !estado.blandas.length;
  $("#cv-m45-blandas").innerHTML = estado.blandas.map(h => `<span class="cv-m45-clase cv-m45-clase-alt">${esc(h.texto)}</span>`).join("");

  $("#cv-m45-bloque-idiomas").hidden = !estado.idiomas.length;
  $("#cv-m45-idiomas").innerHTML = estado.idiomas.map(i =>
    `<li><span>${esc(i.nombre)}</span><span class="cv-m45-nivel">${esc(i.nivel)}</span></li>`).join("");

  $("#cv-m45-bloque-logros").hidden = !estado.logros.length;
  $("#cv-m45-logros").innerHTML = estado.logros.map(l => `<li>${esc(l.texto)}</li>`).join("");

  $("#cv-m45-bloque-educacion").hidden = !estado.educacion.length;
  $("#cv-m45-educacion").innerHTML = estado.educacion.map(e => `
    <div class="cv-m45-edu">
      <div class="cv-m45-edu-inst">${esc(e.institucion)}</div>
      <div class="cv-m45-edu-fecha">${esc(e.fecha)}</div>
      ${e.bullets.length ? `<ul class="cv-m45-edu-bullets">${e.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
    </div>
  `).join("");

  $("#cv-m45-bloque-cert").hidden = !estado.certificaciones.length;
  $("#cv-m45-certificaciones").innerHTML = estado.certificaciones.map(c => `
    <div class="cv-m45-cert">
      <div class="cv-m45-cert-titulo">${esc(c.titulo)}</div>
      <div class="cv-m45-cert-sub">${esc(c.subtitulo)}</div>
    </div>
  `).join("");

  $("#cv-m45-bloque-ref").hidden = !estado.referencias.length;
  $("#cv-m45-referencias").innerHTML = estado.referencias.map(r => `
    <div class="cv-m45-ref">
      <div class="cv-m45-ref-nombre">${esc(r.nombre)}</div>
      <div class="cv-m45-ref-rol">${esc(r.rol)}</div>
      ${r.email ? `<div class="cv-m45-ref-dato">${esc(r.email)}</div>` : ""}
      ${r.linkedin ? `<div class="cv-m45-ref-dato">${esc(r.linkedin)}</div>` : ""}
    </div>
  `).join("");

  $("#cv-m45-bloque-experiencia").hidden = !estado.experiencia.length;
  $("#cv-m45-experiencia").innerHTML = estado.experiencia.map(x => {
    const grupos = {};
    (x.herramientas || []).forEach(h => {
      const clave = h.etiqueta || "";
      (grupos[clave] = grupos[clave] || []).push(h.valor);
    });
    const herramientasHTML = Object.keys(grupos).length ? `
      <div class="cv-m45-job-herr">
        ${Object.entries(grupos).map(([etq, vals]) => `
          <span class="cv-m45-herr-grupo">${etq ? `<b>${esc(etq)}:</b> ` : ""}${vals.map(v => esc(v)).join(", ")}</span>
        `).join("")}
      </div>` : "";
    return `
      <article class="cv-m45-turno">
        <div class="cv-m45-turno-hora">${esc(x.fecha)}</div>
        <div class="cv-m45-turno-cont">
          <div class="cv-m45-job-head">
            <div class="cv-m45-job-rol">${esc(x.rol)}</div>
            <div class="cv-m45-job-empresa">${enlaceSiHay(x.empresa, x.empresaUrl, "cv-enlace-empresa") + ubicacionSufijo(x)}</div>
          </div>
          ${x.descripcion ? `<p class="cv-m45-job-desc">${escPárrafo(x.descripcion)}</p>` : ""}
          ${x.bullets.length ? `<ul class="cv-m45-job-bullets">${x.bullets.map(b => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
          ${herramientasHTML}
        </div>
      </article>
    `;
  }).join("");
}

// CARTAS DE PRESENTACIÓN — 6 modelos, misma lógica de esqueleto+render
// que los CV (ver comentario de asegurarEsqueletoModelo1 más arriba).
// Reusan nombre/apellido/puesto/foto/contacto de `estado` y sólo agregan
// los campos propios de `estado.carta`.
// ============================================================

// ---- Carta 1 — Clásica: carta comercial de toda la vida, remitente
// arriba a la izquierda, fecha, destinatario, cuerpo justificado. ----
function asegurarEsqueletoCarta1() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "carta1") return;
  pagina.dataset.esqueleto = "carta1";
  pagina.innerHTML = `
    <div class="cv-carta cv-carta1">
      <header class="cv-carta1-remitente">
        <h1 class="cv-carta1-nombre"><span id="cv-c1-nombre"></span> <span id="cv-c1-apellido"></span></h1>
        <p class="cv-carta1-puesto" id="cv-c1-puesto"></p>
        <p class="cv-carta1-contacto" id="cv-c1-contacto"></p>
      </header>
      <p class="cv-carta1-fecha" id="cv-c1-fecha"></p>
      <div class="cv-carta1-destinatario" id="cv-c1-destinatario"></div>
      <p class="cv-carta1-saludo" id="cv-c1-saludo"></p>
      <div class="cv-carta1-cuerpo" id="cv-c1-cuerpo"></div>
      <p class="cv-carta1-despedida" id="cv-c1-despedida"></p>
      <p class="cv-carta1-firma" id="cv-c1-firma"></p>
    </div>
  `;
}
function renderCarta1() {
  asegurarEsqueletoCarta1();
  const c = estado.carta;
  $("#cv-c1-nombre").textContent = estado.nombre || "";
  $("#cv-c1-apellido").textContent = estado.apellido || "";
  $("#cv-c1-puesto").textContent = estado.puesto || "";
  $("#cv-c1-contacto").innerHTML = contactoLineaCarta();
  $("#cv-c1-fecha").textContent = fechaCartaFormateada();
  $("#cv-c1-destinatario").innerHTML = [
    c.destinatario ? esc(c.destinatario) : "",
    c.empresaDestino ? esc(c.empresaDestino) : "",
    c.puestoDestino ? `Re: ${esc(c.puestoDestino)}` : "",
  ].filter(Boolean).map((l) => `<span>${l}</span>`).join("");
  $("#cv-c1-saludo").textContent = c.saludo || "";
  $("#cv-c1-cuerpo").innerHTML = escPárrafo(c.cuerpo || "").split("<br><br>").map((p) => `<p>${p}</p>`).join("");
  $("#cv-c1-despedida").textContent = c.despedida || "";
  $("#cv-c1-firma").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
}

// ---- Carta 2 — A juego con el CV: franja lateral oscura con
// nombre/foto/contacto, igual que el Modelo 1, carta a la derecha. ----
function asegurarEsqueletoCarta2() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "carta2") return;
  pagina.dataset.esqueleto = "carta2";
  pagina.innerHTML = `
    <div class="cv-carta2-lateral" id="cv-c2-lateral">
      <div class="cv-foto-marco">
        <img class="cv-foto" id="cv-c2-foto" src="" alt="Foto de perfil" hidden>
        <div class="cv-foto-placeholder" id="cv-c2-foto-placeholder">🙂</div>
      </div>
      <h1 class="cv-carta2-nombre"><span id="cv-c2-nombre"></span><br><span id="cv-c2-apellido"></span></h1>
      <p class="cv-carta2-puesto" id="cv-c2-puesto"></p>
      <div class="cv-carta2-contacto" id="cv-c2-contacto"></div>
    </div>
    <div class="cv-carta2-principal">
      <p class="cv-carta2-fecha" id="cv-c2-fecha"></p>
      <div class="cv-carta2-destinatario" id="cv-c2-destinatario"></div>
      <p class="cv-carta2-saludo" id="cv-c2-saludo"></p>
      <div class="cv-carta2-cuerpo" id="cv-c2-cuerpo"></div>
      <p class="cv-carta2-despedida" id="cv-c2-despedida"></p>
      <p class="cv-carta2-firma" id="cv-c2-firma"></p>
    </div>
  `;
}
function renderCarta2() {
  asegurarEsqueletoCarta2();
  const c = estado.carta;
  $("#cv-c2-nombre").textContent = estado.nombre || "";
  $("#cv-c2-apellido").textContent = estado.apellido || "";
  $("#cv-c2-puesto").textContent = estado.puesto || "";
  $("#cv-c2-contacto").innerHTML = estado.contacto.map((x) =>
    `<div class="cv-carta2-contacto-fila"><span class="cv-contacto-icono">${iconoDe(x.tipo)}</span><span>${contactoValorHTML(x)}</span></div>`
  ).join("");
  const foto = $("#cv-c2-foto"), placeholder = $("#cv-c2-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; placeholder.hidden = true; }
  else { foto.hidden = true; placeholder.hidden = false; }
  $("#cv-c2-fecha").textContent = fechaCartaFormateada();
  $("#cv-c2-destinatario").innerHTML = [
    c.destinatario ? esc(c.destinatario) : "",
    c.empresaDestino ? esc(c.empresaDestino) : "",
    c.puestoDestino ? `Re: ${esc(c.puestoDestino)}` : "",
  ].filter(Boolean).map((l) => `<span>${l}</span>`).join("");
  $("#cv-c2-saludo").textContent = c.saludo || "";
  $("#cv-c2-cuerpo").innerHTML = escPárrafo(c.cuerpo || "").split("<br><br>").map((p) => `<p>${p}</p>`).join("");
  $("#cv-c2-despedida").textContent = c.despedida || "";
  $("#cv-c2-firma").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
}

// ---- Carta 3 — Encabezado moderno: banner de color sólido arriba con
// nombre+contacto, cuerpo abajo sobre blanco. ----
function asegurarEsqueletoCarta3() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "carta3") return;
  pagina.dataset.esqueleto = "carta3";
  pagina.innerHTML = `
    <div class="cv-carta cv-carta3">
      <header class="cv-carta3-banner">
        <h1 class="cv-carta3-nombre"><span id="cv-c3-nombre"></span> <span id="cv-c3-apellido"></span></h1>
        <p class="cv-carta3-puesto" id="cv-c3-puesto"></p>
        <p class="cv-carta3-contacto" id="cv-c3-contacto"></p>
      </header>
      <div class="cv-carta3-cuerpo-envoltorio">
        <p class="cv-carta3-fecha" id="cv-c3-fecha"></p>
        <div class="cv-carta3-destinatario" id="cv-c3-destinatario"></div>
        <p class="cv-carta3-saludo" id="cv-c3-saludo"></p>
        <div class="cv-carta3-cuerpo" id="cv-c3-cuerpo"></div>
        <p class="cv-carta3-despedida" id="cv-c3-despedida"></p>
        <p class="cv-carta3-firma" id="cv-c3-firma"></p>
      </div>
    </div>
  `;
}
function renderCarta3() {
  asegurarEsqueletoCarta3();
  const c = estado.carta;
  $("#cv-c3-nombre").textContent = estado.nombre || "";
  $("#cv-c3-apellido").textContent = estado.apellido || "";
  $("#cv-c3-puesto").textContent = estado.puesto || "";
  $("#cv-c3-contacto").innerHTML = contactoLineaCarta();
  $("#cv-c3-fecha").textContent = fechaCartaFormateada();
  $("#cv-c3-destinatario").innerHTML = [
    c.destinatario ? esc(c.destinatario) : "",
    c.empresaDestino ? esc(c.empresaDestino) : "",
    c.puestoDestino ? `Re: ${esc(c.puestoDestino)}` : "",
  ].filter(Boolean).map((l) => `<span>${l}</span>`).join("");
  $("#cv-c3-saludo").textContent = c.saludo || "";
  $("#cv-c3-cuerpo").innerHTML = escPárrafo(c.cuerpo || "").split("<br><br>").map((p) => `<p>${p}</p>`).join("");
  $("#cv-c3-despedida").textContent = c.despedida || "";
  $("#cv-c3-firma").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
}

// ---- Carta 4 — Minimalista: mucho blanco, nombre chico en mayúsculas
// espaciadas, una línea fina, todo alineado a la izquierda. ----
function asegurarEsqueletoCarta4() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "carta4") return;
  pagina.dataset.esqueleto = "carta4";
  pagina.innerHTML = `
    <div class="cv-carta cv-carta4">
      <header class="cv-carta4-header">
        <p class="cv-carta4-nombre" id="cv-c4-nombre"></p>
        <p class="cv-carta4-contacto" id="cv-c4-contacto"></p>
      </header>
      <p class="cv-carta4-fecha" id="cv-c4-fecha"></p>
      <div class="cv-carta4-destinatario" id="cv-c4-destinatario"></div>
      <p class="cv-carta4-saludo" id="cv-c4-saludo"></p>
      <div class="cv-carta4-cuerpo" id="cv-c4-cuerpo"></div>
      <p class="cv-carta4-despedida" id="cv-c4-despedida"></p>
      <p class="cv-carta4-firma" id="cv-c4-firma"></p>
    </div>
  `;
}
function renderCarta4() {
  asegurarEsqueletoCarta4();
  const c = estado.carta;
  $("#cv-c4-nombre").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
  $("#cv-c4-contacto").innerHTML = contactoLineaCarta();
  $("#cv-c4-fecha").textContent = fechaCartaFormateada();
  $("#cv-c4-destinatario").innerHTML = [
    c.destinatario ? esc(c.destinatario) : "",
    c.empresaDestino ? esc(c.empresaDestino) : "",
    c.puestoDestino ? `Re: ${esc(c.puestoDestino)}` : "",
  ].filter(Boolean).map((l) => `<span>${l}</span>`).join("");
  $("#cv-c4-saludo").textContent = c.saludo || "";
  $("#cv-c4-cuerpo").innerHTML = escPárrafo(c.cuerpo || "").split("<br><br>").map((p) => `<p>${p}</p>`).join("");
  $("#cv-c4-despedida").textContent = c.despedida || "";
  $("#cv-c4-firma").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
}

// ---- Carta 5 — Editorial: masthead tipo revista, nombre grande serif,
// columna de cuerpo angosta con letra capital en el primer párrafo. ----
function asegurarEsqueletoCarta5() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "carta5") return;
  pagina.dataset.esqueleto = "carta5";
  pagina.innerHTML = `
    <div class="cv-carta cv-carta5">
      <header class="cv-carta5-masthead">
        <h1 class="cv-carta5-nombre"><span id="cv-c5-nombre"></span> <span id="cv-c5-apellido"></span></h1>
        <div class="cv-carta5-linea"></div>
        <p class="cv-carta5-puesto" id="cv-c5-puesto"></p>
        <p class="cv-carta5-contacto" id="cv-c5-contacto"></p>
      </header>
      <p class="cv-carta5-fecha" id="cv-c5-fecha"></p>
      <div class="cv-carta5-destinatario" id="cv-c5-destinatario"></div>
      <p class="cv-carta5-saludo" id="cv-c5-saludo"></p>
      <div class="cv-carta5-cuerpo" id="cv-c5-cuerpo"></div>
      <p class="cv-carta5-despedida" id="cv-c5-despedida"></p>
      <p class="cv-carta5-firma" id="cv-c5-firma"></p>
    </div>
  `;
}
function renderCarta5() {
  asegurarEsqueletoCarta5();
  const c = estado.carta;
  $("#cv-c5-nombre").textContent = estado.nombre || "";
  $("#cv-c5-apellido").textContent = estado.apellido || "";
  $("#cv-c5-puesto").textContent = estado.puesto || "";
  $("#cv-c5-contacto").innerHTML = contactoLineaCarta();
  $("#cv-c5-fecha").textContent = fechaCartaFormateada();
  $("#cv-c5-destinatario").innerHTML = [
    c.destinatario ? esc(c.destinatario) : "",
    c.empresaDestino ? esc(c.empresaDestino) : "",
    c.puestoDestino ? `Re: ${esc(c.puestoDestino)}` : "",
  ].filter(Boolean).map((l) => `<span>${l}</span>`).join("");
  $("#cv-c5-saludo").textContent = c.saludo || "";
  const parrafos = escPárrafo(c.cuerpo || "").split("<br><br>").filter(Boolean);
  $("#cv-c5-cuerpo").innerHTML = parrafos.map((p, i) => `<p${i === 0 ? ' class="cv-carta5-primer-parrafo"' : ""}>${p}</p>`).join("");
  $("#cv-c5-despedida").textContent = c.despedida || "";
  $("#cv-c5-firma").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
}

// ---- Carta 6 — Ejecutiva: barra oscura de ancho completo arriba con
// nombre+puesto, cuerpo formal abajo, bloque de firma con cargo. ----
function asegurarEsqueletoCarta6() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "carta6") return;
  pagina.dataset.esqueleto = "carta6";
  pagina.innerHTML = `
    <div class="cv-carta cv-carta6">
      <header class="cv-carta6-barra">
        <div>
          <h1 class="cv-carta6-nombre"><span id="cv-c6-nombre"></span> <span id="cv-c6-apellido"></span></h1>
          <p class="cv-carta6-puesto" id="cv-c6-puesto"></p>
        </div>
        <p class="cv-carta6-contacto" id="cv-c6-contacto"></p>
      </header>
      <div class="cv-carta6-cuerpo-envoltorio">
        <p class="cv-carta6-fecha" id="cv-c6-fecha"></p>
        <div class="cv-carta6-destinatario" id="cv-c6-destinatario"></div>
        <p class="cv-carta6-saludo" id="cv-c6-saludo"></p>
        <div class="cv-carta6-cuerpo" id="cv-c6-cuerpo"></div>
        <p class="cv-carta6-despedida" id="cv-c6-despedida"></p>
        <p class="cv-carta6-firma" id="cv-c6-firma"></p>
        <p class="cv-carta6-firma-cargo" id="cv-c6-firma-cargo"></p>
      </div>
    </div>
  `;
}
function renderCarta6() {
  asegurarEsqueletoCarta6();
  const c = estado.carta;
  $("#cv-c6-nombre").textContent = estado.nombre || "";
  $("#cv-c6-apellido").textContent = estado.apellido || "";
  $("#cv-c6-puesto").textContent = estado.puesto || "";
  $("#cv-c6-contacto").innerHTML = contactoLineaCarta();
  $("#cv-c6-fecha").textContent = fechaCartaFormateada();
  $("#cv-c6-destinatario").innerHTML = [
    c.destinatario ? esc(c.destinatario) : "",
    c.empresaDestino ? esc(c.empresaDestino) : "",
    c.puestoDestino ? `Re: ${esc(c.puestoDestino)}` : "",
  ].filter(Boolean).map((l) => `<span>${l}</span>`).join("");
  $("#cv-c6-saludo").textContent = c.saludo || "";
  $("#cv-c6-cuerpo").innerHTML = escPárrafo(c.cuerpo || "").split("<br><br>").map((p) => `<p>${p}</p>`).join("");
  $("#cv-c6-despedida").textContent = c.despedida || "";
  $("#cv-c6-firma").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
  $("#cv-c6-firma-cargo").textContent = estado.puesto || "";
}

/* ============================================================
   CARTAS 7-11 — a juego con los modelos de gimnasio (41-45).
   Cada una toma el lenguaje visual de su modelo para que el CV y la
   carta se lean como un mismo set cuando se mandan juntos.
   ============================================================ */

// ---- Carta 7 — Coach Studio (va con el modelo 41) ----
function asegurarEsqueletoCarta7() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "carta7") return;
  pagina.dataset.esqueleto = "carta7";
  pagina.innerHTML = `
    <div class="cv-carta cv-carta7">
      <header class="cv-c7-header">
        <div class="cv-c7-header-fondo" aria-hidden="true"></div>
        <div class="cv-c7-foto-aro">
          <img class="cv-c7-foto" id="cv-c7-foto" src="" alt="Foto de perfil" hidden>
          <div class="cv-c7-foto-placeholder" id="cv-c7-foto-placeholder">🙂</div>
        </div>
        <div class="cv-c7-header-texto">
          <h1 class="cv-c7-nombre" id="cv-c7-nombre"></h1>
          <p class="cv-c7-puesto" id="cv-c7-puesto"></p>
          <p class="cv-c7-contacto" id="cv-c7-contacto"></p>
        </div>
      </header>
      <div class="cv-c7-cuerpo-envoltorio">
        <div class="cv-c7-meta">
          <div class="cv-c7-destinatario" id="cv-c7-destinatario"></div>
          <p class="cv-c7-fecha" id="cv-c7-fecha"></p>
        </div>
        <p class="cv-c7-saludo" id="cv-c7-saludo"></p>
        <div class="cv-c7-cuerpo" id="cv-c7-cuerpo"></div>
        <p class="cv-c7-despedida" id="cv-c7-despedida"></p>
        <p class="cv-c7-firma" id="cv-c7-firma"></p>
        <p class="cv-c7-firma-cargo" id="cv-c7-firma-cargo"></p>
      </div>
    </div>
  `;
}
function renderCarta7() {
  asegurarEsqueletoCarta7();
  const c = estado.carta;
  const foto = $("#cv-c7-foto"), ph = $("#cv-c7-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; ph.hidden = true; }
  else { foto.hidden = true; ph.hidden = false; }

  $("#cv-c7-nombre").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
  $("#cv-c7-puesto").textContent = estado.puesto || "";
  $("#cv-c7-contacto").innerHTML = contactoLineaCarta();
  $("#cv-c7-fecha").textContent = fechaCartaFormateada();
  $("#cv-c7-destinatario").innerHTML = [
    c.destinatario ? esc(c.destinatario) : "",
    c.empresaDestino ? esc(c.empresaDestino) : "",
    c.puestoDestino ? esc(c.puestoDestino) : "",
  ].filter(Boolean).map((l) => `<span>${l}</span>`).join("");
  $("#cv-c7-saludo").textContent = c.saludo || "";
  $("#cv-c7-cuerpo").innerHTML = escPárrafo(c.cuerpo || "").split("<br><br>").map((p) => `<p>${p}</p>`).join("");
  $("#cv-c7-despedida").textContent = c.despedida || "";
  $("#cv-c7-firma").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
  $("#cv-c7-firma-cargo").textContent = estado.puesto || "";
}

// ---- Carta 8 — Race Bib (va con el modelo 42) ----
function asegurarEsqueletoCarta8() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "carta8") return;
  pagina.dataset.esqueleto = "carta8";
  pagina.innerHTML = `
    <div class="cv-carta cv-carta8">
      <header class="cv-c8-header">
        <div class="cv-c8-dorsal">
          <div class="cv-c8-dorsal-marca">BIB</div>
          <div class="cv-c8-dorsal-num" id="cv-c8-iniciales"></div>
        </div>
        <div class="cv-c8-header-texto">
          <h1 class="cv-c8-nombre" id="cv-c8-nombre"></h1>
          <p class="cv-c8-puesto" id="cv-c8-puesto"></p>
        </div>
      </header>
      <div class="cv-c8-meta-banda" aria-hidden="true"></div>
      <p class="cv-c8-contacto" id="cv-c8-contacto"></p>
      <div class="cv-c8-cuerpo-envoltorio">
        <p class="cv-c8-fecha" id="cv-c8-fecha"></p>
        <div class="cv-c8-destinatario" id="cv-c8-destinatario"></div>
        <p class="cv-c8-saludo" id="cv-c8-saludo"></p>
        <div class="cv-c8-cuerpo" id="cv-c8-cuerpo"></div>
        <p class="cv-c8-despedida" id="cv-c8-despedida"></p>
        <p class="cv-c8-firma" id="cv-c8-firma"></p>
        <p class="cv-c8-firma-cargo" id="cv-c8-firma-cargo"></p>
      </div>
    </div>
  `;
}
function renderCarta8() {
  asegurarEsqueletoCarta8();
  const c = estado.carta;
  // el número del dorsal son las iniciales reales, no un número inventado
  const iniciales = [estado.nombre, estado.apellido]
    .map((p) => (p || "").trim().charAt(0).toUpperCase()).filter(Boolean).join("");
  $("#cv-c8-iniciales").textContent = iniciales || "—";
  $("#cv-c8-nombre").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
  $("#cv-c8-puesto").textContent = estado.puesto || "";
  $("#cv-c8-contacto").innerHTML = contactoLineaCarta();
  $("#cv-c8-fecha").textContent = fechaCartaFormateada();
  $("#cv-c8-destinatario").innerHTML = [
    c.destinatario ? esc(c.destinatario) : "",
    c.empresaDestino ? esc(c.empresaDestino) : "",
    c.puestoDestino ? `Re: ${esc(c.puestoDestino)}` : "",
  ].filter(Boolean).map((l) => `<span>${l}</span>`).join("");
  $("#cv-c8-saludo").textContent = c.saludo || "";
  $("#cv-c8-cuerpo").innerHTML = escPárrafo(c.cuerpo || "").split("<br><br>").map((p) => `<p>${p}</p>`).join("");
  $("#cv-c8-despedida").textContent = c.despedida || "";
  $("#cv-c8-firma").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
  $("#cv-c8-firma-cargo").textContent = estado.puesto || "";
}

// ---- Carta 9 — Fitness App (va con el modelo 43) ----
function asegurarEsqueletoCarta9() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "carta9") return;
  pagina.dataset.esqueleto = "carta9";
  pagina.innerHTML = `
    <div class="cv-carta cv-carta9">
      <header class="cv-c9-header">
        <div class="cv-c9-anillos" aria-hidden="true">
          <span class="cv-c9-anillo cv-c9-anillo-1"></span>
          <span class="cv-c9-anillo cv-c9-anillo-2"></span>
        </div>
        <h1 class="cv-c9-nombre" id="cv-c9-nombre"></h1>
        <p class="cv-c9-puesto" id="cv-c9-puesto"></p>
        <p class="cv-c9-contacto" id="cv-c9-contacto"></p>
      </header>
      <div class="cv-c9-tarjeta">
        <div class="cv-c9-tarjeta-cima">
          <div class="cv-c9-destinatario" id="cv-c9-destinatario"></div>
          <span class="cv-c9-fecha-pill" id="cv-c9-fecha"></span>
        </div>
        <p class="cv-c9-saludo" id="cv-c9-saludo"></p>
        <div class="cv-c9-cuerpo" id="cv-c9-cuerpo"></div>
        <p class="cv-c9-despedida" id="cv-c9-despedida"></p>
        <p class="cv-c9-firma" id="cv-c9-firma"></p>
        <p class="cv-c9-firma-cargo" id="cv-c9-firma-cargo"></p>
      </div>
    </div>
  `;
}
function renderCarta9() {
  asegurarEsqueletoCarta9();
  const c = estado.carta;
  $("#cv-c9-nombre").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
  $("#cv-c9-puesto").textContent = estado.puesto || "";
  $("#cv-c9-contacto").innerHTML = contactoLineaCarta();
  $("#cv-c9-fecha").textContent = fechaCartaFormateada();
  $("#cv-c9-destinatario").innerHTML = [
    c.destinatario ? esc(c.destinatario) : "",
    c.empresaDestino ? esc(c.empresaDestino) : "",
    c.puestoDestino ? esc(c.puestoDestino) : "",
  ].filter(Boolean).map((l) => `<span>${l}</span>`).join("");
  $("#cv-c9-saludo").textContent = c.saludo || "";
  $("#cv-c9-cuerpo").innerHTML = escPárrafo(c.cuerpo || "").split("<br><br>").map((p) => `<p>${p}</p>`).join("");
  $("#cv-c9-despedida").textContent = c.despedida || "";
  $("#cv-c9-firma").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
  $("#cv-c9-firma-cargo").textContent = estado.puesto || "";
}

// ---- Carta 10 — Iron Room (va con el modelo 44) ----
function asegurarEsqueletoCarta10() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "carta10") return;
  pagina.dataset.esqueleto = "carta10";
  pagina.innerHTML = `
    <div class="cv-carta cv-carta10">
      <header class="cv-c10-header">
        <div class="cv-c10-barra" aria-hidden="true">
          <span class="cv-c10-disco cv-c10-disco-izq"></span>
          <span class="cv-c10-eje"></span>
          <span class="cv-c10-disco cv-c10-disco-der"></span>
        </div>
        <div class="cv-c10-placa">
          <h1 class="cv-c10-nombre" id="cv-c10-nombre"></h1>
          <p class="cv-c10-puesto" id="cv-c10-puesto"></p>
        </div>
      </header>
      <p class="cv-c10-contacto" id="cv-c10-contacto"></p>
      <div class="cv-c10-cuerpo-envoltorio">
        <div class="cv-c10-meta">
          <div class="cv-c10-destinatario" id="cv-c10-destinatario"></div>
          <p class="cv-c10-fecha" id="cv-c10-fecha"></p>
        </div>
        <p class="cv-c10-saludo" id="cv-c10-saludo"></p>
        <div class="cv-c10-cuerpo" id="cv-c10-cuerpo"></div>
        <p class="cv-c10-despedida" id="cv-c10-despedida"></p>
        <p class="cv-c10-firma" id="cv-c10-firma"></p>
        <p class="cv-c10-firma-cargo" id="cv-c10-firma-cargo"></p>
      </div>
    </div>
  `;
}
function renderCarta10() {
  asegurarEsqueletoCarta10();
  const c = estado.carta;
  $("#cv-c10-nombre").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
  $("#cv-c10-puesto").textContent = estado.puesto || "";
  $("#cv-c10-contacto").innerHTML = contactoLineaCarta();
  $("#cv-c10-fecha").textContent = fechaCartaFormateada();
  $("#cv-c10-destinatario").innerHTML = [
    c.destinatario ? esc(c.destinatario) : "",
    c.empresaDestino ? esc(c.empresaDestino) : "",
    c.puestoDestino ? esc(c.puestoDestino) : "",
  ].filter(Boolean).map((l) => `<span>${l}</span>`).join("");
  $("#cv-c10-saludo").textContent = c.saludo || "";
  $("#cv-c10-cuerpo").innerHTML = escPárrafo(c.cuerpo || "").split("<br><br>").map((p) => `<p>${p}</p>`).join("");
  $("#cv-c10-despedida").textContent = c.despedida || "";
  $("#cv-c10-firma").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
  $("#cv-c10-firma-cargo").textContent = estado.puesto || "";
}

// ---- Carta 11 — Class Board (va con el modelo 45) ----
function asegurarEsqueletoCarta11() {
  const pagina = $("#cv-pagina");
  if (pagina.dataset.esqueleto === "carta11") return;
  pagina.dataset.esqueleto = "carta11";
  pagina.innerHTML = `
    <div class="cv-carta cv-carta11">
      <header class="cv-c11-header">
        <div class="cv-c11-header-izq">
          <span class="cv-c11-rotulo">Coach</span>
          <h1 class="cv-c11-nombre" id="cv-c11-nombre"></h1>
          <p class="cv-c11-puesto" id="cv-c11-puesto"></p>
        </div>
        <div class="cv-c11-foto-marco">
          <img class="cv-c11-foto" id="cv-c11-foto" src="" alt="Foto de perfil" hidden>
          <div class="cv-c11-foto-placeholder" id="cv-c11-foto-placeholder">🙂</div>
        </div>
      </header>
      <div class="cv-c11-tiza" aria-hidden="true"></div>
      <p class="cv-c11-contacto" id="cv-c11-contacto"></p>
      <div class="cv-c11-panel">
        <span class="cv-c11-panel-tab" id="cv-c11-fecha"></span>
        <div class="cv-c11-destinatario" id="cv-c11-destinatario"></div>
        <p class="cv-c11-saludo" id="cv-c11-saludo"></p>
        <div class="cv-c11-cuerpo" id="cv-c11-cuerpo"></div>
        <p class="cv-c11-despedida" id="cv-c11-despedida"></p>
        <p class="cv-c11-firma" id="cv-c11-firma"></p>
        <p class="cv-c11-firma-cargo" id="cv-c11-firma-cargo"></p>
      </div>
    </div>
  `;
}
function renderCarta11() {
  asegurarEsqueletoCarta11();
  const c = estado.carta;
  const foto = $("#cv-c11-foto"), ph = $("#cv-c11-foto-placeholder");
  if (estado.foto) { foto.src = estado.foto; foto.hidden = false; ph.hidden = true; }
  else { foto.hidden = true; ph.hidden = false; }

  $("#cv-c11-nombre").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
  $("#cv-c11-puesto").textContent = estado.puesto || "";
  $("#cv-c11-contacto").innerHTML = contactoLineaCarta();
  $("#cv-c11-fecha").textContent = fechaCartaFormateada();
  $("#cv-c11-destinatario").innerHTML = [
    c.destinatario ? esc(c.destinatario) : "",
    c.empresaDestino ? esc(c.empresaDestino) : "",
    c.puestoDestino ? esc(c.puestoDestino) : "",
  ].filter(Boolean).map((l) => `<span>${l}</span>`).join("");
  $("#cv-c11-saludo").textContent = c.saludo || "";
  $("#cv-c11-cuerpo").innerHTML = escPárrafo(c.cuerpo || "").split("<br><br>").map((p) => `<p>${p}</p>`).join("");
  $("#cv-c11-despedida").textContent = c.despedida || "";
  $("#cv-c11-firma").textContent = `${estado.nombre || ""} ${estado.apellido || ""}`.trim();
  $("#cv-c11-firma-cargo").textContent = estado.puesto || "";
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
  tarjeta.appendChild(campoTarjeta("Ciudad, país (opcional, ej. Buenos Aires, Argentina)", item.ubicacion, (v) => { item.ubicacion = v; }));
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

// Variante de enlazarCampoSimple() para los campos anidados en estado.carta.
function enlazarCampoCarta(inputId, clave) {
  const input = $(inputId);
  input.value = estado.carta[clave] || "";
  input.oninput = () => { estado.carta[clave] = input.value; renderPreview(); guardar(); };
}

// Muestra el bloque de modelo-CV o modelo-carta según estado.tipoDocumento.
function actualizarVisibilidadTipoDocumento() {
  const esCarta = estado.tipoDocumento === "carta";
  $("#campo-modelo-cv").classList.toggle("oculto", esCarta);
  $("#campo-modelo-carta").classList.toggle("oculto", !esCarta);
}

// Cada color libre (oscuro, claro) tiene DOS inputs para el mismo valor
// (el swatch nativo <input type=color> y un campo de texto para pegar un
// hex a mano) — hay que mantenerlos sincronizados entre sí, por eso no
// alcanza con enlazarCampoSimple() dos veces. Genérica para no repetir
// esta lógica por cada color libre que se agregue.
function enlazarColorLibre(idPicker, idTexto, clave, porDefecto) {
  const HEX_VALIDO = /^#[0-9a-fA-F]{6}$/;
  const picker = $(idPicker), texto = $(idTexto);
  // el valor real puede ser un degradé (algunos temas lo usan para
  // colorOscuro/colorClaro, ver TEMAS_FONDOS) — el <input type=color>
  // nativo sólo entiende hex, así que ahí se aproxima con el primer color
  // del degradé; el campo de texto sí muestra el valor real completo.
  const valorReal = estado[clave] || porDefecto;
  const aproxHex = HEX_VALIDO.test(valorReal) ? valorReal : ((valorReal.match(/#[0-9a-fA-F]{6}/) || [])[0] || porDefecto);
  picker.value = aproxHex;
  texto.value = valorReal;
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

// Al elegir un tema, actualiza colorOscuro/colorClaro para que combinen
// (ver TEMAS_FONDOS) y resincroniza los selectores de color libre — el
// usuario puede seguir ajustándolos a mano después, como siempre.
function aplicarFondosDeTema(temaId) {
  const par = TEMAS_FONDOS[temaId];
  if (!par) return;
  estado.colorOscuro = par.oscuro;
  estado.colorClaro = par.claro;
  enlazarColorLibre("#in-color-oscuro", "#in-color-oscuro-texto", "colorOscuro", "#16191e");
  enlazarColorLibre("#in-color-claro", "#in-color-claro-texto", "colorClaro", "#ffffff");
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
  $("#in-tipo-documento").value = estado.tipoDocumento || "cv";
  $("#in-tipo-documento").onchange = () => {
    estado.tipoDocumento = $("#in-tipo-documento").value;
    actualizarVisibilidadTipoDocumento();
    renderPreview(); guardar();
  };
  actualizarVisibilidadTipoDocumento();
  enlazarCampoSimple("#in-modelo", "modelo");
  enlazarCampoSimple("#in-modelo-carta", "modeloCarta");
  $("#in-tema").value = estado.tema || "turquesa";
  $("#in-tema").onchange = () => {
    estado.tema = $("#in-tema").value;
    aplicarFondosDeTema(estado.tema);
    renderPreview(); guardar();
  };
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

  enlazarCampoCarta("#in-carta-empresa", "empresaDestino");
  enlazarCampoCarta("#in-carta-puesto", "puestoDestino");
  enlazarCampoCarta("#in-carta-destinatario", "destinatario");
  enlazarCampoCarta("#in-carta-fecha", "fecha");
  enlazarCampoCarta("#in-carta-saludo", "saludo");
  enlazarCampoCarta("#in-carta-cuerpo", "cuerpo");
  enlazarCampoCarta("#in-carta-despedida", "despedida");

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
  actualizarTextoFotoPos();
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
  activarReencuadreFoto();
  $("#btn-foto-centrar").addEventListener("click", () => {
    estado.fotoPos = { x: 50, y: 50 };
    renderPreview(); guardar(); actualizarTextoFotoPos();
  });
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
        case "experiencia": { estado.experiencia.push({ id: nuevoId(), empresa: "", empresaUrl: "", ubicacion: "", fecha: "", rol: "", descripcion: "", bullets: [], herramientas: [] }); montarListaExperiencia(); break; }
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

  // ---- modal "Vista ATS": texto plano lineal armado directo desde
  // `estado` (ver generarTextoATS()), no desde el HTML ya diagramado del
  // modelo — así el usuario ve exactamente lo que un parser automático
  // extraería, sin importar cuántas columnas/íconos tenga el diseño. ----
  const modalAts = $("#modal-vista-ats");
  $("#btn-vista-ats").addEventListener("click", () => {
    $("#modal-vista-ats-texto").value = generarTextoATS();
    $("#modal-vista-ats-copiado").classList.add("oculto");
    modalAts.classList.remove("oculto");
  });
  function cerrarModalAts() { modalAts.classList.add("oculto"); }
  $("#modal-vista-ats-cerrar").addEventListener("click", cerrarModalAts);
  modalAts.addEventListener("click", (e) => { if (e.target === modalAts) cerrarModalAts(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modalAts.classList.contains("oculto")) cerrarModalAts(); });
  $("#modal-vista-ats-copiar").addEventListener("click", async () => {
    const texto = $("#modal-vista-ats-texto");
    let copiado = false;
    try { await navigator.clipboard.writeText(texto.value); copiado = true; }
    catch {
      texto.removeAttribute("readonly");
      texto.select();
      copiado = document.execCommand("copy");
      texto.setAttribute("readonly", "");
    }
    if (copiado) {
      const aviso = $("#modal-vista-ats-copiado");
      aviso.classList.remove("oculto");
      setTimeout(() => aviso.classList.add("oculto"), 2200);
    } else {
      texto.select();
      alert("No se pudo copiar automáticamente — seleccioná el texto y copialo con Ctrl+C.");
    }
  });

  $("#btn-imprimir").addEventListener("click", () => window.print());
  $("#btn-restablecer").addEventListener("click", () => {
    if (!confirm("Esto reemplaza todo el contenido actual por el CV de ejemplo. ¿Seguir?")) return;
    localStorage.removeItem(CLAVE_STORAGE);
    estado = datosIniciales();
    poblarDesdeEstado();
    guardar();
  });

  // ---- modal "Plantilla JSON": antes era un <a href download> directo al
  // .json, pero bajo file:// (cómo corre esta app) Chrome ignora ese
  // download hacia OTRO archivo y en vez de bajarlo lo abre — pantalla
  // negra con el JSON crudo, que a cualquiera no técnico le parece un
  // error. Ahora es un modal con el prompt (instrucciones + plantilla)
  // ya armado para copiar y pegar en un asistente de IA. ----
  const modalPlantilla = $("#modal-plantilla-json");
  // dos modos dentro del mismo modal: "completar" (el prompt de siempre,
  // con la plantilla adentro) y "preparar" (para quien todavía no tiene
  // sus datos organizados — le pide al asistente que lo entreviste antes).
  function mostrarTabPlantilla(modo) {
    const esPreparar = modo === "preparar";
    $("#modal-plantilla-tab-completar").classList.toggle("activo", !esPreparar);
    $("#modal-plantilla-tab-preparar").classList.toggle("activo", esPreparar);
    $("#modal-plantilla-json-descargar").classList.toggle("oculto", esPreparar);
    $("#modal-plantilla-json-texto").value = esPreparar ? armarPromptPreparacion() : armarPromptPlantillaJson();
    $("#modal-plantilla-json-ayuda").innerHTML = esPreparar
      ? "Copiá el texto de abajo y pegaselo a ChatGPT (o el asistente que uses). Te va a ir haciendo preguntas para juntar tus datos, una por vez, y al final te arma un resumen ordenado. Ese resumen es lo que después pegás como tu \"CV viejo\" en la pestaña <strong>📋 Ya tengo mis datos</strong>."
      : "Copiá el texto de abajo y pegaselo a ChatGPT (o el asistente que uses), junto con tu CV viejo o tu perfil de LinkedIn. Ya tiene la plantilla y las instrucciones adentro — el asistente te va a devolver un JSON completo. Después, volvé acá y usá el botón <strong>⬆ Importar datos</strong> con lo que te devuelva.";
    $("#modal-plantilla-json-copiado").classList.add("oculto");
  }
  function abrirModalPlantilla() {
    mostrarTabPlantilla("completar");
    modalPlantilla.classList.remove("oculto");
  }
  function cerrarModalPlantilla() { modalPlantilla.classList.add("oculto"); }
  $("#modal-plantilla-tab-completar").addEventListener("click", () => mostrarTabPlantilla("completar"));
  $("#modal-plantilla-tab-preparar").addEventListener("click", () => mostrarTabPlantilla("preparar"));
  $("#btn-plantilla-json").addEventListener("click", abrirModalPlantilla);
  $("#modal-plantilla-json-cerrar").addEventListener("click", cerrarModalPlantilla);
  modalPlantilla.addEventListener("click", (e) => { if (e.target === modalPlantilla) cerrarModalPlantilla(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modalPlantilla.classList.contains("oculto")) cerrarModalPlantilla(); });
  $("#modal-plantilla-json-copiar").addEventListener("click", async () => {
    const texto = $("#modal-plantilla-json-texto");
    let copiado = false;
    try { await navigator.clipboard.writeText(texto.value); copiado = true; }
    catch {
      // fallback para contextos donde navigator.clipboard no está
      // disponible (algunos navegadores lo restringen bajo file://):
      // seleccionar el texto y usar el comando de copiar clásico.
      texto.removeAttribute("readonly");
      texto.select();
      copiado = document.execCommand("copy");
      texto.setAttribute("readonly", "");
    }
    if (copiado) {
      const aviso = $("#modal-plantilla-json-copiado");
      aviso.classList.remove("oculto");
      setTimeout(() => aviso.classList.add("oculto"), 2200);
    } else {
      texto.select();
      alert("No se pudo copiar automáticamente — seleccioná el texto y copialo con Ctrl+C.");
    }
  });
  $("#modal-plantilla-json-descargar").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(PLANTILLA_JSON_EJEMPLO, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-datos-cv.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // ---- modal "Galería de modelos" — miniaturas estáticas (ver
  // img/plantillas/) en vez de elegir a ciegas por nombre en el <select>.
  // La grilla se arma una sola vez, la primera vez que se abre, recorriendo
  // MODELOS (mismo registro que arma el <select> original) — así no hace
  // falta mantener la lista de 20 en un tercer lugar. ----
  const modalGaleria = $("#modal-galeria-modelos");
  let galeriaArmada = false;
  function armarGaleriaModelos() {
    const grid = $("#galeria-grid");
    grid.innerHTML = Object.entries(MODELOS).map(([id, m]) => `
      <button class="galeria-item" type="button" data-modelo="${id}">
        <img src="img/plantillas/${id}.png" alt="${esc(m.nombre)}" loading="lazy">
        <span>${esc(m.nombre)}</span>
      </button>
    `).join("");
    grid.querySelectorAll(".galeria-item").forEach((boton) => {
      boton.addEventListener("click", () => {
        estado.modelo = boton.dataset.modelo;
        $("#in-modelo").value = estado.modelo;
        renderPreview(); guardar();
        cerrarModalGaleria();
      });
    });
    galeriaArmada = true;
  }
  function abrirModalGaleria() {
    if (!galeriaArmada) armarGaleriaModelos();
    $("#galeria-grid").querySelectorAll(".galeria-item").forEach((boton) => {
      boton.classList.toggle("activo", boton.dataset.modelo === estado.modelo);
    });
    modalGaleria.classList.remove("oculto");
  }
  function cerrarModalGaleria() { modalGaleria.classList.add("oculto"); }
  $("#btn-galeria-modelos").addEventListener("click", abrirModalGaleria);
  $("#modal-galeria-cerrar").addEventListener("click", cerrarModalGaleria);
  modalGaleria.addEventListener("click", (e) => { if (e.target === modalGaleria) cerrarModalGaleria(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modalGaleria.classList.contains("oculto")) cerrarModalGaleria(); });

  // ---- modal "Importar datos": mismo criterio que el de Plantilla JSON —
  // antes el botón abría el selector de archivos directo, sin avisar qué
  // iba a pasar. Ahora explica primero (reemplaza todo, cómo queda) y
  // desde ahí se elige el archivo. ----
  const modalImportar = $("#modal-importar-json");
  function abrirModalImportar() { modalImportar.classList.remove("oculto"); }
  function cerrarModalImportar() { modalImportar.classList.add("oculto"); }
  $("#btn-importar").addEventListener("click", abrirModalImportar);
  $("#modal-importar-json-cerrar").addEventListener("click", cerrarModalImportar);
  $("#modal-importar-json-cancelar").addEventListener("click", cerrarModalImportar);
  modalImportar.addEventListener("click", (e) => { if (e.target === modalImportar) cerrarModalImportar(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modalImportar.classList.contains("oculto")) cerrarModalImportar(); });
  $("#modal-importar-json-elegir").addEventListener("click", () => {
    cerrarModalImportar();
    $("#importar-input").click();
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
  // Un solo punto de entrada para "cargar estos datos", sea que vengan de
  // un archivo (input file) o de texto pegado directo (textarea) — ambos
  // caminos terminan acá. Devuelve true si se aplicó, false si no
  // (JSON inválido, forma inesperada, o el usuario canceló el confirm).
  function aplicarDatosImportados(textoJson) {
    let datos;
    try { datos = JSON.parse(textoJson); }
    catch { alert("Eso no es un JSON válido."); return false; }
    // chequeo mínimo de forma, no una validación exhaustiva — si falta
    // algo puntual el resto de la app igual sigue andando (los campos
    // ausentes quedan vacíos, no rompen nada).
    if (typeof datos !== "object" || datos === null || !Array.isArray(datos.experiencia)) {
      alert("Ese JSON no tiene la forma esperada (¿es un export de esta misma herramienta?).");
      return false;
    }
    if (!confirm("Esto reemplaza todo el contenido actual por lo que hay en el archivo. ¿Seguir?")) return false;
    // "_instrucciones" es la guía que trae la plantilla en blanco (ver
    // docs/plantilla-datos-cv.json) para quien la completa con un
    // asistente de IA — no es un dato del CV, así que no debe quedar
    // pegada en el estado (ni reexportarse después como si lo fuera).
    delete datos._instrucciones;
    estado = datos;
    poblarDesdeEstado();
    guardar();
    return true;
  }

  $("#importar-input").addEventListener("change", (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => { aplicarDatosImportados(lector.result); e.target.value = ""; };
    lector.readAsText(archivo);
  });

  // ---- pegar el JSON directo, sin pasar por un archivo — para cuando
  // ChatGPT (u otro asistente) lo tira en el chat como texto en vez de
  // como archivo descargable, o simplemente es más rápido que guardar y
  // volver a subir un .json. ----
  $("#modal-importar-json-pegar-cargar").addEventListener("click", () => {
    const texto = $("#modal-importar-json-pegar-texto").value.trim();
    if (!texto) { alert("Pegá el JSON en el cuadro de texto primero."); return; }
    if (aplicarDatosImportados(texto)) {
      $("#modal-importar-json-pegar-texto").value = "";
      cerrarModalImportar();
    }
  });
}

bindearControlesEstaticos();
poblarDesdeEstado();
