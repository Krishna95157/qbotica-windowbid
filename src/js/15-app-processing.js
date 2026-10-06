'use strict';
/* processing */
const PSTEPS = ['Plan received','Sheet identified','Finding windows and doors','Reading marks and sizes','Matching types','Building the takeoff'];
function showProc(title, steps = PSTEPS) {
  $('#proc').hidden = false; $('#rev').hidden = true;
  $('#procTitle').textContent = title;
  $('#psteps').innerHTML = steps.map(s => `<li><i></i>${s}</li>`).join('');
  $('#plog').innerHTML = ''; $('#procAct').innerHTML = '';
}
function setStep(i, st) { const li = $$('#psteps li')[i]; if (li) li.className = st; }
function log(html) {
  const ul = $('#plog'); const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li);
  while (ul.children.length > 8) ul.firstChild.remove();
}
function counts() {
  return {windows:S.items.filter(i => i.cat === 'window').length, doors:S.items.filter(i => i.cat === 'door').length, products:groups().length, openings:S.items.length};
}
function renderStats() {
  const list = visibleItems(), a = list.filter(i => i.approved).length;
  const c = {windows:list.filter(i => i.cat === 'window').length, doors:list.filter(i => i.cat === 'door').length,
             products:groups(list).length, openings:list.length};
  const doors = S.src && S.src.kind === 'sample' ? `<div><b>${c.doors}</b>doors</div>` : '';   // uploads are windows only
  $('#wStats').innerHTML = `<div><b>${c.windows}</b>windows</div>${doors}<div><b>${c.products}</b>products</div><div><b>${a}/${c.openings}</b>verified</div>`;
}
function scanTo(x) {
  $('#vscan').style.display = '';
  $('#vscan line').setAttribute('x1', x); $('#vscan line').setAttribute('x2', x);
  $('#vscan rect').setAttribute('x', x - V.W*.04);
}
function resetTakeoff(src) {
  if (S.ctl) S.ctl.abort();                   // stops any background reading of the previous takeoff
  S.bg = null; S.bgPage = null; S.bgReading = new Set(); S.bgFound = new Set();
  S.src = src; S.items = []; S.sel = null; S.selGroup = null; S.open = null; S.leftOut = []; S.takeoffOK = false; S.tab = 'groups'; S.adding = false;
  S.rfq = null; S.bids = null; S.pick = null; S.sheet = null;
  $('#wTitle').textContent = src.title; $('#wFile').textContent = src.file;
  goStage('work');
  setupViewer(src);
  renderSheetTabs(); renderStrip();
  renderStats();
}
async function runSample() {
  const run = ++S.run;
  resetTakeoff({kind:'sample', W:1000, H:720, title:'Demo Residence', file:'A1.0 Floor plan · page 1 of 1'});
  showProc('Reading plan');
  const live = () => run === S.run;
  setStep(0, 'done'); log('A1.0_Floor_Plan_Demo_Residence.pdf · 1 page');
  await wait(REDUCED ? 0 : 450); if (!live()) return;
  setStep(1, 'done'); log('Sheet identified: <b>floor plan</b>, scale 1/4" = 1\'-0"');
  setStep(2, 'active');
  const order = SEED.map(o => ({o, x: bboxOf(o)[0] + bboxOf(o)[2]/2})).sort((a, b) => a.x - b.x);
  const D = REDUCED ? 1 : 3200, t0 = performance.now();
  await new Promise(res => {
    let k = 0;
    const step = t => {
      if (!live()) return res();
      const p = clamp((t - t0) / D, 0, 1), x = p * 1000;
      scanTo(x);
      while (k < order.length && order[k].x < x) {
        const {o} = order[k++];
        const it = {id:uid++, mark:o.mark, cat:o.cat, type:o.type, w:o.w, h:o.h, room:o.room, conf:o.conf, note:o.note || '', box:bboxOf(o)};
        S.items.push(it); drawDets(it.id); renderStats();
        log(`<b>${o.mark}</b> ${o.type.toLowerCase()} · ${o.room} · ${Math.round(o.conf*100)}%`);
      }
      if (p > .5) { setStep(2, 'done'); setStep(3, 'active'); }
      if (p > .78) { setStep(3, 'done'); setStep(4, 'active'); }
      p < 1 ? requestAnimationFrame(step) : res();
    };
    requestAnimationFrame(step);
  });
  if (!live()) return;
  $('#vscan').style.display = 'none';
  setStep(3, 'done'); setStep(4, 'done'); setStep(5, 'active');
  log(`Grouped into <b>${groups().length}</b> products`);
  await wait(REDUCED ? 0 : 650); if (!live()) return;
  setStep(5, 'done');
  S.items.sort((a, b) => a.mark.localeCompare(b.mark, undefined, {numeric:true}));
  enterReview();
}
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  const base = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  await loadScript(base + 'pdf.worker.min.js');
  await loadScript(base + 'pdf.min.js');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js';
  return window.pdfjsLib;
}
async function fileToCanvas(f) {
  const isPdf = /pdf/i.test(f.type) || /\.pdf$/i.test(f.name);
  const canvas = document.createElement('canvas');
  let pages = 1, text = [];
  if (isPdf) {
    const lib = await loadPdfJs();
    const pdf = await lib.getDocument({data: new Uint8Array(await f.arrayBuffer())}).promise;
    pages = pdf.numPages;
    const page = await pdf.getPage(1);
    const v0 = page.getViewport({scale:1});
    const vp = page.getViewport({scale: 2000 / Math.max(v0.width, v0.height)});
    canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({canvasContext:ctx, viewport:vp}).promise;
    const tc = await page.getTextContent().catch(() => null);
    if (tc) text = tc.items.map(it => {
      const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
      return {x:Math.round(x / canvas.width * 1000), y:Math.round(y / canvas.height * 1000), s:String(it.str || '').replace(/\s+/g, ' ').trim()};
    }).filter(t => t.s && t.x >= 0 && t.x <= 1000 && t.y >= 0 && t.y <= 1000);
  } else {
    const url = URL.createObjectURL(f);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const sc = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.round(img.naturalWidth * sc); canvas.height = Math.round(img.naturalHeight * sc);
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
  }
  return {canvas, pages, text};
}
// "x,y: text" lines, top to bottom, capped in size — exact tags and callouts for the model
function textLayer(items, maxBytes) {
  let out = '';
  for (const t of [...(items || [])].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const line = `${t.x},${t.y}: ${t.s}\n`;
    if (out.length + line.length > maxBytes) break;
    out += line;
  }
  return out;
}
const ERR = {
  not_granted:'Claude wasn\u2019t allowed to read the plan. Allow it when asked, or use the sample plan.',
  sampling_disabled:'Claude isn\u2019t available on this account. Use the sample plan instead.',
  rate_limited:'Too many requests right now. Wait a minute, then try again.',
  image_rejected:'That file couldn\u2019t be read as an image. Try a PDF, PNG or JPG under 20 MB.',
  images_unavailable:'This view can\u2019t send images to Claude. Use the sample plan instead.',
  invalid_json:'The result came back incomplete. Try again, or upload a single sheet.',
  refused:'No result for this page. Try a clearer floor plan, elevation or schedule.',
  empty_completion:'No result for this page. Try a clearer floor plan, elevation or schedule.',
  session_expired:'Your session expired. Sign in to Claude again, then retry.',
};
function promptFor(name, W, H, pages, tl = '', textOnly = false) {
  const page = `page 1${pages > 1 ? ` of ${pages}` : ''} of "${name}"`;
  const source = textOnly
    ? `You cannot see the drawing. Instead you get the text layer of ${page}: one line per text item, "x,y: text", with x and y on a 0-1000 scale of the page width and height (y grows downward).
Window and door tags and size callouts sit next to their openings, so use their positions. For box, use a small box around the opening's tag or callout, e.g. [x-15, y-12, x+15, y+6]. Openings with no text near them can't be found from text alone; don't invent them.`
    : `The attached image is ${page}, ${W} x ${H} pixels.`;
  return `You are reading an architectural drawing to build a window and door takeoff for a window dealer.
${source}

Find every exterior window shown on this page. This is a windows-only takeoff: do NOT include doors of any kind (entry, patio, sliding glass, French, bifold, garage). Skip cased openings, closets and cabinets.
If the page is a window schedule rather than a drawing, return one entry per window row with box set to null. Skip door schedules.

For each opening return:
- mark: the tag shown on the drawing (e.g. "W3", "101", "A"). If there is none, assign W01, W02... for windows and D01, D02... for doors.
- category: always "window"
- type: exactly one of ${TYPES.map(t => `"${t}"`).join(', ')}
- width_in, height_in: numbers in inches, only if written on the drawing (dimension string, tag, size code or schedule). Convert 3'-0" to 36. A size code like 3050 means 3'0" x 5'0" = 36 x 60. Use null when not legible. Never estimate from the drawing scale.
- room: the room the opening serves, or null
- box: [x0, y0, x1, y1] tight box around the opening symbol, integers on a 0-1000 scale of the image width and height
- raw_callout: the size or type note exactly as written on the drawing (e.g. "5050 XO", "2040 SH TEMP GL"), or null
- tempered_glass, egress: true only when the drawing says so (TEMP / TEMPERED, EGRESS), otherwise false
- confidence: 0 to 1, honest
- note: a short reason when confidence is below 0.85 or a value is null, otherwise ""

Also return sheet: "floor plan", "elevation", "schedule" or "other".

${tl ? `\n${textOnly ? 'Text layer' : 'The page\u2019s text layer, for exact spelling of tags and callouts (x,y on a 0-1000 scale, y down)'}:\n${tl}\n` : ''}
Reply with only JSON, like:
{"sheet":"floor plan","openings":[{"mark":"W1","category":"window","type":"Casement","raw_callout":"3050 CSMT","width_in":36,"height_in":60,"room":"Bedroom 2","tempered_glass":false,"egress":true,"box":[120,80,180,96],"confidence":0.92,"note":""}]}`;
}
function normalize(res, W, H) {
  const list = Array.isArray(res?.openings) ? res.openings.slice(0, 120) : [];
  const out = [];
  let wn = 1, dn = 1;
  for (const r of list) {
    if (!r || typeof r !== 'object') continue;
    const type = TYPES.find(t => t.toLowerCase() === String(r.type || '').toLowerCase()) || 'Unknown';
    const cat = String(r.category || '').toLowerCase() === 'door' || DOOR_TYPES.has(type) ? 'door' : 'window';
    if (cat === 'door') continue;                                   // windows-only takeoff
    const num = v => { const n = Number(v); return Number.isFinite(n) && n > 0 && n < 400 ? Math.round(n*10)/10 : null; };
    let box = null;
    if (Array.isArray(r.box) && r.box.length === 4 && r.box.every(v => Number.isFinite(Number(v)))) {
      let [x0, y0, x1, y1] = r.box.map(Number);
      if (x1 < x0) [x0, x1] = [x1, x0];
      if (y1 < y0) [y0, y1] = [y1, y0];
      x0 = clamp(x0, 0, 1000) / 1000 * W; x1 = clamp(x1, 0, 1000) / 1000 * W;
      y0 = clamp(y0, 0, 1000) / 1000 * H; y1 = clamp(y1, 0, 1000) / 1000 * H;
      const m = Math.max(W, H) * .006;
      box = [x0 - m, y0 - m, Math.max(x1 - x0, 4) + 2*m, Math.max(y1 - y0, 4) + 2*m];
    }
    const mark = String(r.mark || '').trim().slice(0, 12) || (cat === 'door' ? `D${pad2(dn++)}` : `W${pad2(wn++)}`);
    let conf = clamp(Number(r.confidence) || .5, 0, 1);
    if (r.needs_review === true) conf = Math.min(conf, .8);          // the model asked for a human check
    const base = {cat, type, w:num(r.width_in), h:num(r.height_in), room:String(r.room || '').slice(0, 40), conf,
      note:String(r.note || '').slice(0, 200), box, raw:r.raw_callout ? String(r.raw_callout).slice(0, 40) : '',
      temp:r.tempered_glass === true, egress:r.egress === true};
    const qty = clamp(Math.round(Number(r.quantity) || 1), 1, 20);   // ganged units / schedule quantities → one row each
    for (let k = 0; k < qty; k++) out.push({...base, id:uid++, mark:k ? `${mark}·${k + 1}` : mark});
  }
  return out;
}
async function runUpload(f, sample) {
  const run = ++S.run;
  const live = () => run === S.run;
  let cv;
  try { toast('Preparing ' + f.name); cv = await fileToCanvas(f); }
  catch (e) { toast('That file couldn\u2019t be opened. Try another PDF or image.'); return; }
  if (!live()) return;
  const {canvas, pages, text} = cv, W = canvas.width, H = canvas.height;
  const textOnly = sample.images === false;
  const tl = textLayer(text, textOnly ? 150000 : 50000);
  if (textOnly && !tl) { toast('This PDF has no text layer (it looks like a scan), and this view can\u2019t send images to Claude. Try a CAD-exported PDF, or the sample plan.'); return; }
  const href = canvas.toDataURL('image/jpeg', .9);
  const title = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 60) || 'Uploaded plan';
  resetTakeoff({kind:'upload', W, H, href, title, file:`${f.name} · page 1 of ${pages}`});
  showProc('Reading plan');
  setStep(0, 'done'); log(`${esc(f.name)} · ${pages} page${pages > 1 ? 's' : ''}${pages > 1 ? ' · analyzing page 1' : ''}`);
  setStep(1, 'active');
  if (text && text.length) log(`Text layer: <b>${text.length}</b> text items${textOnly ? '' : ' sent as a reference'}`);
  log(sample.polled ? 'Sending page 1 to the WindowBid reading service' : textOnly ? 'Sending the page\u2019s text to Claude for reading' : 'Sending page 1 to Claude for reading');
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  let scanOn = !REDUCED; const t0 = performance.now();
  const scanStep = t => { if (!scanOn || !live()) return; const p = ((t - t0) / 2600) % 2; scanTo((p < 1 ? p : 2 - p) * W); requestAnimationFrame(scanStep); };
  if (scanOn) requestAnimationFrame(scanStep);
  const ctl = new AbortController(); S.ctl = ctl;
  $('#procAct').innerHTML = '<button class="btn-ghost sm" id="stopRun">Stop</button>';
  $('#stopRun').onclick = () => ctl.abort();
  const seen = new Set(); let gotFirst = false, res;
  // server readings are background jobs: show elapsed time and move the steps along while we poll
  let saidQ = false, saidP = false, lastNote = 0;
  const onStatus = d => {
    if (!live()) return;
    const s = d.elapsed || 0, k = s < 10 ? 1 : s < 45 ? 2 : s < 100 ? 3 : 4;
    for (let i = 1; i <= 4; i++) setStep(i, i < k ? 'done' : i === k ? 'active' : '');
    $('#procTitle').textContent = `Reading plan · ${Math.floor(s / 60)}:${pad2(s % 60)}`;
    if (d.status === 'queued' && !saidQ) { saidQ = true; log('Queued for reading'); }
    if (d.status === 'in_progress' && !saidP) { saidP = true; log('Reading architectural openings'); }
    if (s - lastNote >= 30) { lastNote = s; log(`Still reading · ${Math.floor(s / 60)}:${pad2(s % 60)} elapsed`); }
  };
  const extra = sample.polled ? {onStatus, meta:{filename:f.name, width:W, height:H, pages, textLayer:tl}} : {};
  if (!textOnly) extra.images = blob;
  try {
    res = await sample.json(promptFor(f.name, W, H, pages, sample.polled ? '' : tl, textOnly), {
      signal: ctl.signal, modelTier: 'default', ...extra,
      onText: ({text}) => {
        if (!live()) return;
        if (!gotFirst) { gotFirst = true; setStep(1, 'done'); setStep(2, 'active'); const s = /"sheet"\s*:\s*"([^"]+)"/.exec(text); if (s) log(`Sheet identified: <b>${esc(s[1])}</b>`); }
        const re = /"mark"\s*:\s*"([^"]{1,12})"/g; let m;
        while ((m = re.exec(text))) if (!seen.has(m[1])) { seen.add(m[1]); log(`Found <b>${esc(m[1])}</b>`); }
        if (seen.size > 2) { setStep(2, 'done'); setStep(3, 'active'); }
      }
    });
  } catch (e) {
    scanOn = false; $('#vscan').style.display = 'none';
    if (!live()) return;
    if (e && e.code === 'cancelled') { goStage('upload'); return; }
    if (e && ['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed','images_unavailable'].includes(e.code)) {
      $('#drop').classList.add('off'); $('#avail').textContent = 'Reading your own plans isn\u2019t available in this view. The sample plan works anywhere.';
      samplePromise = Promise.resolve(null);
    }
    showError(ERR[e && e.code] || (sample.polled && e && e.message) || 'The reading was interrupted. Try again.', f);
    return;
  }
  scanOn = false; $('#vscan').style.display = 'none';
  if (!live()) return;
  const items = normalize(res, W, H);
  if (!items.length) { showError('No exterior windows were found on page 1. Try a floor plan, elevation or window schedule page.', f); return; }
  setStep(1, 'done'); setStep(2, 'done'); setStep(3, 'done'); setStep(4, 'active');
  if (res && res.sheet && !gotFirst) log(`Sheet identified: <b>${esc(res.sheet)}</b>`);
  if (res && res.summary && Number.isFinite(res.summary.unique_configurations)) log(`${res.summary.total_windows} windows · ${res.summary.total_doors} doors · ${res.summary.unique_configurations} configurations`);
  const order = [...items].sort((a, b) => (a.box ? a.box[0] : 1e9) - (b.box ? b.box[0] : 1e9));
  for (const it of order) {
    if (!live()) return;
    S.items.push(it); drawDets(it.id); renderStats();
    if (!REDUCED) await wait(Math.max(40, 900 / order.length));
  }
  setStep(4, 'done'); setStep(5, 'active');
  const unplaced = items.filter(i => !i.box).length;
  log(`Read <b>${items.length}</b> openings${unplaced ? `, ${unplaced} from a schedule (no location)` : ''}`);
  await wait(REDUCED ? 0 : 500); if (!live()) return;
  setStep(5, 'done');
  S.items.sort((a, b) => a.mark.localeCompare(b.mark, undefined, {numeric:true}));
  Object.assign(NUMS, counts(), {src:`From your plan · ${title}`});
  enterReview();
}
function showError(msg, f) {
  $$('#psteps li.active').forEach(li => li.className = '');
  $('#procTitle').textContent = 'Reading stopped';
  $('#procAct').innerHTML = `<div class="perr"><p>${esc(msg)}</p><div class="foot-row" style="justify-content:flex-start"><button class="btn sm" id="retry">Try again</button><button class="btn-ghost sm" id="back">Back to upload</button><button class="btn-text" id="trySample">Use the sample plan</button></div></div>`;
  $('#retry').onclick = () => f ? handleFile(f) : goStage('upload');
  $('#back').onclick = () => goStage('upload');
  $('#trySample').onclick = runSample;
}

