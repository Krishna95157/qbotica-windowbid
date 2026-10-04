'use strict';
/* ------------------------------------------------------------------
   Drafting cursor + pen trail
------------------------------------------------------------------ */
/* ------------------------------------------------------------------
   Theme — dark by default; draw a W with the cursor (or use the footer switch) to change it
------------------------------------------------------------------ */
const Theme = (() => {
  const root = document.documentElement;
  const get = () => root.getAttribute('data-wb') === 'light' ? 'light' : 'dark';
  const label = () => { const l = $('#themeSwL'); if (l) l.textContent = get() === 'dark' ? 'Light theme' : 'Dark theme'; };
  function set(t, x, y, byGesture) {
    const apply = () => {
      root.setAttribute('data-wb', t);
      try { localStorage.setItem('wb-theme', t); } catch (e) {}
      label(); document.dispatchEvent(new CustomEvent('themechange'));
    };
    if (document.startViewTransition && !REDUCED) {
      root.style.setProperty('--tx', (x ?? innerWidth / 2) + 'px'); root.style.setProperty('--ty', (y ?? innerHeight / 2) + 'px');
      document.startViewTransition(apply);
    } else apply();
    if (byGesture) toast(t === 'light' ? 'Light theme · draw W again for dark' : 'Dark theme · draw W again for light');
  }
  return {get, set, label, toggle:(x, y, g) => set(get() === 'dark' ? 'light' : 'dark', x, y, g)};
})();
function initTheme() {
  Theme.label();
  const sw = $('#themeSw');
  if (sw) sw.addEventListener('click', e => { const r = sw.getBoundingClientRect(); Theme.toggle(r.left + 10, r.top + r.height / 2); });
}

let vDragging = false;
function initCursor() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.documentElement.classList.add('cc');
  const C = $('#cur'), CO = $('.c-co', C), TG = $('.c-tag', C), BR = $('#curBr'), BI = $('.c-info', BR);
  const cv = $('#trail'), ctx = cv.getContext('2d');
  let orange = getComputedStyle(document.documentElement).getPropertyValue('--orange').trim() || '#FF7805';
  document.addEventListener('themechange', () => { orange = getComputedStyle(document.documentElement).getPropertyValue('--orange').trim() || '#FF7805'; });
  let dpr = 1;
  const size = () => { dpr = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'; };
  size(); addEventListener('resize', size);
  let px = -200, py = -200, cx = px, cy = py, vis = false, target = null, snapEl = null, brOp = 0;
  const b = {x:0, y:0, w:18, h:18}, pts = [];
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    px = e.clientX; py = e.clientY; target = e.target;
    if (!vis) { vis = true; cx = px; cy = py; }
    pts.push({x:px, y:py, t:performance.now()});
    gesture(px, py, e);
  }, {passive:true});
  document.addEventListener('mouseout', e => { if (!e.relatedTarget) vis = false; });
  addEventListener('pointerdown', () => { BR.classList.remove('press'); void BR.offsetWidth; BR.classList.add('press'); });
  // ---- draw a W with the cursor to switch theme ----
  const G = [];
  let wShape = null, wCool = 0;
  function zig(P, H) {            // alternating vertical turning points, ignoring wobble smaller than H
    const out = [P[0]]; let tr = 0, c = P[0];
    for (let i = 1; i < P.length; i++) {
      const q = P[i], r = out[out.length - 1];
      if (tr === 0) { if (q.y - r.y >= H) { tr = 1; c = q; } else if (r.y - q.y >= H) { tr = -1; c = q; } }
      else if (tr === 1) { if (q.y >= c.y) c = q; else if (c.y - q.y >= H) { out.push(c); tr = -1; c = q; } }
      else { if (q.y <= c.y) c = q; else if (q.y - c.y >= H) { out.push(c); tr = 1; c = q; } }
    }
    if (tr !== 0) out.push(c);
    return out;
  }
  function looksLikeW(P) {
    const z = zig(P, 34);
    for (let s0 = z.length - 5; s0 >= 0 && s0 >= z.length - 6; s0--) {
      const w = z.slice(s0, s0 + 5);
      if (w.length < 5) continue;
      let ok = true;
      const amp = [];
      for (let i = 1; i < 5; i++) {
        const dx = w[i].x - w[i - 1].x, dy = w[i].y - w[i - 1].y, dt = w[i].t - w[i - 1].t;
        const n = P.indexOf(w[i]) - P.indexOf(w[i - 1]);
        // each stroke: goes right, alternates down/up, is drawn (not a jump), and is more vertical than flat
        if (dx < 4 || Math.abs(dy) < 34 || (i % 2 ? dy < 0 : dy > 0) || dx > Math.abs(dy) * 2.4 || dt < 60 || n < 3) { ok = false; break; }
        amp.push(Math.abs(dy));
      }
      if (!ok) continue;
      const width = w[4].x - w[0].x, height = Math.max(w[1].y, w[3].y) - Math.min(w[0].y, w[2].y, w[4].y), dur = w[4].t - w[0].t;
      const even = Math.max(...amp) / Math.min(...amp) <= 3.2;
      if (even && width >= 100 && height >= 60 && dur >= 300 && dur <= 2000) return w;
    }
    return null;
  }
  function gesture(x, y, e) {
    const now = performance.now();
    if (now < wCool || (e.buttons && e.target.closest && e.target.closest('#app'))) { G.length = 0; return; }
    G.push({x, y, t:now});
    while (G.length && now - G[0].t > 2000) G.shift();
    if (G.length < 10) return;
    const w = looksLikeW(G);
    if (!w) return;
    const i0 = G.indexOf(w[0]);
    wShape = {p:G.slice(i0 < 0 ? 0 : i0), t:now};
    G.length = 0; wCool = now + 1400;
    setTimeout(() => Theme.toggle(x, y, true), 160);
  }
  function findSnap() {
    let best = null, bd = 1e9;
    for (const s of document.querySelectorAll('[data-snap="on"]')) {
      const r = s.getBoundingClientRect();
      if (!r.width || r.bottom < 0 || r.top > innerHeight) continue;
      const dx = Math.max(r.left - px, 0, px - r.right), dy = Math.max(r.top - py, 0, py - r.bottom);
      const d = Math.hypot(dx, dy);
      if (d < 18 && d < bd) { bd = d; best = s; }
    }
    return best;
  }
  function frame() {
    requestAnimationFrame(frame);
    const now = performance.now();
    while (pts.length && now - pts[0].t > 350) pts.shift();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (wShape && now - wShape.t < 900) {
      const k = 1 - (now - wShape.t) / 900;
      ctx.globalAlpha = k; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = '#A9DFC6';
      ctx.beginPath(); wShape.p.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (!REDUCED && pts.length > 1 && vis) {
      ctx.lineWidth = 1; ctx.strokeStyle = orange; ctx.lineCap = 'round';
      for (let i = 1; i < pts.length; i++) {
        ctx.globalAlpha = (1 - (now - pts[i].t) / 350) * .85;
        ctx.beginPath(); ctx.moveTo(pts[i-1].x, pts[i-1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (!vis || !target || !target.closest) { C.style.opacity = 0; BR.style.opacity = 0; return; }
    if (target.closest('input,select,textarea')) { C.style.opacity = 0; BR.style.opacity = 0; return; }
    C.style.opacity = 1;
    const inApp = !!target.closest('#app');
    const s = inApp ? null : findSnap();
    if (s !== snapEl) { snapEl = s; }
    let label = '', mode = '';
    if (s) {
      const r = s.getBoundingClientRect(), pad = 5, k = REDUCED ? 1 : .26;
      b.x = lerp(b.x, r.left - pad, k); b.y = lerp(b.y, r.top - pad, k); b.w = lerp(b.w, r.width + 2*pad, k); b.h = lerp(b.h, r.height + 2*pad, k);
      cx = lerp(cx, r.left + r.width/2, REDUCED ? 1 : .16); cy = lerp(cy, r.top + r.height/2, REDUCED ? 1 : .16);
      brOp = 1; mode = 'snap';
      BI.textContent = s.dataset.label || '';
    } else {
      cx = lerp(cx, px, REDUCED ? 1 : .55); cy = lerp(cy, py, REDUCED ? 1 : .55);
      const k = REDUCED ? 1 : .3;
      b.x = lerp(b.x, cx - 9, k); b.y = lerp(b.y, cy - 9, k); b.w = lerp(b.w, 18, k); b.h = lerp(b.h, 18, k);
      brOp = Math.max(0, brOp - .12);
      if (inApp && target.closest('#viewer')) {
        mode = 'insp';
        label = vDragging ? 'Dragging' : S.adding ? 'Place' : target.closest('.det') ? 'Select' : V.s > 1 ? 'Pan' : '';
      } else {
        const lab = target.closest('[data-cursor]');
        if (lab) label = lab.dataset.cursor;
        if (target.closest('[data-inspect]')) mode = 'insp';
      }
    }
    C.className = mode + (label ? ' tag' : '') + (target.closest('[data-dark]') ? ' inv' : '');
    TG.textContent = label;
    CO.textContent = `X ${String(Math.round(px)).padStart(4,'0')}\nY ${String(Math.round(py)).padStart(4,'0')}`;
    C.style.transform = `translate(${cx.toFixed(1)}px,${cy.toFixed(1)}px)`;
    BR.style.opacity = brOp;
    BR.style.left = b.x + 'px'; BR.style.top = b.y + 'px'; BR.style.width = b.w + 'px'; BR.style.height = b.h + 'px';
  }
  requestAnimationFrame(frame);
}

