'use strict';
/* ------------------------------------------------------------------
   01 Hero — blueprint assembly
------------------------------------------------------------------ */
function initHero() {
  const svg = $('#heroSvg');
  const L = buildPlanLayers(el('g', {}, svg));
  const over = el('g', {}, svg);
  const o = BYMARK.W07, b = bboxOf(o), mp = markerPos(o);
  const hl = el('g', {style:'opacity:0'}, over);
  el('rect', {x:b[0]-8, y:b[1]-8, width:b[2]+16, height:b[3]+16, class:'hl-reg'}, hl);
  el('path', {d:bracketPath(b[0]-8, b[1]-8, b[2]+16, b[3]+16, 8), class:'hl-br'}, hl);
  const mk = el('g', {class:'mkr', style:'opacity:0'}, over);
  el('circle', {cx:mp.x, cy:mp.y, r:13}, mk); el('text', {x:mp.x, y:mp.y}, mk).textContent = '01';
  const lab = el('g', {class:'lab', style:'opacity:0'}, over);
  const lx = mp.x + 22, ly = mp.y - 12;
  el('rect', {x:lx, y:ly, width:118, height:58}, lab);
  [['W07','h'],['36 × 60 IN',''],['SINGLE HUNG','']].forEach(([t, c], i) => { el('text', {x:lx + 10, y:ly + 17 + i*15, class:c}, lab).textContent = t; });
  const snaps = el('g', {}, svg);
  SEED.forEach(x => { const bb = bboxOf(x); el('rect', {x:bb[0]-5, y:bb[1]-5, width:bb[2]+10, height:bb[3]+10, class:'snap', 'data-snap':'off', 'data-label':`${x.mark}\n${sizeTxt(x)}`}, snaps); });
  const set = (k1, k2, k3, k4) => { L.walls.style.opacity = k1; L.detail.style.opacity = k2; L.dims.style.opacity = k3; };
  L.frags.forEach(f => setFrag(f, 0)); set(0, 0, 0);
  const finish = () => { hl.style.opacity = 1; mk.style.opacity = 1; lab.style.opacity = 1; $('#hCall').classList.add('show'); $$('.snap', snaps).forEach(s => s.dataset.snap = 'on'); };
  if (REDUCED) { L.frags.forEach(f => setFrag(f, 1)); set(1, 1, 1); finish(); $('#top .rv').classList.add('in'); return; }
  requestAnimationFrame(() => $('#top .rv').classList.add('in'));
  (async () => {
    await wait(800);
    const t0 = performance.now(), D = 1700, n = L.frags.length;
    await new Promise(res => { const st = t => { const k = (t - t0) / D; L.frags.forEach((f, i) => { const s = i / n * .42; setFrag(f, ease(clamp((k - s) / .58, 0, 1))); }); k < 1 ? requestAnimationFrame(st) : res(); }; requestAnimationFrame(st); });
    await tween(600, t => L.walls.style.opacity = t);
    await tween(550, t => L.detail.style.opacity = t);
    await tween(550, t => L.dims.style.opacity = t);
    await tween(400, t => { hl.style.opacity = t; });
    mk.style.transform = 'scale(.2)'; mk.style.opacity = 1;
    await tween(300, t => { mk.style.transform = `scale(${lerp(.2, 1, t)})`; }, easeOut);
    await tween(350, t => { lab.style.opacity = t; });
    finish();
  })();
}

/* ------------------------------------------------------------------
   02 Three stages — triggered when each row enters
------------------------------------------------------------------ */
function initStages() {
  const lines = PKG_LANDED;
  const fast = MFRS.reduce((a, m, i) => m.lead < MFRS[a].lead ? i : a, 0);
  const low = lines.reduce((a, v, i) => v < lines[a] ? i : a, 0);
  $('#svProc').innerHTML = `<div class="pp">RFQ #WB-1042<b>Full package</b>${PKG_LINES.length} lines · ${PKG_N} openings<span class="pp-ic">${PKG_LINES.map(l => typeIcon(l.type)).join('')}</span></div>` +
    MFRS.map((m, i) => `<div class="pp pcol" data-cursor="View bid"><span class="nm">${m.short}</span><b>${money(lines[i])}</b>${m.lead} weeks${i === fast ? '<br><span class="ptag g">Fastest</span>' : ''}${i === low ? '<br><span class="ptag">Lowest landed</span>' : ''}</div>`).join('');
  const rv = $('#stgReview'), pc = $('#stgProcure'), w2 = $('#svW02');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const t = e.target; t.classList.add('play');
    if (t === rv) {
      const d = REDUCED ? 0 : 1;
      setTimeout(() => w2.classList.add('focus'), 1300 * d);
      setTimeout(() => w2.classList.add('fixed'), 2100 * d);
      setTimeout(() => { w2.classList.add('ok'); w2.classList.remove('focus'); w2.classList.add('done'); }, 2800 * d);
    }
  }), {threshold:.45});
  io.observe(rv); io.observe(pc);
  const ff = $('#svFf'), lis = $$('li', ff), fill = $('.fill', ff), stg = $('#stgFulfill');
  SCENES.push(() => {
    if (!near(stg)) return;
    const r = ff.getBoundingClientRect();
    const q = clamp((innerHeight * .85 - r.top) / (r.height + innerHeight * .35), 0, 1);
    const n = Math.min(6, Math.floor(q * 7));
    fill.style.setProperty('--g', (n / 6).toFixed(3));
    lis.forEach((li, i) => { li.classList.toggle('on', i < n); li.classList.toggle('nx', i === n); });
  });
}

