'use strict';
/* ------------------------------------------------------------------
   Drawing sets (WindowBid server only). A full set can run to 90 pages, with the facts about one
   window spread over several sheets: the floor plan shows tag "3" in a wall, the schedule on
   another sheet says what "3" is. Three passes:
     1. sort   — every page, small, in batches: floor plan? schedule? elevation? which level?
     2. read   — one thing first, the rest only if needed: the window schedule areas, at full detail.
                 When the schedule gives every window's size and count, that is the takeoff and the
                 floor plans are not read. Otherwise the chosen floor plans (one per level) are read.
     3. join   — plan tags matched to schedule rows across sheets, with quantity checks;
                 elevations are read only when tags are still unexplained.
   Server contracts: server/document-schema.mjs.
------------------------------------------------------------------ */
const DSTEPS = ['Document received','Sorting pages','Reading window schedules','Reading floor plans (if needed)','Matching tags to schedules','Building the takeoff'];
const SCHED_KINDS = new Set(['window_schedule','door_schedule','window_door_schedule','window_types']);
const KIND_NAME = {floor_plan:'floor plan', window_schedule:'window schedule', door_schedule:'door schedule', window_door_schedule:'window & door schedule',
  window_types:'window type legend', elevation:'elevation', other_plan:'other plan', other:'other'};
const DEF_RANK = {schedule:3, window_types:2, plan:1, elevation:0};
const DEF_FROM = {schedule:'Schedule on', window_types:'Type legend on', plan:'Schedule on', elevation:'Elevation'};
const TAG_RANK = {many:2, few:1, none:0};
const LIMITS = {plans:6, schedules:12, cropsPerPage:3, elevations:4, inFlight:3, batch:8};

// run async jobs with at most n in flight
function limiter(n) {
  let active = 0; const q = [];
  const next = () => {
    if (active >= n || !q.length) return;
    active++; const {fn, ok, no} = q.shift();
    fn().then(ok, no).finally(() => { active--; next(); });
  };
  return fn => new Promise((ok, no) => { q.push({fn, ok, no}); next(); });
}
// one log line that updates in place (e.g. "Sorting page 12 of 30")
function logLive(k, html) {
  let li = $(`#plog li[data-k="${k}"]`);
  if (li) { li.innerHTML = html; return; }
  log(html); $('#plog').lastElementChild.dataset.k = k;
}
// render a page (or a region of it, [x0,y0,x1,y1] on 0–1000) with its long side at `px`
async function renderRegion(page, px, region) {
  const v1 = page.getViewport({scale:1});
  const r = region ? region.map(v => clamp(v, 0, 1000) / 1000) : [0, 0, 1, 1];
  const rw = (r[2] - r[0]) * v1.width, rh = (r[3] - r[1]) * v1.height;
  const scale = Math.min(px / Math.max(rw, rh), 12);
  const vp = page.getViewport({scale});
  const x0 = Math.floor(r[0] * vp.width), y0 = Math.floor(r[1] * vp.height);
  const W = Math.max(1, Math.round(rw * scale)), H = Math.max(1, Math.round(rh * scale));
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  await page.render({canvasContext:ctx, viewport:vp, transform:[1, 0, 0, 1, -x0, -y0]}).promise;
  return {canvas, W, H, vp, x0, y0};
}
// text items inside that render, on a 0–1000 scale of it; z = font size, for picking titles
async function regionText(page, {vp, x0, y0, W, H}) {
  const tc = await page.getTextContent().catch(() => null);
  if (!tc) return [];
  const out = [];
  for (const it of tc.items) {
    const s = String(it.str || '').replace(/\s+/g, ' ').trim();
    if (!s) continue;
    const [px, py] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
    const x = (px - x0) / W * 1000, y = (py - y0) / H * 1000;
    if (x < 0 || x > 1000 || y < 0 || y > 1000) continue;
    out.push({x:Math.round(x), y:Math.round(y), s, z:Math.hypot(it.transform[2], it.transform[3])});
  }
  return out;
}
// the biggest words on a sheet (titles, sheet number) — helps sorting scanned-looking thumbnails
function bigText(items) {
  const seen = new Set(); let out = '';
  for (const t of [...items].sort((a, b) => b.z - a.z)) {
    const s = t.s.slice(0, 60);
    if (s.length < 2 || seen.has(s)) continue;
    seen.add(s);
    if (out.length + s.length > 500) break;
    out += (out ? ' | ' : '') + s;
  }
  return out;
}
async function imageCanvas(f, px) {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const sc = Math.min(1, px / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * sc); canvas.height = Math.round(img.naturalHeight * sc);
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return {canvas, W:canvas.width, H:canvas.height};
  } finally { URL.revokeObjectURL(url); }
}
function scaledJpeg(canvas, px, q) {
  const k = Math.min(1, px / Math.max(canvas.width, canvas.height));
  if (k === 1) return {href:canvas.toDataURL('image/jpeg', q), W:canvas.width, H:canvas.height};
  const c = document.createElement('canvas'); c.width = Math.round(canvas.width * k); c.height = Math.round(canvas.height * k);
  c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
  return {href:c.toDataURL('image/jpeg', q), W:c.width, H:c.height};
}
const sheetName = p => p.sheet_number ? `${p.sheet_number} (p.${p.page})` : `page ${p.page}`;
const normLevel = l => {
  const s = String(l || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!s || /^(1st|first|main|ground)(floor|level)?(plan)?$/.test(s)) return 'main';
  if (/^(2nd|second|upper)(floor|level)?(plan)?$/.test(s)) return '2';
  return s;
};

async function runDocument(f, reader) {
  const run = ++S.run, live = () => run === S.run;
  const isPdf = /pdf/i.test(f.type) || /\.pdf$/i.test(f.name);
  const title = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 60) || 'Uploaded plan';
  let pdf = null, total = 1, keepPdf = false;
  try {
    toast('Opening ' + f.name);
    if (isPdf) { const lib = await loadPdfJs(); pdf = await lib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise; total = pdf.numPages; }
  } catch (e) { toast('That file couldn’t be opened. Try another PDF or image.'); return; }
  if (!live()) return;
  resetTakeoff({kind:'upload', W:1000, H:720, href:'', title, file:`${f.name} · ${total} page${total > 1 ? 's' : ''}`, sheets:[]});
  showProc('Reading drawing set', DSTEPS);
  setStep(0, 'done'); log(`${esc(f.name)} · <b>${total}</b> page${total > 1 ? 's' : ''}`);
  const ctl = new AbortController(); S.ctl = ctl;
  $('#procAct').innerHTML = '<button class="btn-ghost sm" id="stopRun">Stop</button>';
  $('#stopRun').onclick = () => ctl.abort();
  const t0 = performance.now();
  const tick = () => { const s = Math.round((performance.now() - t0) / 1000); $('#procTitle').textContent = `Reading drawing set · ${Math.floor(s / 60)}:${pad2(s % 60)}`; };
  const clock = setInterval(() => live() ? tick() : clearInterval(clock), 1000);
  let scanOn = !REDUCED;
  const scanStep = t => { if (!scanOn || !live()) return; const p = ((t - t0) / 2600) % 2; scanTo((p < 1 ? p : 2 - p) * V.W); requestAnimationFrame(scanStep); };
  if (scanOn) requestAnimationFrame(scanStep);
  const stop = () => { scanOn = false; clearInterval(clock); $('#vscan').style.display = 'none'; };
  try {
    const out = await readSet({f, pdf, total, reader, signal:ctl.signal, live});
    stop();
    if (!live() || !out) return;
    const {items, stats, plans, scheds} = out;
    if (!items.length) { showError('No exterior windows were found in this set. Check that it includes a floor plan or a window schedule.', f); return; }
    setStep(4, 'done'); setStep(5, 'active');
    if (stats.tagged) log(`Matched <b>${stats.matched}</b> of ${stats.tagged} tagged openings to schedule rows`);
    if (stats.doors) log(`Left out <b>${stats.doors}</b> doors (windows-only takeoff)`);
    if (stats.added) log(`<b>${stats.added}</b> units listed in schedules but not found on the plans, flagged`);
    log(`Takeoff: <b>${items.length}</b> windows`);
    $('#wFile').textContent = S.src.file = `${f.name} · ${total} page${total > 1 ? 's' : ''} · ` + (out.schedOnly
      ? `read ${scheds} schedule sheet${scheds === 1 ? '' : 's'} first` + (out.background ? '' : ' · floor plans not needed')
      : `read ${plans} plan${plans === 1 ? '' : 's'}${scheds ? `, ${scheds} schedule sheet${scheds === 1 ? '' : 's'}` : ''}`);
    S.items = items.sort((a, b) => a.mark.localeCompare(b.mark, undefined, {numeric:true}));
    if (S.src.sheets.length) showSheet(S.src.sheets[0].page);
    renderStats();
    await wait(REDUCED ? 0 : 500); if (!live()) return;
    setStep(5, 'done');
    Object.assign(NUMS, counts(), {src:`From your plans · ${title}`});
    S.bg = out.background ? {state:'running', text:'Locating windows on the floor plans…'} : null;
    enterReview();
    if (out.background) {
      keepPdf = true;
      runBackground(out.background, live, ctl.signal).finally(() => { try { pdf.destroy(); } catch (e) {} });
    }
  } catch (e) {
    stop();
    if (!live()) return;
    if (e && e.code === 'cancelled') { goStage('upload'); return; }
    showError((e && e.message) || 'The reading was interrupted. Try again.', f);
  } finally {
    if (pdf && !keepPdf) try { pdf.destroy(); } catch (e) {}
  }
}
// The background mapping: a status line in the review while it runs, then the plan locations are filled in.
async function runBackground(job, live, signal) {
  S.bgReading = new Set(); S.bgFound = new Set(); S.bgPage = null;
  const ui = {
    say: text => { if (live()) { S.bg = {state:'running', text}; renderBgNote(); } },
    reading: page => { if (live()) { S.bgReading.add(page); renderStrip(); } },
    read: page => { if (live()) { S.bgReading.delete(page); renderStrip(); } },
    sheetReady: page => { if (live()) { S.bgPage = S.bgPage || page; idleSheet(); } },     // show the page being scanned
  };
  renderStrip(true); bgBeam(live);
  try {
    const r = await job(ui);
    if (!live()) return;
    for (const p of r.pages) S.bgFound.add(p);
    renderStrip(); setTimeout(() => live() && hideStrip(), REDUCED ? 600 : 1500);
    const tot = S.items.filter(i => i.fromSched).length;
    const skipped = r.untagged + r.unknown;
    S.bg = {state:'done', text:`<b>${r.placed} of ${tot}</b> windows located on ${esc([...r.sheets].join(', ') || 'the floor plans')} · select a product to see them on the plan` +
      (skipped ? `. ${skipped} window${skipped > 1 ? 's' : ''} on the plan without a schedule mark ${skipped > 1 ? 'were' : 'was'} not added.` : '')};
    $('#wFile').textContent = S.src.file = S.src.file.replace(/ first$/, '') + ` · ${r.placed} located on the plan`;
    // settle on the house plan: the sheet with the most windows placed (unless the user is looking at something)
    const by = new Map(); S.items.filter(i => i.located).forEach(i => by.set(i.sheet, (by.get(i.sheet) || 0) + 1));
    const plan = [...by].sort((a, b) => b[1] - a[1])[0]?.[0];
    S.bgPage = null;
    if (plan && !S.sel && !S.selGroup && !S.open) { showSheet(plan); fitView(); }
    renderStats(); drawDets(); renderSheetTabs(); renderList(); renderFoot();
    const it = S.sel && byId(S.sel), sum = $('#detail .d-sum');
    if (it && sum && !S.preview) sum.outerHTML = plainSummary(it);
    toast(`${r.placed} of ${tot} windows located on the floor plan`);
  } catch (e) {
    if (!live() || signal.aborted || (e && e.code === 'cancelled')) return;
    S.bg = {state:'failed', text:`Couldn’t read the floor plans (${esc((e && e.message) || 'error')}). The takeoff from the schedule is unchanged.`};
    S.bgPage = null; renderBgNote(); hideStrip();
  }
}
// The page strip over the viewer while the plans are mapped: every page of the set, checked one after another,
// the plan being read with a scan line, a check when its windows are placed.
const KIND_SHORT = {floor_plan:'plan', auto:'plan', window_schedule:'schedule', window_door_schedule:'schedule', window_types:'types',
  door_schedule:'doors', elevation:'elevation', other_plan:'other', other:'other'};
function renderStrip(sweep) {
  const T = $('#vstrip'), th = (S.src && S.src.thumbs) || [];
  if (!th.length || !S.bg || S.bg.state === 'failed') { T.hidden = true; T.innerHTML = ''; return; }
  if (!T.childElementCount) {
    T.innerHTML = th.map((t, i) => { const k = (S.src.kinds || {})[t.page] || {}, name = k.label || `p.${t.page}`;
      return `<span class="vt" data-p="${t.page}" style="--i:${i}" title="${esc(name)} · ${KIND_SHORT[k.kind] || 'page'}"><img src="${t.href}" alt=""><i class="vt-scan"></i><em>${esc(name)}</em></span>`; }).join('');
    T.hidden = false; T.classList.remove('out');
    if (sweep) { T.classList.remove('sweep'); void T.offsetWidth; T.classList.add('sweep'); }
  }
  for (const e of T.children) { const p = +e.dataset.p; e.classList.toggle('reading', S.bgReading.has(p)); e.classList.toggle('found', S.bgFound.has(p)); }
  const r = T.querySelector('.reading, .found');
  if (r) T.scrollTo({left:r.offsetLeft - T.clientWidth / 2 + r.offsetWidth / 2, behavior:REDUCED ? 'auto' : 'smooth'});
}
function hideStrip() {
  const T = $('#vstrip'); if (T.hidden) return;
  T.classList.add('out'); setTimeout(() => { if (T.classList.contains('out')) { T.hidden = true; T.innerHTML = ''; T.classList.remove('out', 'sweep'); } }, 450);
}
// the scan beam over the page being read, while nothing is selected
function bgBeam(live) {
  const t0 = performance.now();
  const step = () => {
    if (!live() || !S.bg || S.bg.state !== 'running') { $('#vscan').style.display = 'none'; return; }
    if (!REDUCED && S.stage === 'review' && S.bgPage && S.sheet === S.bgPage && !S.sel && !S.selGroup && !S.open) {
      const p = ((performance.now() - t0) / 2600) % 2; scanTo((p < 1 ? p : 2 - p) * V.W);
    } else $('#vscan').style.display = 'none';
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
// Place each scheduled unit on the floor plans: plan tag → schedule mark → the next unplaced unit of that mark.
// Nothing is added or removed: the schedule's counts stand; differences are noted on the product.
function mapPlans(planReads, defs) {
  const r = {placed:0, untagged:0, unknown:0, nobox:0, sheets:new Set(), pages:new Set()};
  const free = new Map(), seen = new Map();
  for (const it of S.items) if (it.fromSched && !it.located && it.defId) { if (!free.has(it.defId)) free.set(it.defId, []); free.get(it.defId).push(it); }
  for (const pr of planReads) for (const o of pr.openings) {
    const type0 = TYPES.includes(o.type) ? o.type : 'Unknown';
    if (o.category === 'door' || DOOR_TYPES.has(type0)) continue;          // windows only
    const tag = o.tag ? String(o.tag).trim().slice(0, 12) : '';
    if (!tag) { r.untagged++; continue; }
    const k = normKey(tag), a = altKey(k);
    const cands = [...defs.values()].filter(d => d.cat === 'window' && (d.key === k || altKey(d.key) === a));
    if (!cands.length) { r.unknown++; continue; }
    const box = toBox(o.box, pr.W, pr.H);
    if (!box) { r.nobox++; continue; }
    const qty = clamp(Math.round(Number(o.quantity) || 1), 1, 20);
    for (let q = 0; q < qty; q++) {
      const d = cands.find(c => (free.get(c.id) || []).length) || cands[0];
      seen.set(d.id, (seen.get(d.id) || 0) + 1);
      const it = (free.get(d.id) || []).shift();
      if (!it) continue;
      Object.assign(it, {box, sheet:pr.page, located:true});
      if (!it.room && o.room) it.room = String(o.room).slice(0, 40);
      it.srcs = [...(it.srcs || []), `Tag ${tag} on ${pr.name}`];
      r.placed++; r.sheets.add(pr.label || pr.name); r.pages.add(pr.page);
    }
  }
  const addNote = (it, t) => { if (!(it.note || '').includes(t)) it.note = `${it.note || ''} ${t}`.trim(); };
  for (const d of defs.values()) {
    const units = S.items.filter(i => i.defId === d.id && i.fromSched);
    if (!units.length) continue;
    const n = seen.get(d.id) || 0;
    if (n > units.length) units.forEach(it => { addNote(it, `The floor plans show ${n} with tag ${d.raw}; the schedule lists ${units.length}.`); it.conf = Math.min(it.conf, .75); });
    else units.filter(it => !it.located).forEach(it => addNote(it, 'Not found on the floor plans — shown at its schedule row.'));
  }
  return r;
}

async function readSet({f, pdf, total, reader, signal, live}) {
  const cancelled = () => Object.assign(new Error('cancelled'), {code:'cancelled'});
  const isCancel = e => signal.aborted || (e && e.code === 'cancelled');
  const lim = limiter(LIMITS.inFlight);
  const info = new Map();                     // page → classification

  // ---------- 1. sort every page ----------
  setStep(1, 'active');
  if (pdf && total > 1) {
    const jobs = [], errs = [];
    const classify = async b => {
      for (let a = 0; ; a++) {
        try { return await reader.run({task:'classify', filename:f.name, total, pages:b}, {signal}); }
        catch (e) {
          if (isCancel(e)) throw e;
          if (a >= 1) { log(`Couldn’t sort pages ${b[0].page}–${b[b.length - 1].page}: ${esc(e.message)}`); return null; }
        }
      }
    };
    let batch = [], sorted = 0;
    for (let n = 1; n <= total; n++) {
      if (signal.aborted) throw cancelled();
      const page = await pdf.getPage(n);
      const th = await renderRegion(page, 1000, null);
      const text = bigText(await regionText(page, th));
      const image = th.canvas.toDataURL('image/jpeg', .72);
      (S.src.thumbs = S.src.thumbs || []).push({page:n, href:scaledJpeg(th.canvas, 200, .6).href});   // for the page strip
      page.cleanup();
      if (!live()) return null;
      setupViewer({kind:'upload', W:th.W, H:th.H, href:image});      // pages flip by while they're sorted
      logLive('sort', `Sorting pages · <b>${n}</b> of ${total} scanned${sorted ? ` · ${sorted} sorted` : ''}`);
      batch.push({page:n, image, text});
      if (batch.length === LIMITS.batch || n === total) {
        const b = batch; batch = [];
        jobs.push(lim(() => classify(b)).then(res => {
          for (const p of (res && res.pages) || []) if (b.some(x => x.page === p.page)) info.set(p.page, p);
          sorted += b.length;
          if (live()) logLive('sort', `Sorting pages · <b>${total}</b> of ${total} scanned · ${sorted} sorted`);
        }).catch(e => errs.push(e)));
      }
    }
    await Promise.all(jobs);
    if (errs.some(isCancel)) throw cancelled();
    if (!info.size) throw Object.assign(new Error(errs[0]?.message || 'The pages couldn’t be sorted. Try again.'), {code:'sort_failed'});
    S.src.kinds = Object.fromEntries([...info].map(([n, p]) => [n, {kind:p.kind, label:p.sheet_number || ''}]));
    const tally = {};
    for (const p of info.values()) tally[p.kind] = (tally[p.kind] || 0) + 1;
    log('Sheets: ' + ['floor_plan','window_door_schedule','window_schedule','door_schedule','window_types','elevation']
      .filter(k => tally[k]).map(k => `<b>${tally[k]}</b> ${KIND_NAME[k]}${tally[k] > 1 && !/schedule|legend/.test(k) ? 's' : ''}`).join(', ')
      + `, ${total - (tally.floor_plan || 0) - (tally.elevation || 0) - [...SCHED_KINDS].reduce((s, k) => s + (tally[k] || 0), 0)} other`);
  } else {
    info.set(1, {page:1, kind:'auto', sheet_number:null, title:null, level:null, opening_tags:'many', schedule_regions:[]});
  }
  setStep(1, 'done');

  // ---------- 2. choose and read sheets ----------
  const all = [...info.values()].sort((a, b) => a.page - b.page);
  const floorPlans = all.filter(p => p.kind === 'floor_plan' || p.kind === 'auto');
  // Sets that tag openings with symbols put each tag on exactly one noted plan, so every tagged plan is read
  // (a level split over "continued" sheets stays whole) and the dimensioned copies are left out.
  // Without symbols, one plan per level: the one with the most callouts.
  const tagged = floorPlans.filter(p => (p.tag_style === 'symbols' || p.tag_style === 'both') && p.opening_tags !== 'none');
  let plans;
  if (tagged.length) plans = tagged;
  else {
    const byLevel = new Map();
    for (const p of floorPlans) {
      const k = normLevel(p.level), cur = byLevel.get(k);
      if (!cur || (TAG_RANK[p.opening_tags] ?? 0) > (TAG_RANK[cur.opening_tags] ?? 0)) byLevel.set(k, p);
    }
    plans = [...byLevel.values()].sort((a, b) => a.page - b.page);
  }
  plans = plans.slice(0, LIMITS.plans);
  const planPages = new Set(plans.map(p => p.page));
  // schedule tables are read as high-resolution crops, also when they sit on a plan sheet
  const schedPages = all.filter(p => (SCHED_KINDS.has(p.kind) && p.kind !== 'door_schedule') || (p.schedule_regions || []).length).slice(0, LIMITS.schedules);
  const elevations = all.filter(p => p.kind === 'elevation').slice(0, LIMITS.elevations);
  if (!plans.length && !schedPages.length) {
    // nothing labelled: fall back to the sheets with the most opening tags
    plans = all.filter(p => p.kind !== 'other' && (TAG_RANK[p.opening_tags] ?? 0) > 0).slice(0, 2);
    if (!plans.length) throw Object.assign(new Error('No floor plan or window schedule was found in this set. Upload the architectural drawings.'), {code:'no_sheets'});
    log('No sheet looked like a floor plan; reading the sheets with the most opening tags');
  }
  for (const p of plans) log(`Floor plan: <b>${esc(sheetName(p))}</b>${p.title ? ` ${esc(p.title.toLowerCase())}` : ''}`);
  // every page was sorted above, so this is every page that carries a window schedule — not just the first
  if (schedPages.length) log(`Window schedule${schedPages.length > 1 ? 's' : ''} found on <b>${schedPages.length}</b> page${schedPages.length > 1 ? 's' : ''}: ` +
    schedPages.map(p => `${esc(sheetName(p))}${p.title ? ` ${esc(p.title.toLowerCase())}` : ''}`).join(', '));
  const skipped = floorPlans.filter(p => !planPages.has(p.page)).length;
  if (skipped) log(`${skipped} more floor plan${skipped > 1 ? 's' : ''} skipped (${tagged.length ? 'no opening tags, e.g. dimensioned plans' : 'same level, fewer opening notes'})`);

  const planReads = [], defReads = [], errors = [];
  let plansLeft = plans.length, schedLeft = schedPages.length;
  setStep(2, schedLeft ? 'active' : 'done');
  const refresh = () => {                     // show what's known so far on the plan
    if (!live()) return;
    S.items = mergeSet(planReads, defReads).items; drawDets(); renderStats(); renderSheetTabs();
  };
  const readOne = async (p, kind, region, quiet) => {     // quiet: a background read, the viewer isn't moved
    if (signal.aborted) throw cancelled();
    let canvas, W, H, text = [];
    if (pdf) {
      const page = await pdf.getPage(p.page);
      const r = await renderRegion(page, region ? 2400 : 4000, region);
      ({canvas, W, H} = r);
      text = await regionText(page, r);
      page.cleanup();
    } else ({canvas, W, H} = await imageCanvas(f, 4000));
    let sheet = null;
    if (kind === 'floor_plan' || kind === 'auto') {
      // keep a lighter copy of the sheet for the review viewer; boxes are placed on it (a schedule on this
      // sheet may already have put it there)
      sheet = S.src.sheets.find(x => x.page === p.page);
      if (!sheet) {
        const v = scaledJpeg(canvas, 3000, .85);
        sheet = {page:p.page, label:p.sheet_number || `p.${p.page}`, name:sheetName(p), title:p.title || '', W:v.W, H:v.H, href:v.href};
        S.src.sheets.push(sheet); S.src.sheets.sort((a, b) => a.page - b.page);
      }
      if (live()) { if (!quiet) showSheet(p.page); else { renderSheetTabs(); if (typeof quiet === 'function') quiet(p.page); } }
    }
    const image = await blobToDataURL(await new Promise(ok => canvas.toBlob(ok, 'image/png')));
    canvas.width = canvas.height = 0;
    const body = {task:'page', filename:f.name, page:p.page, total, kind, crop:!!region, level:p.level || '',
      title:[p.sheet_number, p.title].filter(Boolean).join(' '), width:W, height:H, image, textLayer:textLayer(text, 50000)};
    for (let a = 0; ; a++) {
      try { return {res:await reader.run(body, {signal}), sheet}; }
      catch (e) { if (isCancel(e) || a >= 1) throw e; }
    }
  };
  // a viewer copy of a whole sheet (a schedule page, when the takeoff comes from its schedule alone)
  const addSheet = async p => {
    if (S.src.sheets.some(s => s.page === p.page)) return;
    let canvas;
    if (pdf) { const page = await pdf.getPage(p.page); ({canvas} = await renderRegion(page, 3000, null)); page.cleanup(); }
    else ({canvas} = await imageCanvas(f, 3000));
    const v = scaledJpeg(canvas, 3000, .85); canvas.width = canvas.height = 0;
    S.src.sheets.push({page:p.page, label:p.sheet_number || `p.${p.page}`, name:sheetName(p), title:p.title || '', W:v.W, H:v.H, href:v.href});
    S.src.sheets.sort((a, b) => a.page - b.page);
  };
  const readPlans = () => plans.map(p => lim(async () => {
    try {
      const {res, sheet} = await readOne(p, p.kind === 'auto' ? 'auto' : 'floor_plan');
      planReads.push({page:p.page, name:sheetName(p), W:sheet.W, H:sheet.H, openings:res.openings || []});
      if ((res.definitions || []).length) defReads.push({page:p.page, name:sheetName(p), from:'plan', defs:res.definitions});
      log(`${esc(sheetName(p))}: <b>${(res.openings || []).length}</b> openings${(res.definitions || []).length ? `, ${res.definitions.length} schedule rows` : ''}`);
      refresh();
    } catch (e) { if (isCancel(e)) throw e; errors.push(e); log(`Couldn’t read ${esc(sheetName(p))}: ${esc(e.message)}`); }
    finally { if (!--plansLeft) setStep(3, 'done'); }
  }));
  // A. the window schedule first
  const jobs = [];
  for (const p of schedPages) {
    const regions = (p.schedule_regions || []).filter(b => Array.isArray(b) && b.length === 4 && b[2] - b[0] > 20 && b[3] - b[1] > 20)
      .map(([x0, y0, x1, y1]) => [x0 - 25, y0 - 25, x1 + 25, y1 + 25]).slice(0, LIMITS.cropsPerPage);
    const crops = regions.length ? regions : [null];
    let left = crops.length;
    for (const region of crops) jobs.push(lim(async () => {
      try {
        const {res} = await readOne(p, p.kind === 'window_types' ? 'window_types' : 'schedule', region);
        const defs = res.definitions || [];
        defReads.push({page:p.page, name:sheetName(p), label:p.sheet_number || `p.${p.page}`, from:p.kind === 'window_types' ? 'window_types' : 'schedule', defs, region});
        const nw = defs.filter(d => d.applies_to === 'window').length;
        log(`${esc(sheetName(p))}: <b>${nw}</b> window schedule rows`);
        refresh();
      } catch (e) { if (isCancel(e)) throw e; errors.push(e); log(`Couldn’t read the schedule on ${esc(sheetName(p))}: ${esc(e.message)}`); }
      finally { if (!--left && !--schedLeft) setStep(2, 'done'); }
    }));
  }
  const settled = await Promise.allSettled(jobs);
  if (signal.aborted || settled.some(s => s.status === 'rejected' && isCancel(s.reason))) throw cancelled();
  setStep(2, 'done');
  if (defReads.length) {
    const dm = buildDefs(defReads), tables = dm.tables.filter(t => t.rows);
    const used = [...dm.values()].filter(d => d.exterior !== false && d.quantity !== 0);      // as scheduleEnough counts them
    const units = used.reduce((n, d) => n + (Number.isInteger(d.quantity) && d.quantity > 0 ? d.quantity : 0), 0);
    log(`${tables.length} window schedule table${tables.length === 1 ? '' : 's'} · <b>${used.length}</b> marks` + (units ? ` · <b>${units}</b> windows counted` : ''));
    for (const t of tables) if (t.copyOf) log(`${esc(t.name)} repeats ${esc(t.copyOf)} · counted once`);
      else if (t.separate) log(`${esc(t.name)} is a separate schedule that reuses marks with other sizes · kept as its own products (marks ${esc(t.label)}/…)`);
  }
  // B. the floor plans, only if the schedule doesn't already give every window's size and count
  const enough = scheduleEnough(defReads);
  if (enough.ok) {
    const rowPages = new Set([...buildDefs(defReads).values()].map(d => d.page));   // the sheet each kept row came from
    const used = schedPages.filter(p => rowPages.has(p.page));
    log(`The window schedule${used.length > 1 ? 's list' : ' lists'} all <b>${enough.units}</b> windows (${enough.rows} marks) with sizes and counts · the takeoff is ready` +
        (plans.length ? `; the floor plan${plans.length > 1 ? 's' : ''} will be mapped in the background` : ''));
    setStep(3, 'done');
    for (const p of used) { if (signal.aborted) throw cancelled(); await addSheet(p); }
    if (!live()) return null;
    if (used.length) showSheet(used[0].page);
    // after the review opens: read the floor plans and place each scheduled unit on them (counts stay the schedule's)
    const background = !plans.length || !pdf ? null : async ui => {
      const reads = [];
      const res = await Promise.allSettled(plans.map(p => lim(async () => {
        ui.say(`Finding the floor plan… reading ${sheetName(p)}`); ui.reading(p.page);
        try {
          const {res, sheet} = await readOne(p, 'floor_plan', null, ui.sheetReady);
          reads.push({page:p.page, name:sheetName(p), label:sheet.label, W:sheet.W, H:sheet.H, openings:res.openings || []});
        } finally { ui.read(p.page); }
      })));
      if (signal.aborted || res.some(r => r.status === 'rejected' && isCancel(r.reason))) throw cancelled();
      if (!reads.length) throw res.find(r => r.status === 'rejected')?.reason || new Error('No floor plan could be read.');
      return mapPlans(reads.sort((a, b) => a.page - b.page), buildDefs(defReads));
    };
    return {...mergeSet([], defReads), plans:0, scheds:used.length, schedOnly:true, background, planCount:plans.length};
  }
  if (schedPages.length && plans.length) log(`${enough.why} · reading the floor plans`);
  setStep(3, plans.length ? 'active' : 'done');
  const settledB = await Promise.allSettled(readPlans());
  if (signal.aborted || settledB.some(s => s.status === 'rejected' && isCancel(s.reason))) throw cancelled();
  if (!planReads.length && !defReads.length) throw errors[0] || new Error('No sheet could be read. Try again.');
  setStep(3, 'done');

  // ---------- 3. join, and look at elevations if tags are still unexplained ----------
  setStep(4, 'active');
  let merged = mergeSet(planReads, defReads);
  const st = merged.stats;   // a stray keynote read as a tag shouldn't trigger this; a missing schedule should
  if (elevations.length && st.unresolved && (!defReads.length || st.unresolved >= Math.max(3, st.tagged * .2))) {
    log(`${merged.stats.unresolved} tagged openings have no schedule entry · checking ${elevations.length} elevation sheet${elevations.length > 1 ? 's' : ''}`);
    const ej = elevations.map(p => lim(async () => {
      try {
        const {res} = await readOne(p, 'elevation');
        const defs = res.definitions || [];
        if (defs.length) defReads.push({page:p.page, name:sheetName(p), from:'elevation', defs});
        log(`${esc(sheetName(p))}: <b>${defs.length}</b> tag notes`);
      } catch (e) { if (isCancel(e)) throw e; log(`Couldn’t read ${esc(sheetName(p))}: ${esc(e.message)}`); }
    }));
    const es = await Promise.allSettled(ej);
    if (signal.aborted || es.some(s => s.status === 'rejected' && isCancel(s.reason))) throw cancelled();
    merged = mergeSet(planReads, defReads);
  }
  return {...merged, plans:planReads.length, scheds:schedPages.length};
}

// ---------- the join ----------
const normKey = s => { let k = String(s ?? '').toUpperCase().replace(/[\s.\-#_]+/g, ''); if (/^0*\d+$/.test(k)) k = String(parseInt(k, 10)); return k; };
const altKey = k => k.replace(/^(WIN|WDW|DR|W|D)(?=\d)/, '').replace(/^0+(?=\d)/, '');
const inches = v => { const n = Number(v); return Number.isFinite(n) && n > 0 && n < 400 ? Math.round(n * 10) / 10 : null; };
function toBox(b, W, H, pad = .006) {
  if (!Array.isArray(b) || b.length !== 4 || !b.every(v => Number.isFinite(Number(v)))) return null;
  let [x0, y0, x1, y1] = b.map(Number);
  if (x1 < x0) [x0, x1] = [x1, x0];
  if (y1 < y0) [y0, y1] = [y1, y0];
  x0 = clamp(x0, 0, 1000) / 1000 * W; x1 = clamp(x1, 0, 1000) / 1000 * W;
  y0 = clamp(y0, 0, 1000) / 1000 * H; y1 = clamp(y1, 0, 1000) / 1000 * H;
  const m = Math.max(W, H) * pad;
  return [x0 - m, y0 - m, Math.max(x1 - x0, 4) + 2*m, Math.max(y1 - y0, 4) + 2*m];
}
// Does the schedule alone make the takeoff? Every window row needs a size and a count.
function scheduleEnough(defReads) {
  if (!defReads.length) return {ok:false, why:'No window schedule was read'};
  const rows = [...buildDefs(defReads).values()].filter(d => d.exterior !== false && d.quantity !== 0);
  if (!rows.length) return {ok:false, why:'The schedule has no window rows'};
  const noQty = rows.filter(d => !(Number.isInteger(d.quantity) && d.quantity > 0)).length;
  const noSize = rows.filter(d => !d.w || !d.h).length;
  if (noQty) return {ok:false, why:noQty === rows.length ? 'The window schedule has no quantity column' : `${noQty} schedule row${noQty > 1 ? 's have' : ' has'} no count`};
  if (noSize) return {ok:false, why:`${noSize} schedule row${noSize > 1 ? 's have' : ' has'} no size`};
  return {ok:true, rows:rows.length, units:rows.reduce((s, d) => s + d.quantity, 0)};
}
// a schedule row's box, read on a crop, on the 0–1000 scale of the whole page
function rowBoxOnPage(b, region) {
  if (!Array.isArray(b) || b.length !== 4 || !b.every(v => Number.isFinite(Number(v)))) return null;
  if (!region) return b.map(Number);
  const [rx0, ry0, rx1, ry1] = region.map(v => clamp(v, 0, 1000));
  const [x0, y0, x1, y1] = b.map(v => clamp(Number(v), 0, 1000) / 1000);
  return [rx0 + x0 * (rx1 - rx0), ry0 + y0 * (ry1 - ry0), rx0 + x1 * (rx1 - rx0), ry0 + y1 * (ry1 - ry0)];
}
// Several schedule tables (pages, crops): a copy of a table already read (most rows the same mark and size)
// merges into it; a table that reuses marks with other sizes is a separate schedule (another building, a
// casita) and keeps its own products; new marks simply continue the list.
function buildDefs(defReads) {
  const m = new Map(); m.tables = [];
  for (const r of defReads) {
    const defs = r.defs || [], nWin = defs.filter(d => d.applies_to !== 'door').length;
    const rows = defs.filter(d => d.applies_to !== 'door' && !DOOR_TYPES.has(d.type) && normKey(d.key));
    const table = {page:r.page, name:r.name, label:r.label || `p.${r.page}`, rows:rows.length, copyOf:null, separate:false};
    if (r.from !== 'elevation' && rows.length >= 2) {
      let shared = 0, same = 0; const from = new Map();
      for (const d of rows) {
        const cur = m.get(`window:${normKey(d.key)}`);
        if (!cur || cur.page === r.page) continue;
        shared++; from.set(cur.name, (from.get(cur.name) || 0) + 1);
        const w = inches(d.width_in), h = inches(d.height_in);
        if (!w || !cur.w || (Math.abs(w - cur.w) <= 1 && Math.abs((h || 0) - (cur.h || 0)) <= 1)) same++;
      }
      if (shared && same / shared >= .7 && shared >= rows.length * .7) table.copyOf = [...from].sort((a, b) => b[1] - a[1])[0][0];
      else if (shared >= 2 && same / shared < .7) table.separate = true;
    }
    m.tables.push(table);
    for (const d of defs) {
      if (d.applies_to === 'door' || DOOR_TYPES.has(d.type)) continue;     // windows-only takeoff
      const key = normKey(d.key);
      if (!key) continue;
      const cat = d.applies_to === 'door' ? 'door' : 'window', id = table.separate ? `${cat}:${key}@p${r.page}` : `${cat}:${key}`;
      // a lone "window" row in a door table (or the reverse) is usually a misread: it ranks below the proper table
      const share = (cat === 'window' ? nWin : defs.length - nWin) / defs.length;
      const odd = defs.length >= 5 && share < .2;
      const raw = String(d.key).trim().slice(0, 12);
      const nd = {...d, key, raw:table.separate ? `${table.label}/${raw}` : raw, separate:table.separate, cat, id, page:r.page, name:r.name, from:r.from, odd,
        rank:(DEF_RANK[r.from] ?? 0) - (odd ? 2.5 : 0), rowBox:rowBoxOnPage(d.row_box, r.region),
        w:inches(d.width_in), h:inches(d.height_in), type:TYPES.includes(d.type) ? d.type : 'Unknown', conflicts:[]};
      const cur = m.get(id);
      if (!cur) { m.set(id, nd); continue; }
      // the same mark read twice (another sheet, another crop): keep the better source, fill its gaps, remember disagreements
      const [keep, other] = nd.rank > cur.rank ? [nd, cur] : [cur, nd];
      if (!other.odd) {
        if (keep.w && other.w && (Math.abs(keep.w - other.w) > 1 || Math.abs((keep.h || 0) - (other.h || 0)) > 1))
          keep.conflicts.push(`${other.name === keep.name ? `another read of ${other.name}` : other.name} says ${other.w} × ${other.h ?? '?'} in`);
        for (const f of ['w', 'h', 'quantity', 'tempered_glass', 'egress', 'exterior', 'size_text']) if (keep[f] == null && other[f] != null) keep[f] = other[f];
        if (!keep.rowBox && other.rowBox && other.page === keep.page) keep.rowBox = other.rowBox;
        if (keep.type === 'Unknown') keep.type = other.type;
        keep.conflicts.push(...other.conflicts);
      }
      m.set(id, keep);
    }
  }
  return m;
}
function findDef(defs, tag, cat) {
  const k = normKey(tag);
  if (!k) return null;
  const other = cat === 'door' ? 'window' : 'door';
  const alt = c => { const a = altKey(k); for (const d of defs.values()) if (d.cat === c && altKey(d.key) === a) return d; return null; };
  return defs.get(`${cat}:${k}`) || alt(cat) || defs.get(`${other}:${k}`) || alt(other);
}
function mergeSet(planReads, defReads) {
  const defs = buildDefs(defReads);
  const stats = {tagged:0, matched:0, unresolved:0, interior:0, added:0, doors:0};
  const items = [];
  const defLine = d => `${DEF_FROM[d.from]} ${d.name}`;
  for (const r of planReads) for (const o of r.openings) {
    const tag = o.tag ? String(o.tag).trim().slice(0, 12) : '';
    const type0 = TYPES.includes(o.type) ? o.type : 'Unknown';
    const cat0 = o.category === 'door' || DOOR_TYPES.has(type0) ? 'door' : 'window';
    if (cat0 === 'door') { stats.doors++; continue; }                     // windows-only takeoff
    const d = tag ? findDef(defs, tag, cat0) : null;
    if (d && d.exterior === false) { stats.interior++; continue; }
    const ownW = inches(o.width_in), ownH = inches(o.height_in);
    let w = ownW, h = ownH, type = type0, conf = clamp(Number(o.confidence) || .5, 0, 1);
    const notes = [], srcs = [`${tag ? `Tag ${tag}` : 'Drawn'} on ${r.name}`];
    if (o.needs_review === true) { conf = Math.min(conf, .8); if (o.note) notes.push(String(o.note).slice(0, 160)); }
    if (tag) stats.tagged++;
    if (d) {
      stats.matched++;
      srcs.push(defLine(d));
      if (d.w && d.h) {
        if (ownW && ownH && (Math.abs(ownW - d.w) > 1 || Math.abs(ownH - d.h) > 1)) { notes.push(`The plan note says ${ownW} × ${ownH} in; ${d.name} says ${d.w} × ${d.h} in.`); conf = Math.min(conf, .7); }
        w = d.w; h = d.h;
      }
      if (d.type !== 'Unknown') type = d.type;
      conf = Math.min(conf, clamp(Number(d.confidence) || .5, 0, 1));
      if (d.conflicts.length) { notes.push(`Sheets disagree: ${d.conflicts.join('; ')}.`); conf = Math.min(conf, .7); }
    } else if (tag && (w == null || h == null)) {
      stats.unresolved++;
      notes.push(defs.size ? `Tag ${tag} isn’t in any schedule found in this set.` : `No schedule was found in this set for tag ${tag}.`);
    }
    if (DOOR_TYPES.has(type)) { stats.doors++; continue; }
    const cat = 'window';
    const base = {cat, type, w, h, room:String(o.room || '').slice(0, 40), conf, note:notes.join(' '), box:toBox(o.box, r.W, r.H),
      raw:String(o.raw_callout || (d ? `${tag} · ${d.size_text || ''}` : '')).replace(/ · $/, '').slice(0, 40),
      temp:o.tempered_glass === true || (d && d.tempered_glass === true), egress:o.egress === true || (d && d.egress === true),
      sheet:r.page, srcs, tag, defId:d ? d.id : null};
    const qty = clamp(Math.round(Number(o.quantity) || 1), 1, 20);
    for (let k = 0; k < qty; k++) items.push({...base, srcs:[...srcs], id:uid++});
  }
  // quantities: the schedule's count against what was found on the plans
  for (const d of defs.values()) {
    if (d.exterior === false) continue;
    const found = items.filter(i => i.defId === d.id);
    const c = found.length;
    if (d.quantity === 0) {          // a schedule row kept with quantity 0: this type isn't used
      for (const it of found) { it.note = `${it.note} ${d.name} lists 0 of these.`.trim(); it.conf = Math.min(it.conf, .6); }
      continue;
    }
    const q = Number.isInteger(d.quantity) && d.quantity > 0 ? d.quantity : null;
    let missing = 0, note = d.separate ? `From a second window schedule on ${d.name} that reuses mark ${d.key} with another size — check which building it belongs to.` : '';
    if (!planReads.length) { missing = q || 1; }
    else if (q && c < q) { missing = q - c; note = `${d.name} lists ${q}; ${c} found on the plans. Locate the rest, or remove.`; }
    else if (!q && !c) { missing = 1; note = `In ${d.name}, but not found on the floor plans.`; }
    else if (q && c > q) for (const it of found) { it.note = `${it.note} ${d.name} lists ${q}, but ${c} were found on the plans.`.trim(); it.conf = Math.min(it.conf, .75); }
    // from the schedule alone: placed on its row of the schedule sheet (when that sheet is shown)
    const sh = !planReads.length && d.rowBox && (S.src?.sheets || []).find(s => s.page === d.page);
    const box = sh ? toBox(d.rowBox, sh.W, sh.H, 0) : null;
    for (let k = 0; k < Math.min(missing, planReads.length ? 30 : 200); k++) {
      items.push({id:uid++, cat:'window', type:d.type, w:d.w, h:d.h, room:'', box, sheet:box ? d.page : null, tag:d.raw, defId:d.id,
        fromSched:!planReads.length, schedName:d.name, schedQty:q,
        conf:Math.min(planReads.length ? .6 : 1, clamp(Number(d.confidence) || .5, 0, 1)), note,
        raw:`${d.raw}${d.size_text ? ` · ${d.size_text}` : ''}`.slice(0, 40), temp:d.tempered_glass === true, egress:d.egress === true, srcs:[defLine(d)]});
      if (planReads.length) stats.added++;
    }
  }
  // marks: the drawing's tag, numbered when it repeats (3·1, 3·2 …); untagged → W01 / D01
  const seen = new Map(), reps = new Map();
  for (const it of items) if (it.tag) reps.set(`${it.cat}:${it.tag}`, (reps.get(`${it.cat}:${it.tag}`) || 0) + 1);
  let wn = 1, dn = 1;
  for (const it of items) {
    if (!it.tag) { it.mark = it.cat === 'door' ? `D${pad2(dn++)}` : `W${pad2(wn++)}`; continue; }
    const k = `${it.cat}:${it.tag}`, n = (seen.get(k) || 0) + 1; seen.set(k, n);
    it.mark = reps.get(k) > 1 ? `${it.tag}·${n}` : it.tag;
  }
  return {items, stats};
}
