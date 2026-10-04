'use strict';
const NS = 'http://www.w3.org/2000/svg';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
const wait = ms => new Promise(r => setTimeout(r, ms));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const money = n => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const pad2 = n => String(n).padStart(2, '0');
function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function tween(d, fn, ef = ease) {
  if (REDUCED) { fn(1); return Promise.resolve(); }
  return new Promise(r => { const t0 = performance.now(); const st = t => { const k = clamp((t - t0) / d, 0, 1); fn(ef(k)); k < 1 ? requestAnimationFrame(st) : r(); }; requestAnimationFrame(st); });
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}
const bracketPath = (x, y, w, h, k) => `M${x} ${y+k}V${y}H${x+k}M${x+w-k} ${y}H${x+w}V${y+k}M${x+w} ${y+h-k}V${y+h}H${x+w-k}M${x+k} ${y+h}H${x}V${y+h-k}`;
// The hand-offs between pinned scenes (only the product / order card on screen) were long scrolls.
// The sections are shorter now, and these [scroll, timeline] points compress just those stretches,
// so every animation keeps its original timeline values. Must match the heights in 04-home-pinned-scenes.css.
const WARP = {
  review:  [[.7121, .92]],                 // 621vh: scene 371vh, then 150vh for the RFQ package (all 7 types gathered)
  procure: [[.2280, .20], [.9544, .88]],   // 429vh: package arrives, is numbered, sent and docked 75vh, scene 239vh, tail 15vh
  fulfill: [[.0700, .20]],                 // 357vh: intro 18vh, scene 239vh
};
const warp = (r, pts) => {
  if (!pts) return r;
  const P = [[0, 0], ...pts, [1, 1]]; let i = 0;
  while (i < P.length - 2 && r > P[i + 1][0]) i++;
  const [x0, y0] = P[i], [x1, y1] = P[i + 1];
  return y0 + (r - x0) * (y1 - y0) / (x1 - x0);
};
const rawP = sec => { const r = sec.getBoundingClientRect(); const tot = sec.offsetHeight - innerHeight; return warp(tot > 0 ? -r.top / tot : (r.top < 0 ? 1 : 0), WARP[sec.id]); };
const progress = sec => clamp(rawP(sec), 0, 1);
const near = sec => { if (!sec.offsetParent && sec.closest('[hidden]')) return false; const r = sec.getBoundingClientRect(); return r.bottom > -400 && r.top < innerHeight + 400; };
const narrow = () => innerWidth <= 900;
const HS = () => innerWidth <= 767 ? {w:280, h:120} : {w:320, h:128};
function pinTop() { const p = $('#review .pin'); return p ? parseFloat(getComputedStyle(p).top) || 78 : 78; }
const center = () => { const t = pinTop(); return {x: innerWidth / 2, y: (t + innerHeight) / 2}; };
function place(elm, x, y, w, h) {
  const pr = elm.offsetParent ? elm.offsetParent.getBoundingClientRect() : {left:0, top:0};
  elm.style.left = (x - pr.left).toFixed(1) + 'px'; elm.style.top = (y - pr.top).toFixed(1) + 'px';
  elm.style.width = w.toFixed(1) + 'px'; elm.style.height = h.toFixed(1) + 'px';
}
function centerRect() { const c = center(), s = HS(); return {x:c.x - s.w/2, y:c.y - s.h/2, w:s.w, h:s.h}; }
function aper(scene, a, r = centerRect()) {
  if (a <= .001) { scene.style.clipPath = ''; return; }
  const sr = scene.getBoundingClientRect(), m = 12;
  const t = (r.y - m - sr.top) * a, rt = (sr.right - (r.x + r.w + m)) * a, b = (sr.bottom - (r.y + r.h + m)) * a, l = (r.x - m - sr.left) * a;
  scene.style.clipPath = `inset(${t.toFixed(1)}px ${rt.toFixed(1)}px ${b.toFixed(1)}px ${l.toFixed(1)}px)`;
}
function setHead(h, lines) {
  const key = lines.join('|');
  if (h.dataset.k === key) return;
  h.dataset.k = key;
  h.classList.remove('in');
  h.innerHTML = lines.map(l => `<span class="ln"><span>${l}</span></span>`).join('');
  void h.offsetWidth;
  requestAnimationFrame(() => h.classList.add('in'));
}

