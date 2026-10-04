'use strict';
/* review */
const byId = id => S.items.find(i => i.id === id);
function enterReview() {
  S.stage = 'review'; renderSteps();
  $('#proc').hidden = true; $('#rev').hidden = false;
  let first = S.items.find(i => openingStatus(i) !== 'ready' && openingStatus(i) !== 'ok') || S.items[0];
  if (S.pendingMark) { first = S.items.find(i => i.mark === S.pendingMark) || first; S.pendingMark = null; }
  S.sel = null;
  renderReview();
  if (first) setTimeout(() => select(first.id, true), REDUCED ? 0 : 350);
}
function select(id, focus) {
  S.sel = id; S.selGroup = null; S.adding = false; $('#viewer').classList.remove('adding'); $('#vhint').classList.remove('show');
  S.tab = 'openings';
  renderReview();
  const it = byId(id);
  if (focus && it && it.box) focusBox(it.box);
  const row = $(`#list tr[data-id="${id}"]`), L = $('#list');
  if (row && L.scrollHeight > L.clientHeight + 2) {
    const y = row.getBoundingClientRect().top - L.getBoundingClientRect().top + L.scrollTop;
    const top = y - 40, bot = y + row.offsetHeight - L.clientHeight + 8;
    if (L.scrollTop > top) L.scrollTop = top; else if (L.scrollTop < bot) L.scrollTop = bot;
  }
}
function renderReview() {
  renderStats(); drawDets();
  $('#tN').textContent = S.items.length; $('#tG').textContent = groups().length;
  $$('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === S.tab));
  renderDetail(); renderList(); renderFoot();
}
function renderDetail() {
  const d = $('#detail');
  const it = S.sel && byId(S.sel);
  if (!it) { d.innerHTML = `<p class="empty">${S.tab === 'groups' ? 'Select a product to see where each unit is on the plan.' : 'Select an opening on the plan or in the list to check it against the drawing.'}</p>`; return; }
  const st = openingStatus(it), pct = Math.round(it.conf * 100), ok = st === 'ok';
  d.innerHTML = `
    <div class="d-head"><span class="d-mark">${esc(it.mark)}</span><span class="pill st-${st}">${stLabel(it)}</span>
      <span class="d-nav"><button data-act="prev" aria-label="Previous opening">↑</button><button data-act="next" aria-label="Next opening">↓</button></span></div>
    <div class="d-grid">
      <label>Type<select data-f="type" ${ok ? 'disabled' : ''}>${TYPES.map(t => `<option ${t === it.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Room<input data-f="room" value="${esc(it.room)}" ${ok ? 'disabled' : ''}></label>
      <label>Width (in)<input data-f="w" type="number" inputmode="decimal" min="1" max="400" value="${it.w ?? ''}" class="${it.w == null ? 'need' : ''}" ${ok ? 'disabled' : ''}></label>
      <label>Height (in)<input data-f="h" type="number" inputmode="decimal" min="1" max="400" value="${it.h ?? ''}" class="${it.h == null ? 'need' : ''}" ${ok ? 'disabled' : ''}></label>
    </div>
    <div class="d-conf">${it.added ? '<span>Added by you</span>' : `<span>Read confidence</span><div class="bar ${pct >= 85 ? 'ok' : ''}"><i style="width:${pct}%"></i></div><b>${pct}%</b>`}</div>
    ${it.raw || it.temp || it.egress ? `<div class="d-raw"><span>Drawing callout</span><b>${esc(it.raw || '—')}</b>${it.temp ? '<i>Tempered</i>' : ''}${it.egress ? '<i>Egress</i>' : ''}</div>` : ''}
    ${it.note && !ok ? `<p class="d-note">${esc(it.note)}</p>` : ''}
    ${!it.box ? `<p class="d-note">Read from a schedule. No location on this page.</p>` : ''}
    <div class="d-actions">
      ${ok ? `<span class="approved-line">${it.edited || it.added ? 'Edited · verified' : 'Verified'}</span><button class="btn-text" data-act="unapprove">Undo verification</button>`
           : `<button class="btn sm" data-act="approve" ${st === 'missing' ? 'disabled title="Enter width and height first"' : ''}>✓ Verify</button><button class="btn-ghost sm" data-act="remove">Not an opening</button>`}
      <span class="kbd"><kbd>↑</kbd><kbd>↓</kbd> move${ok ? '' : ' · <kbd>V</kbd> verify'}</span>
    </div>`;
}
function renderList() {
  const L = $('#list');
  if (S.tab === 'groups') {
    L.innerHTML = `<div class="groups">${groups().map(g => {
      const allOk = g.items.every(i => i.approved);
      return `<button class="grp ${S.selGroup === g.key ? 'sel' : ''}" data-group="${esc(g.key)}" data-cursor="Locate">
        <b>${esc(pname(g))}</b><span class="q">${g.items.length}<small>${allOk ? 'verified' : 'qty'}</small></span>
        <span class="sz">${g.w ?? '?'} × ${g.h ?? '?'} in</span>
        <span class="mk">${g.items.map(i => esc(i.mark)).join(' · ')}</span></button>`;
    }).join('')}</div>`;
    return;
  }
  L.innerHTML = `<table class="ttable"><thead><tr><th>Mark</th><th>Room</th><th>Type</th><th class="num">Size</th><th>Status</th></tr></thead><tbody>${
    S.items.map(it => { const st = openingStatus(it); return `<tr data-id="${it.id}" data-cursor="Locate" class="${it.id === S.sel ? 'sel' : ''} ${st === 'ok' ? 'okr' : ''}">
      <td class="m">${esc(it.mark)}</td><td>${esc(it.room || '—')}</td><td>${esc(it.type)}</td>
      <td class="num m">${it.w ?? '?'} × ${it.h ?? '?'}</td><td><span class="pill st-${st}">${stLabel(it)}</span></td></tr>`; }).join('')
  }</tbody></table>
  <div style="padding:12px 0 16px"><button class="btn-text" data-act="add">+ Add a missed opening</button></div>`;
}
function renderFoot() {
  const F = $('#revFoot');
  const n = S.items.length, a = S.items.filter(i => i.approved).length;
  const ready = S.items.filter(i => openingStatus(i) === 'ready').length;
  if (S.takeoffOK) {
    F.innerHTML = `<div class="approved-line">Ready for RFQ · ${n} openings, ${groups().length} products</div>
      <div class="foot-row"><button class="btn-ghost sm" data-act="csv" id="csvBtn">Export CSV</button><button class="btn-text" data-act="reopen">Reopen review</button><button class="btn" data-act="rfq">Send to manufacturers <span class="arr">→</span></button></div>`;
    if (!dlFn) $('#csvBtn').hidden = true;
    return;
  }
  F.innerHTML = `<div class="prog"><div class="bar"><i style="width:${n ? a/n*100 : 0}%"></i></div><span>${a} of ${n} verified</span></div>
    <div class="foot-row"><button class="btn-ghost sm" data-act="approveReady" ${ready ? '' : 'disabled'}>Verify high-confidence (${ready})</button>
    <button class="btn" data-act="approveTakeoff" ${n && a === n ? '' : 'disabled'}>Mark Ready for RFQ <span class="arr">→</span></button></div>
    <p class="rfq-help">${n && a === n ? 'All reviewed window and door data will be prepared for manufacturer quoting.' : `${n - a} opening${n - a === 1 ? '' : 's'} still to verify before quoting.`}</p>`;
}
function nextUnapproved(fromId) {
  const i = S.items.findIndex(x => x.id === fromId);
  for (let k = 1; k <= S.items.length; k++) { const it = S.items[(i + k) % S.items.length]; if (!it.approved) return it; }
  return null;
}
function moveSel(d) {
  if (!S.items.length) return;
  let i = S.items.findIndex(x => x.id === S.sel);
  i = i < 0 ? 0 : (i + d + S.items.length) % S.items.length;
  select(S.items[i].id, true);
}
function nextMark(prefix) {
  let n = 1; const used = new Set(S.items.map(i => i.mark));
  while (used.has(prefix + pad2(n))) n++;
  return prefix + pad2(n);
}
function addAt(cx, cy) {
  const p = svgPointFromClient(cx, cy);
  const d = Math.max(V.W, V.H) * .025;
  const it = {id:uid++, mark:nextMark('W'), cat:'window', type:'Unknown', w:null, h:null, room:'', conf:1, added:true, note:'', box:[p.x - d, p.y - d/2, 2*d, d]};
  S.items.push(it); S.takeoffOK = false;
  S.adding = false; $('#viewer').classList.remove('adding'); $('#vhint').classList.remove('show');
  select(it.id, false);
  toast(`${it.mark} added. Set its type and size.`);
}
function initReview() {
  $('#rev').addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]');
    if (tab) { S.tab = tab.dataset.tab; if (S.tab === 'groups') { S.sel = null; fitView(); } else S.selGroup = null; renderReview(); return; }
    const row = e.target.closest('tr[data-id]');
    if (row) { select(+row.dataset.id, true); return; }
    const grp = e.target.closest('[data-group]');
    if (grp) { S.selGroup = S.selGroup === grp.dataset.group ? null : grp.dataset.group; S.sel = null; fitView(); renderReview(); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const it = S.sel && byId(S.sel);
    switch (b.dataset.act) {
      case 'prev': moveSel(-1); break;
      case 'next': moveSel(1); break;
      case 'approve': if (it && openingStatus(it) !== 'missing') { it.approved = true; const nx = nextUnapproved(it.id); nx ? select(nx.id, true) : (S.sel = it.id, renderReview()); } break;
      case 'unapprove': if (it) { it.approved = false; S.takeoffOK = false; renderReview(); } break;
      case 'remove': if (it) { const nx = nextUnapproved(it.id); S.items = S.items.filter(x => x.id !== it.id); S.takeoffOK = false; toast(`${it.mark} removed`); nx && nx.id !== it.id ? select(nx.id, true) : (S.sel = null, renderReview()); } break;
      case 'approveReady': { const c = S.items.filter(i => openingStatus(i) === 'ready'); c.forEach(i => i.approved = true); toast(`${c.length} openings verified`); const nx = S.items.find(i => !i.approved); nx ? select(nx.id, true) : renderReview(); break; }
      case 'approveTakeoff': S.takeoffOK = true; S.sel = null; S.selGroup = null; fitView(); renderReview(); toast('Takeoff marked ready for RFQ'); break;
      case 'reopen': S.takeoffOK = false; renderReview(); break;
      case 'add': S.adding = true; $('#viewer').classList.add('adding'); $('#vhint').classList.add('show'); fitView(); break;
      case 'rfq': openRFQ(); break;
      case 'csv': exportCSV(); break;
    }
  });
  const upd = e => {
    const f = e.target.dataset.f; if (!f) return;
    const it = byId(S.sel); if (!it) return;
    if (f === 'w' || f === 'h') { const v = parseFloat(e.target.value); it[f] = Number.isFinite(v) && v > 0 ? v : null; e.target.classList.toggle('need', it[f] == null); }
    else if (f === 'type') { it.type = e.target.value; it.cat = DOOR_TYPES.has(it.type) ? 'door' : 'window'; }
    else it.room = e.target.value;
    it.edited = true;
    S.takeoffOK = false;
    renderStats(); drawDets(); renderList(); renderFoot();
    $('#tG').textContent = groups().length;
    const st = openingStatus(it), pill = $('#detail .pill'); if (pill) { pill.className = `pill st-${st}`; pill.textContent = stLabel(it); }
    const ap = $('#detail [data-act="approve"]'); if (ap) ap.disabled = st === 'missing';
  };
  $('#detail').addEventListener('input', upd);
  $('#detail').addEventListener('change', upd);
  document.addEventListener('keydown', e => {
    if ($('#app').hidden || S.stage !== 'review') return;
    if (e.target.matches('input,select,textarea')) { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); moveSel(1); }
    else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); moveSel(-1); }
    else if ((e.key === 'v' || e.key === 'V') && S.sel) { const b = $('#detail [data-act="approve"]'); if (b && !b.disabled) b.click(); }
    else if (e.key === 'Escape') { S.adding = false; $('#viewer').classList.remove('adding'); $('#vhint').classList.remove('show'); }
  });
}
let dlFn = null;
function initDownloads() {
  if (window.claude && typeof window.claude.use === 'function') window.claude.use('downloads').then(d => { dlFn = d; if (S.takeoffOK) renderFoot(); }).catch(() => {});
  else dlFn = {   // outside claude.ai (local server, ordinary hosting): a plain browser download
    save: async ({filename, data}) => {
      const url = URL.createObjectURL(new Blob([data], {type:'text/csv;charset=utf-8'}));
      const a = Object.assign(document.createElement('a'), {href:url, download:filename});
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };
}
async function exportCSV() {
  if (!dlFn) return;
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Mark','Category','Type','Width (in)','Height (in)','Room','Drawing callout','Tempered','Egress','Confidence','Status'].join(',')]
    .concat(S.items.map(i => [i.mark, i.cat, i.type, i.w ?? '', i.h ?? '', i.room, i.raw || '', i.temp ? 'yes' : '', i.egress ? 'yes' : '', i.added ? 'added' : Math.round(i.conf*100) + '%', stLabel(i)].map(q).join(',')));
  rows.push('', ['Product','Width (in)','Height (in)','Qty','Marks'].join(','));
  groups().forEach(g => rows.push([pname(g), g.w ?? '', g.h ?? '', g.items.length, g.items.map(i => i.mark).join(' ')].map(q).join(',')));
  try { await dlFn.save({filename:`${(S.src?.title || 'takeoff').replace(/[^\w ]+/g, '').trim() || 'takeoff'} takeoff.csv`, data:rows.join('\n')}); toast('Takeoff exported'); }
  catch (e) { if (e && e.code !== 'declined') toast('Export isn\u2019t available here.'); }
}

const preview = `<div class="preview-note"><b>Platform preview.</b> The takeoff is yours; manufacturers, prices and lead times are sample data.</div>`;
function openRFQ() {
  const gs = groups();
  const due = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  S.rfq = S.rfq || {mfr:MFRS.map(() => true), due, notes:'Match marks to the attached plan. Quote Low-E insulated glass, white exterior.'};
  $('#rfqDoc').innerHTML = `${preview}
    <h1>Request for quote</h1><p class="lead">Your verified takeoff, packaged so every manufacturer prices the same list.</p>
    <div class="two">
      <div class="sheet">
        <div class="sheet-head"><div><b>RFQ #WB-1042</b><span>${esc(S.src.title)}</span></div><div style="text-align:right"><span>Issued ${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span><br><span>Dealer: Arizona Window Solutions</span></div></div>
        <div class="sheet-meta"><div><span>Openings</span>${S.items.length}</div><div><span>Product lines</span>${gs.length}</div><div><span>Source</span>${esc(S.src.file)}</div></div>
        <table class="ttable"><thead><tr><th>Line</th><th>Product</th><th class="num">Size (in)</th><th class="num">Qty</th><th>Marks</th></tr></thead><tbody>
          ${gs.map((g, i) => `<tr><td class="m">${pad2(i+1)}</td><td>${esc(pname(g))}</td><td class="num m">${g.w ?? '?'} × ${g.h ?? '?'}</td><td class="num m">${g.items.length}</td><td style="white-space:normal;font-size:.8rem;color:var(--ink-2)">${g.items.map(x => esc(x.mark)).join(', ')}</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div class="panel">
        <h3>Send to</h3>
        ${MFRS.map((m, i) => `<label class="chk"><input type="checkbox" data-m="${i}" ${S.rfq.mfr[i] ? 'checked' : ''}><span>${m.name}<small>${m.note}</small></span></label>`).join('')}
        <label class="field">Bids due<input type="date" id="rfqDue" value="${S.rfq.due}"></label>
        <label class="field">Notes to manufacturers<textarea id="rfqNotes">${esc(S.rfq.notes)}</textarea></label>
        <div class="foot-row" style="margin-top:18px"><button class="btn-ghost sm" id="rfqBack">Back to takeoff</button><button class="btn" id="rfqSend">Send RFQ <span class="arr">→</span></button></div>
      </div>
    </div>`;
  goStage('rfq');
  $$('#rfqDoc [data-m]').forEach(c => c.onchange = () => { S.rfq.mfr[+c.dataset.m] = c.checked; $('#rfqSend').disabled = !S.rfq.mfr.some(Boolean); });
  $('#rfqDue').onchange = e => S.rfq.due = e.target.value;
  $('#rfqNotes').oninput = e => S.rfq.notes = e.target.value;
  $('#rfqBack').onclick = () => { goStage('work'); S.stage = 'review'; renderSteps(); requestAnimationFrame(() => { fitView(); renderReview(); }); };
  $('#rfqSend').onclick = sendRFQ;
}
function computeBids() {
  const gs = groups(), hasAwning = gs.some(g => g.type === 'Awning');
  return MFRS.map((m, i) => {
    if (!S.rfq.mfr[i]) return null;
    const product = Math.round(gs.reduce((s, g) => s + unitPrice(g) * g.items.length, 0) * m.mult / 10) * 10;
    return {...m, i, product, landed:product + m.freight, dev: m.dev ? (hasAwning ? 'Awning not offered, casement substituted' : 'Grid pattern not offered') : null};
  }).filter(Boolean);
}
async function sendRFQ() {
  S.bids = computeBids();
  const run = ++S.run;
  $('#bidsDoc').innerHTML = `${preview}<h1>Bids</h1><p class="lead">RFQ #WB-1042 sent to ${S.bids.length} manufacturer${S.bids.length > 1 ? 's' : ''}.</p>
    <ul class="arrivals">${S.bids.map(b => `<li data-b="${b.i}"><b>${b.name}</b><span>Waiting for bid</span></li>`).join('')}</ul><div id="cmp"></div>`;
  goStage('bids');
  for (const b of S.bids) {
    await wait(REDUCED ? 0 : 700); if (run !== S.run) return;
    const li = $(`#bidsDoc [data-b="${b.i}"]`); li.classList.add('got'); li.querySelector('span').textContent = 'Bid received';
  }
  await wait(REDUCED ? 0 : 300); if (run !== S.run) return;
  renderBids();
}
function renderBids() {
  const B = S.bids;
  const minL = Math.min(...B.map(b => b.landed)), minLead = Math.min(...B.map(b => b.lead));
  const cell = (html, cls = 'm') => `<td class="${cls}">${html}</td>`;
  $('#cmp').innerHTML = `<div class="cmp-wrap"><table class="cmp">
    <thead><tr><th>Normalized to your takeoff</th>${B.map(b => `<th>${b.name}<br>${b.landed === minL ? '<span class="badge">Lowest landed cost</span>' : ''}${b.lead === minLead ? ' <span class="badge">Fastest delivery</span>' : ''}${b.dev ? ' <span class="badge o">1 deviation</span>' : ''}</th>`).join('')}</tr></thead>
    <tbody>
      <tr><td>Product</td>${B.map(b => cell(money(b.product))).join('')}</tr>
      <tr><td>Freight</td>${B.map(b => cell(money(b.freight))).join('')}</tr>
      <tr class="total"><td>Landed cost</td>${B.map(b => cell(money(b.landed), 'm' + (b.landed === minL ? ' best' : ''))).join('')}</tr>
      <tr><td>Lead time</td>${B.map(b => cell(`${b.lead} weeks`, 'm' + (b.lead === minLead ? ' best' : ''))).join('')}</tr>
      <tr><td>Warranty</td>${B.map(b => cell(b.warranty, '')).join('')}</tr>
      <tr><td>Specification match</td>${B.map(b => cell(b.dev ? esc(b.dev) : `All ${S.items.length} openings`, b.dev ? 'warn' : '')).join('')}</tr>
    </tbody>
    <tfoot><tr><td></td>${B.map(b => `<td><button class="btn sm" data-pick="${b.i}">Use this bid</button></td>`).join('')}</tr></tfoot>
  </table></div>
  <div class="foot-row" style="margin-top:18px;justify-content:flex-start"><button class="btn-ghost sm" id="bidsBack">Back to RFQ</button></div>`;
  $$('#cmp [data-pick]').forEach(b => b.onclick = () => { S.pick = S.bids.find(x => x.i === +b.dataset.pick); goStage('proposal'); renderProposal(); });
  $('#bidsBack').onclick = openRFQ;
}

