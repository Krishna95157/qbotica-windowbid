#!/usr/bin/env node
/**
 * WindowBid server — serves the site and runs plan → takeoff extraction with OpenAI.
 *
 *   node server/server.mjs            (reads ./.env if present)
 *
 * Routes
 *   GET  /                      the site (dist/windowbid.html)
 *   GET  /src/…                 the multi-file source version (for development)
 *   GET  /api/health            {ok, mock, tasks}
 *   POST /api/extract           {filename, width, height, pages, image:"data:image/png;base64,…"} → {id}
 *                               task:"classify" {filename, total, pages:[{page, image, text}]}  — sort a batch of sheets
 *                               task:"page"     {filename, page, total, kind, level, title, crop, width, height, image, textLayer}
 *                                                — read one sheet of a set (see document-schema.mjs)
 *   GET  /api/extract/:id       {status: queued|in_progress|completed|failed|cancelled|incomplete, elapsed, result?, error?}
 *   POST /api/extract/:id/cancel
 *
 * The OpenAI key is read from the environment (OPENAI_API_KEY) and never sent to the browser.
 * Extraction uses the Responses API in background mode with a strict JSON schema, so a 2–3 minute
 * read never holds an HTTP request open: the browser polls /api/extract/:id instead.
 *
 * No npm dependencies — Node 18+ (built-in fetch).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { SYSTEM_PROMPT, userPrompt, TAKEOFF_SCHEMA } from './takeoff-schema.mjs';
import { CLASSIFY_SYSTEM, classifyPrompt, CLASSIFY_SCHEMA, PAGE_SYSTEM, pagePrompt, PAGE_SCHEMA, PAGE_KINDS } from './document-schema.mjs';
import { mockResult, mockClassify, mockPage } from './mock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- configuration (.env + environment) ----------
loadDotEnv(path.join(ROOT, '.env'));
const CFG = {
  port: Number(process.env.PORT || 3000),
  key: (process.env.OPENAI_API_KEY || '').trim(),
  model: process.env.OPENAI_MODEL || 'gpt-6-astra',
  detail: process.env.OPENAI_IMAGE_DETAIL || 'high',
  pageDetail: process.env.OPENAI_PAGE_DETAIL || 'original',   // full-detail sheet reads; "high" caps the image at ~3k tokens however large it is
  classifyDetail: process.env.OPENAI_CLASSIFY_DETAIL || 'high',
  effort: process.env.OPENAI_REASONING_EFFORT || '',          // optional, e.g. "medium"; leave empty if the model doesn't support it
  maxOutput: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 32000),
  base: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
  maxMB: Number(process.env.MAX_UPLOAD_MB || 20),
  perHour: Number(process.env.EXTRACTIONS_PER_HOUR || 200),  // reading calls per visitor IP — protects your API budget (a 90-page set uses ~15)
  mockSeconds: Number(process.env.WB_MOCK_SECONDS || 12),
};
CFG.mock = process.env.WB_MOCK === '1' || !CFG.key;
// LOCAL_OCR_URL: read uploads with the local WindowBid OCR app instead (e.g. http://127.0.0.1:8001).
// The browser talks to it through /local/… on this server, so everything stays on one address.
CFG.localUrl = (process.env.LOCAL_OCR_URL || '').replace(/\/$/, '');

const STATIC = [
  { prefix: '/src/', dir: path.join(ROOT, 'src') },
  { prefix: '/', dir: path.join(ROOT, 'dist'), index: 'windowbid.html' },
];
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };

// jobs this server started (only these ids can be polled or cancelled through it)
const JOBS = new Map();      // id → {created, ip, mock, cancelled}
const HITS = new Map();      // ip → [timestamps]
setInterval(() => {
  const old = Date.now() - 60 * 60 * 1000;
  for (const [id, j] of JOBS) if (j.created < old) JOBS.delete(id);
  for (const [ip, t] of HITS) { const k = t.filter(x => x > old); k.length ? HITS.set(ip, k) : HITS.delete(ip); }
}, 5 * 60 * 1000).unref();

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/health' && req.method === 'GET') {
      return json(res, 200, { ok: true, mock: CFG.mock, tasks: ['takeoff', 'classify', 'page'], local: !!CFG.localUrl });
    }
    if (url.pathname === '/api/extract' && req.method === 'POST') return startExtraction(req, res);
    let m = url.pathname.match(/^\/api\/extract\/([\w-]{6,80})$/);
    if (m && req.method === 'GET') return pollExtraction(m[1], res);
    m = url.pathname.match(/^\/api\/extract\/([\w-]{6,80})\/cancel$/);
    if (m && req.method === 'POST') return cancelExtraction(m[1], res);
    if (CFG.localUrl && url.pathname.startsWith('/local/api/')) return proxyLocal(req, res, url);
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'not_found' });
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(url.pathname, res);
    json(res, 405, { error: 'method_not_allowed' });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: 'server_error', message: 'Something went wrong on the server.' });
  }
});
server.listen(CFG.port, () => {
  console.log(`WindowBid running at http://localhost:${CFG.port}`);
  console.log(CFG.mock
    ? '  Plan reading: MOCK mode (no OPENAI_API_KEY set) — uploads return a canned result after a short wait.'
    : `  Plan reading: OpenAI ${CFG.model} (background mode; sheet reads at image detail "${CFG.pageDetail}", page sorting at "${CFG.classifyDetail}")`);
});

// ---------- local OCR app (LOCAL_OCR_URL) ----------
// Streams /local/api/… to the local app's /api/… unchanged: uploads, status polls, results, page images.
function proxyLocal(req, res, url) {
  const target = new URL(url.pathname.slice('/local'.length) + url.search, CFG.localUrl);
  const headers = { ...req.headers, host: target.host };
  const up = http.request(target, { method: req.method, headers }, r => {
    res.writeHead(r.statusCode, { 'Content-Type': r.headers['content-type'] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    r.pipe(res);
  });
  up.on('error', () => json(res, 502, { error: 'local_unreachable',
    message: 'The local WindowBid reader isn’t running. Start it with ./run.sh in ~/windowbid-experiment.' }));
  req.pipe(up);
}

// ---------- API ----------
async function startExtraction(req, res) {
  const ip = clientIp(req);
  const hits = (HITS.get(ip) || []).filter(t => t > Date.now() - 3600e3);
  if (hits.length >= CFG.perHour) return json(res, 429, { error: 'rate_limited', message: 'Hourly limit reached for plan reading. Try again later.' });

  let body;
  try { body = JSON.parse(await readBody(req, CFG.maxMB * 1024 * 1024 * 1.4)); }
  catch (e) { return json(res, e.code === 'too_large' ? 413 : 400, { error: e.code || 'bad_request', message: e.code === 'too_large' ? `Image is larger than ${CFG.maxMB} MB.` : 'Invalid request.' }); }

  const task = ['takeoff', 'classify', 'page'].includes(body.task) ? body.task : 'takeoff';
  const filename = String(body.filename || 'plan').slice(0, 120);
  const textLayer = typeof body.textLayer === 'string' ? body.textLayer.slice(0, 60000) : '';
  let spec;                       // {instructions, content, name, schema, maxOutput, meta}
  if (task === 'classify') {
    // a batch of small page images: what is each sheet?
    const pages = Array.isArray(body.pages) ? body.pages.slice(0, 16) : [];
    if (!pages.length || !pages.every(p => validImage(p && p.image))) return badImage(res);
    const total = clampInt(body.total, 1, 2000);
    const content = [{ type: 'input_text', text: classifyPrompt({ filename, total }) }];
    for (const p of pages) {
      const text = typeof p.text === 'string' ? p.text.slice(0, 1500) : '';
      content.push({ type: 'input_text', text: `Page ${clampInt(p.page, 1, 2000)}${text ? ` — largest text on the sheet: ${text}` : ''}` });
      content.push({ type: 'input_image', image_url: p.image, detail: CFG.classifyDetail });
    }
    spec = { instructions: CLASSIFY_SYSTEM, content, name: 'sheet_index', schema: CLASSIFY_SCHEMA, maxOutput: 12000,
      meta: { pages: pages.map(p => clampInt(p.page, 1, 2000)) } };
  } else {
    const image = String(body.image || '');
    if (!validImage(image)) return badImage(res);
    const meta = { filename, width: clampInt(body.width, 1, 20000), height: clampInt(body.height, 1, 20000), textLayer };
    if (task === 'page') {
      // one sheet of a set (or a crop of its schedule) at full detail
      Object.assign(meta, {
        page: clampInt(body.page, 1, 2000), total: clampInt(body.total, 1, 2000),
        kind: PAGE_KINDS.includes(body.kind) ? body.kind : 'auto', crop: body.crop === true,
        level: typeof body.level === 'string' ? body.level.slice(0, 60) : '', title: typeof body.title === 'string' ? body.title.slice(0, 80) : '',
      });
      spec = { instructions: PAGE_SYSTEM, name: 'sheet_takeoff', schema: PAGE_SCHEMA, maxOutput: CFG.maxOutput, meta,
        content: [{ type: 'input_text', text: pagePrompt(meta) }, { type: 'input_image', image_url: image, detail: CFG.pageDetail }] };
    } else {
      // single page (claude.ai-compatible flow and older clients)
      meta.pages = clampInt(body.pages, 1, 999);
      spec = { instructions: SYSTEM_PROMPT, name: 'window_takeoff', schema: TAKEOFF_SCHEMA, maxOutput: CFG.maxOutput, meta,
        content: [{ type: 'input_text', text: userPrompt(meta) }, { type: 'input_image', image_url: image, detail: CFG.detail }] };
    }
  }
  hits.push(Date.now()); HITS.set(ip, hits);

  if (CFG.mock) {
    const id = 'mock_' + crypto.randomBytes(9).toString('hex');
    JOBS.set(id, { created: Date.now(), ip, mock: true, task, meta: spec.meta });
    return json(res, 202, { id, status: 'queued' });
  }

  const payload = {
    model: CFG.model,
    background: true,
    instructions: spec.instructions,
    input: [{ role: 'user', content: spec.content }],
    text: { format: { type: 'json_schema', name: spec.name, strict: true, schema: spec.schema } },
    max_output_tokens: spec.maxOutput,
  };
  if (CFG.effort) payload.reasoning = { effort: CFG.effort };

  let r = await openai('POST', '/responses', payload);
  if (!r.ok && r.status === 400 && /detail/i.test(r.raw)) {
    // this model doesn't take that image detail level: fall back to "high"
    for (const c of spec.content) if (c.type === 'input_image') c.detail = 'high';
    r = await openai('POST', '/responses', payload);
  }
  if (!r.ok) return json(res, 502, { error: 'openai_error', message: r.message });
  JOBS.set(r.data.id, { created: Date.now(), ip, mock: false, task });
  json(res, 202, { id: r.data.id, status: r.data.status });
}
function validImage(s) { return typeof s === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s); }
function badImage(res) { return json(res, 400, { error: 'bad_image', message: 'Send each page as a PNG, JPEG or WebP data URL.' }); }

async function pollExtraction(id, res) {
  const job = JOBS.get(id);
  if (!job) return json(res, 404, { error: 'unknown_job', message: 'This reading has expired or was not started here.' });
  const elapsed = Math.round((Date.now() - job.created) / 1000);

  if (job.mock) {
    if (job.cancelled) return json(res, 200, { status: 'cancelled', elapsed });
    if (elapsed < CFG.mockSeconds) return json(res, 200, { status: elapsed < 2 ? 'queued' : 'in_progress', elapsed });
    const result = job.task === 'classify' ? mockClassify(job.meta) : job.task === 'page' ? mockPage(job.meta) : mockResult();
    return json(res, 200, { status: 'completed', elapsed, result });
  }

  const r = await openai('GET', `/responses/${encodeURIComponent(id)}`);
  if (!r.ok) return json(res, 502, { error: 'openai_error', message: r.message, elapsed });
  const d = r.data, status = d.status;
  if (status === 'queued' || status === 'in_progress') return json(res, 200, { status, elapsed });
  if (status === 'completed') {
    const { text, refusal } = outputText(d);
    if (refusal) return json(res, 200, { status: 'failed', elapsed, error: 'refused', message: 'The reading service declined to read this file.' });
    try { return json(res, 200, { status, elapsed, result: JSON.parse(text) }); }
    catch { return json(res, 200, { status: 'failed', elapsed, error: 'bad_output', message: 'The reading came back incomplete. Try again.' }); }
  }
  if (status === 'incomplete') {
    const why = d.incomplete_details && d.incomplete_details.reason;
    return json(res, 200, { status, elapsed, error: 'incomplete', message: why === 'max_output_tokens' ? 'The plan has more openings than one reading can return. Crop the page and try again.' : 'The reading stopped early. Try again.' });
  }
  if (d.error && d.error.message) console.error(`[openai] reading ${id} ${status}: ${d.error.message}`);
  const msg = `Reading ${status}. Try again.`;
  json(res, 200, { status, elapsed, error: status, message: msg });
}

async function cancelExtraction(id, res) {
  const job = JOBS.get(id);
  if (!job) return json(res, 404, { error: 'unknown_job' });
  if (job.mock) { job.cancelled = true; return json(res, 200, { status: 'cancelled' }); }
  const r = await openai('POST', `/responses/${encodeURIComponent(id)}/cancel`);
  json(res, r.ok ? 200 : 502, r.ok ? { status: r.data.status } : { error: 'openai_error', message: r.message });
}

// ---------- OpenAI REST ----------
async function openai(method, p, body) {
  try {
    const r = await fetch(CFG.base + p, {
      method,
      headers: { 'Authorization': `Bearer ${CFG.key}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60000),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const m = (data.error && data.error.message) || `OpenAI returned HTTP ${r.status}.`;
      console.error(`[openai] ${method} ${p} → ${r.status}: ${m}`);
      // shown in the page, so keep the provider out of it; the console line above has the details
      const friendly = r.status === 401 ? 'The reading service isn’t set up correctly on the server (access key rejected).'
        : r.status === 429 ? 'The reading service is busy or out of quota. Try again later.'
        : r.status === 404 && /model/i.test(m) ? 'The reading service isn’t set up correctly on the server (reader not available).'
        : 'The reading service returned an error. Try again.';
      return { ok: false, status: r.status, raw: m, message: friendly };
    }
    return { ok: true, data };
  } catch (e) {
    console.error(`[openai] ${method} ${p} failed:`, e.message);
    return { ok: false, status: 0, raw: e.message, message: 'Couldn’t reach the reading service from the server.' };
  }
}
function outputText(d) {
  if (typeof d.output_text === 'string' && d.output_text) return { text: d.output_text };
  let text = '', refusal = '';
  for (const item of d.output || []) {
    if (item.type !== 'message') continue;
    for (const c of item.content || []) {
      if (c.type === 'output_text') text += c.text || '';
      if (c.type === 'refusal') refusal += c.refusal || 'refused';
    }
  }
  return { text, refusal };
}

// ---------- helpers ----------
function json(res, code, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(s);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { const e = new Error('too large'); e.code = 'too_large'; reject(e); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
function serveStatic(pathname, res) {
  for (const s of STATIC) {
    if (!pathname.startsWith(s.prefix)) continue;
    let rel = decodeURIComponent(pathname.slice(s.prefix.length));
    if (!rel || rel.endsWith('/')) rel += s.index || 'index.html';
    const file = path.join(s.dir, rel);
    if (!file.startsWith(s.dir + path.sep)) break;           // no path traversal
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    return fs.createReadStream(file).pipe(res);
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found');
}
function clientIp(req) { return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }
function clampInt(v, a, b) { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : a; }
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let v = m[2]; if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
