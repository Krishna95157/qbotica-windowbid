'use strict';
/* review */
const byId = id => S.items.find(i => i.id === id);
function enterReview() {
  S.stage = 'review'; renderSteps();
  $('#proc').hidden = true; $('#rev').hidden = false;
  S.leftOut = S.items.filter(i => !inPreprocessed(i)); S.items = S.items.filter(inPreprocessed);
  const first = S.pendingMark && S.items.find(i => i.mark === S.pendingMark); S.pendingMark = null;
  S.sel = null; S.selGroup = null; S.open = null; S.tab = 'groups';
  renderReview();
  if (first) setTimeout(() => select(first.id, true), REDUCED ? 0 : 350);
}
const groupOf = it => groups().find(g => g.items.includes(it));
// Double-click on a product: open it to list its windows, and frame them on the plan (on the sheet
// that holds most of them).
// The sheet to show a product on: where most of its units are, preferring a floor plan they were located on
// over the schedule row they were read from.
function groupSheet(g) {
  const boxed = (g ? g.items : []).filter(i => i.box), onPlan = boxed.filter(i => i.located);
  const use = onPlan.length ? onPlan : boxed;
  if (!use.length) return null;
  const by = new Map(); use.forEach(i => by.set(i.sheet, (by.get(i.sheet) || 0) + 1));
  return [...by].sort((a, b) => b[1] - a[1])[0][0];
}
function openGroup(key) {
  S.open = S.open === key ? null : key; S.selGroup = key; S.sel = null; S.preview = false;
  const g = groups().find(x => x.key === key);
  const page = groupSheet(g);
  const placed = (g ? g.items : []).filter(i => i.box && (!page || i.sheet === page));
  if (S.open && placed.length) {
    if (page && page !== S.sheet) showSheet(page);
    renderReview();
    focusArea(placed.map(i => i.box));
  } else { renderReview(); fitView(); }
}
function select(id, focus) {
  S.sel = id; S.selGroup = null; S.adding = false; S.preview = false; $('#viewer').classList.remove('adding'); $('#vhint').classList.remove('show');
  const it = byId(id);
  if (S.tab === 'groups' && it) S.open = groupOf(it)?.key || null;
  if (it && it.sheet && it.box && it.sheet !== S.sheet) showSheet(it.sheet);
  renderReview();
  if (focus && it && it.box) focusBox(it.box);
  const row = $(`#list tr[data-id="${id}"]`), L = $('#list');
  if (row && L.scrollHeight > L.clientHeight + 2) {
    const y = row.getBoundingClientRect().top - L.getBoundingClientRect().top + L.scrollTop;
    const top = y - 40, bot = y + row.offsetHeight - L.clientHeight + 8;
    if (L.scrollTop > top) L.scrollTop = top; else if (L.scrollTop < bot) L.scrollTop = bot;
  }
}
// One header: the view on show (grouped products to start), and a click flips to the other one.
function renderTab() {
  const g = S.tab === 'groups';
  $('#tabFlip').innerHTML = `${g ? 'Grouped products' : 'Openings'} <span>${g ? groups().length : S.items.length}</span><i class="flip" aria-hidden="true">⇄</i>`;
  $('#tabFlip').title = g ? 'Show every opening' : 'Show the grouped products';
}
function renderReview() {
  renderStats(); drawDets(); renderSheetTabs();
  renderTab();
  renderDetail(); renderList(); renderFoot();
}
// A few plain sentences about the selected opening — what it is, where it is, how many like it —
// built from what was read (no extra AI call), so anyone can follow the takeoff.
const PLAIN_TYPE = {
  'Single hung': ['A single-hung window', 'the bottom half slides up'],
  'Double hung': ['A double-hung window', 'both halves slide up and down'],
  'Casement': ['A casement window', 'it swings outward on side hinges, like a door'],
  'Awning': ['An awning window', 'it is hinged at the top and opens outward'],
  'Picture': ['A fixed (picture) window', 'it doesn’t open'],
  'Sliding': ['A sliding window', 'one panel slides sideways'],
  'Hinged door': ['A hinged (swing) door', ''],
  'Sliding door': ['A sliding glass door', ''],
  'French door': ['A pair of French doors', ''],
};
const ftIn = n => { const f = Math.floor(n / 12), i = Math.round(n - f * 12); return f ? `${f} ft${i ? ` ${i} in` : ''}` : `${i} in`; };
function plainSummary(it) {
  const s = [];
  const [what, how] = PLAIN_TYPE[it.type] || [it.cat === 'door' ? 'A door' : 'A window', ''];
  s.push(`<b>${what}${how ? ` — ${how}` : ''}.</b>` + (it.type === 'Unknown' ? ' Its type isn’t identified yet.' : ''));
  s.push(it.w && it.h ? `About ${ftIn(it.w)} wide and ${ftIn(it.h)} tall (${it.w} × ${it.h} in).`
       : it.w ? `About ${ftIn(it.w)} wide (${it.w} in); its height isn’t known yet.`
       : it.h ? `About ${ftIn(it.h)} tall (${it.h} in); its width isn’t known yet.`
       : 'Its size isn’t known yet — it isn’t written next to it on the drawing.');
  // where: the room, the sheet, and the part of the drawing it sits in
  const sheet = (S.src?.sheets || []).find(x => x.page === it.sheet);
  const W = sheet ? sheet.W : V.W, H = sheet ? sheet.H : V.H;
  let part = '';
  if (it.box) {
    const cx = (it.box[0] + it.box[2] / 2) / W, cy = (it.box[1] + it.box[3] / 2) / H;
    const v = cy < 1 / 3 ? 'upper' : cy > 2 / 3 ? 'lower' : '', h = cx < 1 / 3 ? 'left' : cx > 2 / 3 ? 'right' : '';
    part = v || h ? `the ${[v, h].filter(Boolean).join('-')} part of the drawing` : 'the middle of the drawing';
  }
  const sname = sheet ? sheet.name || sheet.label : '';
  const on = !sheet ? (S.src?.kind === 'sample' ? 'on the floor plan' : '')
    : /^(page|p\.)\s*\d/i.test(sname) ? `on page ${sheet.page} of the drawing` : `on the floor-plan sheet ${esc(sname)}`;
  const name = it.room && it.room === it.room.toUpperCase()            // "GREAT ROOM" → "Great Room"
    ? it.room.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()) : it.room;
  const room = !name ? 'in a room that isn’t labelled next to it'
    : /\d\s*$/.test(name) ? `in <b>${esc(name)}</b>` : `in the <b>${esc(name)}</b>`;   // "in Bedroom 2", "in the Kitchen"
  if (it.fromSched && !it.located) s.push(`It’s listed in the window schedule on ${esc(it.schedName || 'the schedule sheet')} as mark <b>${esc(it.tag)}</b>` +
      (it.schedQty > 1 ? `, which counts ${it.schedQty} of these` : '') + '. The floor plans weren’t read because the schedule already gives every window’s size and count, so its room isn’t known.');
  else s.push(it.box ? `It’s ${room}, ${[on, part && `in ${part}`].filter(Boolean).join(', ')}.`
                : `It’s ${room}. It isn’t pinned to a spot on the plan — it comes from the schedule.`);
  // how it is marked, and how many like it
  const like = groups().find(g => g.items.includes(it));
  const sched = (it.srcs || []).find(x => /^Schedule on|^Type legend on/.test(x));
  if (it.fromSched && !it.located) { /* said above */ }
  else if (it.tag) {
    const same = S.items.filter(x => x.tag === it.tag && x.cat === it.cat).length;
    s.push(`On the plan it carries tag <b>${esc(it.tag)}</b>` + (sched ? `; ${esc(sched.replace(/^Schedule on/, 'the schedule on sheet').replace(/^Type legend on/, 'the type legend on sheet'))} explains what that tag means` : '') +
           (same > 1 ? `. There are ${same} openings with this tag.` : '.'));
  } else if ('tag' in it && !it.added && it.box) {
    s.push(whyCounted(it));
  } else if (it.raw) {
    s.push(`The drawing writes it as “${esc(it.raw)}”.`);
  }
  if (like && like.items.length > 1) s.push(`The house has ${like.items.length} ${it.cat === 'door' ? 'doors' : 'windows'} of this type and size.`);
  if (it.temp) s.push('It needs tempered (safety) glass.');
  if (it.egress) s.push('It’s an egress window — large enough to climb out of in an emergency.');
  const st = openingStatus(it);
  s.push(st === 'ok' ? 'It’s verified.' : st === 'ready' ? 'Read by AI — compare it with the drawing; Verify all (below) confirms every window at once.'
                     : 'Needs a look before quoting' + (it.note ? `: ${esc(it.note)}` : '.'));
  return `<div class="d-sum"><span>In plain words</span><p>${s.join(' ')}</p></div>`;
}
// An opening with no window number on the plan: say so, and what the count rests on, so it is never
// taken as certain. (Readings that know the plan's tags set it.tag; '' means "no tag here".)
const SIZE_NOTE = /\b\d{4,6}\b/;      // a size code such as 5050 or 120100
// Worth a flag on its preview card: no number and no size note to go by (or a high window shown only dashed).
const noNumberFlag = it => 'tag' in it && !it.tag && it.box && !it.added &&
  (!SIZE_NOTE.test(it.raw || '') || /CLERESTORY|\bCLR\b|HIGH\s+(WINDOW|WDW)|TRANSOM/i.test(it.raw || ''));
function whyCounted(it) {
  const raw = (it.raw || '').toUpperCase();
  let why = '<b>There’s no window number on the plan here.</b> ';
  if (/CLERESTORY|\bCLR\b|HIGH\s+(WINDOW|WDW)/.test(raw))
    why += `It’s counted because the note “${esc(it.raw)}” points to this spot. A clerestory is set high in the wall, above ` +
           'the height a floor plan is drawn at, so the plan shows it only as a dashed line in the wall, not as a window symbol.';
  else if (/TRANSOM|\bTR\b/.test(raw))
    why += `It’s counted because the note “${esc(it.raw)}” points here: a transom sits above a door or another window, so the plan may not draw it.`;
  else if (SIZE_NOTE.test(raw))
    why = `This plan names its windows by size notes rather than numbers: it’s counted because the note “${esc(it.raw)}” sits next to this spot — check that the note belongs to this opening and not a neighbouring one.`;
  else if (it.raw)
    why += `It’s counted because the note “${esc(it.raw)}” is written next to this spot — check that the note really belongs to this opening.`;
  else
    why += 'There’s no note here either. It’s counted only because the drawing shows a window-like symbol in the wall, so it may not be a window at all.';
  if (/shared|grouping|several|count against|one note/i.test(it.note || ''))
    why += ' One note covers several windows here: each arrow from the note to the wall is one window, so count the arrows.';
  return why;
}
// "All windows": every opening as a small preview of its spot on the plan, to look through them and
// jump to any one. Each sheet image is placed once (pv-defs) and reused by every preview.
function previewThumb(it) {
  if (!it.box) return '<span class="pv-none">From the schedule \u2014 no spot on the plan</span>';
  const sh = (S.src?.sheets || []).find(x => x.page === it.sheet);
  const W = sh ? sh.W : V.W, H = sh ? sh.H : V.H, [x, y, w, h] = it.box;
  const vh = Math.min(H, Math.max(h * 5, w * 3.75, Math.max(W, H) * 0.06)), vw = Math.min(W, vh * 4 / 3);
  const vx = clamp(x + w / 2 - vw / 2, 0, Math.max(0, W - vw)), vy = clamp(y + h / 2 - vh / 2, 0, Math.max(0, H - vh));
  return `<svg viewBox="${vx} ${vy} ${vw} ${vh}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">` +
    `<use href="${sh ? `#pv-sheet-${sh.page}` : '#vcontent'}"/><rect class="pv-hl" x="${x}" y="${y}" width="${w}" height="${h}"/></svg>`;
}
function renderPreview() {
  const sheets = S.src?.sheets || [];
  const pages = [...new Set(visibleItems().filter(i => i.box && i.sheet).map(i => i.sheet))];
  const defs = pages.map(n => sheets.find(x => x.page === n)).filter(Boolean)
    .map(sh => `<image id="pv-sheet-${sh.page}" href="${esc(sh.href)}" width="${sh.W}" height="${sh.H}"/>`).join('');
  const noun = S.items.some(i => i.cat === 'door') ? 'openings' : 'windows';
  const cards = visibleItems().map(it => {
    const st = openingStatus(it), untagged = noNumberFlag(it);
    return `<button class="pv-card ${it.id === S.sel ? 'sel' : ''}" data-pick="${it.id}" title="Open ${esc(it.mark)}">
      <span class="pv-img">${previewThumb(it)}</span>
      <span class="pv-meta"><b>${esc(it.mark)}</b><span class="pill st-${st}">${stLabel(it)}</span></span>
      <span class="pv-line">${esc(it.type)} \u00b7 ${it.w ?? '?'} \u00d7 ${it.h ?? '?'} in</span>
      <span class="pv-line">${esc(it.room || '\u2014')}${untagged ? ' \u00b7 <i>no number on plan</i>' : ''}</span></button>`;
  }).join('');
  return `<div class="pv-head"><b>All ${visibleItems().length} ${noun}</b><span>Click one to see its details</span>
      <button class="btn-ghost sm" data-act="closePreview">${S.sel ? 'Back to ' + esc(byId(S.sel)?.mark || 'details') : 'Close'}</button></div>
    <svg class="pv-defs" aria-hidden="true"><defs>${defs}</defs></svg>
    <div class="pv-grid">${cards}</div>`;
}
function renderDetail() {
  const d = $('#detail');
  if (S.preview) { d.innerHTML = renderPreview(); return; }
  const it = S.sel && byId(S.sel);
  if (!it) { d.innerHTML = `<p class="empty">${S.tab === 'groups' ? 'Select a product to see where each unit is on the plan. Double-click it to open its windows.' : 'Select an opening on the plan or in the list to check it against the drawing.'}${S.items.length ? ' <button class="btn-text" data-act="preview">Preview all</button>' : ''}</p>`; return; }
  const st = openingStatus(it), pct = Math.round(it.conf * 100), ok = st === 'ok';
  d.innerHTML = `
    <div class="d-head"><span class="d-mark">${esc(it.mark)}</span><span class="pill st-${st}">${stLabel(it)}</span>
      <span class="d-nav">${S.tab === 'groups' ? '<button class="d-all" data-act="backGroups" title="Back to the grouped products">← Products</button>' : ''}<button class="d-all" data-act="preview" title="See every opening with a preview of its spot on the plan">All ${visibleItems().length}</button><button data-act="prev" aria-label="Previous opening">↑</button><button data-act="next" aria-label="Next opening">↓</button></span></div>
    ${plainSummary(it)}
    <div class="d-grid">
      <label>Type<select data-f="type" ${ok ? 'disabled' : ''}>${TYPES.map(t => `<option ${t === it.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Room<input data-f="room" value="${esc(it.room)}" ${ok ? 'disabled' : ''}></label>
      <label>Width (in)<input data-f="w" type="number" inputmode="decimal" min="1" max="400" value="${it.w ?? ''}" class="${it.w == null ? 'need' : ''}" ${ok ? 'disabled' : ''}></label>
      <label>Height (in)<input data-f="h" type="number" inputmode="decimal" min="1" max="400" value="${it.h ?? ''}" class="${it.h == null ? 'need' : ''}" ${ok ? 'disabled' : ''}></label>
    </div>
    <div class="d-conf">${it.added ? '<span>Added by you</span>' : `<span>Read confidence</span><div class="bar ${pct >= 85 ? 'ok' : ''}"><i style="width:${pct}%"></i></div><b>${pct}%</b>`}</div>
    ${it.raw || it.temp || it.egress ? `<div class="d-raw"><span>Drawing callout</span><b>${esc(it.raw || '—')}</b>${it.temp ? '<i>Tempered</i>' : ''}${it.egress ? '<i>Egress</i>' : ''}</div>` : ''}
    ${it.srcs && it.srcs.length ? `<div class="d-src"><span>Found in</span><ul>${it.srcs.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
    ${it.note && !ok ? `<p class="d-note">${esc(it.note)}</p>` : ''}
    ${!it.box ? `<p class="d-note">${it.srcs ? 'Not located on a floor plan.' : 'Read from a schedule. No location on this page.'}</p>` : ''}
    <div class="d-actions">
      ${ok ? `<span class="approved-line">${it.edited || it.added ? 'Edited · verified' : 'Verified'}</span><button class="btn-text" data-act="unapprove">Undo verification</button>`
           : `<button class="btn-ghost sm" data-act="remove">Not an opening</button>`}
      <span class="kbd"><kbd>↑</kbd><kbd>↓</kbd> move</span>
    </div>`;
}
// The floor plans being mapped behind the review (17-app-document.js, runBackground).
const bgNoteHtml = () => !S.bg ? '' : `<p class="bg-note ${S.bg.state}" id="bgNote">${S.bg.state === 'running' ? '<i class="spin" aria-hidden="true"></i>' : ''}<span>${S.bg.text}</span></p>`;
function renderBgNote() {
  const n = $('#bgNote');
  if (n) n.outerHTML = bgNoteHtml(); else if (S.stage === 'review') renderList();
  $('#list .groups')?.classList.toggle('mapping', S.bg?.state === 'running');
}
// where each product sits once the plans are mapped: "On plan A-2.1 · 15 of 15"
function groupLoc(g) {
  if (!S.bg || S.bg.state !== 'done') return '';
  const on = g.items.filter(i => i.located), n = g.items.length;
  if (!on.length) return '<span class="loc none">Not found on the plan · shown at its schedule row</span>';
  const labels = [...new Set(on.map(i => (S.src?.sheets || []).find(s => s.page === i.sheet)?.label).filter(Boolean))].join(', ');
  return `<span class="loc">On plan ${esc(labels)} · ${on.length} of ${n}${on.length < n ? `, ${n - on.length} at the schedule row` : ''}</span>`;
}
// with nothing selected while the plans are being read, the viewer goes back to the page being scanned
function idleSheet() {
  if (S.bg?.state === 'running' && S.bgPage && !S.sel && !S.selGroup && !S.open && S.sheet !== S.bgPage) { showSheet(S.bgPage); fitView(); }
}
function renderList() {
  const List = $('#list');
  const row = it => { const st = openingStatus(it); return `<tr data-id="${it.id}" data-cursor="Locate" class="${it.id === S.sel ? 'sel' : ''} ${st === 'ok' ? 'okr' : ''}">
      <td class="m">${esc(it.mark)}</td><td>${esc(it.room || '—')}</td><td>${esc(it.type)}</td>
      <td class="num m">${it.w ?? '?'} × ${it.h ?? '?'}</td><td><span class="pill st-${st}">${stLabel(it)}</span></td></tr>`; };
  const bg = bgNoteHtml();
  const head = '<thead><tr><th>Mark</th><th>Room</th><th>Type</th><th class="num">Size</th><th>Status</th></tr></thead>';
  if (S.tab === 'groups') {
    List.innerHTML = `${bg}<div class="groups ${S.bg?.state === 'running' ? 'mapping' : ''}">${groups().map((g, gi) => {
      const allOk = g.items.every(i => i.approved), open = S.open === g.key;
      return `<div class="gwrap ${open ? 'open' : ''}"><button class="grp ${S.selGroup === g.key || open ? 'sel' : ''}" data-group="${esc(g.key)}" data-cursor="Locate" aria-expanded="${open}" title="Click to see them on the plan · double-click to open" style="--gi:${gi % 6}">
        <b>${esc(pname(g))}</b><span class="q">${g.items.length}<small>${allOk ? 'verified' : 'qty'}</small></span>
        <span class="sz">${g.w ?? '?'} × ${g.h ?? '?'} in</span>
        <span class="mk">${g.items.map(i => esc(i.mark)).join(' · ')}</span>${groupLoc(g)}</button>
        ${open ? `<div class="gsub"><table class="ttable">${head}<tbody>${g.items.map(row).join('')}</tbody></table></div>` : ''}</div>`;
    }).join('')}</div>`;
    return;
  }
  List.innerHTML = `${bg}<table class="ttable">${head}<tbody>${visibleItems().map(row).join('')}</tbody></table>
  <div style="padding:12px 0 16px"><button class="btn-text" data-act="add">+ Add a missed opening</button></div>`;
}
function renderFoot() {
  const F = $('#revFoot');
  const n = S.items.length, a = S.items.filter(i => i.approved).length;
  const noSize = S.items.filter(i => i.w == null || i.h == null).length;
  if (S.takeoffOK) {
    F.innerHTML = `<div class="approved-line">Ready for RFQ · ${n} openings, ${groups().length} products</div>
      <div class="foot-row"><button class="btn-ghost sm" data-act="csv" id="csvBtn">Export CSV</button><button class="btn-text" data-act="reopen">Reopen review</button><button class="btn" data-act="rfq">Send to manufacturers <span class="arr">→</span></button></div>`;
    if (!dlFn) $('#csvBtn').hidden = true;
    return;
  }
  F.innerHTML = `<div class="prog"><div class="bar"><i style="width:${n ? a/n*100 : 0}%"></i></div><span>${a} of ${n} verified</span></div>
    <div class="foot-row"><button class="btn-ghost sm" data-act="approveAll" ${n && a < n ? '' : 'disabled'}>✓ Verify all (${n - a})</button>
    <button class="btn" data-act="approveTakeoff" ${n ? '' : 'disabled'}>Mark Ready for RFQ <span class="arr">→</span></button></div>
    <p class="rfq-help">${!n ? 'No windows in the takeoff yet.' : a === n ? 'All window data will be prepared for manufacturer quoting.'
      : 'Verify all confirms every window at once. Mark Ready for RFQ verifies any left and prepares the quote.'}${noSize ? ` ${noSize} without a full size go out as “?” — set it first if you know it.` : ''}</p>`;
}
function nextUnapproved(fromId) {
  const i = S.items.findIndex(x => x.id === fromId);
  for (let k = 1; k <= S.items.length; k++) { const it = S.items[(i + k) % S.items.length]; if (!it.approved) return it; }
  return null;
}
function moveSel(d) {
  const list = visibleItems();
  if (!list.length) return;
  let i = list.findIndex(x => x.id === S.sel);
  i = i < 0 ? 0 : (i + d + list.length) % list.length;
  select(list[i].id, true);
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
  if (S.sheet) it.sheet = S.sheet;
  S.items.push(it); S.takeoffOK = false;
  S.adding = false; $('#viewer').classList.remove('adding'); $('#vhint').classList.remove('show');
  select(it.id, false);
  toast(`${it.mark} added. Set its type and size.`);
}
function initReview() {
  $('#rev').addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]');
    if (tab) {   // flip between the grouped products and the openings
      S.tab = S.tab === 'groups' ? 'openings' : 'groups'; S.selGroup = null; S.open = null; S.preview = false;
      if (S.tab === 'groups') { S.sel = null; fitView(); }
      renderReview(); return;
    }
    const row = e.target.closest('tr[data-id]');
    if (row) { select(+row.dataset.id, true); return; }
    const grp = e.target.closest('[data-group]');
    if (grp) {   // one click: show the product's windows on the plan (the double-click opens it, below)
      if (e.detail > 1) return;
      const k = grp.dataset.group;
      if (S.open && S.open !== k) S.open = null;
      S.selGroup = S.selGroup === k && !S.open ? null : k; S.sel = null; S.preview = false;
      const page = S.selGroup && groupSheet(groups().find(x => x.key === k));
      if (page && page !== S.sheet) showSheet(page);
      if (!S.open) fitView();
      renderDetail(); drawDets(); renderFoot();
      $$('#list .grp').forEach(b => b.classList.toggle('sel', b.dataset.group === S.selGroup || b.dataset.group === S.open));
      if (!S.open) $$('#list .gwrap.open').forEach(w => { w.classList.remove('open'); w.querySelector('.gsub')?.remove(); });
      if (!S.selGroup) idleSheet();
      return;
    }
    const pick = e.target.closest('[data-pick]');
    if (pick) { select(+pick.dataset.pick, true); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const it = S.sel && byId(S.sel);
    switch (b.dataset.act) {
      case 'putBack': {
        const n = S.leftOut.length;
        S.items = S.items.concat(S.leftOut).sort((x, y) => x.id - y.id); S.leftOut = []; S.takeoffOK = false;
        toast(`${n} opening${n === 1 ? '' : 's'} put back`); renderReview(); break;
      }
      case 'backGroups': { const k = S.open; S.sel = null; S.open = null; if (k) openGroup(k); else { renderReview(); fitView(); } break; }
      case 'preview': S.preview = true; renderDetail(); $('#detail').scrollTop = 0; break;
      case 'closePreview': S.preview = false; renderDetail(); break;
      case 'prev': moveSel(-1); break;
      case 'next': moveSel(1); break;
      case 'unapprove': if (it) { it.approved = false; S.takeoffOK = false; renderReview(); } break;
      case 'remove': if (it) { const nx = nextUnapproved(it.id); S.items = S.items.filter(x => x.id !== it.id); S.takeoffOK = false; toast(`${it.mark} removed`); nx && nx.id !== it.id ? select(nx.id, true) : (S.sel = null, renderReview()); } break;
      case 'approveAll': { const c = S.items.filter(i => !i.approved); c.forEach(i => i.approved = true); toast(`${c.length} window${c.length === 1 ? '' : 's'} verified`); renderReview(); break; }
      case 'approveTakeoff': S.items.forEach(i => i.approved = true); S.takeoffOK = true; S.sel = null; S.selGroup = null; fitView(); renderReview(); toast('Takeoff marked ready for RFQ'); break;
      case 'reopen': S.takeoffOK = false; renderReview(); break;
      case 'add': S.adding = true; $('#viewer').classList.add('adding'); $('#vhint').classList.add('show'); fitView(); break;
      case 'rfq': openRFQ(); break;
      case 'csv': exportCSV(); break;
    }
  });
  $('#list').addEventListener('dblclick', e => {
    const grp = e.target.closest('[data-group]'); if (!grp) return;
    e.preventDefault(); getSelection()?.removeAllRanges(); openGroup(grp.dataset.group);
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
    renderTab();
    const st = openingStatus(it), pill = $('#detail .pill'); if (pill) { pill.className = `pill st-${st}`; pill.textContent = stLabel(it); }
    const sum = $('#detail .d-sum'); if (sum) sum.outerHTML = plainSummary(it);
  };
  $('#detail').addEventListener('input', upd);
  $('#detail').addEventListener('change', upd);
  document.addEventListener('keydown', e => {
    if ($('#app').hidden || S.stage !== 'review') return;
    if (e.target.matches('input,select,textarea')) { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); moveSel(1); }
    else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); moveSel(-1); }
    else if (e.key === 'Escape' && S.preview) { S.preview = false; renderDetail(); }
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
  const sheetOf = i => (S.src?.sheets || []).find(s => s.page === i.sheet)?.label || '';
  const rows = [['Mark','Category','Type','Width (in)','Height (in)','Room','Drawing callout','Tempered','Egress','Confidence','Status','Plan sheet','Found in'].join(',')]
    .concat(S.items.map(i => [i.mark, i.cat, i.type, i.w ?? '', i.h ?? '', i.room, i.raw || '', i.temp ? 'yes' : '', i.egress ? 'yes' : '', i.added ? 'added' : Math.round(i.conf*100) + '%', stLabel(i), sheetOf(i), (i.srcs || []).join(' | ')].map(q).join(',')));
  rows.push('', ['Product','Width (in)','Height (in)','Qty','Marks'].join(','));
  groups().forEach(g => rows.push([pname(g), g.w ?? '', g.h ?? '', g.items.length, g.items.map(i => i.mark).join(' ')].map(q).join(',')));
  try { await dlFn.save({filename:`${(S.src?.title || 'takeoff').replace(/[^\w ]+/g, '').trim() || 'takeoff'} takeoff.csv`, data:rows.join('\n')}); toast('Takeoff exported'); }
  catch (e) { if (e && e.code !== 'declined') toast('Export isn\u2019t available here.'); }
}

// The RFQ and the bids: 19-app-procure.js
