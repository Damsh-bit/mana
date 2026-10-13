// "Hablemos": the contact popup. Five short steps gather what we need to answer a lead properly (the project, the
// business, goals and features, budget and timing, how to reach them), then a review and the send. Each lead lands in
// Radar Panel as a "Referido de Maná" (POST /api/referidos, see its README), with the page and design it came from.
// Opens from every link to #contacto, from [data-hablemos] (its value preselects the project type) and from /#hablemos.
// Answers stay in this browser until they're sent, so closing it never loses anything.
(function () {
  'use strict';

  const RADAR = 'https://radar-panel-sandy.vercel.app';
  const DRAFT_KEY = 'mana:hablemos';
  const DRAFT_MAX_MS = 14 * 24 * 3600 * 1000;
  const root = document.querySelector('[data-mana-root]') || document.body;
  const mq = (q) => !!(window.matchMedia && window.matchMedia(q).matches);
  const reduced = mq('(prefers-reduced-motion: reduce)');
  const fine = mq('(hover: hover) and (pointer: fine)');
  const EASE = 'cubic-bezier(.16,1,.3,1)';
  const POP = 'cubic-bezier(.34,1.56,.64,1)';
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const anim = (el, frames, opts) => (reduced || !el || !el.animate ? null : el.animate(frames, { easing: EASE, ...opts }));
  const settle = (a) => (a ? a.finished.catch(() => {}) : Promise.resolve());

  const svg = (d, size) => `<svg width="${size || 22}" height="${size || 22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    cero: svg('<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 8.5h18M12 11.5v5M9.5 14h5"/>'),
    rediseno: svg('<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 4v4.7h-4.7M20 12a8 8 0 0 1-13.7 5.6L4 15.3M4 20v-4.7h4.7"/>'),
    landing: svg('<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 10.5h4.5M8.5 15h7v2.5h-7z"/>'),
    tienda: svg('<path d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5"/>'),
    plataforma: svg('<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><path d="M17 13.5v7M13.5 17h7"/>'),
    nose: svg('<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7M12 17h.01"/>'),
    consultas: svg('<path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4.5 19.5l1.4-4.2A7.5 7.5 0 1 1 20 11.5z"/><path d="M9 11.5h.01M12.5 11.5h.01M16 11.5h.01"/>'),
    vender: svg('<path d="M3.5 12.6V5.5a2 2 0 0 1 2-2h7.1l8 8a2 2 0 0 1 0 2.8l-6.3 6.3a2 2 0 0 1-2.8 0z"/><circle cx="8.5" cy="8.5" r="1.5"/>'),
    imagen: svg('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/>'),
    automatizar: svg('<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 3h5"/>'),
    google: svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20.5 20.5"/>'),
    whatsapp: svg('<path d="M20 11.5a8 8 0 0 1-11.7 7.1L4 20l1.4-4.1A8 8 0 1 1 20 11.5z"/><path d="M9.2 8.6c.3 2.7 2.4 5 5.2 5.4l.9-1.2-1.6-.9-.8.7c-.9-.4-1.6-1.1-2-2l.7-.8-.9-1.6z"/>', 18),
    email: svg('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>', 18),
    llamada: svg('<path d="M6.6 3.5h2.6l1.5 4-2 1.4a10 10 0 0 0 6.4 6.4l1.4-2 4 1.5v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/>', 18),
    video: svg('<rect x="3" y="6" width="12.5" height="12" rx="2.5"/><path d="M15.5 10.5l5-3v9l-5-3"/>', 18),
    search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>', 18),
    check: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
    pm: '<svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path class="p" d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path><path class="c" d="M2.5 6.3l2.3 2.2 4.7-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
    next: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
    prev: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
    send: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M14 2L7 9M14 2l-4.5 12L7 9 2 6.5z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path></svg>',
    edit: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10.5 2.5l3 3L6 13H3v-3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path></svg>',
  };

  // The keys are the ones Radar stores (lib/referidos.js there): a new option has to be added on both sides.
  const PROYECTOS = [
    { v: 'cero', t: 'Una web desde cero', d: 'Diseño y desarrollo a medida, de punta a punta.' },
    { v: 'rediseno', t: 'Mejorar la que tengo', d: 'Más rápida, más clara y que te traiga más consultas.' },
    { v: 'landing', t: 'Una landing page', d: 'Una página enfocada en vender una sola cosa.' },
    { v: 'tienda', t: 'Una tienda online', d: 'Catálogo, carrito y pagos para vender por internet.' },
    { v: 'plataforma', t: 'Una plataforma a medida', d: 'Portal de clientes, reservas o un panel interno.' },
    { v: 'nose', t: 'Todavía no sé', d: 'Contanos qué te pasa y lo definimos juntos.' },
  ];
  const OBJETIVOS = [
    { v: 'consultas', t: 'Más consultas', d: 'Que te escriban más clientes.' },
    { v: 'vender', t: 'Vender online', d: 'Cobrar desde la web.' },
    { v: 'imagen', t: 'Verme más profesional', d: 'Que la web esté a la altura.' },
    { v: 'automatizar', t: 'Ahorrar tiempo', d: 'Turnos, pedidos o cotizaciones solos.' },
    { v: 'google', t: 'Aparecer en Google', d: 'Que te encuentren los que buscan.' },
  ];
  const FUNCIONES = [['whatsapp', 'Consultas por WhatsApp'], ['turnos', 'Turnos o reservas'], ['cotizador', 'Cotizador o calculadora'], ['catalogo', 'Catálogo de productos o servicios'], ['pagos', 'Pagos online'], ['blog', 'Blog o novedades'], ['idiomas', 'Varios idiomas'], ['editar', 'Poder editarla yo'], ['integraciones', 'Conectarla con otros sistemas']];
  const CONTENIDOS = [['logo', 'Logo'], ['textos', 'Textos'], ['fotos', 'Fotos'], ['dominio', 'Dominio propio'], ['nada', 'Nada todavía']];
  const PRESUPUESTOS = [
    { v: 'hasta500', t: 'Hasta USD 500', s: 'Hasta 500', d: 'Alcanza para una landing simple o ajustes puntuales.' },
    { v: '500a1500', t: 'USD 500 a 1.500', s: '500 a 1.500', d: 'Un sitio institucional de pocas páginas, bien hecho.' },
    { v: '1500a3000', t: 'USD 1.500 a 3.000', s: '1.500 a 3.000', d: 'Un sitio completo, con funciones como turnos o cotizador.' },
    { v: '3000a6000', t: 'USD 3.000 a 6.000', s: '3.000 a 6.000', d: 'Una tienda online o un sitio con varias integraciones.' },
    { v: 'mas6000', t: 'Más de USD 6.000', s: 'Más de 6.000', d: 'Una plataforma a medida o un proyecto grande.' },
  ];
  const PLAZOS = [['ya', 'Lo antes posible'], ['mes', 'En un mes'], ['trimestre', 'En 2 o 3 meses'], ['sinapuro', 'Sin apuro']];
  const PREFERENCIAS = [['whatsapp', 'WhatsApp'], ['email', 'Email'], ['llamada', 'Llamada'], ['video', 'Videollamada']];
  const PAISES = [['AR', 'Argentina', '+54'], ['ES', 'España', '+34'], ['MX', 'México', '+52'], ['US', 'EE. UU.', '+1'], ['CA', 'Canadá', '+1'], ['otro', 'Otro', '+']];
  const PHONE_HINT = { AR: 'Con característica, sin 0 ni 15. Ej.: 11 5555 1234', ES: 'Ej.: 612 345 678', MX: 'A 10 dígitos. Ej.: 55 1234 5678', US: 'Ej.: (512) 555-0100', CA: 'Ej.: (416) 555-0100', otro: 'Con el código de tu país. Ej.: +56 9 1234 5678' };

  // Radar's rubro keys (lib/config.js there), with names written for a client. Extra words help the search.
  const RUBROS = ('arquitectura:Arquitectura e interiorismo:arquitecto diseño interior|construccion:Constructoras y desarrolladoras:constructora obra desarrolladora|reformas:Reformas y remodelaciones:remodelacion|piscinas:Piscinas:pileta|inmobiliarias:Inmobiliarias:inmobiliaria propiedades|administracion:Administración de propiedades:consorcio|'
    + 'salud:Clínicas y salud privada:clinica implantes estetica dental|odontologia:Odontología:dentista dental odontologo|centros_medicos:Consultorios médicos:medico clinica consultorio|kinesiologia:Kinesiología y fisioterapia:kinesiologo fisioterapeuta|psicologia:Psicología y salud mental:psicologo terapia|oftalmologia:Oftalmología:oculista|veterinarias:Veterinarias:veterinario|'
    + 'legal:Estudios jurídicos:abogado abogados estudio juridico|inmigracion:Abogados de inmigración:visas|notarias:Escribanías y notarías:escribano notario|contadores:Contadores y asesorías:contador contable estudio contable|seguros:Seguros:aseguradora productor|comercio_exterior:Comercio exterior y aduanas:despachante importacion exportacion|'
    + 'energia:Energía y minería:mineria|industria:Fábricas e industria:fabrica taller industrial|logistica:Logística y transporte:transporte|agro:Agro y maquinaria agrícola:campo|'
    + 'plomeria:Plomería:plomero|electricistas:Electricistas:electricista|climatizacion:Aire acondicionado y calefacción:refrigeracion|cerrajeria:Cerrajerías:cerrajero|techos:Techos e impermeabilización:techista|pintura:Pintores:pintor|jardineria:Jardinería y paisajismo:jardinero paisajista|limpieza:Limpieza|plagas:Control de plagas:fumigacion|mudanzas:Mudanzas y fletes:flete|solar:Energía solar:paneles solares|aberturas:Aberturas, vidrios y cerramientos:ventanas vidrieria|carpinteria:Carpintería y muebles a medida:carpintero|seguridad:Seguridad y alarmas:camaras|'
    + 'restaurantes:Restaurantes:restaurante resto bar parrilla|cafeterias:Cafeterías y panaderías:cafe panaderia|hoteles:Hoteles y alojamientos:hotel cabañas hostel|agencias_viajes:Agencias de viajes:turismo excursiones|'
    + 'salones:Salones de eventos:salon fiestas|catering:Catering|fotografia:Fotografía y video:fotografo|organizacion_eventos:Bodas y eventos:wedding planner organizacion|'
    + 'peluquerias:Peluquerías:peluqueria salon belleza|barberias:Barberías:barberia barbero|estetica:Estética y spa:spa cosmetologia|unas:Uñas y pestañas:manicura|tatuajes:Tatuajes:tattoo|gimnasios:Gimnasios:gym gimnasio crossfit|pilates_yoga:Pilates y yoga|artes_marciales:Artes marciales y boxeo:boxeo|'
    + 'talleres:Talleres mecánicos:mecanico taller|chapa_pintura:Chapa y pintura|concesionarias:Concesionarias:autos usados|neumaticos:Neumáticos y lubricentros:gomeria|lavaderos:Lavaderos y detailing:lavadero|gruas:Grúas y auxilio:grua|'
    + 'idiomas:Institutos de idiomas:ingles|apoyo_escolar:Apoyo escolar y academias|autoescuelas:Autoescuelas:manejo|jardines:Jardines maternales:guarderia|musica_arte:Música, danza y arte:escuela|formacion:Formación y oficios:cursos instituto|'
    + 'mueblerias:Mueblerías y decoración:muebles|opticas:Ópticas:anteojos|joyerias:Joyerías:joyas|florerias:Florerías:flores|ferreterias:Ferreterías y materiales:corralon|viveros:Viveros:plantas|mascotas:Mascotas:pet shop|bicicleterias:Bicicleterías:bicicletas')
    .split('|').map((x) => { const [clave, nombre, extra] = x.split(':'); return { clave, nombre, hay: norm(`${nombre} ${extra || ''}`) }; });
  const RUBRO = new Map(RUBROS.map((r) => [r.clave, r]));
  const POPULARES = ['arquitectura', 'construccion', 'salud', 'odontologia', 'legal', 'contadores', 'restaurantes', 'estetica', 'gimnasios', 'inmobiliarias'];

  const STEPS = ['Proyecto', 'Negocio', 'Objetivos', 'Alcance', 'Contacto'];
  const REVIEW = STEPS.length;

  const blank = () => ({
    proyecto: '', empresa: '', rubro: { clave: '', texto: '' }, pais: 'AR', pais_otro: '', ciudad: '', tiene_web: null, web: '',
    objetivo: '', funciones: [], presupuesto: '', plazo: '', contenido: [],
    nombre: '', preferencia: 'whatsapp', telefono: '', email: '', mensaje: '',
  });

  let S = blank();
  let step = 0;
  let reached = 0;     // furthest step opened, so the rail can jump back and forth
  let started = 0;     // first time the form was opened (sent along: bots fill it in no time)
  let fromReview = false;
  let sent = false;
  let isOpen = false;
  let busy = false;
  let ctx = {};
  let rubroQuery = '';
  let el, panel, stage, side, nextBtn, backBtn, bar, counter, lastFocus = null;

  /* ---------- draft ---------- */
  function saveDraft() {
    clearTimeout(saveDraft.t);
    saveDraft.t = setTimeout(() => {
      if (sent) return;
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ S, step: Math.min(step, REVIEW), reached, started, t: Date.now() })); } catch (e) { /* private mode */ }
    }, 250);
  }
  function loadDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!d || !d.S || Date.now() - d.t > DRAFT_MAX_MS) return null;
      return d;
    } catch (e) { return null; }
  }
  function clearDraft() {
    clearTimeout(saveDraft.t);
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* nothing kept */ }
  }

  /* ---------- where the visitor writes from ---------- */
  function context() {
    const q = new URLSearchParams(location.search);
    const m = location.pathname.match(/^\/rubros\/([a-z_]+)\/?$/);
    const r = q.get('r') || (m ? m[1] : '');
    const pais = (q.get('pais') || '').toUpperCase();
    return {
      rubro: RUBRO.has(r) ? r : '',
      plantilla: location.pathname.startsWith('/rubros/') ? q.get('ver') || '' : '',
      para: (q.get('para') || '').slice(0, 120),
      pais: PAISES.some(([k]) => k === pais) ? pais : '',
    };
  }
  // Rubros with designs (the catalog the home already fetched), to suggest first and to link after sending.
  function catalogRubros() {
    try {
      const raw = JSON.parse(sessionStorage.getItem('mana:catalogo') || 'null');
      return ((raw && raw.data && raw.data.rubros) || []).map((r) => r.clave).filter((k) => RUBRO.has(k));
    } catch (e) { return []; }
  }

  /* ---------- labels ---------- */
  const find = (list, v) => list.find((x) => (x.v || x[0]) === v);
  const label = (list, v) => { const x = find(list, v); return x ? x.t || x[1] : ''; };
  const rubroName = () => (S.rubro.clave ? (RUBRO.get(S.rubro.clave) || {}).nombre : S.rubro.texto) || '';
  const paisName = () => (S.pais === 'otro' ? S.pais_otro || 'Otro país' : label(PAISES, S.pais));
  const prefix = () => (find(PAISES, S.pais) || PAISES[0])[2];
  const digits = (t) => String(t || '').replace(/\D/g, '');
  const validEmail = (t) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(t || '').trim());
  const validPhone = (t) => digits(t).length >= 6;
  const validWeb = (t) => /^(https?:\/\/)?[^\s./]+\.[^\s]{2,}$/i.test(String(t || '').trim());
  const hostOf = (t) => String(t || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  const firstName = () => S.nombre.trim().split(/\s+/)[0] || '';

  function answer(i) {
    if (i === 0) return label(PROYECTOS, S.proyecto);
    if (i === 1) return [S.empresa.trim(), rubroName()].filter(Boolean).join(' · ');
    if (i === 2) return [label(OBJETIVOS, S.objetivo), S.funciones.length ? `+${S.funciones.length} ${S.funciones.length === 1 ? 'función' : 'funciones'}` : ''].filter(Boolean).join(' ');
    if (i === 3) return [S.presupuesto === 'charlar' ? 'A charlar' : label(PRESUPUESTOS, S.presupuesto), label(PLAZOS, S.plazo)].filter(Boolean).join(' · ');
    if (i === 4) return [S.nombre.trim(), S.nombre.trim() ? `por ${label(PREFERENCIAS, S.preferencia)}` : ''].filter(Boolean).join(' ');
    return '';
  }

  /* ---------- validation ---------- */
  function check(i) {
    if (i === 0 && !S.proyecto) return { field: 'proyecto', msg: 'Elegí una opción para seguir.' };
    if (i === 1) {
      if (!S.rubro.clave && !S.rubro.texto.trim()) return { field: 'rubro', msg: 'Elegí tu rubro o escribilo.' };
      if (S.proyecto === 'rediseno' && !validWeb(S.web)) return { field: 'web', msg: 'Pasanos la dirección de tu web actual.' };
      if (S.tiene_web === true && !validWeb(S.web)) return { field: 'web', msg: S.web.trim() ? 'Esa dirección no parece válida.' : 'Pasanos la dirección de tu web.' };
    }
    if (i === 2 && !S.objetivo) return { field: 'objetivo', msg: 'Elegí lo más importante para vos.' };
    if (i === 3) {
      if (!S.presupuesto) return { field: 'presupuesto', msg: 'Mové la barra o elegí “Prefiero charlarlo”.' };
      if (!S.plazo) return { field: 'plazo', msg: '¿Para cuándo lo necesitás?' };
    }
    if (i === 4) {
      if (S.nombre.trim().length < 2) return { field: 'nombre', msg: '¿Cómo te llamás?' };
      if (S.preferencia === 'email' && !validEmail(S.email)) return { field: 'email', msg: S.email.trim() ? 'Ese email no parece válido.' : 'Dejanos tu email para escribirte.' };
      if (S.preferencia !== 'email' && !validPhone(S.telefono)) return { field: 'telefono', msg: S.telefono.trim() ? 'Revisá el número.' : 'Dejanos tu número para escribirte.' };
      if (S.email.trim() && !validEmail(S.email)) return { field: 'email', msg: 'Ese email no parece válido.' };
    }
    return null;
  }
  const isDone = (i) => !check(i) && (i !== 4 || S.nombre.trim());

  /* ---------- markup ---------- */
  const words = (t) => t.split(' ').map((w) => `<span class="hb-w"><span>${w}</span></span>`).join(' ');
  const head = (i, title, sub) => `<div class="hb-head">
      <p class="hb-eyebrow mono">${i < REVIEW ? `Paso ${i + 1} de ${STEPS.length} · ${STEPS[i]}` : 'Último paso · Resumen'}</p>
      <h2 class="hb-title d" id="hb-title">${words(title)}</h2>
      <p class="hb-sub" data-a>${sub}</p>
    </div>`;
  const err = (field) => `<span class="hb-err" data-err="${field}" role="alert"></span>`;
  const tile = (field, x, i, ico, small) => `<button type="button" class="hb-tile${small ? ' is-small' : ''}" role="radio" aria-checked="${S[field] === x.v}" data-pick="${field}" data-value="${x.v}" data-a>
      <span class="hb-tile-ico">${ico}</span><span class="hb-tile-t">${x.t}</span><span class="hb-tile-d">${x.d}</span>
      <kbd class="hb-key mono">${i + 1}</kbd><span class="hb-check">${ICON.check}</span></button>`;
  const chip = (field, [v, t], multi) => {
    const on = multi ? S[field].includes(v) : S[field] === v;
    return `<button type="button" class="hb-chip" ${multi ? `aria-pressed="${on}" data-toggle="${field}"` : `role="radio" aria-checked="${on}" data-pick="${field}"`} data-value="${v}"><span class="hb-pm">${ICON.pm}</span>${esc(t)}</button>`;
  };
  const seg = (field, list, icons) => `<div class="hb-seg${icons ? ' has-icons' : ''}" role="radiogroup" data-seg="${field}">${list.map(([v, t]) => `<button type="button" role="radio" aria-checked="${S[field] === v}" data-pick="${field}" data-value="${v}">${icons ? ICON[v] : ''}<span>${t}</span></button>`).join('')}<span class="hb-seg-ind" aria-hidden="true"></span></div>`;
  const field = (name, lbl, attrs, extra) => `<label class="hb-field" data-req="${name}" data-a>
      <input class="hb-input" data-field="${name}" value="${esc(S[name])}" placeholder=" " ${attrs || ''}>
      <span class="hb-label">${lbl}</span>${extra || ''}${err(name)}</label>`;

  function viewProyecto() {
    return `${head(0, '¿Qué tenés en mente?', 'Elegí lo que más se parezca. Si no estás seguro, también vale.')}
      <div class="hb-tiles" role="radiogroup" aria-label="Tipo de proyecto" data-req="proyecto">${PROYECTOS.map((p, i) => tile('proyecto', p, i, ICON[p.v])).join('')}</div>${err('proyecto')}`;
  }

  function rubroBox() {
    if (S.rubro.clave || S.rubro.texto) {
      return `<div class="hb-picked"><span class="hb-picked-dot"></span><span>${esc(rubroName())}</span><button type="button" class="hb-picked-x" data-rubro-clear aria-label="Cambiar el rubro">${ICON.close}</button></div>`;
    }
    return `<div class="hb-search"><span class="hb-search-ico">${ICON.search}</span>
        <input class="hb-input" data-rubro-input value="${esc(rubroQuery)}" placeholder=" " autocomplete="off" aria-label="Buscá tu rubro" aria-controls="hb-sugs">
        <span class="hb-label">Rubro</span></div>
      <div class="hb-chips hb-sugs" id="hb-sugs" data-sugs>${suggestions()}</div>`;
  }
  function suggestions() {
    const q = norm(rubroQuery).trim();
    let list;
    if (q.length < 2) {
      const first = [ctx.rubro, ...catalogRubros(), ...POPULARES].filter((k, i, a) => k && a.indexOf(k) === i);
      list = first.slice(0, 8).map((k) => RUBRO.get(k));
    } else {
      const terms = q.split(/\s+/);
      list = RUBROS.filter((r) => terms.every((t) => r.hay.includes(t))).slice(0, 8);
    }
    const free = rubroQuery.trim().length >= 3 && !list.some((r) => norm(r.nombre) === q)
      ? `<button type="button" class="hb-chip is-free" data-rubro-free><span class="hb-pm">${ICON.pm}</span>Usar “${esc(rubroQuery.trim())}”</button>` : '';
    return list.map((r) => `<button type="button" class="hb-chip" data-rubro="${r.clave}"><span class="hb-pm">${ICON.pm}</span>${esc(r.nombre)}</button>`).join('') + free
      + (!list.length && !free ? '<span class="hb-none">Escribí un poco más…</span>' : '');
  }

  function viewNegocio() {
    const redesign = S.proyecto === 'rediseno';
    const webInput = `<label class="hb-field" data-req="web">
        <input class="hb-input" data-field="web" value="${esc(S.web)}" placeholder=" " inputmode="url" autocomplete="url" maxlength="300">
        <span class="hb-label">${redesign ? 'La dirección de tu web actual' : 'Dirección de tu web'}</span>${err('web')}</label>`;
    return `${head(1, 'Contanos de tu negocio', 'Así llegamos a la primera charla con ideas, no con preguntas.')}
      <div class="hb-grid two">
        ${field('empresa', 'Nombre de tu empresa o marca', 'autocomplete="organization" maxlength="120"', '<span class="hb-hint">Si todavía no tiene nombre, dejalo vacío.</span>')}
        <div class="hb-field hb-rubro" data-req="rubro" data-a>${rubroBox()}${err('rubro')}</div>
      </div>
      <div class="hb-block" data-a>
        <p class="hb-q">¿Dónde está?</p>
        <div class="hb-chips" role="radiogroup" aria-label="País">${PAISES.map(([v, t]) => chip('pais', [v, t])).join('')}</div>
        <div class="hb-grid two hb-gap">
          <label class="hb-field"><input class="hb-input" data-field="ciudad" value="${esc(S.ciudad)}" placeholder=" " autocomplete="address-level2" maxlength="120"><span class="hb-label">Ciudad <span class="hb-opt">opcional</span></span></label>
          <label class="hb-field" data-reveal="otro"${S.pais === 'otro' ? '' : ' hidden'}><input class="hb-input" data-field="pais_otro" value="${esc(S.pais_otro)}" placeholder=" " autocomplete="country-name" maxlength="60"><span class="hb-label">¿Qué país?</span></label>
        </div>
      </div>
      <div class="hb-block" data-a>
        ${redesign ? webInput : `<p class="hb-q">¿Ya tenés web?</p>
        ${seg('tiene_web', [['si', 'Sí, tengo'], ['no', 'Todavía no']])}
        <div class="hb-reveal" data-reveal="web"${S.tiene_web === true ? '' : ' hidden'}>${webInput}</div>`}
      </div>`;
  }

  function viewObjetivos() {
    return `${head(2, '¿Qué tiene que lograr tu web?', 'Elegí lo más importante y sumá lo que te gustaría que tenga.')}
      <p class="hb-q" data-a>Lo más importante</p>
      <div class="hb-tiles is-five" role="radiogroup" aria-label="Objetivo principal" data-req="objetivo">${OBJETIVOS.map((o, i) => tile('objetivo', o, i, ICON[o.v], true)).join('')}</div>${err('objetivo')}
      <div class="hb-block" data-a>
        <p class="hb-q">Lo que te gustaría que tenga <span class="hb-opt">opcional</span></p>
        <div class="hb-chips">${FUNCIONES.map((f) => chip('funciones', f, true)).join('')}</div>
      </div>`;
  }

  const budgetIndex = () => PRESUPUESTOS.findIndex((p) => p.v === S.presupuesto);
  function viewAlcance() {
    const i = budgetIndex();
    const at = i < 0 ? 2 : i;
    return `${head(3, 'Presupuesto y tiempos', 'Un rango orientativo alcanza: nos ayuda a proponerte algo que tenga sentido.')}
      <div class="hb-block hb-budget" data-req="presupuesto" data-a>
        <div class="hb-q-row"><p class="hb-q">Presupuesto orientativo</p>${chip('presupuesto', ['charlar', 'Prefiero charlarlo'])}</div>
        <div class="hb-range${i < 0 ? ' is-untouched' : ''}${S.presupuesto === 'charlar' ? ' is-off' : ''}" style="--f:${at / 4}">
          <div class="hb-range-track"><span class="hb-range-fill"></span>${PRESUPUESTOS.map((p, k) => `<i class="hb-range-stop${k <= at && i >= 0 ? ' on' : ''}" style="left:${k * 25}%"></i>`).join('')}</div>
          <input type="range" min="0" max="4" step="1" value="${at}" data-budget aria-label="Presupuesto orientativo" aria-valuetext="${esc(i < 0 ? 'Sin elegir' : PRESUPUESTOS[i].t)}">
          <span class="hb-range-knob" aria-hidden="true"></span>
          <output class="hb-range-bubble mono" data-bubble>${i < 0 ? 'Mové la barra' : PRESUPUESTOS[i].t}</output>
        </div>
        <div class="hb-range-scale mono" aria-hidden="true">${PRESUPUESTOS.map((p, k) => `<span style="--k:${k / 4}"${k === at && i >= 0 ? ' class="on"' : ''}>${p.s}</span>`).join('')}</div>
        <p class="hb-range-desc" data-budget-desc>${i < 0 ? 'Elegí un rango o dejalo para la charla.' : PRESUPUESTOS[i].d}</p>
        ${err('presupuesto')}
      </div>
      <div class="hb-block" data-req="plazo" data-a>
        <p class="hb-q">¿Para cuándo?</p>
        ${seg('plazo', PLAZOS)}${err('plazo')}
      </div>
      <div class="hb-block" data-a>
        <p class="hb-q">¿Qué ya tenés? <span class="hb-opt">opcional</span></p>
        <div class="hb-chips">${CONTENIDOS.map((c) => chip('contenido', c, true)).join('')}</div>
      </div>`;
  }

  function viewContacto() {
    const mail = S.preferencia === 'email';
    return `${head(4, '¿Cómo te encontramos?', 'Te escribimos nosotros, Santiago o Damián. Nada de bots ni de listas de correo.')}
      <div class="hb-grid two">
        ${field('nombre', 'Tu nombre', 'autocomplete="name" maxlength="80"')}
        <div class="hb-field" data-a>
          <p class="hb-q hb-q-in">¿Por dónde preferís?</p>
          ${seg('preferencia', PREFERENCIAS, true)}
        </div>
      </div>
      <div class="hb-grid two hb-gap">
        <label class="hb-field hb-phone${mail ? '' : ' is-req'}" data-req="telefono" data-a>
          <span class="hb-prefix mono" data-prefix>${prefix()}</span>
          <input class="hb-input" type="tel" data-field="telefono" value="${esc(S.telefono)}" placeholder=" " autocomplete="tel-national" inputmode="tel" maxlength="40">
          <span class="hb-label">WhatsApp o teléfono</span><span class="hb-hint" data-phone-hint>${PHONE_HINT[S.pais] || ''}</span>${err('telefono')}</label>
        <label class="hb-field hb-mail${mail ? ' is-req' : ''}" data-req="email" data-a>
          <input class="hb-input" type="email" data-field="email" value="${esc(S.email)}" placeholder=" " autocomplete="email" inputmode="email" maxlength="120">
          <span class="hb-label">Email</span><span class="hb-ok${validEmail(S.email) ? ' on' : ''}" aria-hidden="true">${ICON.check}</span>${err('email')}</label>
      </div>
      <label class="hb-field hb-area" data-a>
        <textarea class="hb-input" data-field="mensaje" rows="3" maxlength="2000" placeholder=" ">${esc(S.mensaje)}</textarea>
        <span class="hb-label">¿Algo más? Referencias, ideas, fechas… <span class="hb-opt">opcional</span></span>
        <span class="hb-count mono" data-count>${S.mensaje.length}/2000</span>
      </label>
      <label class="hb-hp" aria-hidden="true">No completar<input tabindex="-1" autocomplete="off" data-hp></label>`;
  }

  function viewResumen() {
    const row = (k, v) => (v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '');
    const card = (i, rows) => `<section class="hb-card" data-a><h3 class="mono">${String(i + 1).padStart(2, '0')} · ${STEPS[i]}</h3>
        <button type="button" class="hb-edit" data-goto="${i}">${ICON.edit}Editar</button><dl>${rows}</dl></section>`;
    const web = S.proyecto === 'rediseno' || S.tiene_web === true ? hostOf(S.web) : S.tiene_web === false ? 'Todavía no tiene' : '';
    return `${head(REVIEW, '¿Está todo bien?', 'Revisá tu consulta. Tocá Editar en lo que quieras cambiar.')}
      <div class="hb-review">
        ${card(0, row('Proyecto', label(PROYECTOS, S.proyecto)))}
        ${card(1, row('Empresa', S.empresa.trim()) + row('Rubro', rubroName()) + row('Dónde', [S.ciudad.trim(), paisName()].filter(Boolean).join(', ')) + row('Web', web))}
        ${card(2, row('Objetivo', label(OBJETIVOS, S.objetivo)) + row('Que tenga', S.funciones.map((f) => label(FUNCIONES, f)).join(', ')))}
        ${card(3, row('Presupuesto', S.presupuesto === 'charlar' ? 'Prefiero charlarlo' : label(PRESUPUESTOS, S.presupuesto)) + row('Plazo', label(PLAZOS, S.plazo)) + row('Ya tengo', S.contenido.map((c) => label(CONTENIDOS, c)).join(', ')))}
        ${card(4, row('Nombre', S.nombre.trim()) + row('Preferís', label(PREFERENCIAS, S.preferencia)) + row('Teléfono', S.telefono.trim() ? `${S.telefono.trim().startsWith('+') ? '' : `${prefix()} `}${S.telefono.trim()}` : '') + row('Email', S.email.trim()) + row('Mensaje', S.mensaje.trim()))}
      </div>
      <p class="hb-fine" data-a>Lo leemos Santiago y Damián, nadie más. Te respondemos en menos de 24 horas hábiles.</p>
      <div class="hb-send-error" data-send-error role="alert" hidden></div>`;
  }

  function viewDone() {
    const pref = label(PREFERENCIAS, S.preferencia);
    const cat = catalogRubros();
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    const designs = S.rubro.clave && cat.includes(S.rubro.clave)
      ? { href: local ? `/rubros/rubro.html?r=${S.rubro.clave}` : `/rubros/${S.rubro.clave}`, t: `Mirá diseños de ${RUBRO.get(S.rubro.clave).nombre.toLowerCase()}` }
      : { href: '/rubros/', t: 'Mirá diseños por rubro' };
    const here = location.pathname.replace(/\/+$/, '') === designs.href.split('?')[0].replace(/\/+$/, '');
    return `<div class="hb-done">
        <div class="hb-done-mark" aria-hidden="true">
          <svg viewBox="0 0 120 120" width="120" height="120"><circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" stroke-width="4"></circle><path d="M38 61l15 15 30-32" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </div>
        <h2 class="hb-title d" id="hb-title">${words(`¡Listo${firstName() ? `, ${esc(firstName())}` : ''}!`)}</h2>
        <p class="hb-sub" data-a>Recibimos tu consulta. Te escribimos ${S.preferencia === 'email' ? 'por email' : S.preferencia === 'llamada' ? 'para coordinar la llamada' : S.preferencia === 'video' ? 'para coordinar la videollamada' : `por ${pref}`} en menos de 24 horas hábiles.</p>
        <div class="hb-done-actions" data-a>
          ${here ? '' : `<a class="btn hb-next" href="${designs.href}"><span class="hb-next-t">${esc(designs.t)}</span><span class="bi">${ICON.next}</span></a>`}
          <button type="button" class="hb-ghost" data-hb-close>Cerrar</button>
        </div>
      </div>`;
  }

  const VIEWS = [viewProyecto, viewNegocio, viewObjetivos, viewAlcance, viewContacto, viewResumen];

  /* ---------- shell ---------- */
  function build() {
    if (el) return;
    el = document.createElement('div');
    el.className = 'hb';
    el.hidden = true;
    el.innerHTML = `
      <div class="hb-scrim" data-hb-close></div>
      <div class="hb-orbs" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="hb-panel" role="dialog" aria-modal="true" aria-labelledby="hb-title">
        <aside class="hb-side" aria-label="Tu consulta">
          <div class="hb-side-top"><span class="d hb-logo">man<span class="acc-a">a<span class="acc"></span></span></span><span class="mono hb-tag">Hablemos</span></div>
          <div class="hb-side-body">
            <p class="mono hb-side-lbl">Tu consulta</p>
            <ol class="hb-rail" style="--rail:0"><span class="hb-rail-line" aria-hidden="true"></span>${STEPS.map((s, i) => `<li><button type="button" class="hb-rail-i" data-goto="${i}" disabled>
              <span class="hb-rail-n mono"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="c">${ICON.check}</span></span>
              <span class="hb-rail-t">${s}</span><span class="hb-rail-v" data-rail="${i}"></span></button></li>`).join('')}</ol>
          </div>
          <div class="hb-side-foot"><span class="hb-avatars" aria-hidden="true"><i class="d">S</i><i class="d">D</i></span><p>Te responden Santiago o Damián, en menos de 24 horas hábiles.</p></div>
        </aside>
        <form class="hb-main" novalidate>
          <div class="hb-top">
            <span class="mono hb-counter" data-counter></span>
            <div class="hb-bar" style="--prog:0"><i></i></div>
            <button type="button" class="hb-x" data-hb-close aria-label="Cerrar">${ICON.close}</button>
          </div>
          <div class="hb-stage" data-stage></div>
          <div class="hb-foot">
            <button type="button" class="hb-back" data-hb-back aria-label="Paso anterior">${ICON.prev}</button>
            <span class="hb-enter mono" aria-hidden="true"><kbd>Enter ↵</kbd> <span data-enter>para seguir</span></span>
            <button type="submit" class="btn hb-next" data-hb-next><span class="hb-next-t">Seguir</span><span class="bi">${ICON.next}</span></button>
          </div>
        </form>
      </div>`;
    root.appendChild(el);
    panel = el.querySelector('.hb-panel');
    side = el.querySelector('.hb-side');
    stage = el.querySelector('[data-stage]');
    nextBtn = el.querySelector('[data-hb-next]');
    backBtn = el.querySelector('[data-hb-back]');
    bar = el.querySelector('.hb-bar');
    counter = el.querySelector('[data-counter]');
    bind();
  }

  function paintChrome() {
    const done = STEPS.map((s, i) => isDone(i));
    el.querySelectorAll('.hb-rail-i').forEach((b, i) => {
      b.classList.toggle('is-current', i === step);
      b.classList.toggle('is-done', done[i] && i !== step);
      b.disabled = sent || !(i <= reached || done.slice(0, i).every(Boolean));
      const v = b.querySelector('[data-rail]');
      const text = answer(i);
      if (v.textContent !== text) {
        v.textContent = text;
        anim(v, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 450 });
      }
    });
    const count = Math.min(step, STEPS.length);
    el.querySelector('.hb-rail').style.setProperty('--rail', sent ? 1 : Math.min(step, STEPS.length - 1) / (STEPS.length - 1));
    bar.style.setProperty('--prog', sent ? 1 : step >= REVIEW ? 1 : (count + (isDone(step) ? 0.6 : 0.15)) / STEPS.length);
    counter.textContent = sent ? '¡Enviado!' : step >= REVIEW ? 'Resumen' : `${String(step + 1).padStart(2, '0')} / ${String(STEPS.length).padStart(2, '0')}`;
    backBtn.classList.toggle('is-hidden', step === 0 || sent);
    el.querySelector('.hb-foot').hidden = sent;
    const text = step === REVIEW ? 'Enviar consulta' : fromReview ? 'Volver al resumen' : step === STEPS.length - 1 ? 'Revisar' : 'Seguir';
    const t = nextBtn.querySelector('.hb-next-t');
    if (t.textContent !== text) {
      t.textContent = text;
      nextBtn.querySelector('.bi').innerHTML = step === REVIEW ? ICON.send : ICON.next;
      anim(t, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 400 });
    }
    nextBtn.classList.toggle('is-ready', isDone(step) || step === REVIEW);
    el.querySelector('[data-enter]').textContent = step === REVIEW ? 'para enviar' : 'para seguir';
  }

  // Segmented controls: the white pill slides (and stretches) to the chosen option.
  function placeIndicators(scope, instant) {
    (scope || el).querySelectorAll('.hb-seg').forEach((g) => {
      const ind = g.querySelector('.hb-seg-ind');
      const on = g.querySelector('[aria-checked="true"]');
      g.classList.toggle('has-value', !!on);
      if (!on) return;
      if (instant) ind.style.transition = 'none';
      ind.style.width = `${on.offsetWidth}px`;
      ind.style.height = `${on.offsetHeight}px`;
      ind.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
      if (instant) { ind.getBoundingClientRect(); ind.style.transition = ''; }
    });
  }

  function placeBudget(scope) {
    const r = (scope || el).querySelector('.hb-range');
    if (!r) return;
    const bubble = r.querySelector('[data-bubble]');
    const f = parseFloat(r.style.getPropertyValue('--f')) || 0;
    const w = r.clientWidth;
    const half = bubble.offsetWidth / 2;
    const x = 14 + (w - 28) * f;
    bubble.style.left = `${Math.max(half, Math.min(w - half, x))}px`;
  }

  async function render(dir, first) {
    const view = document.createElement('div');
    view.className = 'hb-view';
    view.innerHTML = sent ? viewDone() : VIEWS[step]();
    const old = stage.firstElementChild;
    if (old && !first) {
      await settle(anim(old, [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: `translateX(${-36 * dir}px)`, filter: 'blur(6px)' }], { duration: 240, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }));
    }
    stage.replaceChildren(view);
    stage.scrollTop = 0;
    placeIndicators(view, true);
    placeBudget(view);
    paintChrome();
    if (!reduced) {
      anim(view, [{ opacity: 0, transform: `translateX(${36 * dir}px)`, filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 620 });
      view.querySelectorAll('.hb-w > span').forEach((w, i) => anim(w, [{ transform: 'translateY(110%)' }, { transform: 'none' }], { duration: 900, delay: 60 + i * 55, fill: 'backwards' }));
      view.querySelectorAll('[data-a]').forEach((a, i) => anim(a, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 120 + Math.min(i, 10) * 45, fill: 'backwards' }));
    }
    if (sent) celebrate(view);
  }

  function focusStep() {
    if (!fine || !isOpen) return; // on phones, focusing an input pops the keyboard over the question
    const target = stage.querySelector('.hb-tile[aria-checked="true"]') || stage.querySelector('input.hb-input, .hb-tile, [data-budget], .hb-done a, .hb-done button') || nextBtn;
    target.focus({ preventScroll: true });
  }

  async function go(n, opts) {
    if (busy || n === step) return;
    busy = true;
    const dir = n > step ? 1 : -1;
    step = n;
    reached = Math.max(reached, Math.min(n, REVIEW));
    if (n === REVIEW) fromReview = false;
    if (opts && opts.edit) fromReview = true;
    if (bar && dir > 0) { bar.classList.remove('is-advancing'); bar.getBoundingClientRect(); bar.classList.add('is-advancing'); }
    await render(dir);
    busy = false;
    focusStep();
    saveDraft();
  }

  function showError(e) {
    const box = stage.querySelector(`[data-req="${e.field}"]`);
    const msg = stage.querySelector(`[data-err="${e.field}"]`);
    if (msg) msg.textContent = e.msg;
    if (box) {
      box.classList.add('is-error');
      anim(box, [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 420, easing: 'ease-out' });
      box.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
      const input = box.querySelector('input.hb-input, [data-rubro-input]');
      if (input) input.focus({ preventScroll: true });
    }
    anim(nextBtn, [{ transform: 'translateX(0)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 320, easing: 'ease-out' });
  }
  function clearError(f) {
    const box = stage.querySelector(`[data-req="${f}"]`);
    if (box) box.classList.remove('is-error');
    const msg = stage.querySelector(`[data-err="${f}"]`);
    if (msg) msg.textContent = '';
  }

  function next() {
    if (busy || sent) return;
    if (step === REVIEW) return send();
    const e = check(step);
    if (e) return showError(e);
    go(fromReview ? REVIEW : step + 1);
  }

  /* ---------- sending ---------- */
  async function send() {
    for (let i = 0; i < STEPS.length; i++) {
      const e = check(i);
      if (e) { await go(i, { edit: true }); showError(e); return; }
    }
    const hp = el.querySelector('[data-hp]');
    const errBox = stage.querySelector('[data-send-error]');
    if (errBox) errBox.hidden = true;
    busy = true;
    nextBtn.classList.add('is-sending');
    nextBtn.disabled = true;
    nextBtn.querySelector('.hb-next-t').textContent = 'Enviando…';
    const body = {
      ...S,
      tiene_web: S.proyecto === 'rediseno' ? true : S.tiene_web,
      web: S.proyecto === 'rediseno' || S.tiene_web === true ? S.web.trim() : '',
      pais: S.pais === 'otro' ? '' : S.pais,
      pais_otro: S.pais === 'otro' ? S.pais_otro : '',
      ms: Date.now() - (started || Date.now()),
      web_alternativa: hp ? hp.value : '',
      pagina: location.pathname,
      plantilla: ctx.plantilla || '',
      para: ctx.para || '',
    };
    const ctrl = window.AbortController ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 20000);
    try {
      const r = await fetch(`${RADAR}/api/referidos`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) throw new Error(data.error || 'No pudimos enviar tu consulta. Probá de nuevo en un momento.');
      sent = true;
      clearDraft();
      busy = false;
      await render(1);
    } catch (e) {
      busy = false;
      const msg = e.name === 'AbortError' ? 'Está tardando demasiado. Probá de nuevo en un momento.'
        : e instanceof TypeError ? 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo: tu consulta sigue guardada acá.' : e.message;
      if (errBox) {
        errBox.textContent = msg;
        errBox.hidden = false;
        errBox.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
        anim(errBox, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 400 });
      }
    } finally {
      clearTimeout(timer);
      nextBtn.classList.remove('is-sending');
      nextBtn.disabled = false;
      if (!sent) paintChrome();
    }
  }

  // The check draws itself and a few sparks fly off it.
  function celebrate(view) {
    const mark = view.querySelector('.hb-done-mark');
    if (!mark || reduced) return;
    const colors = ['var(--mana)', '#0D1117', '#FFFFFF', 'color-mix(in oklch, var(--mana) 55%, #FFFFFF)'];
    for (let i = 0; i < 22; i++) {
      const s = document.createElement('i');
      s.className = 'hb-spark';
      const size = 5 + Math.random() * 7;
      s.style.cssText = `width:${size}px;height:${size}px;background:${colors[i % colors.length]};border-radius:${i % 3 ? '50%' : '2px'}`;
      mark.appendChild(s);
      const a = (i / 22) * Math.PI * 2 + Math.random() * 0.4;
      const d = 80 + Math.random() * 90;
      const sp = s.animate([
        { transform: 'translate(-50%, -50%) scale(0)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d * 0.7}px), calc(-50% + ${Math.sin(a) * d * 0.7}px)) scale(1) rotate(${Math.random() * 180}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 30}px)) scale(.4) rotate(${Math.random() * 360}deg)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 500, delay: 420, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' });
      sp.finished.then(() => s.remove()).catch(() => s.remove());
    }
  }

  /* ---------- interaction ---------- */
  function ripple(btn, e) {
    if (reduced || !btn.animate) return;
    const r = btn.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement('span');
    s.className = 'hb-ripple';
    s.style.cssText = `width:${d}px;height:${d}px;left:${(e.clientX || r.left + r.width / 2) - r.left - d / 2}px;top:${(e.clientY || r.top + r.height / 2) - r.top - d / 2}px`;
    btn.appendChild(s);
    s.animate([{ transform: 'scale(0)', opacity: 0.32 }, { transform: 'scale(1)', opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.2,.7,.3,1)' }).finished.then(() => s.remove()).catch(() => s.remove());
  }

  function pick(btn) {
    const f = btn.dataset.pick;
    const v = btn.dataset.value;
    if (f === 'tiene_web') {
      S.tiene_web = v === 'si';
    } else if (f === 'presupuesto' && v === 'charlar') {
      S.presupuesto = S.presupuesto === 'charlar' ? '' : 'charlar';
    } else {
      S[f] = v;
    }
    const group = btn.closest('[role="radiogroup"]') || btn.parentElement;
    group.querySelectorAll('[data-pick]').forEach((b) => b.setAttribute('aria-checked', String(b === btn && (f !== 'presupuesto' || S.presupuesto === 'charlar'))));
    const check = btn.querySelector('.hb-check');
    if (check) anim(check, [{ transform: 'scale(0) rotate(-90deg)' }, { transform: 'scale(1) rotate(0)' }], { duration: 520, easing: POP });
    anim(btn.querySelector('.hb-tile-ico'), [{ transform: 'scale(.8)' }, { transform: 'scale(1)' }], { duration: 520, easing: POP });
    clearError(f);
    placeIndicators(group.closest('.hb-view') || stage);

    if (f === 'pais') {
      const other = stage.querySelector('[data-reveal="otro"]');
      if (other) reveal(other, v === 'otro');
    }
    if (f === 'tiene_web') {
      const box = stage.querySelector('[data-reveal="web"]');
      if (box) reveal(box, S.tiene_web);
      if (!S.tiene_web) clearError('web');
    }
    if (f === 'presupuesto') syncBudget();
    if (f === 'preferencia') {
      stage.querySelector('.hb-phone').classList.toggle('is-req', v !== 'email');
      stage.querySelector('.hb-mail').classList.toggle('is-req', v === 'email');
      clearError('email'); clearError('telefono');
    }
    paintChrome();
    saveDraft();
    // A project type is one tap: on to the next step.
    if (f === 'proyecto' && !busy) setTimeout(() => { if (isOpen && step === 0) next(); }, reduced ? 0 : 380);
  }

  function reveal(box, show) {
    if (show === !box.hidden) return;
    if (show) {
      box.hidden = false;
      anim(box, [{ opacity: 0, transform: 'translateY(-8px)', clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }], { duration: 520 });
      const input = box.querySelector('input');
      if (input && fine) input.focus({ preventScroll: true });
    } else {
      const a = anim(box, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 220 });
      settle(a).then(() => { box.hidden = true; });
    }
  }

  function toggle(btn) {
    const f = btn.dataset.toggle;
    const v = btn.dataset.value;
    let list = S[f].slice();
    const on = !list.includes(v);
    list = on ? [...list, v] : list.filter((x) => x !== v);
    // "Nada todavía" can't go with anything else.
    if (f === 'contenido' && on) list = v === 'nada' ? ['nada'] : list.filter((x) => x !== 'nada');
    S[f] = list;
    btn.parentElement.querySelectorAll('[data-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(list.includes(b.dataset.value))));
    anim(btn.querySelector('.hb-pm'), [{ transform: on ? 'rotate(-180deg) scale(.6)' : 'rotate(180deg) scale(.6)' }, { transform: 'none' }], { duration: 560, easing: POP });
    paintChrome();
    saveDraft();
  }

  function takeBudget(i) {
    S.presupuesto = PRESUPUESTOS[i].v;
    const charlar = stage.querySelector('[data-pick="presupuesto"]');
    if (charlar) charlar.setAttribute('aria-checked', 'false');
    clearError('presupuesto');
    syncBudget();
    paintChrome();
    saveDraft();
  }

  function syncBudget() {
    const r = stage.querySelector('.hb-range');
    if (!r) return;
    const i = budgetIndex();
    const input = r.querySelector('[data-budget]');
    const at = i < 0 ? Number(input.value) : i;
    r.style.setProperty('--f', at / 4);
    r.classList.toggle('is-untouched', S.presupuesto === '');
    r.classList.toggle('is-off', S.presupuesto === 'charlar');
    r.querySelectorAll('.hb-range-stop').forEach((s, k) => s.classList.toggle('on', i >= 0 && k <= at));
    stage.querySelectorAll('.hb-range-scale span').forEach((s, k) => s.classList.toggle('on', i >= 0 && k === at && S.presupuesto !== 'charlar'));
    const bubble = r.querySelector('[data-bubble]');
    const desc = stage.querySelector('[data-budget-desc]');
    const t = S.presupuesto === 'charlar' ? 'Lo charlamos' : i < 0 ? 'Mové la barra' : PRESUPUESTOS[i].t;
    const d = S.presupuesto === 'charlar' ? 'Perfecto: lo vemos en la primera charla, según lo que necesites.' : i < 0 ? 'Elegí un rango o dejalo para la charla.' : PRESUPUESTOS[i].d;
    input.setAttribute('aria-valuetext', t);
    if (bubble.textContent !== t) { bubble.textContent = t; anim(bubble, [{ transform: 'translateX(-50%) scale(.85)' }, { transform: 'translateX(-50%) scale(1)' }], { duration: 420, easing: POP }); }
    if (desc.textContent !== d) { desc.textContent = d; anim(desc, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 400 }); }
    placeBudget(stage);
  }

  function bind() {
    const form = el.querySelector('form');
    form.addEventListener('submit', (e) => { e.preventDefault(); next(); });

    el.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('[data-hb-close]')) { e.preventDefault(); close(); return; }
      if (t.closest('[data-hb-back]')) { if (!busy && step > 0) go(fromReview ? REVIEW : step - 1); return; }
      const g = t.closest('[data-goto]');
      if (g && !g.disabled) { const n = Number(g.dataset.goto); go(n, { edit: step === REVIEW || fromReview }); return; }
      const p = t.closest('[data-pick]');
      if (p) { ripple(p, e); pick(p); return; }
      const tg = t.closest('[data-toggle]');
      if (tg) { ripple(tg, e); toggle(tg); return; }
      const rb = t.closest('[data-rubro]');
      if (rb) { S.rubro = { clave: rb.dataset.rubro, texto: '' }; rubroQuery = ''; afterRubro(); return; }
      if (t.closest('[data-rubro-free]')) { S.rubro = { clave: '', texto: rubroQuery.trim().slice(0, 80) }; rubroQuery = ''; afterRubro(); return; }
      if (t.closest('[data-rubro-clear]')) {
        S.rubro = { clave: '', texto: '' };
        const box = stage.querySelector('.hb-rubro');
        box.innerHTML = rubroBox() + err('rubro');
        anim(box, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
        const input = box.querySelector('[data-rubro-input]');
        if (input) input.focus();
        paintChrome(); saveDraft();
      }
    });

    el.addEventListener('input', (e) => {
      const t = e.target;
      if (t.matches('[data-rubro-input]')) {
        rubroQuery = t.value;
        const s = stage.querySelector('[data-sugs]');
        if (s) s.innerHTML = suggestions();
        clearError('rubro');
        return;
      }
      if (t.matches('[data-budget]')) { takeBudget(Number(t.value)); return; }
      const f = t.dataset.field;
      if (!f) return;
      S[f] = t.value;
      clearError(f);
      if (f === 'email') { const ok = t.closest('.hb-field').querySelector('.hb-ok'); if (ok) ok.classList.toggle('on', validEmail(t.value)); }
      if (f === 'mensaje') {
        const c = stage.querySelector('[data-count]');
        c.textContent = `${t.value.length}/2000`;
        c.classList.toggle('is-near', t.value.length > 1800);
        t.style.height = 'auto';
        t.style.height = `${Math.min(t.scrollHeight + 2, 260)}px`;
      }
      paintChrome();
      saveDraft();
    });
    // Touching the slider (even without moving it) picks the value under the knob.
    el.addEventListener('pointerdown', (e) => {
      const r = e.target.closest('[data-budget]');
      if (r && (!S.presupuesto || S.presupuesto === 'charlar')) setTimeout(() => takeBudget(Number(r.value)), 0);
    });

    // Spotlight under the pointer on tiles, chips and cards; the orbs drift a little with it.
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const t = e.target.closest('.hb-tile, .hb-chip, .hb-card');
      if (t) {
        const r = t.getBoundingClientRect();
        t.style.setProperty('--mx', `${e.clientX - r.left}px`);
        t.style.setProperty('--my', `${e.clientY - r.top}px`);
      }
      const orbs = el.querySelector('.hb-orbs');
      orbs.style.setProperty('--px', (e.clientX / innerWidth - 0.5).toFixed(3));
      orbs.style.setProperty('--py', (e.clientY / innerHeight - 0.5).toFixed(3));
    });

    el.addEventListener('keydown', (e) => {
      // Keys stay here: the design viewer behind (vitrina.js) also listens for Esc, the arrows and Tab.
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') trapFocus(e);
      const typing = e.target.matches('input, textarea');
      // 1–6 pick a tile on the steps that have them.
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && /^[1-9]$/.test(e.key)) {
        const tiles = stage.querySelectorAll('.hb-tile');
        const t = tiles[Number(e.key) - 1];
        if (t) { e.preventDefault(); t.focus(); pick(t); }
      }
      if (e.key === 'Enter' && e.target.matches('[data-rubro-input]')) {
        e.preventDefault();
        const first = stage.querySelector('[data-sugs] .hb-chip');
        if (first) first.click();
      }
    });

    window.addEventListener('resize', () => { if (isOpen) { placeIndicators(); placeBudget(); } });
  }

  function afterRubro() {
    const box = stage.querySelector('.hb-rubro');
    box.innerHTML = rubroBox() + err('rubro');
    anim(box.querySelector('.hb-picked'), [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: POP });
    clearError('rubro');
    paintChrome();
    saveDraft();
  }

  function trapFocus(e) {
    const items = Array.from(panel.querySelectorAll('button:not([disabled]), input:not([tabindex="-1"]), textarea, a[href]'))
      .filter((x) => x.offsetParent !== null && !x.closest('[hidden]'));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- open / close ---------- */
  const inertBefore = new Map();
  function lockPage(on) {
    const html = document.documentElement;
    if (on) html.style.setProperty('--hb-sb', `${window.innerWidth - html.clientWidth}px`);
    html.classList.toggle('hb-lock', on);
    if (on) Array.from(root.children).forEach((n) => { if (n !== el) { inertBefore.set(n, n.inert); n.inert = true; } });
    else { inertBefore.forEach((was, n) => { n.inert = was; }); inertBefore.clear(); }
    // Everything behind the glass stands still (the carousel, the marquee): it's blurred, and redrawing it costs.
    const g = window.gsap;
    if (g && g.ticker) { if (on) g.ticker.sleep(); else g.ticker.wake(); }
  }

  function open(trigger, preset) {
    if (isOpen) return;
    build();
    ctx = context();
    if (sent) { sent = false; S = blank(); step = 0; reached = 0; started = 0; }
    const d = !S.proyecto && !started ? loadDraft() : null;
    if (d) { S = Object.assign(blank(), d.S); step = Math.min(d.step || 0, REVIEW); reached = d.reached || step; started = d.started || 0; }
    if (!S.rubro.clave && !S.rubro.texto && ctx.rubro) S.rubro = { clave: ctx.rubro, texto: '' };
    if (!S.empresa && ctx.para) S.empresa = ctx.para;
    if (ctx.pais && !d) S.pais = ctx.pais;
    if (preset && PROYECTOS.some((p) => p.v === preset)) {
      S.proyecto = preset;
      if (step === 0) step = 1;
      reached = Math.max(reached, step);
    }
    started = started || Date.now();
    fromReview = false;
    isOpen = true;
    lastFocus = trigger || document.activeElement;
    el.hidden = false;
    lockPage(true);
    render(1, true);
    if (d && (d.step || S.proyecto)) toast('Seguís donde lo dejaste.', 'Empezar de nuevo', restart);

    // The panel grows out of the button that opened it.
    const pr = panel.getBoundingClientRect();
    const tr = trigger && trigger.getBoundingClientRect ? trigger.getBoundingClientRect() : null;
    const ox = tr && tr.width ? tr.left + tr.width / 2 - pr.left : pr.width / 2;
    const oy = tr && tr.width ? tr.top + tr.height / 2 - pr.top : pr.height / 2;
    panel.style.transformOrigin = `${ox}px ${oy}px`;
    anim(el.querySelector('.hb-scrim'), [{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
    anim(el.querySelector('.hb-orbs'), [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 1200 });
    anim(panel, [{ opacity: 0, transform: 'scale(.55)', filter: 'blur(12px)' }, { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }], { duration: 780 });
    anim(side, [{ opacity: 0, transform: 'translateX(-24px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 180, fill: 'backwards' });
    setTimeout(focusStep, reduced ? 0 : 420);
  }

  async function close() {
    if (!isOpen || close.running) return;
    close.running = true;
    saveDraft();
    await Promise.all([
      settle(anim(panel, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.94) translateY(16px)' }], { duration: 280, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' })),
      settle(anim(el.querySelector('.hb-scrim'), [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' })),
      settle(anim(el.querySelector('.hb-orbs'), [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' })),
    ]);
    el.hidden = true;
    el.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    lockPage(false);
    isOpen = false;
    close.running = false;
    if (location.hash === '#hablemos') history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function restart() {
    clearDraft();
    S = blank();
    if (ctx.rubro) S.rubro = { clave: ctx.rubro, texto: '' };
    if (ctx.para) S.empresa = ctx.para;
    if (ctx.pais) S.pais = ctx.pais;
    reached = 0;
    started = Date.now();
    fromReview = false;
    const was = step;
    step = 0;
    render(was > 0 ? -1 : 1);
  }

  function toast(text, action, fn) {
    const t = document.createElement('div');
    t.className = 'hb-toast';
    t.innerHTML = `<span>${esc(text)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
    panel.appendChild(t);
    const kill = () => settle(anim(t, [{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%, 10px)' }], { duration: 250, fill: 'forwards' })).then(() => t.remove());
    if (action) t.querySelector('button').addEventListener('click', () => { fn(); kill(); });
    anim(t, [{ opacity: 0, transform: 'translate(-50%, 14px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { duration: 500, easing: POP });
    setTimeout(kill, 6000);
  }

  /* ---------- triggers ---------- */
  // Any link to the contact section (and [data-hablemos]) opens the popup instead of scrolling.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('[data-hablemos], a[href="#contacto"], a[href="/#contacto"], a[href="#hablemos"], a[href="/#hablemos"]');
    if (!a) return;
    e.preventDefault();
    open(a, a.dataset.hablemos || '');
  });

  window.Hablemos = { open: (preset) => open(null, preset) };
  if (location.hash === '#hablemos') {
    const start = () => open(null, '');
    if (document.readyState === 'complete') setTimeout(start, 300); else window.addEventListener('load', () => setTimeout(start, 300));
  }
})();
