'use strict';
/* ------------------------------------------------------------------
   Standalone demo only (dist/windowbid-standalone.html): read plans with OpenAI straight from the
   browser when no WindowBid server is around. Same prompt, schema and background-mode polling as
   server/server.mjs. WB_TAKEOFF {system, schema, userPrompt} is injected by scripts/build.py --standalone.

   The API key is never part of this file: it is asked for on first use and kept in this browser's
   localStorage only. Anyone who opens the page on their machine must use their own key.
------------------------------------------------------------------ */
const WB_DIRECT = {model:'gpt-6-astra', detail:'high', maxOutput:32000, keyName:'wb_openai_key'};
const wbStore = {
  get() { try { return localStorage.getItem(WB_DIRECT.keyName) || ''; } catch (e) { return wbStore.mem || ''; } },
  set(v) { wbStore.mem = v; try { v ? localStorage.setItem(WB_DIRECT.keyName, v) : localStorage.removeItem(WB_DIRECT.keyName); } catch (e) {} },
};
function wbAskKey() {
  const k = (window.prompt('Paste your OpenAI API key (sk-…).\nIt stays in this browser only and is sent only to api.openai.com.') || '').trim();
  if (k) wbStore.set(k);
  return k;
}
window.wbDirectReader = () => {
  if (!/^(https?|file):$/.test(location.protocol) || !window.fetch) return null;
  const fail = (code, message) => Object.assign(new Error(message || code), {code, message});
  async function api(method, p, body, signal) {
    const key = wbStore.get();
    let r, d;
    try {
      r = await fetch('https://api.openai.com/v1' + p, {method, signal,
        headers:{'Authorization':`Bearer ${key}`, 'Content-Type':'application/json'}, body: body ? JSON.stringify(body) : undefined});
      d = await r.json().catch(() => ({}));
    } catch (e) { throw fail(signal && signal.aborted ? 'cancelled' : 'network', 'Couldn’t reach OpenAI from this browser.'); }
    if (r.ok) return d;
    const m = (d.error && d.error.message) || `OpenAI returned HTTP ${r.status}.`;
    if (r.status === 401) { wbStore.set(''); throw fail('bad_key', 'OpenAI rejected the API key. Try again to enter a new one.'); }
    if (r.status === 429) throw fail('rate_limited', m);
    throw fail('openai_error', m);
  }
  return {
    label:`OpenAI ${WB_DIRECT.model}`, model:WB_DIRECT.model, polled:true, images:true,
    availText:`Standalone demo: your plan is read by OpenAI (${WB_DIRECT.model}) directly from this browser with your own API key (asked once, kept in this browser). A reading can take 1–3 minutes.`,
    async json(prompt, {images, signal, onStatus, meta = {}} = {}) {
      if (!wbStore.get() && !wbAskKey()) throw fail('cancelled');
      const image = await blobToDataURL(images);
      const payload = {
        model:WB_DIRECT.model, background:true, instructions:WB_TAKEOFF.system,
        input:[{role:'user', content:[
          {type:'input_text', text:WB_TAKEOFF.userPrompt({filename:meta.filename || 'plan', width:meta.width, height:meta.height, pages:meta.pages || 1, textLayer:meta.textLayer || ''})},
          {type:'input_image', image_url:image, detail:WB_DIRECT.detail},
        ]}],
        text:{format:{type:'json_schema', name:'window_takeoff', strict:true, schema:WB_TAKEOFF.schema}},
        max_output_tokens:WB_DIRECT.maxOutput,
      };
      const t0 = Date.now(), elapsed = () => Math.round((Date.now() - t0) / 1000);
      let d = await api('POST', '/responses', payload, signal);
      const id = d.id;
      onStatus && onStatus({status:d.status || 'queued', elapsed:0});
      for (;;) {
        await new Promise(ok => { const t = setTimeout(ok, 2500); if (signal) signal.addEventListener('abort', () => { clearTimeout(t); ok(); }, {once:true}); });
        if (signal && signal.aborted) { api('POST', `/responses/${id}/cancel`).catch(() => {}); throw fail('cancelled'); }
        try { d = await api('GET', `/responses/${id}`); }
        catch (e) { if (e.code === 'network') continue; throw e; }   // brief network hiccup: keep polling
        onStatus && onStatus({status:d.status, elapsed:elapsed()});
        if (d.status === 'queued' || d.status === 'in_progress') continue;
        if (d.status === 'completed') {
          let text = d.output_text || '', refusal = '';
          if (!text) for (const it of d.output || []) if (it.type === 'message') for (const c of it.content || []) {
            if (c.type === 'output_text') text += c.text || '';
            if (c.type === 'refusal') refusal += c.refusal || 'refused';
          }
          if (refusal) throw fail('refused', 'The model declined to read this file.');
          try { return JSON.parse(text); } catch (e) { throw fail('bad_output', 'The reading came back incomplete. Try again.'); }
        }
        if (d.status === 'incomplete') throw fail('incomplete', d.incomplete_details && d.incomplete_details.reason === 'max_output_tokens'
          ? 'The plan has more openings than one reading can return. Crop the page and try again.' : 'The reading stopped early. Try again.');
        throw fail(d.status, (d.error && d.error.message) || `Reading ${d.status}.`);
      }
    },
  };
};
