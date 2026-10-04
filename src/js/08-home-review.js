'use strict';
/* ------------------------------------------------------------------
   03 Review — pinned blueprint → takeoff
------------------------------------------------------------------ */
const R = {};

/* ------------------------------------------------------------------
   The RFQ package: all seven product configurations (every window and door type on the plan)
   travel together from Review into Procure. Shared by the Review scene, the hand-off and Procure.
------------------------------------------------------------------ */
const PKG_LINES = (() => {
  const m = new Map();
  SEED.forEach(o => {
    const k = `${o.type}|${o.w}`;
    if (!m.has(k)) m.set(k, {type:o.type, cat:o.cat, w:o.w, h:o.mark === 'W02' ? 36 : o.h, items:[]});
    m.get(k).items.push(o);
  });
  return [...m.values()].sort((a, b) => b.items.length - a.items.length);
})();
const PKG_WIN = PKG_LINES.filter(l => l.cat === 'window').reduce((s, l) => s + l.items.length, 0);
const PKG_DOOR = PKG_LINES.filter(l => l.cat === 'door').reduce((s, l) => s + l.items.length, 0);
const PKG_N = PKG_WIN + PKG_DOOR;
// elevation glyphs, drawn the way window schedules draw them (operation arrows, hinge lines)
function typeIcon(type) {
  const fr = '<rect x="3" y="2" width="18" height="24"/>';
  const g = {
    'Single hung': '<path d="M3 14h18M12 23v-6M9.5 19.5 12 17l2.5 2.5"/>',
    'Double hung': '<path d="M3 14h18M12 23v-6M9.5 19.5 12 17l2.5 2.5M12 5v6M9.5 8.5 12 11l2.5-2.5"/>',
    'Casement': '<path d="M21 2 3 14l18 12" stroke-dasharray="2.2 2"/>',
    'Awning': '<path d="M3 26 12 2l9 24" stroke-dasharray="2.2 2"/>',
    'Picture': '<rect x="6.5" y="5.5" width="11" height="17"/>',
    'Sliding': '<path d="M12 2v24M5 14h5M8 11.5l2.5 2.5L8 16.5"/>',
    'Hinged door': '<rect x="7" y="5.5" width="10" height="8"/><circle cx="17.5" cy="16.5" r=".9"/><path d="M1 26h22"/>',
    'Sliding door': '<path d="M12 2v24M4.5 14h5M7 11.5l2.5 2.5L7 16.5M1 26h22"/>',
    'French door': '<path d="M12 2v24M1 26h22"/><circle cx="10" cy="15" r=".9"/><circle cx="14" cy="15" r=".9"/>',
  }[type] || '<path d="M10 11a2 2 0 1 1 3 1.7c-.7.4-1 .9-1 1.6M12 18v.5"/>';
  return `<svg class="wic" viewBox="0 0 24 28" aria-hidden="true">${fr}${g}</svg>`;
}
function pkgHTML(id, extra = '') {
  return `<div class="pkcard ${extra}" ${id ? `id="${id}"` : ''} data-dark aria-hidden="true">
    <div class="pk-top"><span class="pk-tag">RFQ package · 07 of 07 lines</span><span class="pk-st">Ready for RFQ</span></div>
    <div class="pk-hd"><b>Window + door<br>package</b><span class="q"><span class="pk-n">${pad2(PKG_N)}</span><small>openings</small></span></div>
    <span class="s pk-s">${pad2(PKG_WIN)} windows · ${pad2(PKG_DOOR)} doors · ${pad2(PKG_LINES.length)} configurations</span>
    <ol class="pk-ls">${PKG_LINES.map((l, i) => `<li><i class="no">${pad2(i + 1)}</i><span class="pk-ic">${typeIcon(l.type)}</span><span class="t">${l.type}</span><span class="z">${l.w} × ${l.h}</span><span class="n">×${l.items.length}</span></li>`).join('')}</ol>
  </div>`;
}
const PKS = () => innerWidth <= 767 ? {w:Math.min(310, innerWidth - 32), h:300} : {w:420, h:322};
function pkgRect() { const c = center(), s = PKS(); return {x:c.x - s.w/2, y:c.y - s.h/2, w:s.w, h:s.h}; }

function initReviewScene() {
  const sec = $('#review'), scene = $('#rvScene'), vis = $('#rvVis'), frame = $('#rvFrame'), tbl = $('#rvTable'), rowsBox = $('#rvRows'), sum = $('#rvSum'), note = $('#rvNote');
  const svg = $('#rvSvg');
  const L = buildPlanLayers(el('g', {}, svg));
  const over = el('g', {}, svg);
  const regG = el('g', {style:'opacity:0'}, over);
  const b2 = bboxOf(BYMARK.W02);
  const reg = el('rect', {x:b2[0]-12, y:b2[1]-12, width:b2[2]+24, height:b2[3]+24, class:'hl-reg'}, regG);
  const regB = el('path', {d:bracketPath(b2[0]-12, b2[1]-12, b2[2]+24, b2[3]+24, 8), class:'hl-br'}, regG);
  const MK = {}, SRC = {};
  SEED.forEach((o, i) => {
    const p = markerPos(o);
    const g = el('g', {class:'mkr', style:'opacity:0'}, over);
    el('circle', {cx:p.x, cy:p.y, r:13}, g); el('text', {x:p.x, y:p.y}, g).textContent = pad2(i + 1);
    MK[o.mark] = g;
    const bb = bboxOf(o);
    SRC[o.mark] = el('rect', {x:bb[0]-4, y:bb[1]-4, width:bb[2]+8, height:bb[3]+8, class:'src', 'data-snap':'off', 'data-label':`${o.mark}\n${sizeTxt(o)}`}, over);
  });
  // note position (frame-relative, in % of svg box)
  const rowHTML = o => `<span class="k">${o.mark}</span><span class="r">${o.room}</span><span>${o.type}</span><span class="sz">${o.mark === 'W02' ? '24 × 36' : sizeTxt(o)}</span><span class="st"><span class="lbl">${o.mark === 'W02' ? 'Edited' : 'Verified'}</span></span>`;
  const rows = {};
  SEED.forEach(o => { const d = document.createElement('div'); d.className = 'trow row'; d.innerHTML = rowHTML(o); rowsBox.appendChild(d); rows[o.mark] = d; });
  const FEAT = ['W03', 'W04', 'W07'], WIN = [[.62,.67],[.665,.715],[.71,.76]];
  const flyers = FEAT.map(m => { const f = document.createElement('div'); f.className = 'trow flyer'; f.innerHTML = rowHTML(BYMARK[m]); vis.appendChild(f); return f; });
  const REST = SEED.filter(o => !FEAT.includes(o.mark)).map(o => o.mark);
  // groups: one card per product configuration (same order as the RFQ package lines)
  const groupsL = PKG_LINES.map(l => l.items);
  const sorted = groupsL.flat();
  const gcards = PKG_LINES.map((l, j) => {
    const d = document.createElement('div'); d.className = 'gcard'; d.dataset.dark = '';
    d.innerHTML = `<b><span class="gi">${typeIcon(l.type)}</span>${l.type}</b><span class="q">${l.items.length}<small>QTY</small></span><span class="s">${l.w} × ${l.h} IN</span><span class="mk">${l.items.map(x => x.mark).join(' · ')}</span>`;
    tbl.appendChild(d); return d;
  });
  // the package all seven cards are gathered into, plus four corner brackets that collect them
  vis.insertAdjacentHTML('beforeend', pkgHTML('rvPkg'));
  const pkg = $('#rvPkg'), pkLis = $$('li', pkg), pkN = $('.pk-n', pkg), pkTag = $('.pk-tag', pkg), pkSt = $('.pk-st', pkg), pkS = $('.pk-s', pkg);
  const brs = ['tl', 'tr', 'bl', 'br'].map(c => { const b = document.createElement('i'); b.className = 'pk-br ' + c; vis.appendChild(b); return b; });
  const HEADS = [['The project', 'starts as', 'a drawing.'], ['The structure', 'becomes clear.'], ['Confirm the', 'opening data.'], ['The drawing', 'becomes data.'], ['Reviewed.', 'Ready for RFQ.'], ['Every type.', 'One package.']];
  const COPY = ['Every window package begins as construction drawings. Before anyone can price it, someone has to read them.',
    'Walls, rooms, fixtures and dimensions: the information the takeoff depends on.',
    'Each opening is checked against the drawing. Missing values are filled in, then the opening is verified.',
    'Every verified opening becomes a row in the takeoff, still linked to its place on the plan.',
    'Identical openings group into product configurations: the list manufacturers will quote.',
    'Single hung, casement, awning, picture, sliding and both door types travel together as one RFQ, so every manufacturer prices the whole job.'];
  const head = $('#rvHead'), copy = $('#rvCopy'), cap = $('#rvCap'), terms = $$('#rvTerms li');
  let lay = null;
  function layout() {
    const W = vis.clientWidth, H = vis.clientHeight;
    frame.style.width = W + 'px';
    let fh = frame.offsetHeight, fw = W;
    if (fh > H) { fw = W * H / fh; frame.style.width = fw + 'px'; fh = frame.offsetHeight; }
    const nar = narrow();
    let k, tx, ty, tL, tT, tW;
    if (!nar) { k = clamp((W - 24 - 520) / fw, .34, .56); tx = 0; ty = Math.max(0, (H - 480) / 2 - 10); tL = fw * k + 24; tT = ty; tW = W - tL; }
    else { k = .5; tx = (W - fw * k) / 2; ty = 0; tL = 0; tT = fh * k + 12; tW = W; }
    const TH = 32, FH = nar ? 46 : 56, n = SEED.length;
    const RH = clamp(Math.floor((H - tT - 6 - TH - FH) / n), 22, 32);
    const GH = clamp(Math.floor((n * RH - 6 * 6) / 7), 28, 46);
    const inner = tW - 2 - 24 - 4 * 8;
    const C1 = 52, C4 = nar ? 62 : 70, C5 = nar ? 14 : 92;
    const rest = inner - C1 - C4 - C5;
    const C2 = nar ? 0 : Math.round(rest * .54), C3 = rest - C2;
    tbl.style.left = tL + 'px'; tbl.style.top = tT + 'px'; tbl.style.width = tW + 'px';
    tbl.style.height = (TH + n * RH + FH) + 'px';
    for (const host of [tbl, vis]) [C1, C2, C3, C4, C5].forEach((c, i) => host.style.setProperty(`--c${i + 1}`, c + 'px'));
    $('.th', tbl).style.height = TH + 'px';
    SEED.forEach(o => { rows[o.mark].style.height = RH + 'px'; });
    sum.style.top = (TH + n * RH) + 'px'; sum.style.height = FH + 'px';
    lay = {W, H, fw, fh, k, tx, ty, x0:(W - fw) / 2, y0:(H - fh) / 2, RH, GH, TH, C1, C2, C3, C4, C5, nar};
    // note placement next to W02
    const sv = svg.getBoundingClientRect(), fr = frame.getBoundingClientRect(), sc = sv.width / 1000;
    note.style.left = Math.min((sv.left - fr.left) + (b2[0] + b2[2] + 24) * sc, fr.width - 232) + 'px';
    note.style.top = ((sv.top - fr.top) + (b2[1] + b2[3] + 40) * sc) + 'px';
    LAYOUT_DIRTY = false;
  }
  let idx = -1;
  function update() {
    if (!near(sec)) return;
    if (LAYOUT_DIRTY || !lay) layout();
    const p = REDUCED ? clamp(progress(sec), 0, 1) : progress(sec);
    const vr = vis.getBoundingClientRect();
    // drawing layers
    L.frags.forEach((f, i) => { const s = .06 + i * .0086; setFrag(f, ease(seg(p, s, s + .06))); });
    L.walls.style.opacity = seg(p, .24, .30); L.detail.style.opacity = seg(p, .30, .36); L.dims.style.opacity = seg(p, .36, .42);
    // markers + W02 annotation
    const mA = seg(p, .42, .47), act = seg(p, .47, .5), C = ease(seg(p, .58, .62));
    SEED.forEach((o, i) => {
      const v = clamp(mA * 12 - i, 0, 1), g = MK[o.mark];
      g.style.opacity = (v * (o.mark === 'W02' ? 1 : 1 - act * .7) * (1 - C)).toFixed(3);
      if (o.mark === 'W02') g.style.transform = `scale(${(1 - act).toFixed(3)})`;
      SRC[o.mark].dataset.snap = p > .42 && p < .58 ? 'on' : 'off';
    });
    const ok = p >= .55, fixed = p >= .52;
    regG.style.opacity = (act * (1 - C)).toFixed(3);
    reg.classList.toggle('ok', ok); regB.classList.toggle('ok', ok);
    note.classList.toggle('fixed', fixed); note.classList.toggle('ok', ok);
    note.style.opacity = (act * (1 - seg(p, .58, .6))).toFixed(3);
    // frame transform; from .92 the drawing, table and summary clear away for the package
    const m = ease(seg(p, .92, .94));
    const k = lerp(1, lay.k, C), tx = lerp(lay.x0, lay.tx, C), ty = lerp(lay.y0, lay.ty, C);
    frame.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${k.toFixed(4)})`;
    frame.style.opacity = (1 - m).toFixed(3);
    tbl.style.opacity = C > 0 ? 1 : 0;
    $('.th', tbl).style.opacity = (C * (1 - ease(seg(p, .87, .9)))).toFixed(3);
    // flyers
    const cols = s => `${lay.C1}px ${(lay.C2 * s).toFixed(1)}px ${lay.C3}px ${lay.C4}px ${(lay.C5 * s).toFixed(1)}px`;
    FEAT.forEach((mk, i) => {
      const t = seg(p, WIN[i][0], WIN[i][1]), f = flyers[i], row = rows[mk];
      if (t <= 0 || t >= 1) { f.style.display = 'none'; return; }
      const sr = SRC[mk].getBoundingClientRect(), rr = row.getBoundingClientRect();
      const e = ease(clamp(t / .85, 0, 1)), s = ease(seg(t, .3, .85));
      f.style.display = 'grid';
      const sw = lay.nar ? 190 : 230, sh = 28;
      f.style.left = lerp(sr.left - vr.left, rr.left - vr.left, e).toFixed(1) + 'px';
      f.style.top = lerp(sr.top - vr.top - sh - 6, rr.top - vr.top, e).toFixed(1) + 'px';
      f.style.width = lerp(sw, rr.width, e).toFixed(1) + 'px';
      f.style.height = lerp(sh, rr.height, e).toFixed(1) + 'px';
      f.style.gridTemplateColumns = cols(s);
      f.style.opacity = (1 - seg(t, .88, 1)).toFixed(3);
    });
    // rows + grouping
    const a = ease(seg(p, .84, .87)), c = ease(seg(p, .87, .9)), fz = seg(p, .89, .92);
    let shown = 0;
    SEED.forEach((o, i) => {
      const fi = FEAT.indexOf(o.mark);
      let vis1 = fi >= 0 ? seg(p, WIN[fi][0] + (WIN[fi][1] - WIN[fi][0]) * .86, WIN[fi][1]) : (p >= .76 + REST.indexOf(o.mark) * .0045 ? 1 : 0);
      if (vis1 >= 1) shown++;
      const si = sorted.indexOf(o), gi = groupsL.findIndex(g => g.includes(o)), kk = groupsL[gi].indexOf(o);
      let y = lerp(lay.TH + i * lay.RH, lay.TH + si * lay.RH, a);
      y = lerp(y, lay.TH + 6 + gi * (lay.GH + 6) + kk * 4, c);
      const r = rows[o.mark];
      r.style.transform = `translateY(${y.toFixed(1)}px)`;
      r.style.opacity = (vis1 * (kk > 0 ? 1 - c * .85 : 1) * (1 - fz)).toFixed(3);
      r.style.zIndex = 10 - kk;
    });
    sum.style.opacity = (seg(p, .8, .83) * (1 - m)).toFixed(3);
    tbl.style.setProperty('--tbA', (1 - ease(seg(p, .93, .95))).toFixed(3));
    // the package: brackets travel from the table's corners to the package outline, the panel unrolls,
    // then each product card lifts off the table and slots into its line; the counters add up as they land
    const pk = pkgRect(), tr = tbl.getBoundingClientRect();
    place(pkg, pk.x, pk.y, pk.w, pk.h);
    const pa = ease(seg(p, .935, .95));
    pkg.style.opacity = pa.toFixed(3);
    pkg.style.clipPath = pa >= 1 ? '' : `inset(0 0 ${((1 - pa) * 100).toFixed(1)}% 0)`;
    const bk = ease(seg(p, .92, .945)), bo = seg(p, .92, .925) * (1 - seg(p, .984, .992));
    const from = [[tr.left, tr.top], [tr.right - 16, tr.top], [tr.left, tr.bottom - 16], [tr.right - 16, tr.bottom - 16]];
    const to = [[pk.x - 7, pk.y - 7], [pk.x + pk.w - 9, pk.y - 7], [pk.x - 7, pk.y + pk.h - 9], [pk.x + pk.w - 9, pk.y + pk.h - 9]];
    brs.forEach((b, i) => { place(b, lerp(from[i][0], to[i][0], bk), lerp(from[i][1], to[i][1], bk), 16, 16); b.style.opacity = bo.toFixed(3); });
    let got = 0, nOpen = 0, nWin = 0, nDoor = 0;
    gcards.forEach((g, j) => {
      const t = seg(p, .94 + j * .0045, .958 + j * .0045), e = ease(t);
      let x = 8, yy = lay.TH + 6 + j * (lay.GH + 6), w = tr.width - 18, hh = lay.GH;
      if (t > 0) {
        const lr = pkLis[j].getBoundingClientRect();
        x = lerp(x, lr.left - tr.left - 6, e); yy = lerp(yy, lr.top - tr.top, e) - Math.sin(Math.PI * e) * 38;
        w = lerp(w, lr.width + 12, e); hh = lerp(hh, lr.height, e);
      }
      g.style.left = x.toFixed(1) + 'px'; g.style.top = yy.toFixed(1) + 'px'; g.style.width = w.toFixed(1) + 'px'; g.style.height = hh.toFixed(1) + 'px';
      g.style.opacity = (fz * (1 - seg(t, .8, 1))).toFixed(3);
      g.style.zIndex = t > 0 && t < 1 ? 40 : 20;
      g.classList.toggle('lift', t > 0 && t < 1);
      pkLis[j].style.opacity = seg(t, .7, 1).toFixed(3);
      pkLis[j].classList.toggle('land', t >= .8 && t < 1 && p < .99);
      if (t >= .8) { const l = PKG_LINES[j]; got++; nOpen += l.items.length; l.cat === 'door' ? nDoor += l.items.length : nWin += l.items.length; }
    });
    pkN.textContent = pad2(nOpen);
    pkTag.textContent = `RFQ package · ${pad2(got)} of ${pad2(PKG_LINES.length)} lines`;
    pkS.textContent = `${pad2(nWin)} windows · ${pad2(nDoor)} doors · ${pad2(got)} configurations`;
    pkSt.style.opacity = seg(p, .982, .99).toFixed(3);
    aper(scene, ease(seg(p, .986, .997)), pk);
    scene.style.visibility = p >= .997 ? 'hidden' : 'visible';
    // narrative
    const ni = p < .24 ? 0 : p < .42 ? 1 : p < .58 ? 2 : p < .84 ? 3 : p < .92 ? 4 : 5;
    if (ni !== idx) { idx = ni; setHead(head, HEADS[ni]); copy.textContent = COPY[ni]; }
    const nfr = Math.round(seg(p, .06, .24) * 14);
    cap.textContent = p < .06 ? 'Sheet A1.0 / blank' : p < .24 ? `Assembling / ${pad2(nfr)} of 14 wall fragments` : p < .36 ? 'Walls · rooms · fixtures' : p < .42 ? 'Opening information present'
      : p < .47 ? 'Openings marked / 12' : p < .52 ? 'W02 / height missing' : p < .55 ? 'W02 / edited to 24 × 36' : p < .58 ? 'W02 / verified'
      : p < .84 ? `Takeoff rows / ${pad2(shown)} of 12` : p < .92 ? '12 openings → 07 products'
      : got === 0 ? 'Assembling the RFQ package' : got < PKG_LINES.length ? `Packaging / line ${pad2(got)} of 07 · ${PKG_LINES[got - 1].type}` : '07 lines · 12 openings → RFQ #WB-1042';
    cap.classList.toggle('ok', (p >= .55 && p < .58) || p >= .8);
    terms[0].className = ni === 2 && p < .5 ? 'on' : p >= .5 ? 'ok' : '';
    terms[1].className = p >= .5 && p < .55 ? 'on' : p >= .55 ? 'ok' : '';
    terms[2].className = p >= .55 ? 'ok' : '';
  }
  SCENES.push(update);
  R.sec = sec;
}

