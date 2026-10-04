'use strict';
/* ------------------------------------------------------------------
   About page — brand construction scene + story reveals
------------------------------------------------------------------ */
const About = (() => {
  const sec = $('#abHero');
  let built = false, active = false, io = null, frameIO = null, last = -1, ran = false;
  const P = {};
  const isMobile = () => innerWidth <= 767;
  // transform a qmark path (92 × 100 space) into scene coordinates
  const T = (d, s, tx, ty) => d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (m, x, y) => `${(+x * s + tx).toFixed(2)} ${(+y * s + ty).toFixed(2)}`);
  function build() {
    const svg = $('#abSvg');
    const d = $('#qmark path').getAttribute('d');
    const panels = d.split(/(?=M)/).map(s => s.trim()).filter(Boolean).map(s => T(s, 2.7, 375.8, 24));
    // construction guides: each drawn from its midpoint outward (paired origins)
    const G = $('#abGuides');
    const cx = 500, cy = 159, k = Math.tan(Math.PI / 6);
    const lines = [[0,294,1000,294],[0,24,1000,24],[0,159,1000,159],[500,0,500,640],[375.8,0,375.8,330],[624.2,0,624.2,330],[0,493,1000,493],
      [cx - 420, cy + 420 * k, cx + 420, cy - 420 * k],[cx - 420, cy - 420 * k, cx + 420, cy + 420 * k]];
    P.guides = [];
    for (const [x1, y1, x2, y2] of lines) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      for (const [ex, ey] of [[x1, y1], [x2, y2]]) P.guides.push(el('path', {d:`M${mx} ${my}L${ex} ${ey}`, class:'ab-g', pathLength:1}, G));
    }
    P.circ = el('circle', {cx, cy, r:150, class:'ab-circ', style:'opacity:0'}, G);
    P.def = $('#abDef'); panels.forEach(p => el('path', {d:p, class:'ab-def'}, P.def));
    P.out = panels.map(p => el('path', {d:p, class:'ab-ol', pathLength:1}, $('#abOut')));
    P.outG = $('#abOut'); P.G = G; P.or = $('#abOrange'); P.fr = $('#abFillR');
    P.word = $('#abWord'); P.prod = $('#abProd'); P.cap = $('#abCap');
    // unfold faces + band cube outline
    P.faces = $$('#abUnf .ab-face'); P.stage = $('#abUnfStage'); P.hd = $('#abUnfHd');
    const bc = $('#abBandCube');
    d.split(/(?=M)/).map(s => s.trim()).filter(Boolean).forEach(s => el('path', {d:s}, bc));
    built = true;
  }
  const CAPS = ['01 / Construction guides', '02 / Panel outlines', '03 / Definition', '04 / Fill #FF7805', '05 / Brand complete'];
  function update(p) {
    const g = ease(seg(p, 0, .15));
    P.guides.forEach(x => x.style.strokeDashoffset = (1 - g).toFixed(4));
    P.G.style.opacity = (lerp(.04, .18, g) * (1 - .6 * seg(p, .4, .6)) * (1 - seg(p, .92, 1))).toFixed(3);
    P.circ.style.opacity = seg(p, .08, .15).toFixed(3);
    P.out.forEach((o, i) => o.style.strokeDashoffset = (1 - ease(seg(p, .15 + i * .05, .30 + i * .05))).toFixed(4));
    P.outG.style.opacity = (lerp(.35, 1, seg(p, .4, .6)) * (1 - seg(p, .8, .88))).toFixed(3);
    P.def.style.opacity = (.12 * seg(p, .4, .6) * (1 - seg(p, .78, .88))).toFixed(3);
    const f = ease(seg(p, .6, .8));
    P.fr.setAttribute('y', (300 - 286 * f).toFixed(1)); P.fr.setAttribute('height', (286 * f).toFixed(1));
    P.or.style.opacity = f > 0 ? lerp(.4, 1, f).toFixed(3) : 0;
    P.word.setAttribute('transform', `translate(0 ${((1 - ease(seg(p, .8, .88))) * 215).toFixed(1)})`);
    P.prod.setAttribute('transform', `translate(0 ${((1 - ease(seg(p, .84, .92))) * 40).toFixed(1)})`);
    const ci = p < .15 ? 0 : p < .4 ? 1 : p < .6 ? 2 : p < .8 ? 3 : 4;
    if (ci !== last) { last = ci; P.cap.textContent = CAPS[ci]; P.cap.classList.toggle('ok', ci === 4); }
  }
  // cube faces: top = who we are, left = what we do, right = our agenda
  let geo = null;
  function layoutUnf() {
    const W = P.stage.clientWidth, H = P.stage.clientHeight, gap = 18;
    const cw = (W - 2 * gap) / 3, ch = H;
    const R = Math.min(H * .38, W * .17, 230), cx = W / 2, cy = H / 2;
    const pt = a => { const r = a * Math.PI / 180; return [cx + R * Math.sin(r) * 1.06, cy - R * Math.cos(r)]; };
    const Tp = pt(0), UR = pt(60), B = pt(180), LL = pt(240), UL = pt(300), Cc = [cx, cy];
    const faces = [[UL, Tp, Cc], [UL, Cc, LL], [Cc, UR, B]].map(([P0, P1, P2]) => {
      const P3 = [P1[0] + P2[0] - P0[0], P1[1] + P2[1] - P0[1]];
      const m = [(P0[0] + P1[0] + P2[0] + P3[0]) / 4, (P0[1] + P1[1] + P2[1] + P3[1]) / 4];
      const sh = p => [m[0] + (p[0] - m[0]) * .9, m[1] + (p[1] - m[1]) * .9];
      const [a0, a1, a2] = [sh(P0), sh(P1), sh(P2)];
      return {iso:[(a1[0]-a0[0])/cw, (a1[1]-a0[1])/cw, (a2[0]-a0[0])/ch, (a2[1]-a0[1])/ch, a0[0], a0[1]], dir:[m[0] - cx, m[1] - cy]};
    });
    P.faces.forEach((f, i) => { f.style.width = cw + 'px'; f.style.height = ch + 'px'; faces[i].fin = [1, 0, 0, 1, i * (cw + gap), 0]; });
    geo = {W, H, faces};
  }
  function updateUnf(p) {
    if (!geo || geo.W !== P.stage.clientWidth || geo.H !== P.stage.clientHeight) layoutUnf();
    const ex = ease(seg(p, .12, .3)) * .35, t = ease(seg(p, .3, .72)), col = seg(p, .14, .32);
    P.faces.forEach((f, i) => {
      const g = geo.faces[i];
      const iso = g.iso.slice(); iso[4] += g.dir[0] * ex; iso[5] += g.dir[1] * ex;
      const mtx = iso.map((v, k) => lerp(v, g.fin[k], t));
      f.style.transform = `matrix(${mtx.map(v => v.toFixed(4)).join(',')})`;
      f.querySelector('.fo').style.opacity = (1 - col).toFixed(3);
      const tx = ease(seg(p, .68 + i * .05, .82 + i * .05));
      const fi = f.querySelector('.fi'); fi.style.opacity = tx.toFixed(3); fi.style.transform = `translateY(${(18 * (1 - tx)).toFixed(1)}px)`;
    });
    const h = ease(seg(p, .6, .74));
    P.hd.style.opacity = h.toFixed(3); P.hd.style.transform = `translateY(${(16 * (1 - h)).toFixed(1)}px)`;
  }
  function scene() {
    if (!active || PAGE !== 'about') return;
    const us = $('#abUnf');
    if (innerWidth > 900 && near(us)) updateUnf(REDUCED ? 1 : progress(us));
    const band = $('#abBand');
    if (near(band) && !REDUCED) { const r = band.getBoundingClientRect(); const q = clamp(1 - r.bottom / (innerHeight + r.height), 0, 1); $('#abBandCube').style.transform = `translateY(-50%) translateY(${((q - .5) * -80).toFixed(1)}px) rotate(${((q - .5) * 8).toFixed(2)}deg)`; }
  }
  SCENES.push(scene);
  // the brand construction plays by itself, step 01 → 05, while the visitor stays put
  let runId = 0;
  function play() {
    const id = ++runId, ctl = $('#abCtl'), prog = $('#abProg');
    ctl.classList.remove('on');
    const D = isMobile() ? 4200 : 5600;
    tween(D, t => { if (active && id === runId) { update(t); prog.style.transform = `scaleX(${t.toFixed(4)})`; } }, x => x)
      .then(() => { if (active && id === runId) { prog.style.transform = 'scaleX(1)'; ctl.classList.add('on'); } });
  }
  // called while the page is swapped in, before it is painted: always start from a blank sheet
  function prepare() {
    if (!built) { build(); $('#abReplay').addEventListener('click', () => { ran = true; play(); }); }
    runId++; last = -1;
    if (REDUCED) { update(1); $('#abProg').style.transform = 'scaleX(1)'; $('#abCtl').classList.add('on'); return; }
    update(0); $('#abProg').style.transform = 'scaleX(0)'; $('#abCtl').classList.remove('on');
  }
  function enter() {
    prepare();
    active = true; geo = null;
    if (REDUCED) { scene(); return; }
    ran = false;
    frameIO = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting || ran) return; ran = true; play();
    }), {threshold:.4});
    frameIO.observe($('#abFrame'));
    scene();
  }
  function leave() {
    active = false; runId++;
    if (io) { io.disconnect(); io = null; }
    if (frameIO) { frameIO.disconnect(); frameIO = null; }
  }
  return {prepare, enter, leave};
})();

