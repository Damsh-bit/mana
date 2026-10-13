// Live previews of Radar templates: the same adaptarPlantilla that builds each prospect's demo, filled with sample data
// (or the client's name, country and brand color from the link), inside a sandboxed iframe with no origin.
// Contact buttons don't dial a fake number: the page explains what they would do on the client's real site.
//
// Performance: each preview is a whole site (GSAP, Three.js, its own loops), so they load one or two at a time, play
// their intro and then freeze (no frames, no animations) until they're hovered. Small previews also run at half frame
// rate and render 3D at 1x. While the viewer is open, everything behind it is frozen and not painted.
import { RADAR, escapeHtml } from './catalogo.js';

const Mana = window.Mana || { reducedMotion: false };
const ease = [0.16, 1, 0.3, 1];

// Sample business, per country (Radar adapts prices, currency and words to it).
const SAMPLES = {
  AR: { l: 'Palermo', d: 'Av. Santa Fe 3250, CABA', t: '+54 11 5555-0100', w: '5491155550100', tt: '541155550100' },
  ES: { l: 'Chamberí', d: 'Calle de Fuencarral 120, Madrid', t: '+34 910 000 100', w: '34910000100', tt: '34910000100' },
  MX: { l: 'Polanco', d: 'Av. Presidente Masaryk 220, CDMX', t: '+52 55 5555 0100', w: '525555550100', tt: '525555550100' },
  US: { l: 'Austin', d: '1200 S Congress Ave, Austin, TX', t: '(512) 555-0100', tt: '15125550100' },
  CA: { l: 'Toronto', d: '220 King St W, Toronto, ON', t: '(416) 555-0100', tt: '14165550100' },
};

// Sample names by rubro, then by category.
const NAMES = {
  arquitectura: 'Estudio Lumen', construccion: 'Andes Construcciones', reformas: 'Obra Clara', piscinas: 'Azul Piscinas',
  inmobiliarias: 'Andes Propiedades', salud: 'Clínica Aurora', odontologia: 'Dental Aurora', veterinarias: 'Vete Patitas',
  legal: 'Ríos & Asociados', contadores: 'Estudio Ríos', restaurantes: 'Casa Olivo', cafeterias: 'Café Molino',
  hoteles: 'Hotel Alameda', gimnasios: 'Forma Gym', peluquerias: 'Studio Bruma', barberias: 'Barbería Norte',
  // categories
  profesionales: 'Ríos & Asociados', industria: 'Metalúrgica Delta', hogar: 'Servicios Norte', gastronomia: 'Casa Olivo',
  eventos: 'Salón Magnolia', belleza: 'Studio Bruma', autos: 'Taller Ruta 8', educacion: 'Instituto Faro', comercios: 'Almacén Central',
};
export const sampleName = (rubro) => NAMES[rubro.clave] || NAMES[rubro.categoria] || 'Tu Negocio';

// ?para=Estudio%20Pérez&pais=ES&color=2a6f97 personalize a link for one client.
export function personalization(search = location.search) {
  const q = new URLSearchParams(search);
  const para = (q.get('para') || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const pais = (q.get('pais') || '').toUpperCase();
  const color = (q.get('color') || '').replace(/^#/, '').toLowerCase();
  return { para, pais: SAMPLES[pais] ? pais : 'AR', color: /^[0-9a-f]{6}$/.test(color) ? `#${color}` : '' };
}

function demoData(template, rubro, who) {
  const s = SAMPLES[who.pais];
  const d = { n: who.para || sampleName(rubro), l: s.l, d: s.d, t: s.t, tt: s.tt, e: 'hola@tunegocio.com', pa: who.pais,
    lg: template.idioma, mk: 'Maná', c: {} };
  if (s.w) d.w = s.w;
  // Made-up reviews only for the made-up business: a real one sees its own on its real site.
  if (!who.para) { d.r = 4.9; d.rc = 127; }
  if (who.color) d.cm = who.color;
  return d;
}

// Runs inside the preview (stringified), before the template's own scripts.
// o.thumb: a small preview that can "tour" (scroll down by itself); o.every: draw one frame out of every n;
// o.dpr: devicePixelRatio the template sees (canvas and 3D size).
function bridge(o) {
  var post = function (m) { m.mana = 1; try { parent.postMessage(m, '*'); } catch (e) { /* detached */ } };

  // Contact links report to the page instead of opening.
  var kind = function (h) {
    if (/^(?:https?:)?\/\/(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\b|^whatsapp:/i.test(h)) return 'whatsapp';
    if (/^tel:/i.test(h)) return 'tel';
    if (/^sms:/i.test(h)) return 'sms';
    if (/^mailto:/i.test(h)) return 'email';
    return '';
  };
  var text = function (h) {
    try { return new URL(h.replace(/^whatsapp:\/\//i, 'https://wa.me/')).searchParams.get('text') || ''; } catch (e) { return ''; }
  };
  var intercept = function (h) {
    h = String(h || '');
    var k = kind(h);
    if (!k) return false;
    post({ type: 'contact', kind: k, text: k === 'whatsapp' ? text(h) : '' });
    return true;
  };
  window.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (a && intercept(a.href)) e.preventDefault();
  });
  var open = window.open;
  window.open = function (u) { return intercept(u) ? null : open.apply(window, arguments); };

  if (o.dpr) {
    try { Object.defineProperty(window, 'devicePixelRatio', { get: function () { return o.dpr; }, configurable: true }); } catch (e) { /* read-only */ }
  }

  // Every animation loop (GSAP, Motion, Three.js, the template's own) goes through requestAnimationFrame: routing it
  // here lets the page freeze the preview or lower its frame rate.
  var nativeRAF = window.requestAnimationFrame.bind(window);
  var nativeCAF = window.cancelAnimationFrame.bind(window);
  var callbacks = new Map();
  var seq = 0;
  var scheduled = false;
  var frozen = false;
  var tick = 0;
  var every = o.every || 1;
  var schedule = function () {
    if (scheduled || frozen || !callbacks.size) return;
    scheduled = true;
    nativeRAF(flush);
  };
  var flush = function (t) {
    scheduled = false;
    if (frozen) return;
    tick += 1;
    if (every > 1 && tick % every) { schedule(); return; }
    var due = callbacks;
    callbacks = new Map();
    due.forEach(function (cb) { try { cb(t); } catch (e) { setTimeout(function () { throw e; }); } });
  };
  window.requestAnimationFrame = function (cb) { seq += 1; callbacks.set(seq, cb); schedule(); return seq; };
  window.cancelAnimationFrame = function (id) { callbacks.delete(id); };

  var held = [];
  var freeze = function () {
    if (frozen) return;
    frozen = true;
    try {
      held = document.getAnimations().filter(function (a) { return a.playState === 'running'; });
      held.forEach(function (a) { a.pause(); });
    } catch (e) { held = []; }
    Array.prototype.forEach.call(document.querySelectorAll('video'), function (v) {
      if (!v.paused) { v.pause(); v.setAttribute('data-mana-paused', ''); }
    });
  };
  var play = function () {
    if (!frozen) return;
    frozen = false;
    held.forEach(function (a) { try { a.play(); } catch (e) { /* gone */ } });
    held = [];
    Array.prototype.forEach.call(document.querySelectorAll('video[data-mana-paused]'), function (v) {
      v.removeAttribute('data-mana-paused');
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
    schedule();
  };

  var ready = function () { setTimeout(function () { post({ type: 'ready' }); }, 150); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();

  var tourId = 0;
  var last = 0;
  var step = function (t) {
    if (frozen) return;
    var dt = last ? Math.min(64, t - last) : 16;
    last = t;
    var max = Math.min(document.documentElement.scrollHeight - innerHeight, innerHeight * 4);
    var y = Math.min(max, (window.scrollY || 0) + dt * innerHeight * 0.00042);
    window.scrollTo(0, y);
    if (y < max) tourId = nativeRAF(step);
  };
  if (o.thumb) {
    var css = document.createElement('style');
    css.textContent = 'html{scroll-behavior:auto!important;scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}';
    document.documentElement.appendChild(css);
  }

  window.addEventListener('message', function (e) {
    if (e.source !== parent || !e.data || !e.data.mana) return;
    var d = e.data;
    if (d.type === 'freeze') freeze();
    else if (d.type === 'play') play();
    else if (d.type === 'tour' && o.thumb) {
      nativeCAF(tourId);
      last = 0;
      if (d.on) tourId = nativeRAF(step);
      else if (d.instant) window.scrollTo(0, 0);
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

let adapter = null;
const loadAdapter = () => (adapter = adapter || import(`${RADAR}/lib/demo.js`).catch((e) => { adapter = null; throw e; }));

const pages = new Map();
function loadPage(id) {
  if (!pages.has(id)) {
    pages.set(id, fetch(`${RADAR}/api/plantillas?id=${encodeURIComponent(id)}&vitrina`)
      .then((r) => {
        if (!r.ok) throw new Error(`Radar respondió ${r.status}`);
        return r.json();
      })
      .catch((e) => { pages.delete(id); throw e; }));
  }
  return pages.get(id);
}

// Fetch ahead (network only), so a hover doesn't wait for the download.
export function prefetch(templates) {
  loadAdapter().catch(() => {});
  templates.forEach((t) => loadPage(t.id).catch(() => {}));
}

const built = new Map();
function buildPage(template, rubro, who, opts) {
  const key = `${template.id}|${rubro.clave}|${JSON.stringify(opts)}`;
  if (!built.has(key)) {
    built.set(key, Promise.all([loadAdapter(), loadPage(template.id)]).then(([{ adaptarPlantilla }, page]) => {
      const html = adaptarPlantilla(page.html, demoData(template, rubro, who), page.ejemplo || {});
      const script = `<script>(${bridge.toString()})(${JSON.stringify(opts)});</script>`;
      return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + script) : script + html;
    }).catch((e) => { built.delete(key); throw e; }));
  }
  return built.get(key);
}

// Messages from the previews, routed to whoever mounted each one.
const listeners = new Map();
window.addEventListener('message', (e) => {
  const fn = listeners.get(e.source);
  if (fn && e.data && e.data.mana) fn(e.data);
});
const listen = (frame, fn) => { if (frame.contentWindow) listeners.set(frame.contentWindow, fn); };
const tell = (frame, type, extra) => {
  if (frame.contentWindow) frame.contentWindow.postMessage(Object.assign({ mana: 1, type }, extra), '*');
};

// Load queue: two previews at a time, hovered ones first, each holding its slot until it has rendered.
const waiting = [];
let running = 0;
function enqueue(run, urgent) {
  const at = urgent ? waiting.filter((j) => j.urgent).length : waiting.length;
  waiting.splice(at, 0, { run, urgent });
  pump();
}
function pump() {
  while (running < 2 && waiting.length) {
    const { run } = waiting.shift();
    running += 1;
    run().finally(() => { running -= 1; pump(); });
  }
}

const previews = new Set();
export function freezeAll() { previews.forEach((p) => p.freeze()); }

// A live, scaled-down preview inside `host` (which sets its size). size(w, h) → the width the site is rendered at.
// settle: ms it keeps playing after loading before it freezes (0: freeze right away unless active).
export function createPreview({ template, rubro, who, host, size, settle = 2600 }) {
  const frame = document.createElement('iframe');
  frame.className = 'pv-frame';
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.setAttribute('tabindex', '-1');
  frame.setAttribute('aria-hidden', 'true');
  frame.title = `Vista previa de ${template.title}`;
  host.appendChild(frame);

  const fit = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    const vw = size(w, h);
    const s = w / vw;
    frame.style.width = `${vw}px`;
    frame.style.height = `${Math.ceil(h / s)}px`;
    frame.style.transform = `scale(${s})`;
  };
  const ro = 'ResizeObserver' in window ? new ResizeObserver(fit) : null;
  if (ro) ro.observe(host);
  fit();

  let state = 'idle';
  let queued = false;
  let active = false;
  let frozen = false;
  let timer = 0;

  const p = {
    template,
    load(urgent) {
      if (queued) return;
      queued = true;
      enqueue(() => new Promise((resolve) => {
        if (state === 'destroyed') { resolve(); return; }
        state = 'loading';
        buildPage(template, rubro, who, { thumb: true, every: 2, dpr: 1 }).then((html) => {
          if (state === 'destroyed') { resolve(); return; }
          const done = () => {
            if (state !== 'loading') return;
            state = 'ready';
            host.classList.add('is-ready');
            setTimeout(resolve, 400);
            if (active) p.activate();
            else timer = setTimeout(() => { if (!active) p.freeze(); }, settle);
          };
          listen(frame, (m) => { if (m.type === 'ready') done(); });
          frame.addEventListener('load', done, { once: true });
          setTimeout(done, 6000);
          frame.srcdoc = html;
        }).catch(() => {
          state = 'failed';
          host.classList.add('is-failed');
          resolve();
        });
      }), urgent);
    },
    // Hovered: plays and scrolls down by itself.
    activate() {
      active = true;
      clearTimeout(timer);
      if (state !== 'ready' || Mana.reducedMotion) return;
      if (frozen) { frozen = false; tell(frame, 'play'); }
      tell(frame, 'tour', { on: true });
    },
    // Plays for a moment (to finish its intro, or just to show it's alive) and freezes again.
    peek(ms = 2600) {
      if (active) return;
      clearTimeout(timer);
      if (state !== 'ready' || Mana.reducedMotion) return;
      if (frozen) { frozen = false; tell(frame, 'play'); }
      timer = setTimeout(() => { if (!active) p.freeze(); }, ms);
    },
    deactivate(delay = 900, instant = false) {
      active = false;
      if (state !== 'ready') return;
      tell(frame, 'tour', { on: false, instant });
      clearTimeout(timer);
      timer = setTimeout(() => p.freeze(), delay);
    },
    freeze() {
      clearTimeout(timer);
      if (state !== 'ready' || frozen) return;
      frozen = true;
      tell(frame, 'freeze');
    },
    // Loads when it gets near the screen.
    loadWhenNear(el) {
      if (!('IntersectionObserver' in window)) { p.load(); return; }
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((x) => x.isIntersecting)) return;
        io.disconnect();
        p.load();
      }, { rootMargin: '300px 0px' });
      io.observe(el);
    },
    destroy() {
      state = 'destroyed';
      clearTimeout(timer);
      if (ro) ro.disconnect();
      if (frame.contentWindow) listeners.delete(frame.contentWindow);
      previews.delete(p);
      frame.remove();
    },
  };
  previews.add(p);
  return p;
}

// ---------- Viewer: one design at a time, full screen, on desktop or phone size ----------
const ICON = {
  close: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path></svg>',
  prev: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
  next: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
  desktop: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"></rect><path d="M5.5 14h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>',
  mobile: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="4" y="1.5" width="8" height="13" rx="1.8" stroke="currentColor" stroke-width="1.5"></rect><path d="M7 12.2h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>',
};

const CONTACT = {
  whatsapp: (t) => (t ? 'En tu web, este botón abre WhatsApp con la consulta ya escrita:' : 'En tu web, este botón abre un chat de WhatsApp con vos.'),
  tel: () => 'En tu web, este botón llama directo a tu teléfono.',
  sms: () => 'En tu web, este botón te manda un mensaje de texto.',
  email: () => 'En tu web, este botón abre un email dirigido a vos.',
};

export function createViewer({ rubro, who, templates, onClose, onChange, contactHref }) {
  const host = document.querySelector('[data-mana-root]') || document.body;
  const M = window.Motion;
  const el = document.createElement('div');
  el.className = 'vw';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'vw-name');
  el.dataset.device = 'desktop';
  el.innerHTML = `
    <div class="vw-bar">
      <button type="button" class="vw-btn" data-vw="close" aria-label="Cerrar">${ICON.close}</button>
      <div class="vw-title"><span class="mono" data-vw="count"></span><strong class="d" id="vw-name" data-vw="name"></strong></div>
      <div class="vw-devices" role="group" aria-label="Ver como">
        <button type="button" data-vw="desktop" aria-pressed="true">${ICON.desktop}<span>Computadora</span></button>
        <button type="button" data-vw="mobile" aria-pressed="false">${ICON.mobile}<span>Celular</span></button>
      </div>
      <div class="vw-nav">
        <button type="button" class="vw-btn" data-vw="prev" aria-label="Diseño anterior">${ICON.prev}</button>
        <button type="button" class="vw-btn" data-vw="next" aria-label="Diseño siguiente">${ICON.next}</button>
      </div>
      <a class="btn vw-cta" href="${escapeHtml(contactHref)}">Quiero esta<span class="bi">${ICON.next}</span></a>
    </div>
    <div class="vw-stage">
      <div class="vw-device" data-vw="device">
        <iframe data-vw="frame" title="" sandbox="allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"></iframe>
      </div>
      <div class="vw-loading mono" data-vw="loading"><span class="vw-spin" aria-hidden="true"></span>Preparando el diseño…</div>
    </div>
    <div class="vw-toast" role="status" aria-live="polite" data-vw="toast"></div>`;
  host.appendChild(el);
  const $ = (k) => el.querySelector(`[data-vw="${k}"]`);
  const frame = $('frame');
  const toast = $('toast');
  const loading = $('loading');
  const root = document.documentElement;
  let index = 0;
  let open = false;
  let opener = null;
  let toastTimer = 0;
  let token = 0;
  let shown = Promise.resolve();

  const showToast = (m) => {
    const say = CONTACT[m.kind];
    if (!say) return;
    const quote = m.text ? `<q>${escapeHtml(m.text.length > 240 ? `${m.text.slice(0, 240)}…` : m.text)}</q>` : '';
    toast.innerHTML = `<span class="vw-toast-dot" aria-hidden="true"></span><span><strong>${escapeHtml(say(m.text))}</strong>${quote}</span>`;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), m.text ? 7000 : 4200);
  };

  const ready = () => { el.classList.add('is-ready'); loading.hidden = true; };
  const load = async (i) => {
    const t = templates[i];
    const mine = ++token;
    $('count').textContent = `${String(i + 1).padStart(2, '0')} / ${String(templates.length).padStart(2, '0')}`;
    $('name').textContent = t.title;
    frame.title = `Diseño ${t.title} para ${rubro.nombre}`;
    el.classList.remove('is-ready');
    loading.hidden = false;
    try {
      // The site starts once the opening animation is over, so the two don't fight for frames.
      const [html] = await Promise.all([buildPage(t, rubro, who, {}), shown]);
      if (mine !== token) return;
      listen(frame, (m) => {
        if (m.type === 'ready') ready();
        if (m.type === 'contact') showToast(m);
      });
      frame.srcdoc = html;
    } catch (e) {
      if (mine !== token) return;
      loading.textContent = 'No pudimos cargar este diseño. Probá de nuevo en un rato.';
    }
  };
  frame.addEventListener('load', () => { if (frame.hasAttribute('srcdoc')) ready(); });

  const go = (i) => {
    index = (i + templates.length) % templates.length;
    load(index);
    if (onChange) onChange(templates[index], index);
  };

  const setDevice = (d) => {
    el.dataset.device = d;
    $('desktop').setAttribute('aria-pressed', String(d === 'desktop'));
    $('mobile').setAttribute('aria-pressed', String(d === 'mobile'));
  };

  const clipFrom = (rect) => {
    if (!rect) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return `inset(${Math.max(0, rect.top)}px ${Math.max(0, vw - rect.right)}px ${Math.max(0, vh - rect.bottom)}px ${Math.max(0, rect.left)}px round 20px)`;
  };

  const focusables = () => Array.from(el.querySelectorAll('button:not([hidden]), a[href], iframe')).filter((x) => x.offsetParent !== null);
  const onKey = (e) => {
    if (!open) return;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (e.key === 'Escape') { e.preventDefault(); api.close(); }
    else if (e.key === 'ArrowRight' && !typing && templates.length > 1) go(index + 1);
    else if (e.key === 'ArrowLeft' && !typing && templates.length > 1) go(index - 1);
    else if (e.key === 'Tab') {
      const f = focusables();
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  document.addEventListener('keydown', onKey);

  $('close').addEventListener('click', () => api.close());
  $('prev').addEventListener('click', () => go(index - 1));
  $('next').addEventListener('click', () => go(index + 1));
  $('desktop').addEventListener('click', () => setDevice('desktop'));
  $('mobile').addEventListener('click', () => setDevice('mobile'));
  if (templates.length < 2) { $('prev').hidden = true; $('next').hidden = true; }

  const api = {
    get isOpen() { return open; },
    open(i, from) {
      opener = from && from.focus ? from : document.activeElement;
      const rect = from && from.getBoundingClientRect ? (from.querySelector('.pl-shot') || from).getBoundingClientRect() : null;
      if (!open) {
        open = true;
        freezeAll();
        el.hidden = false;
        root.classList.add('vw-lock');
        const start = clipFrom(rect);
        // Once it covers the screen, the page behind stops being painted.
        const cover = () => { if (open) root.classList.add('vw-covered'); };
        if (M && M.animate && !Mana.reducedMotion && start) {
          const anim = M.animate(el, { clipPath: [start, 'inset(0px 0px 0px 0px round 0px)'] }, { duration: 0.7, ease });
          shown = Promise.resolve(anim).then(() => { el.style.clipPath = 'none'; cover(); });
          M.animate(el.querySelector('.vw-bar'), { opacity: [0, 1], y: [-12, 0] }, { duration: 0.5, delay: 0.25, ease });
        } else {
          shown = Promise.resolve();
          cover();
        }
        $('close').focus({ preventScroll: true });
      }
      index = i;
      load(i);
    },
    close() {
      if (!open) return;
      open = false;
      token++;
      toast.classList.remove('is-on');
      tell(frame, 'freeze');
      root.classList.remove('vw-covered');
      const target = opener && opener.querySelector ? opener.querySelector('.pl-shot') || opener : null;
      const end = target && target.isConnected ? clipFrom(target.getBoundingClientRect()) : null;
      const finish = () => {
        el.hidden = true;
        el.style.clipPath = '';
        frame.removeAttribute('srcdoc');
        root.classList.remove('vw-lock');
        if (opener && opener.focus) opener.focus({ preventScroll: true });
        if (onClose) onClose();
      };
      if (M && M.animate && !Mana.reducedMotion && end) {
        Promise.resolve(M.animate(el, { clipPath: ['inset(0px 0px 0px 0px round 0px)', end] }, { duration: 0.5, ease })).then(finish);
      } else {
        finish();
      }
    },
    go,
  };
  return api;
}
