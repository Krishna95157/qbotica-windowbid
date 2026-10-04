'use strict';
/* ------------------------------------------------------------------
   APP — state & routing
------------------------------------------------------------------ */
const TYPES = ['Single hung','Double hung','Casement','Awning','Picture','Sliding','Hinged door','Sliding door','French door','Unknown'];
const DOOR_TYPES = new Set(['Hinged door','Sliding door','French door']);
const S = {stage:'upload', src:null, items:[], sel:null, selGroup:null, tab:'openings', takeoffOK:false, run:0, adding:false, rfq:null, bids:null, pick:null, margin:6700 / 30300 * 100, pendingMark:null, ms:0, complete:false, price:0};
let uid = 1;
const STAGES = [['upload','Upload'],['work','Extract'],['review','Review'],['rfq','RFQ'],['bids','Bids'],['proposal','Proposal'],['order','Order']];
const STEP_GROUPS = [['Review',['upload','work','review']],['Procure',['rfq','bids','proposal']],['Fulfill',['order']]];
function groups() {
  const m = new Map();
  for (const it of S.items) {
    const key = `${it.cat}|${it.type}|${it.w ?? '?'}|${it.h ?? '?'}`;
    if (!m.has(key)) m.set(key, {key, cat:it.cat, type:it.type, w:it.w, h:it.h, items:[]});
    m.get(key).items.push(it);
  }
  return [...m.values()].sort((a, b) => (a.cat === b.cat ? b.items.length - a.items.length : a.cat === 'window' ? -1 : 1));
}
function openApp() {
  $('#app').hidden = false; document.body.classList.add('app-open');
  if (location.hash !== '#takeoff') history.pushState(null, '', '#takeoff');
  if (S.stage === 'upload') goStage('upload');
}
function closeApp(fromRouter) {
  S.run++;
  if (S.ctl) S.ctl.abort();
  $('#app').hidden = true; document.body.classList.remove('app-open');
  if (!fromRouter && location.hash === '#takeoff') history.pushState(null, '', PAGE === 'home' ? location.pathname + location.search : '#' + PAGE);
  LAYOUT_DIRTY = true; runScenes();
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (!g) return;
  e.preventDefault();
  $('#navLinks').classList.remove('open');
  if (g.dataset.go === 'app') { if (!S.items.length) S.stage = 'upload'; openApp(); }
  else closeApp();
});
function goStage(st) {
  S.stage = st;
  const map = {upload:'upload', work:'work', review:'work', rfq:'rfq', bids:'bids', proposal:'proposal', order:'order'};
  $$('.stage').forEach(s => s.classList.toggle('on', s.dataset.stage === map[st]));
  $('#appBody').scrollTop = 0;
  renderSteps();
}
function renderSteps() {
  const idx = STAGES.findIndex(s => s[0] === S.stage);
  let i = 0;
  $('#steps').innerHTML = STEP_GROUPS.map(([gname, keys]) => {
    const start = i, end = i + keys.length - 1;
    const gcls = idx > end ? 'done' : idx >= start ? 'on' : '';
    const items = keys.map(k => { const j = i++; const n = STAGES[j][1]; return `<span class="st2 ${j < idx ? 'done' : j === idx ? 'cur' : ''}"><i></i>${n}</span>`; }).join('');
    return `<li class="grp ${gcls}"><span class="gl">${gname}</span>${items}</li>`;
  }).join('');
}

/* proposal + order (platform preview) */
function renderProposal(sent) {
  const b = S.pick, n = S.items.length, gs = groups();
  const install = Math.round(INSTALL_PER * n);
  const margin = Math.round(b.landed * S.margin / 100);
  const price = b.landed + margin + install;
  const mtxt = (+S.margin.toFixed(2)) + '%';
  $('#propDoc').innerHTML = `${preview}
    <h1>Customer proposal</h1><p class="lead">Your cost stays with you. The customer sees one clear price for the finished job.</p>
    <div class="prop-grid">
      <div class="panel">
        <p class="who">Dealer view</p>
        <table class="ledger">
          <tr class="muted"><td>${esc(b.name)} product</td><td>${money(b.product)}</td></tr>
          <tr class="muted"><td>Freight</td><td>${money(b.freight)}</td></tr>
          <tr><td>Landed cost</td><td>${money(b.landed)}</td></tr>
          <tr><td>Installation, ${n} openings</td><td>${money(install)}</td></tr>
          <tr><td>Dealer margin (${mtxt})</td><td>${money(margin)}</td></tr>
          <tr class="sum"><td>Customer total</td><td>${money(price)}</td></tr>
        </table>
        <div class="slider"><label for="mg" style="font-size:.85rem;color:var(--ink-2)">Margin</label><input id="mg" type="range" min="0" max="40" step=".01" value="${S.margin}"><output>${mtxt}</output></div>
        <div class="foot-row" style="margin-top:16px;justify-content:flex-start"><button class="btn-ghost sm" id="propBack">Back to bids</button></div>
      </div>
      <div class="sheet">
        <p class="who">What the customer sees</p>
        <div class="sheet-head"><div><b>${esc(S.src.title)}</b><span>Windows and doors, supplied and installed</span></div><div style="text-align:right"><span>Arizona Window Solutions</span></div></div>
        <table class="ttable"><thead><tr><th>Product</th><th class="num">Size (in)</th><th class="num">Qty</th></tr></thead><tbody>
          ${gs.map(g => `<tr><td>${esc(pname(g))}</td><td class="num m">${g.w ?? '?'} × ${g.h ?? '?'}</td><td class="num m">${g.items.length}</td></tr>`).join('')}
        </tbody></table>
        <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap">
          <div><span class="who" style="margin:0">Installed total</span><div class="price">${money(price)}</div>
          <span style="font-size:.85rem;color:var(--ink-2)">Estimated delivery ${b.lead}–${b.lead + 1} weeks · ${esc(b.warranty)} product warranty</span></div>
          ${sent ? '<span class="approved-line">Customer accepted</span>' : '<button class="btn" id="propSend">Send proposal <span class="arr">→</span></button>'}
        </div>
      </div>
    </div>
    ${sent ? `<div class="foot-row" style="margin-top:28px;justify-content:flex-start"><button class="btn" id="poBtn">Create purchase order <span class="arr">→</span></button><span style="font-size:.85rem;color:var(--ink-2)">Moves this project into Fulfill.</span></div>` : ''}`;
  const mg = $('#mg');
  mg.oninput = () => { S.margin = +mg.value; renderProposal(sent); $('#mg').focus(); };
  $('#propBack').onclick = () => goStage('bids');
  const ps = $('#propSend'); if (ps) ps.onclick = () => { S.price = price; renderProposal(true); toast('Customer accepted the proposal'); };
  const po = $('#poBtn'); if (po) po.onclick = () => { S.price = price; S.ms = 0; S.complete = false; goStage('order'); renderOrder(); };
}
const ORDER_MS = [
  ['PO created', 'Oct 18', 'Dealer issued PO #WB-0048 to the selected manufacturer.'],
  ['PO acknowledged', 'Oct 20', 'The manufacturer acknowledged PO #WB-0048 and confirmed lines and quantities.'],
  ['Manufacturing', 'Oct 22', 'Started Oct 22 · estimated completion Nov 17.'],
  ['Ready to ship', 'Nov 18', 'Units packed and carrier booked.'],
  ['In transit', 'Nov 20', 'Shipment 01 · ETA Nov 24.'],
  ['Delivered', 'Nov 24', 'All units received on site · condition confirmed.'],
  ['Installed', 'Dec 01', 'Every opening installed · customer signoff.'],
];
function renderOrder() {
  const b = S.pick, gs = groups(), n = S.items.length, ms = S.ms || 0, done = ms >= ORDER_MS.length - 1 && S.complete;
  const hPct = ORDER_MS.length > 1 ? Math.min(ms, ORDER_MS.length - 1) / (ORDER_MS.length - 1) : 0;
  $('#orderDoc').innerHTML = `${preview}
    <h1>Purchase order</h1><p class="lead">The customer-approved proposal becomes an order. The same lines carry through production, delivery and installation.</p>
    <div class="or-grid">
      <div class="sheet">
        <div class="sheet-head"><div><b>PO #WB-0048</b><span>${esc(b.name)} · ${esc(S.src.title)}</span></div><div style="text-align:right"><span>Issued Oct 18</span><br><span>Customer total ${money(S.price || 0)}</span></div></div>
        <div class="sheet-meta"><div><span>Openings</span>${n}</div><div><span>Product lines</span>${gs.length}</div><div><span>PO value</span>${money(b.landed)}</div></div>
        <table class="ttable"><thead><tr><th>Line</th><th>Product</th><th class="num">Size (in)</th><th class="num">Qty</th><th>Marks</th></tr></thead><tbody>
          ${gs.map((g, i) => `<tr><td class="m">${pad2(i+1)}</td><td>${esc(pname(g))}</td><td class="num m">${g.w ?? '?'} × ${g.h ?? '?'}</td><td class="num m">${g.items.length}</td><td style="white-space:normal;font-size:.8rem;color:var(--ink-2)">${g.items.map(x => esc(x.mark)).join(', ')}</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div class="panel">
        <h3>Order status</h3>
        <div class="or-tlw"><span class="fill" style="height:calc((100% - 44px) * ${hPct.toFixed(3)})"></span><ol class="or-tl">
          ${ORDER_MS.map((m, i) => `<li class="${i < ms || done ? 'on' : i === ms ? 'cur' : ''}"><span>${m[0]}</span><small>${m[1]}</small></li>`).join('')}
        </ol></div>
        <div class="or-panel"><b>${ORDER_MS[ms][0]}</b>${ORDER_MS[ms][2]}</div>
        <div class="foot-row" style="margin-top:16px">
          <button class="btn-ghost sm" id="ordBack">Back to proposal</button>
          ${done ? '' : `<button class="btn" id="ordNext">${ms < ORDER_MS.length - 1 ? 'Advance status' : 'Mark project complete'} <span class="arr">→</span></button>`}
        </div>
      </div>
    </div>
    ${done ? `<div class="complete"><h2>Project complete.</h2><p class="lead">From reviewed opening to installed product, on one record.</p>
      <div class="foot-row" style="justify-content:flex-start"><button class="btn" id="again">Start a new takeoff</button><button class="btn-ghost sm" data-go="home">Back to the site</button></div></div>` : ''}`;
  $('#ordBack').onclick = () => { goStage('proposal'); renderProposal(true); };
  const nx = $('#ordNext');
  if (nx) nx.onclick = () => { if (S.ms < ORDER_MS.length - 1) S.ms++; else S.complete = true; renderOrder(); };
  const ag = $('#again'); if (ag) ag.onclick = () => { S.complete = false; goStage('upload'); };
}

