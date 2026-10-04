#!/usr/bin/env node
/**
 * WindowBid server — serves the site and runs plan → takeoff extraction with OpenAI.
 *
 *   node server/server.mjs            (reads ./.env if present)
 *
 * Routes
 *   GET  /                      the site (dist/windowbid.html)
 *   GET  /src/…                 the multi-file source version (for development)
 *   GET  /api/health            {ok, provider, model, mock}
 *   POST /api/extract           {filename, width, height, pages, image:"data:image/png;base64,…"} → {id}
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
import { mockResult } from './mock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- configuration (.env + environment) ----------
loadDotEnv(path.join(ROOT, '.env'));
const CFG = {
  port: Number(process.env.PORT || 3000),
  key: (process.env.OPENAI_API_KEY || '').trim(),
  model: process.env.OPENAI_MODEL || 'gpt-6-astra',
  detail: process.env.OPENAI_IMAGE_DETAIL || 'high',
  effort: process.env.OPENAI_REASONING_EFFORT || '',          // optional, e.g. "medium"; leave empty if the model doesn't support it
  maxOutput: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 32000),
  base: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
  maxMB: Number(process.env.MAX_UPLOAD_MB || 20),
  perHour: Number(process.env.EXTRACTIONS_PER_HOUR || 20),   // per visitor IP — protects your API budget
  mockSeconds: Number(process.env.WB_MOCK_SECONDS || 12),
};
CFG.mock = process.env.WB_MOCK === '1' || !CFG.key;

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
      return json(res, 200, { ok: true, provider: 'openai', model: CFG.model, mock: CFG.mock });
    }
    if (url.pathname === '/api/extract' && req.method === 'POST') return startExtraction(req, res);
    let m = url.pathname.match(/^\/api\/extract\/([\w-]{6,80})$/);
    if (m && req.method === 'GET') return pollExtraction(m[1], res);
    m = url.pathname.match(/^\/api\/extract\/([\w-]{6,80})\/cancel$/);
    if (m && req.method === 'POST') return cancelExtraction(m[1], res);
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
    : `  Plan reading: OpenAI ${CFG.model} (background mode, image detail "${CFG.detail}")`);
});

// ---------- API ----------
async function startExtraction(req, res) {
  const ip = clientIp(req);
  const hits = (HITS.get(ip) || []).filter(t => t > Date.now() - 3600e3);
  if (hits.length >= CFG.perHour) return json(res, 429, { error: 'rate_limited', message: 'Hourly limit reached for plan reading. Try again later.' });

  let body;
  try { body = JSON.parse(await readBody(req, CFG.maxMB * 1024 * 1024 * 1.4)); }
  catch (e) { return json(res, e.code === 'too_large' ? 413 : 400, { error: e.code || 'bad_request', message: e.code === 'too_large' ? `Image is larger than ${CFG.maxMB} MB.` : 'Invalid request.' }); }

  const image = String(body.image || '');
  if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) return json(res, 400, { error: 'bad_image', message: 'Send the page as a PNG, JPEG or WebP data URL.' });
  const meta = {
    filename: String(body.filename || 'plan').slice(0, 120),
    width: clampInt(body.width, 1, 20000), height: clampInt(body.height, 1, 20000), pages: clampInt(body.pages, 1, 999),
    textLayer: typeof body.textLayer === 'string' ? body.textLayer.slice(0, 60000) : '',
  };
  hits.push(Date.now()); HITS.set(ip, hits);

  if (CFG.mock) {
    const id = 'mock_' + crypto.randomBytes(9).toString('hex');
    JOBS.set(id, { created: Date.now(), ip, mock: true });
    return json(res, 202, { id, status: 'queued', model: 'mock' });
  }

  const payload = {
    model: CFG.model,
    background: true,
    instructions: SYSTEM_PROMPT,
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: userPrompt(meta) },
        { type: 'input_image', image_url: image, detail: CFG.detail },
      ],
    }],
    text: { format: { type: 'json_schema', name: 'window_takeoff', strict: true, schema: TAKEOFF_SCHEMA } },
    max_output_tokens: CFG.maxOutput,
  };
  if (CFG.effort) payload.reasoning = { effort: CFG.effort };

  const r = await openai('POST', '/responses', payload);
  if (!r.ok) return json(res, 502, { error: 'openai_error', message: r.message });
  JOBS.set(r.data.id, { created: Date.now(), ip, mock: false });
  json(res, 202, { id: r.data.id, status: r.data.status, model: CFG.model });
}

async function pollExtraction(id, res) {
  const job = JOBS.get(id);
  if (!job) return json(res, 404, { error: 'unknown_job', message: 'This reading has expired or was not started here.' });
  const elapsed = Math.round((Date.now() - job.created) / 1000);

  if (job.mock) {
    if (job.cancelled) return json(res, 200, { status: 'cancelled', elapsed });
    if (elapsed < CFG.mockSeconds) return json(res, 200, { status: elapsed < 2 ? 'queued' : 'in_progress', elapsed });
    return json(res, 200, { status: 'completed', elapsed, result: mockResult(), model: 'mock' });
  }

  const r = await openai('GET', `/responses/${encodeURIComponent(id)}`);
  if (!r.ok) return json(res, 502, { error: 'openai_error', message: r.message, elapsed });
  const d = r.data, status = d.status;
  if (status === 'queued' || status === 'in_progress') return json(res, 200, { status, elapsed });
  if (status === 'completed') {
    const { text, refusal } = outputText(d);
    if (refusal) return json(res, 200, { status: 'failed', elapsed, error: 'refused', message: 'The model declined to read this file.' });
    try { return json(res, 200, { status, elapsed, result: JSON.parse(text), model: d.model, usage: d.usage || null }); }
    catch { return json(res, 200, { status: 'failed', elapsed, error: 'bad_output', message: 'The reading came back incomplete. Try again.' }); }
  }
  if (status === 'incomplete') {
    const why = d.incomplete_details && d.incomplete_details.reason;
    return json(res, 200, { status, elapsed, error: 'incomplete', message: why === 'max_output_tokens' ? 'The plan has more openings than one reading can return. Raise OPENAI_MAX_OUTPUT_TOKENS or crop the page.' : 'The reading stopped early. Try again.' });
  }
  const msg = (d.error && d.error.message) || `Reading ${status}.`;
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
      const friendly = r.status === 401 ? 'The server’s OpenAI API key was rejected. Check OPENAI_API_KEY.'
        : r.status === 429 ? 'OpenAI rate limit or quota reached. Check billing and limits on the OpenAI Platform.'
        : r.status === 404 && /model/i.test(m) ? `Model "${CFG.model}" isn’t available to this API key. Set OPENAI_MODEL to a vision-capable model you have access to.`
        : m;
      return { ok: false, message: friendly };
    }
    return { ok: true, data };
  } catch (e) {
    console.error(`[openai] ${method} ${p} failed:`, e.message);
    return { ok: false, message: 'Couldn’t reach OpenAI from the server.' };
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
