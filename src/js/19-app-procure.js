'use strict';
/* ------------------------------------------------------------------
   PROCURE — RFQ → Bids → Proposal → Purchase order
   (platform preview: manufacturers, prices, specs and order dates are simulated)

   One rule for every screen: decision first → summary second → evidence only when asked for.
   - Level 1 (must know now): project, the decision or status, the one important number, the primary action.
   - Level 2 (summary): counts, price, delivery, requirement status, chosen supplier.
   - Level 3 (evidence): tables, marks, full specs, source file, calculations, history — behind "View …".
   A problem is never collapsed away: it stays in the summary line ("2 without a size", "3 / 6").
   The four documents get more finished as the project moves: RFQ technical, Bids analytical,
   Proposal client-ready, Purchase order operational. Motion is calm: disclosures, selection,
   preference changes, status changes — no count-ups or cascading rows.

   What a dealer compares besides price (bids leveled on the same terms):
   - whole-window NFRC ratings (U-factor, SHGC, visible transmittance, air leakage); targets from
     ENERGY STAR v7 for a hot climate (Southern zone: U-factor ≤ 0.32, SHGC ≤ 0.23)
   - the glass package: panes, Low-E coating, gas fill, warm-edge spacer, tempered glass where required
   - frame and finish, warranty (product, glass seal, labor), lead time, quote validity, deposit, scope
------------------------------------------------------------------ */
const SPEC_TARGET = {u:.32, shgc:.23, al:.30, warranty:20};
const SPEC_ITEMS = [
  ['perf', 'Performance', 'NFRC-certified whole-window ratings · U-factor ≤ 0.32 · SHGC ≤ 0.23 · air leakage ≤ 0.30 (ENERGY STAR v7, Southern zone)'],
  ['glass', 'Glass package', 'Dual-pane insulated · Low-E · argon fill · warm-edge spacer'],
  ['temp', 'Safety glass', ''],                                   // filled in with the takeoff's tempered count
  ['finish', 'Frame & finish', 'White exterior · state the frame material'],
  ['warranty', 'Warranty', '≥ 20 years on product and glass seal · labor coverage stated'],
  ['terms', 'Terms', 'Prices valid ≥ 30 days · state deposit and lead time'],
];
// sample bid details, one per manufacturer in MFRS (03-pricing.js)
const BID_SPEC = [
  {frame:'Vinyl, fiberglass-clad', finish:'White', u:.28, shgc:.22, vt:.47, al:.10, nfrc:true, panes:'Dual-pane', lowe:'Low-E³ (366)', gas:'Argon 90%', spacer:'Warm-edge, stainless', warm:true, wProduct:20, wGlass:20, wLabor:2, deposit:50, valid:30},
  {frame:'Aluminum-clad wood', finish:'White', u:.30, shgc:.21, vt:.42, al:.07, nfrc:true, panes:'Dual-pane', lowe:'Low-E³ (366)', gas:'Argon 95%', spacer:'Warm-edge, foam', warm:true, wProduct:20, wGlass:20, wLabor:1, deposit:30, valid:45},
  {frame:'Vinyl', finish:'White', u:.30, shgc:.27, vt:.51, al:.25, nfrc:true, panes:'Dual-pane', lowe:'Low-E² (272)', gas:'Argon', spacer:'Aluminum box', warm:false, wProduct:15, wGlass:10, wLabor:0, deposit:25, valid:30},
];
const PRIORITIES = [
  ['balanced', 'Balanced', {cost:.35, lead:.15, perf:.2, warranty:.1, spec:.15, terms:.05}],
  ['cost', 'Lowest cost', {cost:.82, lead:.04, perf:.04, warranty:.03, spec:.05, terms:.02}],
  ['speed', 'Fastest delivery', {cost:.2, lead:.6, perf:.1, warranty:.05, spec:.05, terms:0}],
  ['perf', 'Best performance', {cost:.15, lead:.05, perf:.45, warranty:.2, spec:.15, terms:0}],
];
const FACTOR_NAME = {cost:'price', lead:'delivery', perf:'energy performance', warranty:'warranty', spec:'requirements met', terms:'terms'};
const RFQ_NO = '#WB-1042', PO_NO = '#WB-0048', DEALER = 'Arizona Window Solutions';
const today = () => new Date().toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
const dueDay = iso => { const d = new Date(`${iso}T12:00`); return isNaN(d) ? iso : d.toLocaleDateString('en-US', {month:'short', day:'numeric'}).toUpperCase(); };
const weeks = b => `${b.lead}–${b.lead + 1} weeks`;
const plural = (n, w, ws = w + 's') => `${n} ${n === 1 ? w : ws}`;

// "5·1–5·15" for a run of one tag; otherwise the first marks and a count
function markRange(items) {
  const ms = items.map(i => i.mark), tag = items[0]?.tag;
  if (tag && ms.length > 2 && ms.every((m, k) => m === `${tag}·${k + 1}`)) return `${ms[0]}–${ms[ms.length - 1]}`;
  return ms.length > 6 ? `${ms.slice(0, 5).join(', ')} +${ms.length - 5}` : ms.join(', ');
}

/* ---------- shared pieces: preview line, header, number blocks, disclosures, product lines, action bar ---------- */
const PREVIEW = '<p class="wb-pv"><b>Preview environment</b> · Manufacturer, pricing and lead-time data are simulated.</p>';
const headHtml = (title, ref, project, sub) => `<header class="wb-head">
    <div class="wb-head-r"><h1>${title}</h1><span class="wb-ref">${ref}</span></div>
    <p class="wb-proj">${esc(project)}</p>${sub ? `<p class="wb-sub">${sub}</p>` : ''}</header>`;
const numsHtml = list => `<div class="wb-nums">${list.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div>`;
S.openDis = S.openDis || new Set();
// "View product lines  12  ↓": the same disclosure everywhere; remembers what was open across re-renders
const dis = (id, label, count, body) => `<div class="wb-dis ${S.openDis.has(id) ? 'open' : ''}" data-dis="${id}">
    <button type="button" class="wb-dis-h" aria-expanded="${S.openDis.has(id)}"><span>${label}</span>${count !== '' && count != null ? `<em>${count}</em>` : ''}<i aria-hidden="true"></i></button>
    <div class="wb-dis-b"><div class="wb-dis-in">${body}</div></div></div>`;
document.addEventListener('click', e => {
  const h = e.target.closest('.wb-dis-h'); if (!h) return;
  const d = h.parentElement, open = !d.classList.contains('open');
  d.classList.toggle('open', open); h.setAttribute('aria-expanded', open);
  open ? S.openDis.add(d.dataset.dis) : S.openDis.delete(d.dataset.dis);
});
// product lines with their marks summarised; every mark one click away
function linesHtml(gs) {
  return `<div class="wb-lines" role="table">
    <div class="wb-line wb-lh" role="row"><span>Line</span><span>Product</span><span class="r">Size (in)</span><span class="r">Qty</span><span>Marks</span></div>
    ${gs.map((g, i) => `<div class="wb-line" role="row">
      <span class="n">${pad2(i + 1)}</span>
      <span class="p">${esc(pname(g))}${g.items.some(x => x.temp) ? '<i class="wb-tag">Tempered</i>' : ''}</span>
      <span class="s r">${g.w ?? '?'} × ${g.h ?? '?'}</span>
      <span class="q r">${g.items.length}</span>
      <details class="wb-mk"><summary>Marks ${esc(markRange(g.items))}</summary><p>${g.items.map(x => esc(x.mark)).join(', ')}</p></details></div>`).join('')}
  </div>`;
}
const barHtml = (back, mid, primary) => `<div class="wb-bar"><div class="wb-bar-in">${back}<span class="wb-bar-mid">${mid}</span>${primary}</div></div>`;
// mount a document; the short fade plays only when the page is first opened, not on updates
function mountDoc(host, html, enter) {
  host.innerHTML = html;
  if (enter) { host.classList.remove('wb-enter'); void host.offsetWidth; host.classList.add('wb-enter'); }
}
const sourceLine = () => { const m = /(\d+) pages?/.exec(S.src?.file || ''); return S.src?.kind === 'sample' ? 'Sample floor plan' : m ? `${m[1]}-page architectural set` : 'Uploaded plan'; };

/* ---------- RFQ: a prepared specification sheet ---------- */
function openRFQ(enter = true) {
  const gs = groups(), n = S.items.length, temp = S.items.filter(i => i.temp).length;
  const noSize = S.items.filter(i => i.w == null || i.h == null).length, open = S.items.filter(i => !i.approved).length;
  const due = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  S.rfq = S.rfq || {mfr:MFRS.map(() => true), due, notes:'Match marks to the attached plan. Quote Low-E insulated glass, white exterior.',
                    spec:Object.fromEntries(SPEC_ITEMS.map(([k]) => [k, true])), v:1};
  const sp = S.rfq.spec, on = SPEC_ITEMS.filter(([k]) => sp[k]).length;
  const specText = k => k === 'temp' ? (temp ? `Tempered glass at the ${plural(temp, 'unit')} marked in the takeoff` : 'Tempered glass wherever code requires it') : SPEC_ITEMS.find(s => s[0] === k)[2];
  const basis = ['Low-E insulated glass', sp.finish && 'White exterior', sp.perf && 'NFRC compliant', sp.warranty && '20-year product warranty'].filter(Boolean).join(' · ');
  const issues = [noSize && `<b class="wb-warn">${noSize} without a size</b>`, open && `<b class="wb-warn">${open} not verified</b>`].filter(Boolean);
  const k = S.rfq.mfr.filter(Boolean).length;
  mountDoc($('#rfqDoc'), `<div class="wb wb-rfq">${PREVIEW}
    ${headHtml('Request for quote', `RFQ ${RFQ_NO} · v${S.rfq.v}`, S.src.title, `${DEALER} · ${n} verified opening${n === 1 ? '' : 's'} ready to price`)}
    ${numsHtml([[n, 'Openings'], [gs.length, 'Product lines'], [temp, 'Tempered']])}
    <section class="wb-blk"><h3 class="wb-k">Quote basis</h3><p class="wb-s">${basis}</p></section>
    <section class="wb-blk"><h3 class="wb-k">Products</h3>
      <p class="wb-s">${plural(gs.length, 'product line')} · ${plural(n, 'opening')}${issues.length ? ' · ' + issues.join(' · ') : ''}</p>
      ${dis('rfq-lines', 'View product lines', gs.length, linesHtml(gs))}</section>
    <section class="wb-blk"><h3 class="wb-k">Requirements</h3>
      <p class="wb-s" id="rfqReq">${on === SPEC_ITEMS.length ? `${SPEC_ITEMS.length} requirements · All included` : `${on} of ${SPEC_ITEMS.length} included · <b class="wb-warn">${SPEC_ITEMS.length - on} switched off</b>`}</p>
      ${dis('rfq-req', 'Review requirements', SPEC_ITEMS.length, `<p class="wb-note">Every bid will be checked against these. NFRC ratings must be for the whole window, not the center of the glass.</p>
        <div class="wb-reqs">${SPEC_ITEMS.map(([key, label]) => `<label class="wb-req"><input type="checkbox" data-spec="${key}" ${sp[key] ? 'checked' : ''}>
          <span class="sw" aria-hidden="true"></span><span class="tx"><b>${label}</b><span>${esc(specText(key))}</span></span></label>`).join('')}</div>`)}</section>
    <section class="wb-blk"><h3 class="wb-k">Send to</h3>
      <div class="wb-mfrs">${MFRS.map((m, i) => `<label class="wb-mfr"><input type="checkbox" data-m="${i}" ${S.rfq.mfr[i] ? 'checked' : ''}>
        <span class="box" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7"/></svg></span>
        <span class="nm">${m.name}</span><span class="nt">${m.note}</span></label>`).join('')}</div></section>
    <section class="wb-blk wb-due"><h3 class="wb-k">Bids due</h3>
      <label class="wb-date"><span id="rfqDueTxt">${dueDay(S.rfq.due)}</span><input type="date" id="rfqDue" value="${S.rfq.due}" aria-label="Bids due"></label>
      ${dis('rfq-note', 'Note to manufacturers', '', `<textarea id="rfqNotes" class="wb-ta" aria-label="Note to manufacturers">${esc(S.rfq.notes)}</textarea>`)}</section>
    <section class="wb-blk"><h3 class="wb-k">Source</h3><p class="wb-s">${sourceLine()}</p>
      ${dis('rfq-src', 'View source details', '', `<p class="wb-mono">${esc(S.src.file || '')}</p>`)}</section>
    ${barHtml('<button class="btn-ghost sm" id="rfqBack">← Back to takeoff</button>', `<span id="rfqMid">${k ? plural(k, 'manufacturer') + ' selected' : 'Choose at least one manufacturer'}</span>`,
      `<button class="btn wb-send" id="rfqSend" ${k ? '' : 'disabled'}><span class="lb">Send RFQ</span> <span class="arr">→</span></button>`)}
  </div>`, enter);
  goStage('rfq');
  const sync = () => {
    const k = S.rfq.mfr.filter(Boolean).length, on = Object.values(S.rfq.spec).filter(Boolean).length;
    $('#rfqMid').textContent = k ? `${plural(k, 'manufacturer')} selected` : 'Choose at least one manufacturer';
    $('#rfqSend').disabled = !k;
    $('#rfqReq').innerHTML = on === SPEC_ITEMS.length ? `${SPEC_ITEMS.length} requirements · All included` : `${on} of ${SPEC_ITEMS.length} included · <b class="wb-warn">${SPEC_ITEMS.length - on} switched off</b>`;
  };
  $$('#rfqDoc [data-m]').forEach(c => c.onchange = () => { S.rfq.mfr[+c.dataset.m] = c.checked; sync(); });
  $$('#rfqDoc [data-spec]').forEach(c => c.onchange = () => { S.rfq.spec[c.dataset.spec] = c.checked; sync(); });
  $('#rfqDue').onchange = e => { S.rfq.due = e.target.value; $('#rfqDueTxt').textContent = dueDay(S.rfq.due); };
  $('#rfqNotes').oninput = e => S.rfq.notes = e.target.value;
  $('#rfqBack').onclick = () => { goStage('work'); S.stage = 'review'; renderSteps(); requestAnimationFrame(() => { fitView(); renderReview(); }); };
  $('#rfqSend').onclick = async () => {
    const b = $('#rfqSend'); if (b.classList.contains('sending')) return;
    if (S.rfq.sent && S.rfq.sentKey !== JSON.stringify([S.rfq.mfr, S.rfq.spec, S.rfq.due])) S.rfq.v++;   // changed since last sent: a new version
    S.rfq.sent = true; S.rfq.sentKey = JSON.stringify([S.rfq.mfr, S.rfq.spec, S.rfq.due]);
    b.classList.add('sending'); b.querySelector('.lb').textContent = 'Sending';
    await wait(REDUCED ? 0 : 600);
    sendRFQ();
  };
}

/* ---------- bids: a comparison board ---------- */
// which of the switched-on requirements a bid meets
function reqCheck(b) {
  const sp = S.rfq.spec, x = b.spec;
  const tests = {
    perf: [x.nfrc && x.u <= SPEC_TARGET.u && x.shgc <= SPEC_TARGET.shgc && x.al <= SPEC_TARGET.al,
           x.shgc > SPEC_TARGET.shgc ? `SHGC ${x.shgc.toFixed(2)} > ${SPEC_TARGET.shgc}` : x.u > SPEC_TARGET.u ? `U-factor ${x.u.toFixed(2)} > ${SPEC_TARGET.u}` : 'Not NFRC-rated'],
    glass: [x.warm, 'No warm-edge spacer'],
    temp: [true, ''],
    finish: [true, ''],
    warranty: [x.wProduct >= SPEC_TARGET.warranty && x.wGlass >= SPEC_TARGET.warranty && x.wLabor > 0, `${x.wGlass}-year glass seal${x.wLabor ? '' : ', no labor cover'}`],
    terms: [x.valid >= 30, `Prices valid ${x.valid} days`],
  };
  const on = SPEC_ITEMS.map(s => s[0]).filter(k => sp[k]);
  const fails = on.filter(k => !tests[k][0]).map(k => tests[k][1]);
  return {met:on.length - fails.length, total:on.length, fails, star:x.u <= SPEC_TARGET.u && x.shgc <= SPEC_TARGET.shgc};
}
function computeBids() {
  const gs = groups(), hasAwning = gs.some(g => g.type === 'Awning');
  return MFRS.map((m, i) => {
    if (!S.rfq.mfr[i]) return null;
    const lines = gs.map(g => Math.round(unitPrice(g) * g.items.length * m.mult / 10) * 10);
    const product = lines.reduce((a, v) => a + v, 0);
    return {...m, i, spec:BID_SPEC[i], lines, product, landed:product + m.freight,
      dev: m.dev ? (hasAwning ? 'Awning not offered, casement substituted' : 'Grid pattern not offered') : null};
  }).filter(Boolean);
}
// 0–1 per factor (1 = best among these bids), weighted by the chosen priority
function scoreBids(B, w) {
  const minL = Math.min(...B.map(b => b.landed)), minLead = Math.min(...B.map(b => b.lead));
  return B.map(b => {
    const x = b.spec, c = reqCheck(b), misses = (c.total - c.met) + (b.dev ? 1 : 0);
    const f = {
      cost: clamp(1 - (b.landed - minL) / (minL * .12), 0, 1),
      lead: clamp(1 - (b.lead - minLead) / 6, 0, 1),
      perf: clamp((clamp(1 - (x.u - .22) / .12, 0, 1) + clamp(1 - (x.shgc - .17) / .12, 0, 1)) / 2 - (c.star ? 0 : .25) + (x.warm ? .05 : 0), 0, 1),
      warranty: clamp((x.wProduct + x.wGlass + x.wLabor * 4) / 48, 0, 1),
      spec: clamp(1 - misses * .3, 0, 1),
      terms: clamp(1 - (x.deposit - 20) / 40, 0, 1) * .7 + clamp(x.valid / 45, 0, 1) * .3,
    };
    const tw = Object.values(w).reduce((a, v) => a + v, 0) || 1;
    return Math.round(Object.keys(w).reduce((a, k) => a + w[k] * f[k], 0) / tw * 100);
  });
}
const prio = () => PRIORITIES.find(p => p[0] === S.prio) || PRIORITIES[0];
function bidState() {
  const B = S.bids, sc = scoreBids(B, prio()[2]), best = sc.indexOf(Math.max(...sc));
  const minL = Math.min(...B.map(b => b.landed)), minLead = Math.min(...B.map(b => b.lead));
  const chosen = S.bidChoice != null && B.some(b => b.i === S.bidChoice) ? B.findIndex(b => b.i === S.bidChoice) : best;
  return {B, sc, best, minL, minLead, chosen};
}
async function sendRFQ() {
  S.bids = computeBids(); S.prio = S.prio || 'balanced'; S.bidChoice = null; S.bidsIn = 0;
  const run = S.bidRun = (S.bidRun || 0) + 1;            // its own counter: a background plan read keeps going
  renderBids(true); goStage('bids');
  for (let k = 0; k < S.bids.length; k++) {
    await wait(REDUCED ? 0 : 650); if (run !== S.bidRun) return;
    S.bidsIn = k + 1; renderBids(false, k);
  }
}
function renderBids(enter, fresh) {
  const {B, best, minL, minLead, chosen} = bidState(), all = S.bidsIn >= B.length, gs = groups();
  const tags = (b, k) => [k === best && all && '<i class="wb-t best">Best match</i>', b.lead === minLead && '<i class="wb-t">Fastest</i>',
                          b.landed === minL && '<i class="wb-t">Lowest cost</i>'].filter(Boolean).join('');
  const rows = B.map((b, k) => {
    if (k >= S.bidsIn) return `<div class="wb-bid wait" role="row"><span class="nm"><b>${b.short}</b></span><span class="wb-await">Awaiting bid…</span></div>`;
    const c = reqCheck(b), ok = c.met === c.total;
    return `<button type="button" class="wb-bid ${k === fresh ? 'in' : ''} ${all && k === chosen ? 'sel' : ''}" data-bid="${b.i}" role="row" aria-pressed="${all && k === chosen}" ${all ? '' : 'disabled'}>
      <span class="nm"><b>${b.short}</b><span class="tags" data-tags="${k}">${tags(b, k)}</span></span>
      <span class="m">${money(b.landed)}</span><span>${weeks(b)}</span>
      <span class="rq ${ok ? 'ok' : 'x'}">${ok ? '✓' : '!'} ${c.met} / ${c.total}${b.dev ? '<small>+ 1 product deviation</small>' : ''}</span></button>`;
  }).join('');
  const rest = !all ? '' : `
    <section class="wb-blk wb-ev">
      ${dis('bid-products', 'Compare products', gs.length, productsCompareHtml(B, gs))}
      ${dis('bid-specs', 'Compare specifications', '', specTableHtml(B))}
      ${dis('bid-rank', 'View ranking details', '', `<div id="rankBox">${rankHtml()}</div>`)}
    </section>
    <section class="wb-blk wb-opt"><h3 class="wb-k">Optimize recommendation for</h3>
      <div class="seg" role="radiogroup" aria-label="Optimize recommendation for">${PRIORITIES.map(([key, l]) => `<button type="button" role="radio" data-prio="${key}" aria-checked="${S.prio === key}">${l}</button>`).join('')}</div></section>
    <section class="wb-rec" id="recBox">${recHtml()}</section>`;
  mountDoc($('#bidsDoc'), `<div class="wb wb-bids ${all && fresh === B.length - 1 ? 'reveal' : ''}">${PREVIEW}
    ${headHtml('Bids received', `<b>${S.bidsIn} / ${B.length}</b> · RFQ ${RFQ_NO} · v${S.rfq.v}`, S.src.title, all ? 'Every bid normalized to your takeoff and checked against your requirements.' : 'Waiting for manufacturers to reply…')}
    <div class="wb-cmp" role="table">
      <div class="wb-bid wb-bh" role="row"><span></span><span class="m">Total</span><span>Delivery</span><span>Requirements</span></div>
      ${rows}</div>
    ${rest}
    ${barHtml('<button class="btn-ghost sm" id="bidsBack">← Back to RFQ</button>', `<span id="bidsMid">${all ? usingText() : ''}</span>`,
      `<button class="btn" id="bidUse" ${all ? '' : 'disabled'}>Use this bid <span class="arr">→</span></button>`)}
  </div>`, enter);
  $('#bidsBack').onclick = () => { S.bidRun++; openRFQ(); };
  if (!all) return;
  $$('#bidsDoc [data-bid]').forEach(r => r.onclick = () => { S.bidChoice = S.bidChoice === +r.dataset.bid ? null : +r.dataset.bid; applyPriority(); });
  $$('#bidsDoc [data-prio]').forEach(b => b.onclick = () => { S.prio = b.dataset.prio; applyPriority(); });
  const t = $('#bdCmp');
  t.onmouseover = e => { const c = e.target.closest('[data-c]'); t.dataset.hc = c ? c.dataset.c : ''; };
  t.onmouseleave = () => { t.dataset.hc = ''; };
  $$('#bdCmp .bd-gh button').forEach(b => b.onclick = () => { const g = b.closest('tbody'); g.classList.toggle('open'); b.setAttribute('aria-expanded', g.classList.contains('open')); });
  $('#bidUse').onclick = () => { const {B, chosen} = bidState(); S.pick = B[chosen]; S.prop = {state:'draft', v:1}; openProposal(true); };
}
const usingText = () => { const {B, best, chosen} = bidState(); return chosen === best ? `Using ${B[chosen].short} · recommended` : `Using ${B[chosen].short} · your choice`; };
// a preference change updates the recommendation, tags, bars and selection in place — no jump, no re-render
function applyPriority() {
  const {B, best, chosen} = bidState();
  $$('#bidsDoc [data-prio]').forEach(b => b.setAttribute('aria-checked', b.dataset.prio === S.prio));
  $$('#bidsDoc [data-bid]').forEach((r, k) => { r.classList.toggle('sel', k === chosen); r.setAttribute('aria-pressed', k === chosen); });
  $$('#bidsDoc .wb-t.best').forEach(t => t.remove());
  const tg = $(`#bidsDoc [data-tags="${best}"]`); if (tg) tg.insertAdjacentHTML('afterbegin', '<i class="wb-t best">Best match</i>');
  $('#recBox').innerHTML = recHtml(); const rb = $('#recBox'); rb.classList.remove('wb-swap'); void rb.offsetWidth; rb.classList.add('wb-swap');
  const sc = scoreBids(B, prio()[2]);
  $$('#rankBox .wb-rank li').forEach((li, k) => { li.querySelector('.bar i').style.transform = `scaleX(${sc[k] / 100})`; li.querySelector('.sc').textContent = sc[k]; li.classList.toggle('best', k === best); });
  const w = $('#rankBox .wb-weights'); if (w) w.innerHTML = weightsText();
  $('#bidsMid').textContent = usingText();
  $('#bdCmp').dataset.best = best;
}
const weightsText = () => { const [, label, w] = prio(); return `<b>${label}:</b> ` + Object.entries(w).filter(([, v]) => v).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${FACTOR_NAME[k]} ${Math.round(v * 100)}%`).join(' · '); };
function rankHtml() {
  const {B, sc, best} = bidState();
  return `<ol class="wb-rank">${B.map((b, k) => `<li class="${k === best ? 'best' : ''}"><span class="nm">${b.short}</span><span class="bar"><i style="transform:scaleX(${sc[k] / 100})"></i></span><b class="sc">${sc[k]}</b></li>`).join('')}</ol>
    <p class="wb-note wb-weights">${weightsText()}</p>
    <p class="wb-note">Each factor is scored 0–1 against the other bids (the lowest price scores 1; 12 % more scores 0), then weighted and summed to 100.</p>`;
}
function recHtml() {
  const {B, best, minL, minLead} = bidState(), b = B[best], c = reqCheck(b), sp = b.spec;
  const pts = [c.met === c.total && !b.dev ? 'Meets every project requirement' : `Misses ${c.total - c.met + (b.dev ? 1 : 0)}: ${[...c.fails, b.dev].filter(Boolean).join(' · ')}`,
               b.landed === minL ? 'The lowest bid' : `${money(b.landed - minL)} above the lowest bid`,
               `${weeks(b)} estimated delivery`];
  const why = [`<b>Price:</b> ${money(b.landed)} landed${b.landed === minL ? ', the lowest' : ` — ${money(b.landed - minL)} more than the lowest`}`,
               `<b>Delivery:</b> ${weeks(b)}${b.lead === minLead ? ', the fastest' : ` — ${b.lead - minLead} week${b.lead - minLead > 1 ? 's' : ''} slower than the fastest`}`,
               `<b>Energy:</b> U-factor ${sp.u.toFixed(2)}, SHGC ${sp.shgc.toFixed(2)}${c.star ? ' — qualifies for ENERGY STAR v7, Southern zone' : ' — does not meet the ENERGY STAR targets'}`,
               `<b>Warranty:</b> ${sp.wProduct} years product, ${sp.wGlass} years glass seal, ${sp.wLabor ? `${sp.wLabor} year${sp.wLabor > 1 ? 's' : ''} labor` : 'no labor cover'}`,
               `<b>Terms:</b> ${sp.deposit}% deposit, prices valid ${sp.valid} days`];
  return `<p class="wb-k">Recommended · ${prio()[1]}</p><h2>${b.name}</h2>
    <ul class="wb-pts">${pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
    ${dis('bid-why', `Why ${b.short} ranks first`, '', `<ul class="wb-why">${why.map(w => `<li>${w}</li>`).join('')}</ul>`)}`;
}
function productsCompareHtml(B, gs) {
  return `<div class="wb-scroll"><table class="wb-tbl"><thead><tr><th>Line</th><th>Product</th><th class="r">Qty</th>${B.map(b => `<th class="r">${b.short}</th>`).join('')}</tr></thead><tbody>
    ${gs.map((g, i) => `<tr><td class="m">${pad2(i + 1)}</td><td>${esc(pname(g))} <span class="wb-dim">${g.w ?? '?'} × ${g.h ?? '?'}</span></td><td class="r m">${g.items.length}</td>${B.map(b => `<td class="r m">${money(b.lines[i])}</td>`).join('')}</tr>`).join('')}
    <tr class="tot"><td></td><td>Freight</td><td></td>${B.map(b => `<td class="r m">${money(b.freight)}</td>`).join('')}</tr>
    <tr class="tot"><td></td><td><b>Total landed</b></td><td></td>${B.map(b => `<td class="r m"><b>${money(b.landed)}</b></td>`).join('')}</tr></tbody></table></div>`;
}
// the full leveled table, grouped; groups open on demand and show "All met / 2 misses" when closed
function specTableHtml(B) {
  const sp = S.rfq.spec, C = B.map(reqCheck), minL = Math.min(...B.map(b => b.landed)), minLead = Math.min(...B.map(b => b.lead));
  const row = (label, v, sub = '') => `<tr><th scope="row">${label}${sub ? `<small>${sub}</small>` : ''}</th>${B.map((b, k) => { const [h, st = ''] = v(b, k); return `<td data-c="${k}" class="${st}">${h}</td>`; }).join('')}</tr>`;
  const ok = (cond, on) => !on ? '' : cond ? 'ok' : 'miss';
  const group = (id, title, sum, rows, open) => `<tbody class="bd-g ${open ? 'open' : ''}"><tr class="bd-gh"><th scope="rowgroup"><button type="button" aria-expanded="${!!open}">${title}<i aria-hidden="true"></i></button></th>${B.map((b, k) => `<td data-c="${k}">${sum(b, k)}</td>`).join('')}</tr>${rows}</tbody>`;
  const passSum = tests => b => { const bad = tests.filter(t => t(b) === 'miss').length; return bad ? `<span class="pill-x">${bad} miss${bad > 1 ? 'es' : ''}</span>` : '<span class="pill-ok">All met</span>'; };
  const perfT = [b => ok(b.spec.u <= SPEC_TARGET.u, sp.perf), b => ok(b.spec.shgc <= SPEC_TARGET.shgc, sp.perf), b => ok(b.spec.al <= SPEC_TARGET.al, sp.perf), b => ok(b.spec.nfrc, sp.perf)];
  const glassT = [b => ok(b.spec.warm, sp.glass)];
  const warT = [b => ok(b.spec.wProduct >= SPEC_TARGET.warranty, sp.warranty), b => ok(b.spec.wGlass >= SPEC_TARGET.warranty, sp.warranty), b => ok(b.spec.wLabor > 0, sp.warranty)];
  const best = bidState().best;
  return `<div class="bd-wrap"><table class="bd-cmp" id="bdCmp" data-best="${best}">
    <thead><tr><th scope="col"></th>${B.map((b, k) => `<th scope="col" data-c="${k}"><b>${b.short}</b><span>${b.note}</span></th>`).join('')}</tr></thead>
    ${group('cost', 'Cost', b => `<span class="m">${money(b.landed)}</span>`, [
      row('Product', b => [`<span class="m">${money(b.product)}</span>`]),
      row('Freight', b => [`<span class="m">${money(b.freight)}</span>`]),
      row('Landed cost', b => [`<span class="m">${money(b.landed)}</span>${b.landed === minL ? '<small>Lowest</small>' : `<small>+${money(b.landed - minL)}</small>`}`, b.landed === minL ? 'best' : '']),
    ].join(''))}
    ${group('time', 'Schedule', b => `<span class="m">${b.lead}–${b.lead + 1} wk</span>`, [
      row('Lead time', b => [weeks(b), b.lead === minLead ? 'best' : '']),
      row('Prices valid', b => [`${b.spec.valid} days`, ok(b.spec.valid >= 30, sp.terms)]),
    ].join(''))}
    ${group('perf', 'Energy performance', passSum(perfT), [
      row('U-factor', b => [`<span class="m">${b.spec.u.toFixed(2)}</span>`, perfT[0](b)], `target ≤ ${SPEC_TARGET.u} · lower insulates better`),
      row('SHGC', b => [`<span class="m">${b.spec.shgc.toFixed(2)}</span>`, perfT[1](b)], `target ≤ ${SPEC_TARGET.shgc} · lower blocks more sun heat`),
      row('Visible light', b => [`<span class="m">${b.spec.vt.toFixed(2)}</span>`], 'VT · higher lets in more daylight'),
      row('Air leakage', b => [`<span class="m">${b.spec.al.toFixed(2)}</span>`, perfT[2](b)], 'cfm/ft² · ≤ 0.30'),
      row('NFRC certified', b => [b.spec.nfrc ? 'Yes' : 'No', perfT[3](b)]),
      row('ENERGY STAR v7', (b, k) => [C[k].star ? 'Southern zone' : 'Not qualified', ok(C[k].star, sp.perf)]),
    ].join(''))}
    ${group('glass', 'Glass package', passSum(glassT), [
      row('Glazing', b => [b.spec.panes]), row('Low-E coating', b => [esc(b.spec.lowe)]), row('Gas fill', b => [esc(b.spec.gas)]),
      row('Spacer', b => [esc(b.spec.spacer), glassT[0](b)]), row('Tempered where marked', () => ['Included', ok(true, sp.temp)]),
    ].join(''))}
    ${group('frame', 'Frame & finish', b => esc(b.spec.frame.split(',')[0]), [row('Frame', b => [esc(b.spec.frame)]), row('Exterior finish', b => [esc(b.spec.finish), ok(true, sp.finish)])].join(''))}
    ${group('war', 'Warranty', passSum(warT), [
      row('Product', b => [`${b.spec.wProduct} years`, warT[0](b)]), row('Glass seal', b => [`${b.spec.wGlass} years`, warT[1](b)]),
      row('Labor', b => [b.spec.wLabor ? plural(b.spec.wLabor, 'year') : 'Not covered', warT[2](b)]),
    ].join(''))}
    ${group('terms', 'Terms', b => `${b.spec.deposit}% deposit`, [row('Deposit on order', b => [`${b.spec.deposit}%`]), row('Balance', () => ['Before delivery'])].join(''))}
    ${group('scope', 'Products as specified', (b) => b.dev ? '<span class="pill-x">1 deviation</span>' : '<span class="pill-ok">All met</span>',
      row('Deviations', b => [b.dev ? esc(b.dev) : `All ${S.items.length} openings as specified`, b.dev ? 'miss' : 'ok']))}
  </table></div>`;
}

/* ---------- proposal: the client-ready document, with the dealer's private pricing beside it ---------- */
function proposalNums() {
  const b = S.pick, n = S.items.length, install = Math.round(INSTALL_PER * n);
  const markup = Math.round(b.landed * S.margin / 100);
  return {b, n, install, markup, price:b.landed + install + markup};
}
function openProposal(enter) {
  const {b, n, install, markup, price} = proposalNums(), gs = groups(), st = S.prop.state;
  const done = st === 'accepted', locked = st !== 'draft';
  mountDoc($('#propDoc'), `<div class="wb wb-prop">${PREVIEW}
    <div class="pp-grid">
      <article class="pp-doc">
        <div class="pp-top"><span class="wb-k">Customer proposal</span><span class="wb-ref">Proposal v${S.prop.v} · ${today()}</span></div>
        <h1 class="pp-proj">${esc(S.src.title)}</h1>
        <p class="pp-sub">Windows supplied and installed</p>
        <div class="pp-price"><b id="ppPrice">${money(price)}</b><span>Installed total</span></div>
        <p class="pp-facts">${n} openings · Delivery ${weeks(b)} · ${b.spec.wProduct}-year product warranty</p>
        ${dis('prop-incl', 'View included products', gs.length, linesHtml(gs))}
        <footer class="pp-from"><b>${DEALER}</b><span>Prices valid 30 days · installation by ${DEALER}</span></footer>
        ${st === 'sent' ? '<p class="pp-state">Sent to the customer · waiting for a reply</p>' : ''}
        ${done ? `<p class="pp-state ok"><i aria-hidden="true">✓</i> Accepted by the customer · ${today()}</p>` : ''}
      </article>
      <aside class="pp-priv" aria-label="Dealer pricing, private">
        <p class="wb-k">Dealer pricing</p><p class="pp-lock">Private · not included in the customer proposal</p>
        <dl class="pp-led">
          <div><dt>Landed · ${esc(b.short)}</dt><dd>${money(b.landed)}</dd></div>
          <div><dt>Installation · ${n} openings</dt><dd>${money(install)}</dd></div>
          <div><dt>Markup</dt><dd id="ppMk">${money(markup)}</dd></div>
          <div class="sum"><dt>Customer price</dt><dd id="ppSum">${money(price)}</dd></div>
        </dl>
        <label class="pp-slider"><span>Markup on landed cost <output id="ppPct">${(+S.margin.toFixed(2))}%</output></span>
          <input id="mg" type="range" min="0" max="40" step=".01" value="${S.margin}" ${locked ? 'disabled' : ''}></label>
        ${dis('prop-cost', 'Cost breakdown', '', `<dl class="pp-led sm">
          <div><dt>Product</dt><dd>${money(b.product)}</dd></div><div><dt>Freight</dt><dd>${money(b.freight)}</dd></div>
          <div><dt>Landed cost</dt><dd>${money(b.landed)}</dd></div><div><dt>Installation (${money(Math.round(INSTALL_PER))} × ${n})</dt><dd>${money(install)}</dd></div>
          <div><dt>Markup (${(+S.margin.toFixed(2))}% of landed)</dt><dd>${money(markup)}</dd></div></dl>`)}
      </aside>
    </div>
    ${barHtml('<button class="btn-ghost sm" id="propBack">← Back to bids</button>',
      done ? 'The customer accepted · next, order from the manufacturer' : st === 'sent' ? 'Waiting for the customer' : 'The customer sees one price, not your costs',
      done ? '<button class="btn" id="poBtn">Create purchase order <span class="arr">→</span></button>'
           : `<button class="btn" id="propSend" ${locked ? 'disabled' : ''}>Send proposal <span class="arr">→</span></button>`)}
  </div>`, enter);
  goStage('proposal');
  const mg = $('#mg');
  mg.oninput = () => {
    S.margin = +mg.value; const p = proposalNums();
    $('#ppPrice').textContent = money(p.price); $('#ppSum').textContent = money(p.price); $('#ppMk').textContent = money(p.markup);
    $('#ppPct').textContent = (+S.margin.toFixed(2)) + '%';
  };
  $('#propBack').onclick = () => { goStage('bids'); };
  const send = $('#propSend');
  if (send) send.onclick = async () => {
    S.price = proposalNums().price; S.prop.state = 'sent'; openProposal(); toast(`Proposal v${S.prop.v} sent`);
    await wait(REDUCED ? 0 : 1200);
    if (S.stage !== 'proposal' || S.prop.state !== 'sent') return;
    S.prop.state = 'accepted'; openProposal();
  };
  const po = $('#poBtn'); if (po) po.onclick = () => { S.ms = 0; goStage('order'); renderOrder(true); };
}
const renderProposal = () => openProposal(true);

/* ---------- purchase order: an operational record — status first ---------- */
const ORDER_MS = [
  ['PO created', 'Oct 18', 'Dealer issued the purchase order'],
  ['PO acknowledged', 'Oct 20', 'The manufacturer confirmed lines and quantities'],
  ['Manufacturing', 'Oct 22', 'Production started, completion estimated Nov 17'],
  ['Ready to ship', 'Nov 18', 'Units packed and carrier booked'],
  ['In transit', 'Nov 20', 'Shipment 01 on its way'],
  ['Delivered', 'Nov 24', 'All units received on site, condition confirmed'],
  ['Installed', 'Dec 01', 'Every opening installed, customer signoff'],
];
const ORDER_STAGES = [['Confirmed', [0, 1]], ['Manufacturing', [2, 3]], ['Delivery', [4, 5]], ['Installed', [6]]];
const STATUS_NOW = ['Order placed', 'Order confirmed', 'Manufacturing', 'Ready to ship', 'In transit', 'Delivered', 'Installed'];
function renderOrder(enter) {
  const b = S.pick, gs = groups(), n = S.items.length, ms = S.ms || 0, complete = ms >= ORDER_MS.length - 1;
  const stage = ORDER_STAGES.map(([name, idx]) => {
    const happened = idx.filter(i => i <= ms), allDone = happened.length === idx.length;
    const state = allDone ? 'done' : happened.length ? 'cur' : 'next';
    const note = allDone ? `✓ ${ORDER_MS[idx[idx.length - 1]][1]}` : happened.length ? `Started ${ORDER_MS[happened[0]][1]}`
               : name === 'Delivery' ? `Expected ${ORDER_MS[5][1]}` : `Est. ${ORDER_MS[idx[0]][1]}`;
    return {name, state, note};
  });
  const delivery = ms >= 5 ? `Delivered ${ORDER_MS[5][1]}` : `Expected ${ORDER_MS[5][1]}`;
  const head = complete
    ? `<section class="po-done"><p class="po-ok"><i aria-hidden="true">✓</i> Project complete</p>
        <p class="wb-s">Installed ${ORDER_MS[6][1]} · ${n} of ${n} openings installed · customer signoff completed</p></section>`
    : `<section class="po-now"><p class="wb-k">Current status</p><p class="po-st">${STATUS_NOW[ms]}</p>
        <p class="wb-s">${ORDER_MS[ms][2]} · since ${ORDER_MS[ms][1]}</p>
        <div class="po-exp"><span class="wb-k">Delivery</span><b>${delivery.toUpperCase()}</b></div></section>`;
  mountDoc($('#orderDoc'), `<div class="wb wb-po">${PREVIEW}
    ${headHtml('Purchase order', `PO ${PO_NO}`, S.src.title, `${b.name} · RFQ ${RFQ_NO} · Proposal v${S.prop?.v || 1}`)}
    ${numsHtml([[money(b.landed), 'Order value'], [n, 'Openings'], [gs.length, 'Product lines']])}
    ${head}
    <ol class="po-track" aria-label="Order progress">${stage.map(s => `<li class="${s.state}"><i aria-hidden="true"></i><b>${s.name}</b><span>${s.note}</span></li>`).join('')}</ol>
    <section class="wb-blk">${dis('po-hist', 'View complete order history', ORDER_MS.length, `<ol class="po-hist">${ORDER_MS.map((m, i) => i <= ms
        ? `<li class="ok"><i aria-hidden="true">✓</i><b>${m[0]}</b><span>${m[1]}</span><small>${m[2]}</small></li>`
        : `<li class="est"><i aria-hidden="true">○</i><b>Estimated · ${m[0].toLowerCase()}</b><span>${m[1]}</span></li>`).join('')}</ol>
        <p class="wb-note">✓ = confirmed event · ○ = estimate, not yet happened.</p>`)}</section>
    <section class="wb-blk"><h3 class="wb-k">Ordered products</h3><p class="wb-s">${plural(gs.length, 'line')} · ${plural(n, 'opening')}</p>
      ${dis('po-lines', 'View order details', gs.length, linesHtml(gs))}</section>
    ${barHtml('<button class="btn-ghost sm" id="ordBack">← Back to proposal</button>',
      complete ? '' : '<span class="wb-dim">Demo · move the order to its next milestone</span>',
      complete ? '<button class="btn" id="again">Start new takeoff <span class="arr">→</span></button>'
               : `<button class="btn" id="ordNext">Next milestone <span class="arr">→</span></button>`)}
  </div>`, enter);
  $('#ordBack').onclick = () => { goStage('proposal'); };
  const nx = $('#ordNext'); if (nx) nx.onclick = () => { S.ms = Math.min(ORDER_MS.length - 1, (S.ms || 0) + 1); renderOrder(); };
  const ag = $('#again'); if (ag) ag.onclick = () => { S.complete = false; goStage('upload'); };
}
