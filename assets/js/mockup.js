// Abstract mini site drawn in a template's own colors, like the project cards. Light enough to show dozens at once
// (the home list); the rubro page shows the real, live template instead.
import { escapeHtml } from './catalogo.js';

const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const LAYOUTS = [
  // Split hero: copy on the left, picture on the right.
  (t) => `
    <div class="mk-hero mk-split">
      <div class="mk-copy"><u></u><strong class="d">${t}</strong><s></s><s class="w6"></s><em></em></div>
      <div class="mk-pic"><i></i><i></i><i></i></div>
    </div>
    <div class="mk-row"><span></span><span></span><span></span></div>`,
  // Full-color hero, centered.
  (t) => `
    <div class="mk-hero mk-bold"><u></u><strong class="d">${t}</strong><span class="mk-pills"><em></em><em class="ghost"></em></span></div>
    <div class="mk-row"><span></span><span></span><span></span></div>`,
  // Dark hero with cards underneath.
  (t) => `
    <div class="mk-hero mk-dark"><u></u><strong class="d">${t}</strong><s></s><em></em><i class="mk-orb"></i></div>
    <div class="mk-row mk-cards"><span></span><span></span><span></span></div>`,
];

export function mockupHtml(template, extraClass) {
  const p = template.palette;
  const layout = LAYOUTS[hash(template.id) % LAYOUTS.length];
  const style = `--mk-c:${p.main};--mk-k:${p.dark};--mk-on:${p.onMain}`;
  return `<div class="mk ${extraClass || ''}" style="${style}" aria-hidden="true">
    <div class="mk-win">
      <div class="mk-bar"><i></i><i></i><i></i></div>
      <div class="mk-nav"><b></b><s></s><s></s><s></s><em></em></div>
      ${layout(escapeHtml(template.title))}
    </div>
  </div>`;
}
