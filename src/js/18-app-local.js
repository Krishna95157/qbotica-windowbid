'use strict';
/* ------------------------------------------------------------------
   Reading with the local WindowBid OCR app (server started with LOCAL_OCR_URL). The upload goes to it
   through /local/api/… on this server; its takeoff is shown in this demo's review, windows only.
   The local app shows its takeoff as soon as it is extracted and finishes its independent re-reads of
   OCR'd notes right after — the review refreshes when they are in.
------------------------------------------------------------------ */
const LSTEPS = ['Drawing received','Reading text and drawing lines','Finding windows and their notes','Checking notes with independent reads','Building the takeoff'];
const LOCAL_TYPE = {single_hung:'Single hung', double_hung:'Double hung', casement:'Casement', awning:'Awning',
  picture:'Picture', transom:'Picture', sliding:'Sliding'};
const LOCAL_DOOR = /door/;

async function runLocal(f) {
  const run = ++S.run, live = () => run === S.run;
  const title = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 60) || 'Uploaded plan';
  resetTakeoff({kind:'upload', W:1000, H:720, href:'', title, file:f.name, sheets:[]});
  showProc('Reading drawing', LSTEPS);
  setStep(0, 'done'); setStep(1, 'active'); log(esc(f.name));
  const ctl = new AbortController(); S.ctl = ctl;
  $('#procAct').innerHTML = '<button class="btn-ghost sm" id="stopRun">Stop</button>';
  $('#stopRun').onclick = () => { ctl.abort(); goStage('upload'); };
  const t0 = performance.now();
  const clock = setInterval(() => {
    if (!live()) return clearInterval(clock);
    const s = Math.round((performance.now() - t0) / 1000);
    $('#procTitle').textContent = `Reading drawing · ${Math.floor(s / 60)}:${pad2(s % 60)}`;
  }, 1000);
  const fail = msg => { clearInterval(clock); if (live()) showError(msg, f); };
  try {
    const form = new FormData();
    form.append('file', f, f.name);
    let r = await fetch('/local/api/takeoff', {method:'POST', body:form, signal:ctl.signal});
    let d = await r.json().catch(() => ({}));
    if (!r.ok) return fail(d.message || d.detail || 'The local reader refused this file.');
    const id = d.document_id;
    let st;
    for (;;) {
      await wait(1500);
      if (!live() || ctl.signal.aborted) return clearInterval(clock);
      r = await fetch(`/local/api/documents/${id}/status`, {cache:'no-store'});
      st = await r.json().catch(() => ({}));
      if (!r.ok) return fail(st.message || 'Lost contact with the local reader.');
      if (st.state === 'failed') return fail(st.error || 'The drawing could not be read.');
      const stage = st.stage || '';
      const k = st.state === 'done' ? 3 : /notation|linking|rooms|Parsing/i.test(stage) ? 2 : 1;
      for (let i = 1; i < 5; i++) setStep(i, i < k ? 'done' : i === k ? 'active' : '');
      if (stage) logLive('stage', esc(stage.replace(/\s*\(all orientations\)/, '')));
      if (st.state === 'done') break;
    }
    const doc = await (await fetch(`/local/api/documents/${id}`, {cache:'no-store'})).json();
    if (!live()) return clearInterval(clock);
    clearInterval(clock);
    for (const w of doc.warnings || []) if (/skipped/.test(w)) log(esc(w.split(' — ')[0]));
    const {items, sheets} = mapLocal(doc, id);
    if (!items.length) return showError('No windows were found on this drawing. Try a floor plan or a window schedule.', f);
    S.src.sheets = sheets;
    S.items = items;
    const pages = doc.pages.length;
    $('#wFile').textContent = S.src.file = `${f.name} · ${pages} sheet${pages === 1 ? '' : 's'} read · ${Math.round(st.elapsed || 0)} s`;
    log(`Takeoff: <b>${items.length}</b> windows`);
    setStep(3, 'done'); setStep(4, 'done');
    if (sheets.length) showSheet(sheets[0].page);
    Object.assign(NUMS, counts(), {src:`From your plans · ${title}`});
    enterReview();
    if (doc.verification === 'pending') followLocalChecks(id, run);
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    fail('Couldn’t reach the local reader. Start it with ./run.sh in ~/windowbid-experiment.');
  }
}

// The independent re-reads finish after the first result: refresh the takeoff, keeping what was verified here.
async function followLocalChecks(id, run) {
  toast('Checking notes with independent reads…');
  for (;;) {
    await wait(2000);
    if (run !== S.run) return;
    const st = await (await fetch(`/local/api/documents/${id}/status`, {cache:'no-store'})).json().catch(() => ({}));
    if (st.verification === 'running') continue;
    const doc = await (await fetch(`/local/api/documents/${id}`, {cache:'no-store'})).json();
    if (run !== S.run || S.stage !== 'review') return;
    const verified = new Set(S.items.filter(i => i.approved).map(i => i.localId));
    const sel = S.sel && byId(S.sel)?.localId;
    S.items = mapLocal(doc, id).items;
    for (const it of S.items) if (verified.has(it.localId)) it.approved = true;
    S.sel = (S.items.find(i => i.localId === sel) || {}).id || null;
    renderReview();
    toast('Independent checks finished');
    return;
  }
}

function mapLocal(doc, id) {
  const sheets = doc.pages.map(p => ({page:p.number, label:`p.${p.number}`, name:`page ${p.number}`, title:'',
    W:p.width, H:p.height, href:`/local/api/documents/${id}/pages/${p.number}.png`}));
  const items = [];
  for (const it of doc.items) {
    if (it.status === 'excluded' || it.status === 'rejected' || it.in_scope === false) continue;
    if (it.category === 'door' || LOCAL_DOOR.test(it.type || '')) continue;          // windows-only takeoff
    const ev = it.evidence.find(e => e.role === 'annotation' || e.role === 'tag') || it.evidence[0];
    const b = (it.opening && it.opening.bbox) || (ev && ev.bbox);
    const blocking = it.issues.filter(i => i.severity === 'blocking').map(i => i.message);
    const other = it.issues.filter(i => i.severity !== 'blocking').map(i => i.message);
    const srcs = [ev ? `Note “${ev.raw_text}” on page ${it.page}` : `Window symbol on page ${it.page}`];
    if (it.schedule_confirms) srcs.push('Size confirmed by the schedule');
    const base = {
      cat:'window', type:LOCAL_TYPE[it.type] || 'Unknown', w:it.width_in ?? null, h:it.height_in ?? null,
      room:it.room || '', conf:it.status === 'verified' ? .97 : it.status === 'review_recommended' ? .9 : .6,
      note:[...blocking, ...other].slice(0, 2).join(' ') + (it.type && !LOCAL_TYPE[it.type] ? ` Read as ${it.type.replace(/_/g, ' ')}.` : ''),
      box:b ? [b[0] - 4, b[1] - 4, b[2] - b[0] + 8, b[3] - b[1] + 8] : null,
      raw:(ev ? ev.raw_text : '').slice(0, 40), temp:(it.attributes || []).includes('tempered'),
      egress:(it.attributes || []).includes('egress'), sheet:it.page, srcs, localId:it.id,
      tag:it.mark || '',                                    // the drawing's own window number, '' if none
    };
    const mark = it.mark || `#${it.number}`, qty = clamp(Number(it.quantity) || 1, 1, 20);
    for (let k = 0; k < qty; k++) items.push({...base, srcs:[...srcs], id:uid++, mark:k ? `${mark}·${k + 1}` : mark});
  }
  items.sort((a, b) => a.mark.localeCompare(b.mark, undefined, {numeric:true}));
  return {items, sheets};
}
