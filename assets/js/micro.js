// Micro-interactions: small answers to the pointer and the scroll all over the site (the big motion is in main.js).
// The ones that follow the mouse run only with a mouse; none run with reduced motion. Rows rendered later (the rubros
// list) are styled by CSS, so they need nothing here.
(function () {
  'use strict';

  const root = document.querySelector('[data-mana-root]');
  if (!root) return;
  const mq = (q) => !!(window.matchMedia && window.matchMedia(q).matches);
  if (mq('(prefers-reduced-motion: reduce)')) return;
  const fine = mq('(hover: hover) and (pointer: fine)');
  const all = (sel, scope) => Array.from((scope || root).querySelectorAll(sel));
  const M = window.Motion;

  // The header tightens and gets a shadow once the page scrolls.
  const header = root.querySelector('header');
  if (header) {
    let scrolled = null;
    const check = () => {
      const on = window.scrollY > 8;
      if (on !== scrolled) { scrolled = on; header.classList.toggle('is-scrolled', on); }
    };
    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  // Nav links roll their letters up, one after the other.
  all('.nav-links a').forEach((a) => {
    const text = a.textContent.trim();
    if (!text || a.querySelector('.roll')) return;
    a.setAttribute('aria-label', text);
    const roll = document.createElement('span');
    roll.className = 'roll';
    roll.setAttribute('aria-hidden', 'true');
    Array.from(text).forEach((c, i) => {
      const cell = document.createElement('span');
      cell.className = 'roll-c';
      cell.style.setProperty('--i', i);
      const ch = c === ' ' ? ' ' : c;
      cell.append(Object.assign(document.createElement('span'), { textContent: ch }), Object.assign(document.createElement('span'), { textContent: ch }));
      roll.appendChild(cell);
    });
    a.replaceChildren(roll);
  });

  // Section labels ("(01) Proyectos") decode themselves when they show up, and again on hover.
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&+=/';
  function scramble(el) {
    if (el.dataset.scrambling) return;
    el.dataset.scrambling = '1';
    const final = el.dataset.text;
    const total = 16;
    let frame = 0;
    const step = () => {
      frame++;
      const p = frame / total;
      el.textContent = Array.from(final).map((c, i) => (/[\s()·]/.test(c) || i / final.length < p ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
      if (frame < total) setTimeout(step, 34);
      else { el.textContent = final; delete el.dataset.scrambling; }
    };
    step();
  }
  const labels = all('section p.mono, section .lbl').filter((el) => /^\(\d+\)|^Archivo/.test(el.textContent.trim()) && !el.children.length);
  labels.forEach((el) => {
    el.dataset.text = el.textContent;
    if (fine) el.parentElement.addEventListener('mouseenter', () => scramble(el));
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      setTimeout(() => scramble(e.target), 250);
    }), { threshold: 1 });
    labels.forEach((el) => io.observe(el));
  }

  // Numbers count up the first time they're seen ("Proyectos 06").
  all('#proyectos h2 sup').forEach((sup) => {
    const end = parseInt(sup.textContent, 10);
    if (!end || !('IntersectionObserver' in window)) return;
    const width = sup.textContent.length;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / 1100);
        sup.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 3)))).padStart(width, '0');
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 1 });
    io.observe(sup);
  });

  // A few sparks fly from the point where a button is pressed.
  root.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn, .reel-btn, .pill-btn, .svc-cta');
    if (!b || e.button !== 0) return;
    burst(e.clientX, e.clientY, b.classList.contains('svc-cta') ? 6 : 10);
  });
  function burst(x, y, n) {
    const layer = document.createElement('div');
    layer.className = 'burst';
    layer.style.left = `${x}px`;
    layer.style.top = `${y}px`;
    document.body.appendChild(layer);
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const d = 26 + Math.random() * 26;
      s.style.background = i % 3 === 0 ? '#0D1117' : 'var(--mana)';
      layer.appendChild(s);
      s.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0)`, opacity: 0.2 },
      ], { duration: 520 + Math.random() * 260, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
    setTimeout(() => layer.remove(), 900);
  }

  if (!fine) return;

  // Project cards lean toward the pointer, with a glare that follows it.
  all('.work .card').forEach((card) => {
    const shot = card.firstElementChild;
    if (!shot) return;
    const glare = document.createElement('span');
    glare.className = 'glare';
    glare.setAttribute('aria-hidden', 'true');
    shot.appendChild(glare);
    shot.classList.add('lean');
    card.addEventListener('pointermove', (e) => {
      const r = shot.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      shot.style.setProperty('--rx', `${((0.5 - y) * 5).toFixed(2)}deg`);
      shot.style.setProperty('--ry', `${((x - 0.5) * 7).toFixed(2)}deg`);
      shot.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
      shot.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
    });
    card.addEventListener('pointerleave', () => {
      shot.style.setProperty('--rx', '0deg');
      shot.style.setProperty('--ry', '0deg');
    });
  });

  // Portraits: the big initial and the dot move against the tilt (main.js), so the card has depth.
  all('[data-m="tilt"]').forEach((t) => {
    t.addEventListener('pointermove', (e) => {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--tx', `${(((e.clientX - r.left) / r.width - 0.5) * -18).toFixed(1)}px`);
      t.style.setProperty('--ty', `${(((e.clientY - r.top) / r.height - 0.5) * -14).toFixed(1)}px`);
    });
    t.addEventListener('pointerleave', () => { t.style.setProperty('--tx', '0px'); t.style.setProperty('--ty', '0px'); });
  });

  // Contact card: "Hablemos." swells under the pointer like a dock, and the rings drift after it.
  const contact = root.querySelector('[data-x="contact"]');
  const word = contact && contact.querySelector('[data-x="letters"]');
  if (contact && word) {
    const text = word.textContent;
    word.setAttribute('aria-label', text);
    word.replaceChildren(...Array.from(text).map((c) => {
      const l = document.createElement('span');
      l.className = 'lt';
      l.setAttribute('aria-hidden', 'true');
      l.textContent = c;
      return l;
    }));
    const letters = all('.lt', word);
    let centers = [];
    const measure = () => { centers = letters.map((l) => { const r = l.getBoundingClientRect(); return r.left + r.width / 2; }); };
    contact.addEventListener('pointerenter', measure);
    contact.addEventListener('pointermove', (e) => {
      if (!centers.length) measure();
      const wr = word.getBoundingClientRect();
      const near = 1 - Math.min(1, Math.abs(e.clientY - (wr.top + wr.height / 2)) / (wr.height * 1.6));
      letters.forEach((l, i) => {
        const d = Math.abs(e.clientX - centers[i]);
        l.style.setProperty('--l', (Math.max(0, 1 - d / (wr.height * 1.4)) * near).toFixed(3));
      });
      const cr = contact.getBoundingClientRect();
      contact.style.setProperty('--cx', ((e.clientX - cr.left) / cr.width - 0.5).toFixed(3));
      contact.style.setProperty('--cy', ((e.clientY - cr.top) / cr.height - 0.5).toFixed(3));
    });
    contact.addEventListener('pointerleave', () => {
      letters.forEach((l) => l.style.setProperty('--l', 0));
      contact.style.setProperty('--cx', 0);
      contact.style.setProperty('--cy', 0);
      centers = [];
    });
    window.addEventListener('resize', () => { centers = []; });
  }

  // The cursor says hi over anything that opens "Hablemos".
  const blob = root.querySelector('[data-m="blob"]');
  const label = root.querySelector('[data-m="cursor-label"]');
  if (M && M.animate && blob && label) {
    const trigger = (t) => t && t.closest && t.closest('[data-hablemos], a[href="#contacto"], a[href="/#contacto"]');
    root.addEventListener('mouseover', (e) => {
      const a = trigger(e.target);
      if (!a || a.contains(e.relatedTarget)) return;
      label.textContent = '¡Hola!';
      M.animate(blob, { scale: 0.62 }, { type: 'spring', stiffness: 320, damping: 20 });
      M.animate(label, { opacity: 1 }, { duration: 0.2, delay: 0.05 });
    });
    root.addEventListener('mouseout', (e) => {
      const a = trigger(e.target);
      if (!a || a.contains(e.relatedTarget)) return;
      M.animate(label, { opacity: 0 }, { duration: 0.15 });
    });
  }
})();
