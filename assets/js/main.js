(function () {
  'use strict';

  const root = document.querySelector('[data-mana-root]');
  if (!root) return;

  const mq = (q) => !!(window.matchMedia && window.matchMedia(q).matches);
  const all = (sel, scope) => Array.from((scope || root).querySelectorAll(sel));
  const reducedMotion = mq('(prefers-reduced-motion: reduce)');

  // Hooks for content rendered after load (the rubros catalog). No-ops until motion is set up, and without motion.
  const api = { reducedMotion, reveal: () => {}, refresh: () => {} };
  window.Mana = api;

  // Hover in/out by delegation, so cards added later behave like the ones in the markup.
  const hoverable = (selector, enter, leave) => {
    const handle = (fn) => (e) => {
      const el = e.target.closest && e.target.closest(selector);
      if (el && root.contains(el) && !el.contains(e.relatedTarget)) fn(el);
    };
    root.addEventListener('mouseover', handle(enter));
    root.addEventListener('mouseout', handle(leave));
  };

  // ---------- Projects carousel ----------
  // Without motion (reduced motion / no JS) the reel stays a native, snap-scrolling
  // strip. With motion it becomes an endless auto-playing loop you can drag.
  function setupReel(reel) {
    const track = reel.querySelector('[data-reel-track]');
    const prevBtn = root.querySelector('[data-reel-prev]');
    const nextBtn = root.querySelector('[data-reel-next]');
    const originals = Array.from(track.children);
    const gsap = window.gsap;

    const stepSize = () => {
      const first = originals[0];
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return first ? first.getBoundingClientRect().width + gap : 300;
    };

    if (reducedMotion || !gsap) {
      if (prevBtn) prevBtn.addEventListener('click', () => reel.scrollBy({ left: -stepSize(), behavior: 'smooth' }));
      if (nextBtn) nextBtn.addEventListener('click', () => reel.scrollBy({ left: stepSize(), behavior: 'smooth' }));
      return;
    }

    reel.classList.add('is-live');

    // Clone the set until a full screen of extra cards follows it, so the loop never shows a gap.
    // Clones are made once (before hover handlers are bound); a resize only re-measures.
    const clones = [];
    let loopWidth = 0;
    const measure = () => {
      loopWidth = clones[0] ? clones[0].offsetLeft - originals[0].offsetLeft : track.scrollWidth;
    };
    const fill = () => {
      const need = () => loopWidth + Math.max(reel.clientWidth, window.screen ? window.screen.width : 0);
      let guard = 0;
      while ((!clones.length || track.scrollWidth < need()) && guard < 6) {
        originals.forEach((item) => {
          const c = item.cloneNode(true);
          c.setAttribute('aria-hidden', 'true');
          c.setAttribute('tabindex', '-1');
          track.appendChild(c);
          clones.push(c);
        });
        measure();
        guard++;
      }
    };
    fill();

    const state = { x: 0 };
    let speed = 0;            // current multiplier of the autoplay speed (eased)
    let targetSpeed = 1;
    const AUTO = 42;          // px per second
    let hovering = false;
    let visible = true;
    let dragging = false;
    let moved = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let tween = null;

    const wrap = (v) => {
      if (!loopWidth) return 0;
      return ((v % loopWidth) - loopWidth) % loopWidth;
    };

    const render = () => { gsap.set(track, { x: wrap(state.x), force3D: true }); };

    const tick = (time, deltaTime) => {
      const dt = Math.min(deltaTime, 64) / 1000;
      targetSpeed = hovering || dragging || !visible ? 0 : 1;
      speed += (targetSpeed - speed) * Math.min(1, dt * 4);
      if (!dragging && !tween) {
        state.x -= AUTO * speed * dt;
        if (Math.abs(velocity) > 2) {
          state.x += velocity * dt;
          velocity *= Math.pow(0.04, dt); // inertia after a fling
        } else {
          velocity = 0;
        }
      }
      render();
    };
    gsap.ticker.add(tick);

    const nudge = (dir) => {
      velocity = 0;
      if (tween) tween.kill();
      tween = gsap.to(state, {
        x: state.x - dir * stepSize(),
        duration: 0.9,
        ease: 'expo.out',
        onComplete: () => { tween = null; }
      });
    };
    if (prevBtn) prevBtn.addEventListener('click', () => nudge(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => nudge(1));

    reel.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovering = true; });
    reel.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hovering = false; });

    // Drag / swipe
    reel.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      moved = 0;
      velocity = 0;
      lastX = e.clientX;
      lastT = performance.now();
      if (tween) { tween.kill(); tween = null; }
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      moved += Math.abs(dx);
      if (moved > 6 && !reel.classList.contains('is-dragging')) {
        reel.classList.add('is-dragging');
        try { reel.setPointerCapture(e.pointerId); } catch (err) { /* already released */ }
      }
      state.x += dx;
      const dt = Math.max(1, now - lastT);
      velocity = velocity * 0.6 + (dx / dt) * 1000 * 0.4;
      lastX = e.clientX;
      lastT = now;
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      if (performance.now() - lastT > 90) velocity = 0;
      // Keep the drag state for a frame so the click that ends a drag doesn't open a card.
      requestAnimationFrame(() => { moved = 0; reel.classList.remove('is-dragging'); });
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    reel.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    reel.addEventListener('dragstart', (e) => e.preventDefault());

    // Keyboard: bring the focused card into view.
    reel.addEventListener('focusin', (e) => {
      const item = e.target.closest('.reel-item');
      if (!item) return;
      reel.scrollLeft = 0;
      const pad = parseFloat(getComputedStyle(reel).getPropertyValue('--edge')) || 24;
      const r = item.getBoundingClientRect();
      const box = reel.getBoundingClientRect();
      if (r.left < box.left + pad || r.right > box.right - pad) {
        state.x -= r.left - box.left - pad;
        render();
      }
      hovering = true;
    });
    reel.addEventListener('focusout', () => { hovering = false; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }).observe(reel);
    }

    window.addEventListener('resize', () => { measure(); fill(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  }

  // ---------- Page motion (GSAP + Motion), ported from the design ----------
  function startMotion() {
    const gsap = window.gsap;
    const ST = window.ScrollTrigger;
    const M = window.Motion;
    const desktop = root.getBoundingClientRect().width >= 760 && mq('(hover: hover) and (pointer: fine)');
    const ease = [0.16, 1, 0.3, 1];
    const soft = { type: 'spring', stiffness: 260, damping: 24 };
    const pending = new Map();

    // GSAP: intro, marquee, parallax, wordmark
    let footTl = null;
    if (gsap) {
      if (ST) gsap.registerPlugin(ST);
      gsap.context(() => {
        gsap.timeline({ defaults: { ease: 'expo.out' } })
          .from(all('[data-g="nav"]'), { y: -18, opacity: 0, duration: 1, stagger: 0.07 }, 0)
          .from(all('[data-g="word"]'), { yPercent: 120, duration: 1.4, stagger: 0.09 }, 0.15)
          .from(all('[data-g="acc"]'), { y: -36, rotation: -150, opacity: 0, duration: 1.2, ease: 'back.out(2.4)' }, 0.5)
          .from(all('[data-g="mark"]'), { scaleX: 0, transformOrigin: '0% 50%', duration: 1.2, ease: 'expo.inOut' }, 0.85)
          .from(all('[data-g="fade"]'), { y: 26, opacity: 0, duration: 1.1, stagger: 0.1 }, 0.7);

        all('[data-g="marquee"]').forEach((track) => {
          const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 34, repeat: -1 });
          const band = track.parentElement;
          band.addEventListener('mouseenter', () => gsap.to(loop, { timeScale: 0.2, duration: 0.8, ease: 'power2.out' }));
          band.addEventListener('mouseleave', () => gsap.to(loop, { timeScale: 1, duration: 0.8, ease: 'power2.out' }));
        });

        gsap.to(all('[data-g="cue"]'), { y: 4, duration: 0.9, ease: 'sine.inOut', repeat: -1, yoyo: true });

        if (ST) {
          all('[data-g="parallax"]').forEach((el) => {
            gsap.fromTo(el, { yPercent: 3 }, {
              yPercent: -3, ease: 'none',
              scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.8 }
            });
          });
        }

        const foot = root.querySelector('[data-g="foot"]');
        if (foot) {
          footTl = gsap.timeline({ paused: true })
            .from(all('[data-g="fl"]', foot), { yPercent: 110, duration: 1.5, ease: 'expo.out', stagger: 0.08 })
            .from(all('[data-g="facc"]', foot), { y: -140, rotation: -220, opacity: 0, duration: 1.3, ease: 'back.out(1.8)' }, 0.5);
        }
      }, root);
      if (ST && document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => ST.refresh());
      }
      if (ST) api.refresh = () => ST.refresh();
    }

    // The carousel clones its cards, so it must exist before hover handlers are bound.
    all('[data-reel]').forEach(setupReel);

    // Motion: reveals, hovers, cursor, scroll progress
    if (M && M.animate && M.inView) {
      const { animate, inView, scroll } = M;

      const whenVisible = (el, run, amount) => {
        pending.set(el, run);
        inView(el, () => {
          if (!pending.has(el)) return;
          pending.delete(el);
          run();
        }, { amount: amount || 0.15 });
      };

      const reveal = (el, delay) => {
        animate(el, { opacity: 0, y: 40 }, { duration: 0 });
        whenVisible(el, () => {
          const a = animate(el, { opacity: [0, 1], y: [40, 0] }, { duration: 1.1, delay: delay || 0, ease });
          if (a && a.then) a.then(() => { el.style.removeProperty('opacity'); el.style.removeProperty('transform'); });
        });
      };
      all('[data-m="reveal"]').forEach((el) => reveal(el, 0));
      all('[data-m="stagger"]').forEach((group) => {
        Array.from(group.children).forEach((child, i) => reveal(child, i * 0.1));
      });
      api.reveal = reveal;

      const foot = root.querySelector('[data-g="foot"]');
      if (foot && footTl) whenVisible(foot, () => footTl.play(), 0.3);

      // Safety net: anything already on screen shows up even if the observer can't fire.
      setTimeout(() => {
        const vh = window.innerHeight || 0;
        pending.forEach((run, el) => {
          const r = el.getBoundingClientRect();
          if (r.top < vh && r.bottom > 0) { pending.delete(el); run(); }
        });
      }, 2200);

      all('[data-m="pulse"]').forEach((el) => {
        animate(el, { scale: [1, 2.8], opacity: [0.6, 0] }, { duration: 1.8, repeat: Infinity, ease: 'easeOut' });
      });

      const bar = root.querySelector('[data-m="progress"]');
      if (bar && scroll) scroll(animate(bar, { scaleX: [0, 1] }, { ease: 'linear' }));

      const lens = { type: 'spring', stiffness: 150, damping: 22 };
      const cardParts = (card) => ['media', 'arrow', 'title'].map((k) => card.querySelector(`[data-m="${k}"]`));
      hoverable('[data-m="card"]', (card) => {
        const [media, arrow, title] = cardParts(card);
        if (media) animate(media, { scale: 1.035 }, lens);
        if (arrow) animate(arrow, { rotate: 45 }, soft);
        if (title) animate(title, { x: 10 }, soft);
      }, (card) => {
        const [media, arrow, title] = cardParts(card);
        if (media) animate(media, { scale: 1 }, lens);
        if (arrow) animate(arrow, { rotate: 0 }, soft);
        if (title) animate(title, { x: 0 }, soft);
      });

      if (desktop) {
        all('[data-m="magnet"]').forEach((el) => {
          el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            animate(el, { x: (e.clientX - r.left - r.width / 2) * 0.28, y: (e.clientY - r.top - r.height / 2) * 0.4 }, { type: 'spring', stiffness: 320, damping: 18 });
          });
          el.addEventListener('pointerleave', () => animate(el, { x: 0, y: 0 }, { type: 'spring', stiffness: 260, damping: 13 }));
        });

        all('[data-m="tilt"]').forEach((el) => {
          el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            animate(el, { rotateY: px * 12, rotateX: -py * 12, scale: 1.02 }, { type: 'spring', stiffness: 200, damping: 20 });
          });
          el.addEventListener('pointerleave', () => animate(el, { rotateY: 0, rotateX: 0, scale: 1 }, { type: 'spring', stiffness: 200, damping: 16 }));
        });

        const cursor = root.querySelector('[data-m="cursor"]');
        const blob = root.querySelector('[data-m="blob"]');
        const label = root.querySelector('[data-m="cursor-label"]');
        if (cursor && blob) {
          let visible = false;
          animate(blob, { scale: 0.16 }, { duration: 0 });
          window.addEventListener('pointermove', (e) => {
            if (e.pointerType && e.pointerType !== 'mouse') return;
            if (!visible) {
              visible = true;
              animate(cursor, { x: e.clientX, y: e.clientY }, { duration: 0 });
              animate(cursor, { opacity: 1 }, { duration: 0.3 });
            }
            animate(cursor, { x: e.clientX, y: e.clientY }, { type: 'spring', stiffness: 650, damping: 44, mass: 0.5 });
          });
          document.documentElement.addEventListener('mouseleave', () => { visible = false; animate(cursor, { opacity: 0 }, { duration: 0.25 }); });
          hoverable('[data-m="card"]', (card) => {
            if (label) label.textContent = card.getAttribute('data-cursor') || 'Ver';
            animate(blob, { scale: 1 }, { type: 'spring', stiffness: 300, damping: 24 });
            if (label) animate(label, { opacity: 1 }, { duration: 0.2, delay: 0.08 });
          }, () => {
            animate(blob, { scale: 0.16 }, { type: 'spring', stiffness: 300, damping: 26 });
            if (label) animate(label, { opacity: 0 }, { duration: 0.15 });
          });
          hoverable('a:not([data-m="card"]), button', (el) => {
            if (!el.closest('[data-m="card"]')) animate(blob, { scale: 0.4 }, soft);
          }, (el) => {
            if (!el.closest('[data-m="card"]')) animate(blob, { scale: 0.16 }, soft);
          });
          // Inside a live preview the page can't follow the pointer: hide the cursor until it comes back out.
          hoverable('iframe', () => animate(cursor, { opacity: 0 }, { duration: 0.2 }), () => {
            if (visible) animate(cursor, { opacity: 1 }, { duration: 0.2 });
          });
        }
      }
    } else if (footTl) {
      footTl.play();
    }
  }

  if (reducedMotion) {
    all('[data-reel]').forEach(setupReel);
  } else {
    startMotion();
  }
})();
