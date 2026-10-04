#!/usr/bin/env node
/**
 * A stand-in for the OpenAI Responses API, for testing the WindowBid server without a real key.
 *
 *   node server/test/fake-openai.mjs 4010
 *   OPENAI_BASE_URL=http://127.0.0.1:4010/v1 OPENAI_API_KEY=sk-test-fake node server/server.mjs
 *
 * It validates every request the WindowBid server sends (auth header, background mode, strict JSON schema,
 * an image input) and walks each job through queued → in_progress → completed like the real API.
 * Requests that break the contract get HTTP 400 with the reason, so a test fails loudly.
 */
import http from 'node:http';
import { TAKEOFF_SCHEMA } from '../takeoff-schema.mjs';

const PORT = Number(process.argv[2] || 4010);
const jobs = new Map();
let n = 0;

function strictProblems(schema, at = '$') {
  const out = [];
  const t = [].concat(schema.type || []);
  if (t.includes('object')) {
    if (schema.additionalProperties !== false) out.push(`${at}: additionalProperties must be false`);
    const props = Object.keys(schema.properties || {});
    const req = new Set(schema.required || []);
    for (const p of props) if (!req.has(p)) out.push(`${at}.${p}: must be listed in required`);
    for (const p of props) out.push(...strictProblems(schema.properties[p], `${at}.${p}`));
  }
  if (t.includes('array') && schema.items) out.push(...strictProblems(schema.items, `${at}[]`));
  return out;
}

const RESULT = {
  sheet: 'floor plan',
  summary: { total_windows: 3, total_doors: 1, unique_configurations: 4 },
  openings: [
    { mark: 'W1', category: 'window', type: 'Sliding', raw_callout: '5050 XO', width_in: 60, height_in: 60, room: 'Bedroom 2', quantity: 1, tempered_glass: false, egress: true, box: [180, 150, 300, 175], confidence: 0.94, needs_review: false, note: '' },
    { mark: 'W2', category: 'window', type: 'Single hung', raw_callout: '2040 SH TEMP GL', width_in: 24, height_in: 48, room: 'Bath 2', quantity: 1, tempered_glass: true, egress: false, box: [420, 150, 470, 175], confidence: 0.9, needs_review: false, note: '' },
    { mark: 'W3', category: 'window', type: 'Picture', raw_callout: '40?? FX', width_in: 48, height_in: null, room: 'Living area', quantity: 2, tempered_glass: false, egress: false, box: [600, 700, 720, 725], confidence: 0.6, needs_review: true, note: 'Height not legible.' },
    { mark: 'D1', category: 'door', type: 'Sliding door', raw_callout: '6068 SGD', width_in: 72, height_in: 80, room: 'Dining', quantity: 1, tempered_glass: true, egress: false, box: [760, 860, 900, 885], confidence: 0.92, needs_review: false, note: '' },
  ],
};

http.createServer((req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.headers.authorization !== 'Bearer sk-test-fake') return send(401, { error: { message: 'Incorrect API key provided.' } });
    if (req.method === 'POST' && req.url === '/v1/responses') {
      const b = JSON.parse(body || '{}'), problems = [];
      if (b.background !== true) problems.push('background must be true');
      const fmt = b.text && b.text.format;
      if (!fmt || fmt.type !== 'json_schema' || fmt.strict !== true || !fmt.schema) problems.push('text.format must be a strict json_schema');
      else problems.push(...strictProblems(fmt.schema));
      const content = (b.input && b.input[0] && b.input[0].content) || [];
      const img = content.find(c => c.type === 'input_image');
      if (!img || !/^data:image\/(png|jpeg|webp);base64,/.test(img.image_url || '')) problems.push('input must include an input_image data URL');
      if (!content.find(c => c.type === 'input_text')) problems.push('input must include input_text');
      if (!b.instructions) problems.push('instructions missing');
      if (problems.length) { console.error('[fake-openai] rejected:', problems); return send(400, { error: { message: 'Contract check failed: ' + problems.join('; ') } }); }
      const id = `resp_fake_${++n}`;
      jobs.set(id, { polls: 0, model: b.model, cancelled: false });
      const txt = content.find(c => c.type === 'input_text').text;
      console.log(`[fake-openai] accepted ${id} model=${b.model} detail=${img.detail} image=${Math.round(img.image_url.length / 1024)} KB text-layer=${/text layer/i.test(txt) ? (txt.split('\n').length - 3) + ' lines' : 'none'}`);
      return send(200, { id, object: 'response', status: 'queued', model: b.model, background: true });
    }
    let m = req.url.match(/^\/v1\/responses\/([\w-]+)\/cancel$/);
    if (m && req.method === 'POST') { const j = jobs.get(m[1]); if (!j) return send(404, { error: { message: 'not found' } }); j.cancelled = true; console.log(`[fake-openai] cancelled ${m[1]}`); return send(200, { id: m[1], status: 'cancelled' }); }
    m = req.url.match(/^\/v1\/responses\/([\w-]+)$/);
    if (m && req.method === 'GET') {
      const j = jobs.get(m[1]); if (!j) return send(404, { error: { message: 'not found' } });
      if (j.cancelled) return send(200, { id: m[1], status: 'cancelled' });
      j.polls++;
      if (j.polls < 2) return send(200, { id: m[1], status: 'queued' });
      if (j.polls < 4) return send(200, { id: m[1], status: 'in_progress' });
      return send(200, { id: m[1], status: 'completed', model: j.model, usage: { input_tokens: 2100, output_tokens: 900 },
        output: [{ type: 'reasoning', summary: [] }, { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(RESULT) }] }] });
    }
    send(404, { error: { message: 'unknown route' } });
  });
}).listen(PORT, () => {
  const p = strictProblems(TAKEOFF_SCHEMA);
  console.log(`[fake-openai] listening on ${PORT}; TAKEOFF_SCHEMA strict-mode check: ${p.length ? p.join('; ') : 'OK'}`);
});
