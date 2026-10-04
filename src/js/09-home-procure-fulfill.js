'use strict';
/* ------------------------------------------------------------------
   04 Procure — one procurement sheet: RFQ → bids → selection → proposal → acceptance
------------------------------------------------------------------ */
function initProcureScene() {
  $('#pcCard').outerHTML = pkgHTML('pcCard', 'full');
  const sec = $('#procure'), scene = $('#pcScene'), vis = $('#pcVis'), sheet = $('#pcSheet'), card = $('#pcCard'), ord = $('#pcOrder');
  const sched = $('#pcSched'), led = $('#pcLed'), sel = $('#pcSel'), selSvg = $('#pcSelSvg'), selL = $('#pcSelL');
  const acc = $('#pcAcc'), sig = $('#pcSig'), tick = $('#pcTick'), accRule = $('#pcAccRule');
  const PKG = PKG_LANDED;
  const AWN = PKG_LINES.findIndex(l => l.type === 'Awning');   // Mesa Ridge doesn't make awnings: one substituted line
  const TAGS = [[], [['Fastest', '']], [['Lowest cost', ''], ['⚠ Awning substituted', 'dv']]];
  const cells = PKG_LINES.map(l => `<i class="cv-c" title="${l.type}">${typeIcon(l.type)}</i>`).join('');
  sched.innerHTML = `<div class="ps-row th"><span class="ps-c">Manufacturer</span><span class="ps-c">Lines quoted · ${pad2(PKG_LINES.length)}</span><span class="ps-c">Package landed</span><span class="ps-c">Lead</span><i class="rl"></i></div>` +
    MFRS.map((m, i) => `<div class="ps-row" data-cursor="View bid"><div class="ps-c n"><b>${m.short}</b><div class="ps-tags">${TAGS[i].map(([t, c]) => `<span class="ps-tag ${c}">${t}</span>`).join('')}</div></div><span class="ps-c cv"><span><span class="cv-s">${cells}</span><em class="cv-n">00/07</em></span></span><span class="ps-c"><span>${money(PKG[i])}</span></span><span class="ps-c"><span>${m.lead} wk</span></span><i class="rl"></i></div>`).join('');
  const rows = $$('.ps-row', sched), th = rows[0], bids = rows.slice(1);
  const cvCells = bids.map(r => $$('.cv-c', r)), cvN = bids.map(r => $('.cv-n', r));
  // the package that arrives from Review (same markup as the hand-off)
  const pkOl = $('.pk-ls', card), pkLis = $$('li', card), pkTag = $('.pk-tag', card), pkSt = $('.pk-st', card);
  const CAPS = ['RFQ #WB-1042 · issued Oct 02', '03 / 03 bids received', 'Fastest · lowest cost · one deviation', 'Cascade selected for proposal', 'Dealer view · internal', 'Customer proposal · $42,500', 'Customer accepted · 18 Oct 2026', 'Customer-accepted order → fulfillment'];
  const cap = $('#pcCap'), terms = $$('#pcTerms li'), head = $('.pc-txt .rv', sec);
  function update() {
    if (!near(sec)) return;
    const raw = rawP(sec), p = clamp(raw, 0, 1), nar = narrow();
    if (raw >= .03) head.classList.add('in');
    const vr = vis.getBoundingClientRect(), cr = centerRect(), pk = pkgRect(), sr = sheet.getBoundingClientRect();
    // the RFQ package carried over from Review: its lines are numbered as RFQ lines, it is sent,
    // then it folds down to its header and docks into the corner of the procurement sheet
    const sx = nar ? 12 : 24, sy = nar ? 46 : 52, mv = ease(seg(p, .12, .2)), fo = 1 - seg(p, .87, .9);
    place(card, lerp(pk.x, vr.left + sx, mv), lerp(pk.y, vr.top + sy, mv), lerp(pk.w, cr.w, mv), lerp(pk.h, cr.h, mv));
    card.style.opacity = (raw < .03 ? 0 : 1) * fo;
    pkOl.style.opacity = (1 - seg(mv, 0, .4)).toFixed(3);
    let numbered = 0;
    pkLis.forEach((li, j) => { const on = p >= .045 + j * .009; li.classList.toggle('num', on); if (on) numbered++; });
    pkTag.textContent = p < .04 ? 'RFQ package · 07 of 07 lines' : 'RFQ #WB-1042 · 07 lines';
    pkSt.textContent = p < .04 ? 'Ready for RFQ' : p < .11 ? `Numbering ${pad2(numbered)}/07` : 'Sent to 3 mfrs';
    card.classList.toggle('sent', p >= .11);
    // the sheet draws outward from the card
    const ra = ease(seg(p, .16, .28)), W = sheet.clientWidth, H = sheet.clientHeight;
    sheet.style.opacity = (ra > 0 ? 1 : 0) * fo;
    sheet.style.clipPath = ra >= 1 ? '' : `inset(${(sy * (1 - ra)).toFixed(1)}px ${((W - sx - cr.w) * (1 - ra)).toFixed(1)}px ${((H - sy - cr.h) * (1 - ra)).toFixed(1)}px ${(sx * (1 - ra)).toFixed(1)}px)`;
    $('.ps-hd', sheet).style.opacity = seg(p, .24, .3); $('#pcMeta').style.opacity = seg(p, .25, .31);
    // schedule: rules draw left to right, names appear, values rise from masked cells
    const wipe = ease(seg(p, .68, .73));
    sched.style.opacity = (1 - wipe).toFixed(3);
    th.querySelector('.rl').style.transform = `scaleX(${ease(seg(p, .3, .36)).toFixed(3)})`;
    th.style.opacity = seg(p, .32, .36);
    bids.forEach((r, i) => {
      r.querySelector('.rl').style.transform = `scaleX(${ease(seg(p, .34 + i * .02, .4 + i * .02)).toFixed(3)})`;
      r.querySelector('.n > b').style.opacity = seg(p, .4 + i * .015, .43 + i * .015);
      $$('.ps-c > span', r).forEach((c, j) => { const t0 = .44 + (i * 3 + j) * .011; c.style.transform = `translateY(${(110 * (1 - ease(seg(p, t0, t0 + .03)))).toFixed(1)}%)`; });
      // coverage strip: each product line lights up as this manufacturer's quote for it comes in
      let q = 0;
      cvCells[i].forEach((c, k) => {
        const on = p >= .46 + i * .03 + k * .0035; if (on) q++;
        c.classList.toggle('on', on && !(i === 2 && k === AWN));
        c.classList.toggle('dv', on && i === 2 && k === AWN);
      });
      cvN[i].textContent = `${pad2(q)}/07`;
      r.querySelector('.ps-tags').style.opacity = seg(p, .56 + i * .008, .59 + i * .008);
      r.classList.toggle('dim', p >= .63 && i !== 1);
    });
    // selection: a green line traces around Cascade
    const rr = bids[1].getBoundingClientRect();
    sel.setAttribute('x', (rr.left - sr.left - 10).toFixed(1)); sel.setAttribute('y', (rr.top - sr.top + 3).toFixed(1));
    sel.setAttribute('width', Math.max(0, rr.width + 20).toFixed(1)); sel.setAttribute('height', Math.max(0, rr.height - 6).toFixed(1));
    sel.style.strokeDashoffset = (1 - seg(p, .6, .66)).toFixed(4);
    selSvg.style.opacity = (1 - wipe).toFixed(3);
    selL.style.left = (rr.right - sr.left - selL.offsetWidth) + 'px'; selL.style.top = (rr.bottom - sr.top + 2) + 'px';
    selL.style.opacity = (seg(p, .65, .68) * (1 - wipe)).toFixed(3);
    // dealer view → customer proposal → acceptance
    led.style.opacity = (wipe * fo).toFixed(3);
    led.style.clipPath = wipe >= 1 ? '' : `inset(0 ${((1 - wipe) * 100).toFixed(1)}% 0 0)`;
    const cust = p >= .75;
    led.classList.toggle('cust', cust); sheet.classList.toggle('cust', cust);
    sig.style.strokeDashoffset = (1 - seg(p, .77, .81)).toFixed(4);
    tick.classList.toggle('on', p >= .81);
    accRule.style.transform = `scaleX(${ease(seg(p, .81, .84)).toFixed(3)})`;
    acc.classList.toggle('ok', p >= .83);
    // the accepted proposal compresses into the order card that carries into Fulfill
    const om = ease(seg(p, .91, .95));
    place(ord, lerp(sr.left + sr.width / 2 - cr.w / 2, cr.x, om), lerp(sr.top + sr.height / 2 - cr.h / 2, cr.y, om), cr.w, cr.h);
    ord.style.opacity = seg(p, .88, .91).toFixed(3);
    const ai = 1 - ease(seg(p, .03, .12)), ao = ease(seg(p, .93, .97));
    aper(scene, Math.max(ai, ao), ai >= ao ? pk : cr);
    scene.style.visibility = raw < .03 || raw >= .97 ? 'hidden' : 'visible';
    const ci = p < .3 ? 0 : p < .55 ? 1 : p < .6 ? 2 : p < .68 ? 3 : p < .75 ? 4 : p < .83 ? 5 : p < .88 ? 6 : 7;
    cap.textContent = CAPS[ci]; cap.classList.toggle('ok', ci >= 6);
    terms[0].className = p < .3 ? 'on' : 'ok';
    terms[1].className = p < .3 ? '' : p < .68 ? 'on' : 'ok';
    terms[2].className = p < .68 ? '' : p < .83 ? 'on' : 'ok';
  }
  SCENES.push(update);
}

/* ------------------------------------------------------------------
   05 Fulfill — the order trace: one line drawing down from the PO
------------------------------------------------------------------ */
const FF_MS = [
  ['PO created', 'Dealer', 'Oct 18', {k:'01 / PO created', t:'Purchase order', d:[['PO', '#WB-0048'], ['Supplier', 'Cascade'], ['Lines', '07 · 12 openings']]}],
  ['PO acknowledged', 'Manufacturer', 'Oct 20', {k:'02 / PO acknowledged', t:'Acknowledged', d:[['By', 'Cascade'], ['Confirmed', '07 lines · 12 units']]}],
  ['Manufacturing', 'Manufacturer', 'Oct 22', {k:'03 / Manufacturing', t:'In production', d:[['Supplier', 'Cascade'], ['Started', 'Oct 22'], ['Est. complete', 'Nov 17']]}],
  ['Ready to ship', 'Manufacturer', 'Nov 18', {k:'04 / Ready to ship', t:'Packed', d:[['Packed', 'Nov 18'], ['Units', '12 · 3 crates']]}],
  ['In transit', 'Carrier', 'Nov 20', {k:'05 / In transit', t:'Shipment 01', d:[['Carrier', 'Demo Freight'], ['Tracking', '5840-291'], ['ETA', 'Nov 24']]}],
  ['Delivered', 'Dealer · job site', 'Nov 24', {k:'06 / Delivered', t:'Delivery confirmed', d:[['Received', 'Nov 24'], ['Location', 'Job site'], ['Condition', 'Confirmed']]}],
  ['Installed', 'Installer', 'Dec 01', {k:'07 / Installed', t:'Installation', d:[['Openings', '12 / 12'], ['Customer signoff', '<span class="okt">✓ Signed</span>']]}],
];
function initFulfillScene() {
  const sec = $('#fulfill'), scene = $('#ffScene'), vis = $('#ffVis'), po = $('#ffPo'), tr = $('#ffTrace'), draw = $('#ffDraw'), tip = $('#ffTip'), ms = $('#ffMs'), note = $('#ffNote'), end = $('#ffEnd');
  ms.innerHTML = FF_MS.map(m => `<li data-cursor="Details"><span>${m[0]}</span><span class="ow">${m[1]}</span><span class="dt">${m[2]} <span class="ck">✓</span><span class="nxt">Next</span></span></li>`).join('');
  const lis = $$('li', ms), cap = $('#ffCap'), terms = $$('#ffTerms li'), head = $('.ff-txt .rv', sec);
  let shown = -2, hover = -1;
  const noteHTML = i => { const d = FF_MS[i][3]; return `<div class="in"><span class="k">${d.k}</span><h4>${d.t}</h4><dl>${d.d.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl></div>`; };
  lis.forEach((li, i) => {
    li.addEventListener('mouseenter', () => { if (li.classList.contains('on')) { hover = i; note.innerHTML = noteHTML(i); shown = -3; kick(); } });
    li.addEventListener('mouseleave', () => { hover = -1; shown = -2; kick(); });
  });
  function update() {
    if (!near(sec)) return;
    const raw = rawP(sec), p = clamp(raw, 0, 1), nar = narrow();
    scene.style.visibility = raw < .03 ? 'hidden' : 'visible';
    if (raw >= .03) head.classList.add('in');
    const vr = vis.getBoundingClientRect(), cr = centerRect();
    aper(scene, 1 - ease(seg(p, .03, .12)));
    // the customer-accepted order becomes the PO header
    const mv = ease(seg(p, .12, .2)), tw = nar ? vr.width : Math.min(vr.width * .58, 420);
    place(po, lerp(cr.x, vr.left, mv), lerp(cr.y, vr.top, mv), lerp(cr.w, tw, mv), cr.h);
    $('.b', po).style.opacity = seg(p, .15, .2);
    // a single leader line draws down; each milestone appears when the line reaches it
    const RH = nar ? 34 : 50, H = RH * 6;
    tr.style.setProperty('--h', H + 'px');
    const g = seg(p, .22, .84);
    draw.style.transform = `scaleY(${g.toFixed(4)})`;
    tip.style.top = `calc(var(--rh) / 2 + ${(g * H).toFixed(1)}px)`;
    tip.style.opacity = p >= .2 ? 1 : 0;
    const k = p < .22 ? -1 : Math.min(6, Math.floor(g * 6 + 1e-4));
    lis.forEach((li, i) => { li.classList.toggle('on', i <= k); li.classList.toggle('nx', k >= 0 && i === k + 1); });
    if (k >= 0 && hover < 0 && shown !== k) { shown = k; note.innerHTML = noteHTML(k); }
    if (!nar && k >= 0) { const li = lis[hover >= 0 ? hover : k]; note.style.top = Math.max(0, li.getBoundingClientRect().top - vr.top - 18) + 'px'; }
    // ending: the trace folds away, W07 and "Complete." remain
    const e = ease(seg(p, .86, .92));
    tr.style.opacity = (seg(p, .18, .22) * (1 - e)).toFixed(3); tr.style.transform = `scaleY(${(1 - .5 * e).toFixed(3)})`;
    note.style.opacity = ((k >= 0 ? 1 : 0) * (1 - e)).toFixed(3);
    po.style.opacity = ((raw < .03 ? 0 : 1) * (1 - e)).toFixed(3);
    end.style.opacity = seg(p, .9, .96).toFixed(3);
    cap.textContent = e > .5 ? 'W07 · from drawing to installation' : k < 0 ? 'PO #WB-0048 · Cascade' : `${pad2(k + 1)} / ${FF_MS[k][0]} · ${FF_MS[k][2]}`;
    cap.classList.toggle('ok', k === 6);
    terms[0].className = p < .3 ? 'on' : 'ok';
    terms[1].className = p < .3 ? '' : p < .86 ? 'on' : 'ok';
    terms[2].className = p < .86 ? '' : 'ok';
  }
  SCENES.push(update);
}

function initHandoffs() {
  $('#hand1').outerHTML = pkgHTML('hand1', 'full hfix');
  const h1 = $('#hand1'), h2 = $('#hand2'), rv = $('#review'), pc = $('#procure'), ff = $('#fulfill');
  SCENES.push(() => {
    if (PAGE !== 'home') { h1.classList.remove('on'); h2.classList.remove('on'); return; }
    const c = center();
    const s1 = rawP(rv) >= .997 && rawP(pc) < .03, s2 = rawP(pc) >= .97 && rawP(ff) < .03;
    for (const [h, on] of [[h1, s1], [h2, s2]]) { h.classList.toggle('on', on); if (on) { h.style.left = c.x + 'px'; h.style.top = c.y + 'px'; } }
    if (s1) { const s = PKS(); h1.style.width = s.w + 'px'; h1.style.height = s.h + 'px'; }
  });
}

