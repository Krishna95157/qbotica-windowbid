'use strict';
/* upload */
let samplePromise = null, AI_NAME = 'Claude';
function initAI() {
  const avail = $('#avail');
  if (!window.claude || typeof window.claude.use !== 'function') {
    // Not on claude.ai: use the WindowBid server (OpenAI, key kept on the server) if this page is served by it.
    avail.textContent = 'Checking for the WindowBid reading service…';
    // The standalone build (dist/windowbid-standalone.html) adds a browser-direct OpenAI reader as a fallback.
    samplePromise = serverReader().then(r => r || (window.wbDirectReader ? window.wbDirectReader() : null)).then(r => {
      if (!r) {
        avail.textContent = 'Reading your own plans needs the WindowBid server (or this page open in Claude). The sample plan works anywhere.';
        $('#drop').classList.add('off');
        return null;
      }
      AI_NAME = r.label;
      avail.textContent = r.availText || (r.mock
        ? 'Demo server without an API key: uploads return a sample reading after a short wait.'
        : `Your plan is read by OpenAI (${r.model}) through the WindowBid server. A reading can take 1–3 minutes.`);
      return r;
    });
    return;
  }
  avail.textContent = 'Your plan is read by Claude on your account. Nothing is stored.';
  const off = () => {
    avail.textContent = 'Claude isn\u2019t available to this page in this view (for example when signed out, or in an account where AI inside artifacts is turned off). Open the link in your own claude.ai account, or run the WindowBid server. The sample plan works anywhere.';
    $('#drop').classList.add('off');
    return null;
  };
  samplePromise = window.claude.use('sample').then(async fn => {
    if (!fn) return off();
    const lim = await fn.limits().catch(() => null);
    const images = !!(lim && lim.images);
    // No image support in this view: PDFs can still be read from their text layer (tags, sizes, rooms, positions).
    if (!images) avail.textContent = 'This view can\u2019t send images to Claude, so PDFs are read from their text layer: tags, size callouts and room names. Image files and scanned PDFs need image reading.';
    return {label:'Claude', images, json:(input, opts) => fn.json(input, opts)};
  }).catch(off);
}
// Plan reader backed by server/server.mjs: POST the rendered page, then poll the background job.
async function serverReader() {
  if (!/^https?:$/.test(location.protocol)) return null;
  let h = null;
  try {
    const r = await fetch('/api/health', {cache:'no-store', signal:AbortSignal.timeout(4000)});
    if (r.ok) h = await r.json();
  } catch (e) { return null; }
  if (!h || !h.ok) return null;
  const fail = (code, message) => Object.assign(new Error(message || code), {code, message});
  return {
    label: h.mock ? 'mock reader, no API key' : `OpenAI ${h.model}`, model: h.model, mock: !!h.mock, polled: true, images: true,
    async json(prompt, {images, signal, onStatus, meta} = {}) {
      const image = await blobToDataURL(images);
      let r, d;
      try {
        r = await fetch('/api/extract', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({image, ...meta}), signal});
        d = await r.json().catch(() => ({}));
      } catch (e) { throw fail(signal && signal.aborted ? 'cancelled' : 'network', 'Couldn\u2019t reach the WindowBid server.'); }
      if (!r.ok) throw fail(d.error || 'server_error', d.message);
      const id = d.id;
      onStatus && onStatus({status:d.status || 'queued', elapsed:0});
      for (;;) {
        await new Promise(ok => { const t = setTimeout(ok, 2500); if (signal) signal.addEventListener('abort', () => { clearTimeout(t); ok(); }, {once:true}); });
        if (signal && signal.aborted) { fetch(`/api/extract/${id}/cancel`, {method:'POST'}).catch(() => {}); throw fail('cancelled'); }
        try { r = await fetch(`/api/extract/${id}`, {cache:'no-store'}); d = await r.json(); }
        catch (e) { continue; }                                   // brief network hiccup: keep polling
        if (!r.ok) throw fail(d.error || 'server_error', d.message);
        onStatus && onStatus(d);
        if (d.status === 'completed') return d.result;
        if (d.status !== 'queued' && d.status !== 'in_progress') throw fail(d.error || d.status, d.message);
      }
    }
  };
}
// Blob → data URL without FileReader (missing in Safari Lockdown Mode and some in-app browsers).
async function blobToDataURL(b) {
  if (!b) throw Object.assign(new Error('The page image couldn’t be prepared. Try a smaller plan.'), {code:'bad_image'});
  const u8 = new Uint8Array(await b.arrayBuffer());
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return `data:${b.type || 'image/png'};base64,${btoa(s)}`;
}
function initUpload() {
  buildPlan(el('g', {}, $('#thumbSvg')));
  const drop = $('#drop'), file = $('#file');
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) handleFile(f); });
  file.addEventListener('change', () => { const f = file.files[0]; if (f) handleFile(f); file.value = ''; });
  $('#useSample').addEventListener('click', runSample);
}
async function handleFile(f) {
  const okType = /pdf|png|jpe?g|webp/i.test(f.type) || /\.(pdf|png|jpe?g|webp)$/i.test(f.name);
  if (!okType) { toast('Use a PDF, PNG, JPG or WebP file.'); return; }
  const fn = samplePromise ? await samplePromise : null;
  if (!fn) { toast('Reading your own plans isn\u2019t available here. Try the sample plan.'); return; }
  const isPdf = /pdf/i.test(f.type) || /\.pdf$/i.test(f.name);
  if (fn.images === false && !isPdf) { toast('This view reads PDFs from their text only. Export the plan as a PDF, or try the sample plan.'); return; }
  runUpload(f, fn);
}

/* viewer */
const V = {W:1000, H:720, s:1, tx:0, ty:0};
function applyT() { $('#vstage').style.transform = `translate(${V.tx}px,${V.ty}px) scale(${V.s})`; }
function fitInfo() {
  const r = $('#viewer').getBoundingClientRect();
  const k = Math.min(r.width / V.W, r.height / V.H);
  return {r, k, ox:(r.width - V.W*k)/2, oy:(r.height - V.H*k)/2};
}
function fitView() { V.s = 1; V.tx = 0; V.ty = 0; applyT(); }
function focusBox(b) {
  const {r, k, ox, oy} = fitInfo();
  if (!k) return;
  const cx = b[0] + b[2]/2, cy = b[1] + b[3]/2;
  const s = clamp(Math.min(r.width*.3/(b[2]*k), r.height*.3/(b[3]*k)), 1.3, 2.4);
  V.s = s; V.tx = r.width/2 - s*(ox + cx*k); V.ty = r.height/2 - s*(oy + cy*k);
  applyT();
}
function zoomAt(f, px, py) {
  const ns = clamp(V.s * f, 1, 8);
  V.tx = px - (px - V.tx) * ns / V.s; V.ty = py - (py - V.ty) * ns / V.s; V.s = ns;
  if (ns === 1) { V.tx = 0; V.ty = 0; }
  applyT();
}
function setupViewer(src) {
  V.W = src.W; V.H = src.H;
  $('#vsvg').setAttribute('viewBox', `0 0 ${src.W} ${src.H}`);
  const c = $('#vcontent'); c.innerHTML = '';
  if (src.kind === 'sample') buildPlan(c);
  else el('image', {href:src.href, x:0, y:0, width:src.W, height:src.H}, c);
  $('#vover').innerHTML = '';
  $('#vscan rect').setAttribute('height', src.H); $('#vscan line').setAttribute('y2', src.H);
  $('#vscan rect').setAttribute('width', src.W * .04);
  fitView();
}
function svgPointFromClient(cx, cy) {
  const svg = $('#vsvg'); const p = svg.createSVGPoint(); p.x = cx; p.y = cy;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}
function initViewer() {
  const vw = $('#viewer');
  let down = null;
  vw.addEventListener('pointerdown', e => {
    if (e.target.closest('.vtools')) return;
    down = {x:e.clientX, y:e.clientY, tx:V.tx, ty:V.ty, moved:false, id:e.pointerId};
    vw.setPointerCapture(e.pointerId);
  });
  vw.addEventListener('pointermove', e => {
    if (!down || down.id !== e.pointerId) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) > 4) { down.moved = true; vDragging = true; vw.classList.add('dragging'); }
    if (down.moved && V.s > 1) { V.tx = down.tx + dx; V.ty = down.ty + dy; applyT(); }
  });
  const end = e => {
    if (!down) return;
    vw.classList.remove('dragging'); vDragging = false;
    const wasClick = !down.moved; down = null;
    if (!wasClick || S.stage !== 'review') return;
    if (S.adding) { addAt(e.clientX, e.clientY); return; }
    const hit = document.elementsFromPoint(e.clientX, e.clientY).map(n => n.closest && n.closest('.det')).find(Boolean);
    if (hit) select(+hit.dataset.id, true);
    else if (S.sel || S.selGroup) { S.sel = null; S.selGroup = null; renderReview(); }
  };
  vw.addEventListener('pointerup', end);
  vw.addEventListener('pointercancel', () => { down = null; vDragging = false; vw.classList.remove('dragging'); });
  vw.addEventListener('wheel', e => {
    e.preventDefault();
    const r = vw.getBoundingClientRect();
    vw.classList.add('wheeling'); clearTimeout(initViewer._w);
    initViewer._w = setTimeout(() => vw.classList.remove('wheeling'), 150);
    zoomAt(Math.exp(-e.deltaY * .0018), e.clientX - r.left, e.clientY - r.top);
  }, {passive:false});
  $('.vtools').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const r = vw.getBoundingClientRect();
    if (b.dataset.z === 'fit') fitView();
    else zoomAt(b.dataset.z === 'in' ? 1.5 : 1/1.5, r.width/2, r.height/2);
  });
  addEventListener('resize', () => { if (S.stage === 'review' && S.sel) { const it = byId(S.sel); if (it && it.box) focusBox(it.box); } });
}
function drawDets(popId) {
  const over = $('#vover'); over.innerHTML = '';
  const fs = Math.max(V.W, V.H) / 78;
  const grpIds = S.selGroup ? new Set((groups().find(g => g.key === S.selGroup)?.items || []).map(i => i.id)) : null;
  for (const it of S.items) {
    if (!it.box) continue;
    const g = makeDet(over, it.box, it, {cls:`det st-${openingStatus(it)}`, chip:true, fs, corner:Math.min(fs*.9, it.box[2]*.35, it.box[3]*.35)});
    g.dataset.id = it.id;
    if (it.id === S.sel || (grpIds && grpIds.has(it.id))) g.classList.add('sel');
    if (it.id === popId) g.classList.add('pop');
  }
  $('#vstage').classList.toggle('has-sel', !!(S.sel || S.selGroup) && S.stage === 'review');
}

