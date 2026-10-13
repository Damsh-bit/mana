// One rubro (/rubros/<clave>): every active template for it, live, plus a full-screen viewer. This is the link that goes
// to a client: ?para=<name> puts their name in every design, ?pais=ES|MX|US|CA adapts prices and words, ?color=<hex>
// switches the designs to their brand color, and ?ver=<template> opens one straight away.
import { loadCatalog, rubroFromUrl, rubroUrl, plural, pad, escapeHtml, lowerFirst } from './catalogo.js';
import { mockupHtml } from './mockup.js';
import { rowHtml, revealRows, floater, errorHtml } from './rubros.js';
import { personalization, createPreview, createViewer } from './vitrina.js';

const Mana = window.Mana || { reveal: () => {}, refresh: () => {}, reducedMotion: false };
const page = document.querySelector('[data-rubro-page]');
const who = personalization();
const CONTACT = '/#contacto';

const ARROW = '<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M4.5 11.5l7-7M5.5 4.5h6v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

const $ = (sel) => page.querySelector(sel);
const words = (text) => text.split(/\s+/).filter(Boolean)
  .map((w) => `<span class="mask"><span class="w">${escapeHtml(w)}</span></span>`).join(' ');
const line = (text) => `<span class="rh-line">${words(text)}</span>`;

function setMeta(name, content) {
  let m = document.querySelector(`meta[name="${name}"]`);
  if (!m) { m = document.createElement('meta'); m.setAttribute('name', name); document.head.appendChild(m); }
  m.setAttribute('content', content);
}

function animateHero() {
  page.classList.remove('is-loading');
  const gsap = window.gsap;
  if (!gsap || Mana.reducedMotion) return;
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .from(page.querySelectorAll('.rh-title .w'), { yPercent: 120, duration: 1.3, stagger: 0.07 })
    .from(page.querySelectorAll('[data-rh-fade]'), { y: 24, opacity: 0, duration: 1, stagger: 0.08, clearProps: 'transform,opacity' }, 0.3);
}

function renderHero(rubro) {
  const n = rubro.templates.length;
  const nombre = lowerFirst(rubro.nombre);
  $('[data-rh-crumb]').textContent = rubro.categoriaNombre || 'Rubro';
  $('[data-rh-count]').textContent = plural(n, 'diseño', 'diseños');
  const title = $('[data-rh-title]');
  const lead = $('[data-rh-lead]');
  if (who.para) {
    const forLine = $('[data-rh-for]');
    forLine.querySelector('span:last-child').textContent = `Propuesta para ${who.para}`;
    forLine.hidden = false;
    title.innerHTML = `${line('Así podría verse')} ${line(`la web de ${who.para}.`)}`;
    title.classList.toggle('is-long', who.para.length > 16);
    lead.textContent = `Tomamos ${n === 1 ? 'un diseño pensado' : `${n} diseños pensados`} para ${nombre} y les pusimos tu nombre. Los textos, las fotos y los colores se ajustan a tu negocio. Tocá cualquiera y recorrelo como si ya fuera tu web.`;
    document.title = `Propuesta para ${who.para} — Maná`;
    setMeta('robots', 'noindex, nofollow');
  } else {
    title.innerHTML = `${line('Webs para')} ${line(`${nombre}.`)}`;
    title.classList.toggle('is-long', nombre.length > 30);
    lead.textContent = `${n === 1 ? 'Un diseño pensado' : `${n} diseños pensados`} para ${nombre}: lo que tus clientes buscan antes de escribirte, a un toque. Tocá cualquiera y recorrelo como si ya fuera tu web.`;
    document.title = `Webs para ${nombre} — Maná`;
  }
  setMeta('description', lead.textContent);
}

function cardHtml(rubro, t, i) {
  const ideal = t.enfoques.map((e) => e.nombre).join(' · ');
  const swatches = (who.color ? [who.color] : t.palette.swatches).map((c) => `<i style="background:${c}"></i>`).join('');
  return `<article class="pl${i % 3 === 0 ? ' pl-wide' : ''}">
    <a class="pl-card" href="${rubroUrl(rubro.clave, { ver: t.id })}" data-m="card" data-cursor="Recorrer" data-index="${i}" aria-label="Recorrer el diseño ${escapeHtml(t.title)}">
      <div class="pl-shot" style="--mk-c:${t.palette.main}">
        <div class="pl-media" data-m="media">${mockupHtml(t, 'pl-skel')}</div>
      </div>
      <div class="pl-info">
        <div class="pl-text">
          <span class="pl-num mono">${pad(i + 1)} / ${pad(rubro.templates.length)}<span class="pl-badge"><i aria-hidden="true"></i>Vista en vivo</span></span>
          <h2 class="pl-title d" data-m="title">${escapeHtml(t.title)}</h2>
          ${t.detail ? `<p class="pl-detail">${escapeHtml(t.detail)}</p>` : ''}
          ${ideal ? `<p class="pl-for mono">Ideal para ${escapeHtml(ideal)}</p>` : ''}
          ${t.idioma === 'en' ? '<p class="pl-for mono">En inglés</p>' : ''}
        </div>
        <div class="pl-side">
          <span class="pl-sw" aria-hidden="true">${swatches}</span>
          <span class="arrow" data-m="arrow" aria-hidden="true">${ARROW}</span>
        </div>
      </div>
    </a>
  </article>`;
}

function verUrl(id) {
  const u = new URL(location.href);
  if (id) u.searchParams.set('ver', id); else u.searchParams.delete('ver');
  return `${u.pathname}${u.search}${u.hash}`;
}

function renderGallery(rubro) {
  const grid = $('[data-rubro-grid]');
  const templates = rubro.templates;
  grid.innerHTML = templates.map((t, i) => cardHtml(rubro, t, i)).join('');
  const cards = Array.from(grid.querySelectorAll('.pl-card'));
  // A landscape card shows the desktop site; a portrait one (phones) shows the mobile site.
  const size = (w, h) => (h > w ? 390 : w < 760 ? 1280 : 1440);
  const thumbs = cards.map((card, i) => {
    const p = createPreview({ template: templates[i], rubro, who, host: card.querySelector('.pl-media'), size });
    p.loadWhenNear(card);
    return p;
  });
  cards.forEach((card, i) => {
    Mana.reveal(card.parentElement, i % 3 === 0 ? 0 : (i % 3 - 1) * 0.12);
    card.addEventListener('mouseenter', () => thumbs[i].activate());
    card.addEventListener('mouseleave', () => thumbs[i].deactivate());
  });

  // Opening adds a history entry, so the phone's back button closes the viewer. Closing it from the page just rewrites
  // the address: history.back() can't be trusted (Chrome skips entries it considers unprompted, even out of the site).
  const viewer = createViewer({
    rubro, who, templates, contactHref: CONTACT,
    onChange: (t) => history.replaceState({ ver: t.id }, '', verUrl(t.id)),
    onClose: () => history.replaceState(null, '', verUrl('')),
  });
  const openAt = (i, from) => {
    viewer.open(i, from);
    history.pushState({ ver: templates[i].id }, '', verUrl(templates[i].id));
  };
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.pl-card');
    if (!card || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    openAt(Number(card.dataset.index), card);
  });
  window.addEventListener('popstate', () => {
    const ver = new URLSearchParams(location.search).get('ver');
    const i = templates.findIndex((t) => t.id === ver);
    if (i >= 0) { if (!viewer.isOpen) viewer.open(i, cards[i]); else viewer.go(i); }
    else if (viewer.isOpen) viewer.close();
  });
  const first = templates.findIndex((t) => t.id === new URLSearchParams(location.search).get('ver'));
  if (first >= 0) viewer.open(first, null);
}

function renderOthers(catalog, rubro) {
  const section = $('[data-rubro-others]');
  const list = section.querySelector('[data-rubros-list]');
  const others = catalog.rubros.filter((r) => !rubro || r.clave !== rubro.clave);
  if (!others.length) { section.hidden = true; return; }
  if (!rubro) section.querySelector('[data-others-title]').textContent = 'Rubros con diseños';
  list.innerHTML = others.slice(0, 8).map(rowHtml).join('');
  revealRows(list);
  floater((k) => catalog.rubro(k)).attach(list);
}

function renderMissing(catalog) {
  page.classList.add('is-missing');
  $('[data-rh-crumb]').textContent = 'Rubro';
  $('[data-rh-count]').textContent = '';
  $('[data-rh-title]').innerHTML = `${line('Ese rubro')} ${line('todavía no está.')}`;
  $('[data-rh-lead]').textContent = 'Mirá los rubros que ya tienen diseños, o contanos de tu negocio: también hacemos webs desde cero.';
  $('[data-rh-cta]').textContent = 'Contanos de tu negocio';
  $('[data-rh-ver]').hidden = true;
  $('[data-share]').hidden = true;
  $('[data-rubro-gallery]').hidden = true;
  document.title = 'Rubro sin diseños todavía — Maná';
  setMeta('robots', 'noindex');
  renderOthers(catalog, null);
  animateHero();
}

function setupShare() {
  const btn = $('[data-share]');
  if (!btn) return;
  const label = btn.querySelector('[data-share-label]');
  btn.addEventListener('click', async () => {
    const url = `${location.origin}${verUrl('')}`;
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: document.title, url }); return; }
      await navigator.clipboard.writeText(url);
      label.textContent = 'Link copiado';
    } catch (e) {
      label.textContent = 'Copiá el link de arriba';
    }
    setTimeout(() => { label.textContent = 'Compartir'; }, 2400);
  });
}

async function init() {
  const clave = rubroFromUrl();
  let catalog;
  try {
    catalog = await loadCatalog();
  } catch (e) {
    page.classList.remove('is-loading');
    $('[data-rh-title]').innerHTML = line('No pudimos cargar los diseños.');
    const grid = $('[data-rubro-grid]');
    grid.innerHTML = errorHtml('Revisá la conexión y probá de nuevo.');
    grid.querySelector('[data-retry]').addEventListener('click', () => location.reload());
    return;
  }
  const rubro = catalog.rubro(clave);
  if (!rubro) { renderMissing(catalog); return; }
  renderHero(rubro);
  renderGallery(rubro);
  renderOthers(catalog, rubro);
  setupShare();
  animateHero();
  Mana.refresh();
}

if (page) init();
