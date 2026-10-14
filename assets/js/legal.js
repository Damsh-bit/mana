// Legal: the cookie notice and its preferences (every page), the preferences panel on /legal/cookies/, the table of
// contents of the legal pages and the "botón de arrepentimiento" form. The site sets no cookies and has no analytics:
// what it keeps in the browser is listed on /legal/cookies/. Only "preferencias" (the Hablemos draft) needs a yes, and
// hablemos.js asks window.ManaConsent before saving anything. A new kind of storage or a tracker goes in that table,
// gets its own category here and bumps VERSION, so everyone is asked again.
(function () {
  'use strict';

  const KEY = 'mana:consent';
  const VERSION = 1;
  const MAX_MS = 365 * 24 * 3600 * 1000; // a choice is asked again after a year
  const OPTIONAL = { preferencias: ['mana:hablemos'] }; // what each optional category stores, removed when it's turned off
  const root = document.querySelector('[data-mana-root]') || document.body;
  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const EASE = 'cubic-bezier(.16,1,.3,1)';
  const anim = (el, frames, opts) => (reduced || !el || !el.animate ? null : el.animate(frames, { easing: EASE, ...opts }));

  /* ---------- the choice ---------- */
  function read() {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || 'null');
      return c && c.v === VERSION && Date.now() - c.t < MAX_MS ? c : null;
    } catch (e) { return null; }
  }
  let choice = read();

  function decide(preferencias) {
    choice = { v: VERSION, preferencias: !!preferencias, t: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(choice)); } catch (e) { /* private mode: asked again next visit */ }
    Object.keys(OPTIONAL).forEach((cat) => {
      if (!choice[cat]) OPTIONAL[cat].forEach((k) => { try { localStorage.removeItem(k); } catch (e) { /* nothing kept */ } });
    });
    document.dispatchEvent(new CustomEvent('mana:consent', { detail: { ...choice } }));
    paintPanels();
  }

  window.ManaConsent = {
    allows: (cat) => cat === 'necesarias' || !!(choice && choice[cat]),
    decided: () => !!choice,
    set: decide,
    open: () => show(true),
  };

  /* ---------- the notice ---------- */
  let box = null;
  function build() {
    if (box) return;
    box = document.createElement('div');
    box.className = 'ck';
    box.hidden = true;
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Aviso de cookies');
    box.innerHTML = `
      <p class="ck-t d"><i aria-hidden="true"></i>Sin cookies de seguimiento</p>
      <p class="ck-p">No usamos cookies de publicidad ni de analítica. Guardamos en tu navegador solo lo necesario para que el sitio funcione y, si aceptás, el borrador del formulario “Hablemos” para que no pierdas lo que escribiste. <a href="/legal/cookies/">Política de cookies</a></p>
      <p class="ck-now mono" data-ck-now hidden></p>
      <div class="ck-a">
        <button type="button" class="ck-no" data-ck="no">Solo lo necesario</button>
        <button type="button" class="ck-yes" data-ck="si">Aceptar</button>
      </div>`;
    root.appendChild(box);
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ck]');
      if (!b) return;
      decide(b.dataset.ck === 'si');
      hide();
    });
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape' && choice) hide(); });
  }

  let lastFocus = null;
  let closing = 0; // the pending hide, so opening it again in between wins
  function show(asked) {
    build();
    const now = box.querySelector('[data-ck-now]');
    now.hidden = !choice;
    if (choice) now.textContent = choice.preferencias ? 'Ahora: aceptaste todo' : 'Ahora: solo lo necesario';
    if (asked) lastFocus = document.activeElement;
    const wasOpen = !box.hidden && !closing;
    clearTimeout(closing);
    closing = 0;
    box.getAnimations().forEach((a) => a.cancel());
    box.hidden = false;
    if (!wasOpen) anim(box, [{ opacity: 0, transform: 'translateY(24px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 700 });
    if (asked) box.querySelector(choice && choice.preferencias ? '.ck-yes' : '.ck-no').focus({ preventScroll: true });
  }
  function hide() {
    if (!box || box.hidden || closing) return;
    if (lastFocus && lastFocus.focus && box.contains(document.activeElement)) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
    anim(box, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(16px)' }], { duration: 260, fill: 'forwards' });
    // A timer, not the animation's end: a page in the background doesn't run animations.
    closing = setTimeout(() => {
      closing = 0;
      box.hidden = true;
      box.getAnimations().forEach((a) => a.cancel());
    }, reduced ? 0 : 270);
  }

  // "Preferencias de cookies" (footer and cookie policy) opens it again.
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-consent-open]');
    if (!t) return;
    e.preventDefault();
    show(true);
  });

  /* ---------- the panel on /legal/cookies/ ---------- */
  function paintPanels() {
    document.querySelectorAll('[data-consent-switch]').forEach((s) => s.setAttribute('aria-checked', String(!!(choice && choice[s.dataset.consentSwitch]))));
    document.querySelectorAll('[data-consent-status]').forEach((p) => {
      p.textContent = !choice ? 'Todavía no elegiste: no guardamos el borrador.' : choice.preferencias ? 'Guardamos el borrador del formulario.' : 'Solo lo necesario: no guardamos el borrador.';
    });
  }
  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-consent-switch]');
    if (!s) return;
    decide(s.getAttribute('aria-checked') !== 'true');
    hide();
  });

  /* ---------- legal pages: the table of contents follows the reading ---------- */
  function toc() {
    const links = Array.from(document.querySelectorAll('.lg-toc a[href^="#"]'));
    if (!links.length || !window.IntersectionObserver) return;
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const seen = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) seen.add(en.target.id); else seen.delete(en.target.id); });
      const first = Array.from(byId.keys()).find((id) => seen.has(id));
      if (first) links.forEach((a) => a.classList.toggle('is-on', a === byId.get(first)));
    }, { rootMargin: '-90px 0px -55% 0px' });
    byId.forEach((a, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- botón de arrepentimiento / de baja ---------- */
  // No account and no extra steps: the request gets a code here and goes out by email or WhatsApp with everything in it.
  // We confirm the code within 24 hours by the same channel (Disposición 954/2025, art. 5).
  function arrepentimiento() {
    const form = document.querySelector('[data-arr]');
    if (!form) return;
    const q = new URLSearchParams(location.search);
    if (q.get('tipo') === 'baja') { const r = form.querySelector('input[name="tipo"][value="baja"]'); if (r) r.checked = true; }
    const out = document.querySelector('[data-arr-out]');
    const email = form.dataset.email || '';
    const wa = (form.dataset.whatsapp || '').replace(/\D/g, '');
    const ready = (v) => v && !/[[\]]/.test(v);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const val = (k) => String(f.get(k) || '').trim();
      let bad = null;
      form.querySelectorAll('[data-arr-err]').forEach((x) => { x.textContent = ''; });
      form.querySelectorAll('.is-error').forEach((x) => x.classList.remove('is-error'));
      const fail = (name, msg) => {
        if (bad) return;
        bad = form.querySelector(`[name="${name}"]`);
        const err = form.querySelector(`[data-arr-err="${name}"]`);
        if (err) err.textContent = msg;
        if (bad) { bad.closest('.arr-field').classList.add('is-error'); bad.focus(); }
      };
      if (val('nombre').length < 2) fail('nombre', 'Escribí tu nombre y apellido.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('email')) && val('telefono').replace(/\D/g, '').length < 6) fail('email', 'Dejanos un email o un teléfono para confirmarte la solicitud.');
      if (val('servicio').length < 3) fail('servicio', 'Contanos qué contrataste.');
      if (bad) return;

      const tipo = val('tipo') === 'baja' ? 'baja' : 'arrepentimiento';
      const code = `${tipo === 'baja' ? 'BAJA' : 'ARR'}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const title = tipo === 'baja' ? 'Solicitud de baja de servicio' : 'Solicitud de arrepentimiento (revocación)';
      const opt = (k, label) => (val(k) ? `${label}: ${val(k)}` : null);
      const body = [
        title, `Código: ${code}`, '',
        `Nombre: ${val('nombre')}`, opt('dni', 'DNI o CUIT'), opt('email', 'Email'), opt('telefono', 'Teléfono'),
        `Servicio: ${val('servicio')}`, opt('fecha', 'Fecha de contratación'),
        val('detalle') ? `\nDetalle: ${val('detalle')}` : null,
        '', `Enviada desde ${location.origin}/legal/arrepentimiento/ el ${new Date().toLocaleString('es-AR')}.`,
      ].filter((l) => l !== null).join('\n');

      out.querySelector('[data-arr-code]').textContent = code;
      out.querySelector('[data-arr-text]').textContent = body;
      const mail = out.querySelector('[data-arr-mail]');
      const whats = out.querySelector('[data-arr-wa]');
      mail.hidden = !ready(email);
      whats.hidden = !wa;
      if (ready(email)) mail.href = `mailto:${email}?subject=${encodeURIComponent(`${title} · ${code}`)}&body=${encodeURIComponent(body)}`;
      if (wa) whats.href = `https://wa.me/${wa}?text=${encodeURIComponent(body)}`;
      out.querySelector('[data-arr-none]').hidden = ready(email) || !!wa;
      out.hidden = false;
      anim(out, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 600 });
      out.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
      out.focus({ preventScroll: true });
    });

    const copy = document.querySelector('[data-arr-copy]');
    if (copy) copy.addEventListener('click', () => {
      const t = document.querySelector('[data-arr-text]').textContent;
      const ok = () => { copy.textContent = 'Copiado'; setTimeout(() => { copy.textContent = 'Copiar el texto'; }, 2000); };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok, () => {}); else ok();
    });
  }

  function start() {
    paintPanels();
    toc();
    arrepentimiento();
    // Asked once, after the page's entrance: no choice means nothing optional is kept.
    if (!choice) setTimeout(() => { if (!choice) show(false); }, reduced ? 0 : 1600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
