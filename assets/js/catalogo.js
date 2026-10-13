// Templates by rubro, published by Radar Panel (GET /api/plantillas, see its README: "Vitrina en Maná").
// Whatever is loaded there and marked "Usarla en las demos" shows up here within a minute; nothing is listed by hand.

export const RADAR = 'https://radar-panel-sandy.vercel.app';

const CACHE_KEY = 'mana:catalogo';
const FRESH_MS = 60 * 1000; // Radar's CDN caches the catalog for a minute too

// Radar's rubro names are written for prospecting; a few read better for a client.
const DISPLAY = {
  salud: 'Clínicas y salud privada',
  legal: 'Estudios jurídicos',
  energia: 'Proveedores de energía y minería',
};

// Pretty URLs (/rubros/arquitectura) need the rewrite in vercel.json; a plain local server only has the file.
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

const PERSONAL = ['para', 'pais', 'color'];

export function rubroUrl(clave, extra) {
  const q = new URLSearchParams();
  if (LOCAL) q.set('r', clave);
  // Keep the personalization of a client link while moving between rubros.
  const current = new URLSearchParams(location.search);
  PERSONAL.forEach((k) => { if (current.get(k)) q.set(k, current.get(k)); });
  Object.entries(extra || {}).forEach(([k, v]) => (v ? q.set(k, v) : q.delete(k)));
  const qs = q.toString();
  return `${LOCAL ? '/rubros/rubro.html' : `/rubros/${clave}`}${qs ? `?${qs}` : ''}`;
}

export function rubroFromUrl() {
  const q = new URLSearchParams(location.search).get('r');
  if (q) return q;
  const last = decodeURIComponent(location.pathname.replace(/\/+$/, '').split('/').pop() || '');
  return /^rubro(\.html)?$/.test(last) ? '' : last;
}

const capitalize = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '');

// "Arquitectura · Estudio residencial: proyectos, casa en 3D y honorarios"
//   → title "Estudio residencial", detail "Proyectos, casa en 3D y honorarios".
// A bare internal name ("Salud privada de alto ticket") gives way to the site's own tagline.
function describe(t) {
  const raw = String(t.nombre || '');
  const name = raw.split(/\s+·\s+/).pop().trim();
  if (!/\s·\s|:/.test(raw) && t.lema) return { title: capitalize(t.lema), detail: '' };
  const cut = name.indexOf(':');
  const title = cut > 0 ? name.slice(0, cut).trim() : name;
  const detail = cut > 0 ? capitalize(name.slice(cut + 1).trim()) : t.lema && t.lema !== title ? t.lema : '';
  return { title, detail };
}

function luminance(hex) {
  const n = parseInt(String(hex || '').slice(1), 16);
  if (Number.isNaN(n)) return 1;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function palette(t) {
  const main = t.color || t.colores[0] || '#56B3F2';
  const dark = t.colores.filter((c) => luminance(c) < 0.06).sort((a, b) => luminance(a) - luminance(b))[0] || '#0D1117';
  return { main, dark, onMain: luminance(main) > 0.4 ? '#0D1117' : '#FFFFFF', swatches: [...new Set([main, ...t.colores])].slice(0, 4) };
}

function normalize(data) {
  const categorias = new Map((data.categorias || []).map((c) => [c.clave, c.nombre]));
  const templates = new Map((data.plantillas || []).map((t) => {
    const colores = Array.isArray(t.colores) ? t.colores : [];
    const full = { ...t, colores, enfoques: t.enfoques || [] };
    return [t.id, { ...full, ...describe(full), palette: palette(full) }];
  }));
  const rubros = (data.rubros || []).map((r) => ({
    clave: r.clave,
    nombre: DISPLAY[r.clave] || r.nombre,
    categoria: r.categoria,
    categoriaNombre: categorias.get(r.categoria) || '',
    templates: r.plantillas.map((id) => templates.get(id)).filter(Boolean),
  })).filter((r) => r.templates.length);
  return {
    updated: data.actualizado,
    categorias: (data.categorias || []).filter((c) => rubros.some((r) => r.categoria === c.clave)),
    rubros,
    templates,
    total: templates.size,
    rubro: (clave) => rubros.find((r) => r.clave === clave) || null,
  };
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { t, data } = JSON.parse(raw);
    return Date.now() - t < FRESH_MS ? data : null;
  } catch (e) {
    return null;
  }
}

function writeCache(data) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data })); } catch (e) { /* private mode */ }
}

let pending = null;

export function loadCatalog() {
  if (pending) return pending;
  const cached = readCache();
  if (cached) return (pending = Promise.resolve(normalize(cached)));
  pending = fetch(`${RADAR}/api/plantillas`, { headers: { accept: 'application/json' } })
    .then((r) => {
      if (!r.ok) throw new Error(`Radar respondió ${r.status}`);
      return r.json();
    })
    .then((data) => {
      writeCache(data);
      return normalize(data);
    })
    .catch((e) => {
      pending = null;
      throw e;
    });
  return pending;
}

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const pad = (n) => String(n).padStart(2, '0');
export const escapeHtml = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// "Arquitectura e interiorismo" → "arquitectura e interiorismo", for "Webs para …".
export const lowerFirst = (t) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : '');
