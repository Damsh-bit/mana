// Rubros list: the home section ([data-rubros="home"]) and the /rubros/ page ([data-rubros="index"]). Built from the
// catalog Radar publishes, so a rubro shows up here as soon as it has an active template.
import { loadCatalog, rubroUrl, plural, pad, escapeHtml } from './catalogo.js';
import { mockupHtml } from './mockup.js';

const Mana = window.Mana || { reveal: () => {}, refresh: () => {}, reducedMotion: false };
const HOME_LIMIT = 8;

const ARROW = '<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M4.5 11.5l7-7M5.5 4.5h6v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

export function rowHtml(r, i) {
  const t = r.templates;
  const dots = t.slice(0, 5).map((x) => `<i style="background:${x.palette.main}"></i>`).join('');
  return `<li class="rb-item">
    <a class="rb-row" href="${rubroUrl(r.clave)}" data-m="card" data-rubro="${escapeHtml(r.clave)}" style="--rb-c:${t[0].palette.main}">
      <span class="rb-num mono">${pad(i + 1)}</span>
      <span class="rb-main">
        <span class="rb-name d" data-m="title">${escapeHtml(r.nombre)}</span>
        <span class="rb-cat mono">${escapeHtml(r.categoriaNombre)}</span>
      </span>
      <span class="rb-dots" aria-hidden="true">${dots}</span>
      <span class="rb-count mono">${plural(t.length, 'diseño', 'diseños')}</span>
      <span class="arrow rb-arrow" data-m="arrow" aria-hidden="true">${ARROW}</span>
      <span class="rb-strip" aria-hidden="true">${t.slice(0, 4).map((x) => mockupHtml(x, 'rb-mini')).join('')}</span>
    </a>
  </li>`;
}

export function revealRows(list) {
  Array.from(list.children).forEach((li, i) => Mana.reveal(li, Math.min(i, 10) * 0.06));
}

export function errorHtml(text) {
  return `<div class="rb-error" role="alert"><p>${escapeHtml(text)}</p><button type="button" class="pill-btn" data-retry>Reintentar</button></div>`;
}

// A fan of the rubro's designs that follows the pointer over the list (desktop only).
export function floater(byKey) {
  const gsap = window.gsap;
  const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (Mana.reducedMotion || !fine || !gsap) return { attach() {} };
  const host = document.querySelector('[data-mana-root]') || document.body;
  const el = document.createElement('div');
  el.className = 'rb-float';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<div class="rb-fan"></div>';
  host.appendChild(el);
  const fan = el.firstChild;
  gsap.set(el, { opacity: 0, scale: 0.85 });
  const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
  const W = 320;
  const H = 240;
  let current = null;

  const place = (e, instant) => {
    const right = e.clientX + 70 + W + 90 < window.innerWidth;
    const x = right ? e.clientX + 70 + 90 : e.clientX - 70 - W - 90;
    const y = Math.min(Math.max(e.clientY - H / 2, 24), window.innerHeight - H - 24);
    if (instant) gsap.set(el, { x, y });
    else { xTo(x); yTo(y); }
  };
  const show = (rubro, e) => {
    if (!rubro || current === rubro.clave) return;
    const first = current === null;
    current = rubro.clave;
    fan.innerHTML = rubro.templates.slice(0, 3).map((t) => mockupHtml(t, 'rb-card')).join('');
    const cards = Array.from(fan.children);
    const mid = (cards.length - 1) / 2;
    cards.forEach((c, i) => {
      const off = i - mid;
      c.style.zIndex = String(10 - Math.abs(off) * 2);
      gsap.fromTo(c, { x: 0, y: 46, rotation: 0, opacity: 0, scale: 0.9 }, {
        x: off * 78, y: Math.abs(off) * 14, rotation: off * 8, opacity: 1, scale: 1,
        duration: 0.8, ease: 'expo.out', delay: i * 0.05,
      });
    });
    if (first) {
      place(e, true);
      gsap.to(el, { opacity: 1, scale: 1, duration: 0.45, ease: 'expo.out' });
    }
  };
  const hide = () => {
    if (current === null) return;
    current = null;
    gsap.to(el, { opacity: 0, scale: 0.85, duration: 0.3, ease: 'power2.out' });
  };
  window.addEventListener('scroll', hide, { passive: true });
  return {
    attach(scope) {
      scope.addEventListener('mousemove', (e) => {
        const row = e.target.closest('.rb-row');
        if (!row) return hide();
        show(byKey(row.dataset.rubro), e);
        place(e);
      });
      scope.addEventListener('mouseleave', hide);
    },
  };
}

function countUp(el, n) {
  if (!el) return;
  const M = window.Motion;
  el.textContent = pad(n);
  if (Mana.reducedMotion || !M || !M.animate || !M.inView) return;
  el.textContent = '00';
  M.inView(el, () => {
    M.animate(0, n, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => { el.textContent = pad(Math.round(v)); } });
  });
}

function swap(list, render) {
  const M = window.Motion;
  if (Mana.reducedMotion || !M || !M.animate) { render(); return; }
  const out = M.animate(list, { opacity: [1, 0], y: [0, 10] }, { duration: 0.18, ease: 'easeIn' });
  const done = () => {
    render();
    list.style.removeProperty('opacity');
    list.style.removeProperty('transform');
  };
  if (out && out.then) out.then(done); else done();
}

async function initHome(section) {
  const list = section.querySelector('[data-rubros-list]');
  const chips = section.querySelector('[data-rubros-chips]');
  const more = section.querySelector('[data-rubros-more]');
  let catalog;
  try {
    catalog = await loadCatalog();
  } catch (e) {
    list.innerHTML = errorHtml('No pudimos cargar los rubros. Revisá la conexión y probá de nuevo.');
    list.querySelector('[data-retry]').addEventListener('click', () => initHome(section));
    return;
  }
  if (!catalog.rubros.length) { section.hidden = true; return; }

  countUp(section.querySelector('[data-rubros-count]'), catalog.total);
  const render = (cat) => {
    const rubros = catalog.rubros.filter((r) => !cat || r.categoria === cat);
    list.innerHTML = rubros.slice(0, HOME_LIMIT).map(rowHtml).join('');
    revealRows(list);
    if (more) {
      const hidden = rubros.length > HOME_LIMIT;
      more.hidden = !hidden;
      if (hidden) more.querySelector('[data-rubros-more-label]').textContent = `Ver los ${rubros.length} rubros`;
    }
  };
  render('');

  if (chips && catalog.categorias.length > 1) {
    const opts = [{ clave: '', nombre: 'Todos', n: catalog.rubros.length },
      ...catalog.categorias.map((c) => ({ ...c, n: catalog.rubros.filter((r) => r.categoria === c.clave).length }))];
    chips.innerHTML = opts.map((o, i) => `<button type="button" class="chip" data-cat="${escapeHtml(o.clave)}" aria-pressed="${i === 0}">${escapeHtml(o.nombre)}<span class="mono">${o.n}</span></button>`).join('');
    chips.hidden = false;
    Mana.reveal(chips, 0.1);
    chips.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn || btn.getAttribute('aria-pressed') === 'true') return;
      chips.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      swap(list, () => render(btn.dataset.cat));
    });
  }
  floater((k) => catalog.rubro(k)).attach(list);
  Mana.refresh();
}

async function initIndex(section) {
  const groups = section.querySelector('[data-rubros-groups]');
  let catalog;
  try {
    catalog = await loadCatalog();
  } catch (e) {
    groups.innerHTML = errorHtml('No pudimos cargar los rubros. Revisá la conexión y probá de nuevo.');
    groups.querySelector('[data-retry]').addEventListener('click', () => initIndex(section));
    return;
  }
  countUp(section.querySelector('[data-rubros-count]'), catalog.total);
  const total = section.querySelector('[data-rubros-total]');
  if (total) total.textContent = `${plural(catalog.rubros.length, 'rubro', 'rubros')} · ${plural(catalog.total, 'diseño', 'diseños')}`;
  let i = 0;
  groups.innerHTML = catalog.categorias.map((c) => {
    const rubros = catalog.rubros.filter((r) => r.categoria === c.clave);
    const rows = rubros.map((r) => rowHtml(r, i++)).join('');
    return `<div class="rb-group">
      <div class="rb-group-head mono"><span>${escapeHtml(c.nombre)}</span><span>${plural(rubros.length, 'rubro', 'rubros')}</span></div>
      <ol class="rb-list">${rows}</ol>
    </div>`;
  }).join('') || '<p class="rb-empty">Todavía no hay diseños publicados.</p>';
  groups.querySelectorAll('.rb-list').forEach(revealRows);
  floater((k) => catalog.rubro(k)).attach(groups);
  Mana.refresh();
}

const home = document.querySelector('[data-rubros="home"]');
if (home) initHome(home);
const index = document.querySelector('[data-rubros="index"]');
if (index) initIndex(index);
