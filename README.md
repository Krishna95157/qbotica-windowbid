# qBotica WindowBid — Demo Website

**Review. Procure. Fulfill.**

A single-page marketing and demo site for **qBotica WindowBid**, a platform that takes a window and door project from architectural drawings to an installed order. It's built with plain HTML, CSS and JavaScript (no framework, no build dependencies).

| | |
|---|---|
| **Run it** | `node server/server.mjs` → http://localhost:3000 (section 1) |
| **Single-file build** | `dist/windowbid.html` (SHA-256 `b421cb93e1b134c8532dd748e114165b8fa67f15610a7065120ab3842c156e24`) |
| **Source to edit** | `src/` (HTML, 10 CSS files, 18 JS files) and `server/` (plan-reading API) |
| **AI plan reading** | **OpenAI via the WindowBid server** (`server/server.mjs`, key kept server-side). The page also supports a host-provided AI runtime — see section 8 |
| **Owner / context** | Internal demo for qBotica, requested by qBotica's CEO |
| **Status** | Working prototype. Plan reading and review are real; manufacturers, bids, prices and fulfillment dates are sample data, labelled "Platform preview" |

---

## 1. Quick start

You need **Node.js 18+** (for the site plus AI plan reading) and a modern browser with internet access for the web fonts. Python 3 is only needed for the build script.

### A. Full demo with AI plan reading (recommended)
```bash
cd qbotica-windowbid
cp .env.example .env          # Windows: copy .env.example .env
# open .env and paste your NEW OpenAI key after OPENAI_API_KEY=
node server/server.mjs        # or: npm start
```
Open **http://localhost:3000** and use **Try Demo → upload a plan**. With no key in `.env`, the server runs in **mock mode**: uploads return a canned reading after about 12 seconds, at no cost, so you can test the flow first.

### B. Static preview only (no upload reading)
```bash
python3 -m http.server 8080
```
| URL | What it is |
|---|---|
| http://localhost:8080/dist/windowbid.html | The single-file build |
| http://localhost:8080/src/index.html | The same page from the separate source files |

In this mode, uploading your own plan is disabled and a note says why. The sample plan works everywhere.

---

## 2. What the project is about

A window and door project passes through three parties:

- **The customer** (homeowner or project owner) needs windows and doors installed.
- **The dealer** reads the architectural plans, works out every opening, gets prices from manufacturers and sells the package to the customer.
- **The manufacturer** builds and ships the products.

WindowBid sits in the middle and carries **one continuous record** of every opening from the drawing through to installation:

| Stage | Question | What happens | Who acts |
|---|---|---|---|
| **01 Review** | Review the extracted takeoff | AI reads the openings from the drawing; the dealer verifies, edits and marks the takeoff **Ready for RFQ** | Dealer reviews AI-extracted data |
| **02 Procure** | Compare manufacturer options | The takeoff becomes an RFQ; manufacturers bid; bids are compared like for like; a proposal goes to the customer | Customer **accepts** the proposal |
| **03 Fulfill** | From order to installation | The accepted proposal becomes a purchase order, tracked through manufacturing, shipping, delivery and installation | Manufacturer **acknowledges** the PO |

**Wording rule (important):** the dealer *verifies* technical data, the customer *accepts* the commercial proposal, and the manufacturer *acknowledges* the PO. The word "approve" is never used for the takeoff.

## 3. Main objective

Show qBotica's leadership and prospective customers, in one browser tab, that WindowBid can:

1. read a construction drawing with AI and turn it into structured opening data, with a human in the loop;
2. carry that same record, without retyping, into procurement and fulfillment;
3. do it in a polished, distinctive way that looks like the industry's own material (drawing sheets), not a generic software dashboard.

---

## 4. Everything implemented so far

### Site-wide
- **Brand:** "qBotica WindowBid" lockups (header, footer, demo bar, browser-tab icon). The qBotica cube symbol is rebuilt from a written spec, and the wordmark uses Poppins Bold as a stand-in.
- **Design system:** drafting-paper look with ruled frames, ruler ticks, registration crosses and sheet labels. Three typefaces: Archivo for statements, Instrument Sans for body text, Geist Mono for technical labels. The colour rule is **orange = machine-read / needs attention**, **green = confirmed by a person / complete**. Full details are in `docs/DESIGN.md`.
- **Theme:** **dark by default**. Draw a **W** with the mouse anywhere (desktop) to switch to light and back, or use the footer's theme switch on any device. The new theme opens as a circle from where the W ended, and the choice is saved in `localStorage` under `wb-theme`.
- **Drafting cursor (desktop):** an orange pen trail, a crosshair over drawings, snapping to window openings, and small action labels.
- **Page transitions:** an "aperture" between Home, About and Contact. Hash routes are `#about`, `#contact` and `#takeoff` (the demo).
- **Accessibility:** keyboard focus outlines, "reduce motion" support (animations skip to their final state), and responsive layouts down to about 360 px wide.

### Home page (top to bottom)
1. **Hero:** "Review. Procure. Fulfill." A floor plan assembles from 14 flying wall pieces, then window W07 is highlighted.
2. **Three stages. One continuous record:** three ruled rows, each with a small animated example (takeoff statuses Verified / Edited / Needs review; three supplier prices; seven fulfillment milestones).
3. **Review** (pinned scroll scene): the drawing is read, W02's missing height is edited and verified, plan labels stretch into a takeoff table, and identical rows group into seven products.
4. **Procure** (pinned scroll scene): one procurement sheet. The product card becomes RFQ line 01, the bid schedule draws itself, **Cascade** is selected with a green trace, the dealer ledger becomes the customer proposal ($42,500), and the customer signs and accepts.
5. **Fulfill** (pinned, charcoal): the order becomes PO #WB-0048 (Cascade). One line draws down through seven milestones (with owner and date), with a W07 tag riding the line, and ends on **"W07 — Complete."**
6. **Metrics:** 10 windows, 02 doors, 07 products, 12 openings verified. These update to the user's own counts after an upload in the demo.
7. **Call to action:** "See the workflow yourself."
8. **Footer:** links, theme switch and "draw a W" hint.

### About page
1. The qBotica logo **builds itself** (about 5.6 s, five steps, progress bar, then Replay and "Scroll to unfold").
2. **"One cube. Three sides."** As you scroll, the cube's faces flatten into three coloured panels: Who we are (orange), What we do (deep green), Our agenda (mint).
3. An orange "Let's build it together." band with a Contact Us button.

### Contact page
A fill-in-the-blank sentence on a drawing sheet: *"Hi, I'm ___ from ___. I'd like [a live demo ▾]. Reach me at ___."* Blanks turn green when valid, and sending shows a thank-you. **The form is a prototype and does not send anything yet.**

### Demo workspace ("Try Demo", `#takeoff`)

| Step | What works |
|---|---|
| Upload | Sample plan (works anywhere) or your own PDF/PNG/JPG/WebP, read by **Claude** on claude.ai or by **OpenAI through the WindowBid server** everywhere else (section 8). PDFs also send their **text layer**; if a view can't send images, PDFs are read from that text alone |
| Extract | Scan animation with a live log. For uploads, page 1 is rendered (PDF.js) and read by AI; server readings run as **background jobs** with elapsed time and step-by-step progress (1–3 minutes is normal) |
| Review | Zoomable plan, coloured detection boxes, an editable opening card showing the **drawing callout as written** (e.g. `5050 XO`) with Tempered / Egress flags, statuses **AI read / Needs review / Verified / Edited**, add or remove openings, keyboard shortcuts (↑/↓ or J/K, V to verify, Esc), **Mark Ready for RFQ →**, CSV export |
| RFQ | RFQ #WB-1042 built from the grouped takeoff; choose manufacturers, set a due date and notes |
| Bids | Three sample bids (Northline, Cascade, Mesa Ridge), compared like for like with badges |
| Proposal | Dealer ledger with margin slider beside the customer view; choosing Cascade on the sample plan gives exactly **$42,500** |
| Order | PO #WB-0048 with a seven-step tracker, ending in "Project complete" |

---

## 5. Latest changes (most recent first)

| Version | Change |
|---|---|
| **v12 — PDFs in every view** | Uploaded PDFs now also send their **text layer** (every text item with its position: tags, size callouts like `5050 XO`, room names). When the claude.ai view can't send images to Claude, PDFs are **read from the text layer alone**, so CAD-exported PDFs still work. When images are available (Claude or OpenAI), the text layer goes along as a reference for exact spelling. Clear, specific messages for: Claude not available in this view; scanned PDF with no text; image files in a text-only view. |
| **v11 — OpenAI plan reading** | New `server/` (Node 18+, no dependencies) that serves the site and reads uploaded plans with the **OpenAI Responses API in background mode**, using a **strict JSON schema** (Structured Outputs). The API key stays in `.env` on the server. The browser polls `/api/extract/:id`, so 2–3 minute readings never freeze the page. The model returns the **raw drawing callout**, tempered/egress flags and quantities. The review card shows the callout as evidence, and the CSV includes it. Also new: mock mode, a fake-OpenAI test server, an end-to-end test, a Dockerfile and Render config. The claude.ai page keeps using Claude and now also shows callouts. |
| **v10 — packaging** | Code organised into `src/` (HTML + 10 CSS + 18 JS files) with a lossless build to `dist/windowbid.html`. Two small code improvements, both re-published to the live link: (1) CSV export now also works outside claude.ai (plain browser download); (2) the internal `status()` function was renamed `openingStatus()` so the multi-file version doesn't shadow the browser's `window.status`. |
| v9 | **Dark theme by default**; switch with a W cursor gesture or the footer switch; circle-reveal transition; choice remembered. |
| — | Tried a horizontal "three coloured panels" version of the Three-stages section, then **reverted** at the client's request (vertical rows kept). |
| v8 | **Procure** redesigned as one procurement sheet (self-drawing bid schedule, selection trace, signature acceptance). **Fulfill** redesigned as a single order trace ending in "W07 — Complete.". **Cascade** carried as the selected supplier from bid to PO. Stage questions reworded. The old "One record" section folded into the Fulfill ending. |
| v7 | **Contact** redesigned three times; it ended as one sentence on a drawing sheet. |
| v6 | Takeoff table redesign (row-overlap fix); wording rule applied site-wide (verify / accept / acknowledge). |
| v5 | About page: self-building logo, cube unfold, orange closing band. |
| v4 | qBotica branding; site orange matched to `#FF7805`. |
| v1–v3 | First demo, editorial redesign, and the Review → Procure → Fulfill story with blueprint assembly. |

Full history and reasons are in `docs/DESIGN.md` (section 13) and `docs/PROJECT-NOTES.md` (version history).

## 6. What we're currently working on / next steps

1. **Rotate the OpenAI key and deploy the server.** Revoke the key that was shared in chat, create a new one, put it in `.env` (or your host's secret settings), and deploy (section 11). The deployed URL becomes the public demo link with OpenAI reading.
2. **Validate on real plans.** Run 5–10 real floor plans, compare with a manual takeoff, and tune `server/takeoff-schema.mjs` (prompt and codes) and `OPENAI_MODEL` / `OPENAI_IMAGE_DETAIL`.
3. **Multi-sheet PDFs.** Pick the relevant sheets (floor plan, window schedule, elevations) instead of only page 1.
4. **Production path (later).** CV + OCR + rules for speed, with AI only as a fallback, once the demo proves demand.
5. **Official brand files**, **real data for the sample plan**, **wiring the Contact form**, **About page sign-off** and the **font licence**, as before.

---

## 7. Project structure

```
windowbid/
├── README.md                     ← you are here
├── package.json                  ← npm shortcuts (start / build / check / fake-openai); no dependencies
├── .env.example                  ← copy to .env and add OPENAI_API_KEY (never commit .env)
├── .gitignore / .dockerignore    ← keep .env out of git and Docker images
├── Dockerfile                    ← run anywhere: docker build -t windowbid . && docker run -p 3000:3000 -e OPENAI_API_KEY=… windowbid
├── render.yaml                   ← one-click deploy on Render (asks for OPENAI_API_KEY)
├── server/                       ← plan-reading backend (Node 18+, built-ins only)
│   ├── server.mjs                ← serves dist/ (and /src/), plus /api/health, /api/extract, polling and cancel
│   ├── takeoff-schema.mjs        ← the extraction prompt + strict JSON schema (edit here to tune results)
│   ├── mock.mjs                  ← canned reading used when no key is set
│   └── test/fake-openai.mjs      ← fake Responses API that checks every request, for offline testing
├── dist/
│   └── windowbid.html            ← BUILT single-file page = exactly what is live. Do not edit by hand.
├── src/                          ← SOURCE. Edit here, then run the build.
│   ├── index.html                ← all markup; <link>/<script> tags inside build markers
│   ├── css/                      ← loaded in this order (order = cascade, do not reorder)
│   │   ├── 01-tokens-base.css            colour/type tokens (light + dark), reset, type, buttons, header, logo lockup
│   │   ├── 02-plan-drawing.css           floor-plan line weights, detections, drawing frames
│   │   ├── 03-home-hero-stages.css       hero + "Three stages" rows
│   │   ├── 04-home-pinned-scenes.css     Review, handoff cards, Procure sheet, Fulfill trace
│   │   ├── 05-home-metrics-cta-footer.css
│   │   ├── 06-contact.css                page shell + Contact sentence form
│   │   ├── 07-status-cursor.css          status pills + drafting cursor
│   │   ├── 08-demo-app.css               the whole demo workspace
│   │   ├── 09-about.css                  About: logo construction, cube unfold, orange band
│   │   └── 10-additions-theme-motion.css later additions, theme switch/reveal, reduced-motion rule
│   └── js/                       ← classic scripts, loaded in this order (order matters)
│       ├── 00-theme-preload.js           runs in <head>: applies the saved/default theme before first paint
│       ├── 01-core-helpers.js            $, $$, el(), tween, toast, layout helpers, REDUCED flag
│       ├── 02-plan-model.js              the sample floor plan: SEED openings, rooms, walls, statuses
│       ├── 03-pricing.js                 BASE prices, SCALE calibration, MFRS (manufacturers), install cost
│       ├── 04-scroll-scheduler.js        SCENES list + one requestAnimationFrame loop for scroll scenes
│       ├── 05-theme-cursor.js            Theme module, W-gesture recogniser, drafting cursor + pen trail
│       ├── 06-router-reveals.js          hash router, aperture transition, reveal-on-scroll
│       ├── 07-home-hero-stages.js        hero blueprint assembly, Three-stages rows
│       ├── 08-home-review.js             Review pinned scene
│       ├── 09-home-procure-fulfill.js    Procure sheet, Fulfill trace, handoff cards
│       ├── 10-home-metrics.js            count-up metrics
│       ├── 11-about.js                   About page (prepare / enter / leave)
│       ├── 12-contact.js                 Contact sentence form
│       ├── 13-app-state-order.js         demo state, step routing, proposal + order screens
│       ├── 14-app-upload-viewer.js       upload, AI provider detection (Claude / WindowBid server), zoom/pan viewer
│       ├── 15-app-processing.js          sample run, PDF rendering, AI prompt + response handling
│       ├── 16-app-review-rfq-bids.js     review UI, CSV export, RFQ, bids
│       └── 99-boot.js                    initialises everything in order
├── scripts/
│   ├── build.py                  ← src/ → dist/windowbid.html (and --check)
│   ├── screenshots.py            ← optional: reference screenshots via Playwright
│   └── test_extraction.py        ← optional: end-to-end upload → reading → review test via Playwright
├── assets/
│   └── brand/qbotica-symbol.svg  ← standalone copy of the (rebuilt) cube symbol, for designers
└── docs/
    ├── DESIGN.md                 ← full design rationale, page by page (colours, type, motion, rules)
    └── PROJECT-NOTES.md          ← product details, demo data and numbers, wording rule, history
```

### How the source fits together
- **No modules, no bundler.** The JS files are classic `<script>` tags that share one global scope in the order listed. `99-boot.js` calls the `init…` functions. If you add a file, add its `<script src>` (or `<link>`) tag **inside the build markers** in `src/index.html`, in the right position.
- **Each JS file starts with `'use strict';`.** The build removes the duplicates and wraps everything in a single `(() => { … })();`, so the published page leaks no globals.
- **All drawings are code.** The floor plan, logo, icons and animations are SVG/CSS/JS; there are no image files. The qBotica symbol lives once as `<symbol id="qmark">` in `src/index.html` and is reused everywhere with `<use href="#qmark">`.
- **Colours and fonts** are CSS variables in `src/css/01-tokens-base.css`. The dark theme is a token block applied by `data-wb="dark"` on `<html>`.
- **Sample data** (12 openings, 3 manufacturers, $42,500 proposal, PO #WB-0048, dates) is consistent across the homepage and the demo. If you change a number, see `docs/PROJECT-NOTES.md` ("The demo data") for everything that must stay in sync.

---

## 8. Dependencies and requirements

| Requirement | Why | Needed for |
|---|---|---|
| Modern browser | View transitions (theme reveal), `position: sticky`, CSS `color-mix` | Viewing (older browsers degrade gracefully) |
| Internet access | **Google Fonts**: Archivo, Instrument Sans, Geist Mono, Poppins | The exact look (offline falls back to Arial/Helvetica) |
| Internet access, on demand | **PDF.js 3.11.174** from cdnjs, loaded only when a PDF is uploaded | Reading uploaded PDFs |
| **Node.js 18+** | `server/server.mjs` (built-in `fetch`, no npm packages) | AI plan reading with OpenAI; serving the full demo |
| **OpenAI API key with billing** | Plan reading through the server (API billing is separate from ChatGPT Plus) | Real readings (without a key, mock mode) |
| Python 3.8+ | `scripts/build.py`, simple static server | Building; static preview (standard library only) |
| Playwright (optional) | `pip install playwright && python3 -m playwright install chromium` | `scripts/screenshots.py` only |

There are **no npm or pip packages** for the site or the server.

### Where AI plan reading comes from

| Where the page runs | Reads uploaded plans with | Notes |
|---|---|---|
| **claude.ai artifact** (live link) | **Claude**, via the artifact's `sample` capability (declared at publish: `{sample: {}, downloads: true}`) | If the view can send images: image + text layer. If not: **PDF text layer only**. If the runtime gives no Claude access (signed out or AI turned off in that account): uploads disabled with an explanation. A claude.ai page cannot call your own server (the artifact sandbox blocks outside requests). |
| **WindowBid server** (`node server/server.mjs`, local or deployed) | **OpenAI**, via `server/server.mjs` | The key lives only on the server. Mock mode when no key is set. |
| Plain static hosting (no server) | — | Upload disabled with an explanation; the sample plan and everything else work. |

The page picks automatically: `window.claude` present → Claude; otherwise it calls `GET /api/health` on its own origin → OpenAI server; otherwise uploads are disabled.

---

## 8b. OpenAI plan reading: how it works

```
Browser                                   WindowBid server (server.mjs)                 OpenAI
───────                                   ─────────────────────────────                 ──────
upload PDF/PNG/JPG
render page 1 → PNG (PDF.js, ~2000 px)
POST /api/extract {image, filename,…} ──► validate · rate-limit · build request ──► POST /v1/responses
                                                                                       background: true
                                          ◄── {id: resp_…, status: queued} ◄──────────  strict JSON schema
poll GET /api/extract/:id every 2.5 s ──► GET /v1/responses/:id ─────────────────────►  queued → in_progress
show "Reading plan · 1:12", steps, log    ◄── status / elapsed                          → completed
                                          completed → parse output_text → JSON
◄── {status: completed, result} ◄────────
review UI: boxes, callouts, Needs review → dealer verifies / edits → Mark Ready for RFQ
Stop button ──► POST /api/extract/:id/cancel ──► POST /v1/responses/:id/cancel
```

**What the model returns** (`server/takeoff-schema.mjs`, enforced with Structured Outputs in strict mode):

```json
{ "sheet": "floor plan",
  "summary": { "total_windows": 36, "total_doors": 4, "unique_configurations": 18 },
  "openings": [ { "mark": "W01", "category": "window", "type": "Sliding",
                  "raw_callout": "5050 XO", "width_in": 60, "height_in": 60, "room": "Bedroom 2",
                  "quantity": 1, "tempered_glass": false, "egress": true,
                  "box": [120, 80, 180, 96], "confidence": 0.94, "needs_review": false, "note": "" } ] }
```

- `raw_callout` is copied **exactly as written** on the drawing and shown on the review card as evidence. The interpretation (type, inches) sits next to it, so a dealer can check how the result was reached.
- `needs_review: true` caps confidence below 85%, so the opening shows **Needs review**.
- `quantity > 1` becomes one takeoff row per unit (W3, W3·2, …), so grouping and pricing stay correct.
- `box` uses a 0–1000 scale of the page and draws the detection on the plan. Schedule rows have `box: null`.
- `type` is one of the review UI's types. **Keep `TYPES` in `server/takeoff-schema.mjs` and `src/js/13-app-state-order.js` identical.**

### Configuration (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | *(empty → mock mode)* | Your OpenAI Platform key. **Server only.** |
| `OPENAI_MODEL` | `gpt-6-astra` | Vision-capable model (OpenAI's current recommendation for new projects). Any model your key can use with image input and Structured Outputs works. |
| `OPENAI_IMAGE_DETAIL` | `high` | How closely the model inspects the image (`high` / `low` / `auto`). |
| `OPENAI_REASONING_EFFORT` | *(empty)* | Optional `low` / `medium` / `high` for reasoning models. |
| `OPENAI_MAX_OUTPUT_TOKENS` | `32000` | Raise it if very large plans return "incomplete". |
| `PORT` | `3000` | Server port (hosts like Render set it automatically). |
| `MAX_UPLOAD_MB` | `20` | Largest page image accepted. |
| `EXTRACTIONS_PER_HOUR` | `20` | Per-visitor limit to protect your API budget on a public deployment. |
| `WB_MOCK` / `WB_MOCK_SECONDS` | — / `12` | Force mock mode and set how long a mock reading takes. |

### Security rules
- **The API key never goes to the browser.** It is read from the environment on the server. `.env` is in `.gitignore` and `.dockerignore`, and this project contains no key.
- **If a key is ever pasted into a chat, email or repo, revoke it** at https://platform.openai.com/api-keys and create a new one.
- On a public URL, also set a **monthly spend limit** for the project in the OpenAI dashboard. The server's per-IP hourly limit is a second line of defence.
- The server only polls or cancels jobs it started itself, so it can't be used as a general proxy to your OpenAI account.
- Background responses are held by OpenAI for polling; see OpenAI's data-retention docs for your project settings.

### Testing without a real key
```bash
node server/test/fake-openai.mjs 4010                     # terminal 1: fake Responses API (checks every request)
OPENAI_BASE_URL=http://127.0.0.1:4010/v1 OPENAI_API_KEY=sk-test-fake node server/server.mjs   # terminal 2
python3 scripts/test_extraction.py http://127.0.0.1:3000  # terminal 3 (needs Playwright + Pillow)
```
The fake checks for: the key header, `background: true`, a strict `json_schema` in which every property is required and `additionalProperties` is false, `instructions`, an `input_text` and an `input_image` data URL. It then walks the job through queued → in_progress → completed. In the v11 run this passed end to end: 5 rows, `quantity: 2` expanded to W3 and W3·2, callouts and Needs review shown, Stop cancels the job, and a rejected key gives a clear message.

**Note:** the real OpenAI API could not be called from the environment where this was built, so the first run with your real key is the true test. If OpenAI rejects a field, the server log and the on-screen error show OpenAI's exact message.

---

## 9. Build and verify

```bash
python3 scripts/build.py           # writes dist/windowbid.html from src/
python3 scripts/build.py --check   # confirms dist/ matches src/ (exits non-zero if not)
sha256sum dist/windowbid.html      # b421cb93e1b134c8532dd748e114165b8fa67f15610a7065120ab3842c156e24 for this package
```

**Workflow:** edit files in `src/` → check them at `http://localhost:3000/src/index.html` (server) or `http://localhost:8080/src/index.html` (static) → run `scripts/build.py` → check `http://localhost:3000/` → deploy the server and/or publish `dist/windowbid.html`.

The build is lossless: splitting the original single-file page into `src/` and rebuilding it produced the exact same bytes. After each code change, the rebuilt `dist/windowbid.html` is read back and checked byte for byte.

---

## 10. How to get the exact same preview

1. Run `node server/server.mjs` and open **http://localhost:3000** (or serve statically with `python3 -m http.server 8080` and open `http://localhost:8080/dist/windowbid.html`), with internet access so the fonts load.
2. **Theme:** the page opens dark. If you previously switched to light, it remembers that. To reset, run `localStorage.removeItem('wb-theme')` in the browser console, or draw a W, or use the footer switch.
3. **Viewport:** the reference look is a desktop window around **1440 × 900**. Phones and tablets get their own responsive layouts on purpose.
4. **Motion:** animations play in full unless the operating system has "reduce motion" turned on; then you see final states.
5. **Start positions:** the hero and About logo animate on load. The Review, Procure and Fulfill scenes are driven by scroll, so scroll slowly to watch them.
6. **Direct links:** `…/windowbid.html#about`, `#contact`, `#takeoff` (opens the demo).
7. **Optional proof:** `python3 scripts/screenshots.py` saves 15 reference screenshots to `screenshots/` (Playwright plus internet needed).
8. **Stale page:** if a deployed copy ever looks older than `dist/windowbid.html`, hard-refresh (Cmd/Ctrl + Shift + R).

## 11. Publishing and deployment

| Target | What you get | How |
|---|---|---|
| **Render** (easiest public link with OpenAI reading) | `https://<your-service>.onrender.com` | Push this folder to a GitHub repo → Render → **New → Blueprint** → pick the repo (uses `render.yaml`) → paste your new `OPENAI_API_KEY` when asked. Free instances sleep when idle; the first visit can take ~30 s. |
| **Railway / Fly.io / any Node host** | your host's URL | Start command `node server/server.mjs`; set `OPENAI_API_KEY` as a secret. No build step, no `npm install`. |
| **Standalone single file** (demo only) | open `dist/windowbid-standalone.html` directly (double-click) | Built with `python3 scripts/build.py --standalone`. No server: plans are read by OpenAI straight from the browser. On the first upload it asks for an OpenAI API key and keeps it in that browser's localStorage; the key is never written into the file. Use only on your own machine, since anyone using the page in that browser spends that key. |
| **Docker** | anywhere | `docker build -t windowbid . && docker run -p 3000:3000 -e OPENAI_API_KEY=... windowbid` |
| **Static host only** (Netlify, GitHub Pages, S3) | static URL | Upload `dist/windowbid.html`. Everything works except reading your own uploads. |

## 12. Troubleshooting

| Symptom | Fix |
|---|---|
| Fonts look like Arial/Helvetica | No internet, or Google Fonts is blocked. Connect and reload. |
| The live link shows an older design | Browser cache. Hard-refresh. |
| Stuck on the light theme | Draw a W, use the footer switch, or clear `wb-theme` from localStorage. |
| The W gesture doesn't trigger | Draw it steadily, about palm-sized (at least ~100 × 60 px), left to right, in 0.3–2 s. Very fast zigzags are ignored on purpose. Desktop mouse or trackpad only. |
| On claude.ai: "Claude isn't available to this page in this view" | The runtime didn't give the page Claude access. This happens when signed out, or in an account or organization (e.g. a school or work workspace) where AI inside artifacts is turned off. Open the link in the claude.ai account that owns it, or use the WindowBid server. |
| On claude.ai: "PDFs are read from their text layer" | This view can't send images to Claude. CAD-exported PDFs still work (their text carries the tags and callouts). Scans and image files need image reading: use another account or the WindowBid server. |
| "This PDF has no text layer (it looks like a scan)" | Only in text-only views. Export the drawing to PDF from the CAD tool instead of scanning, or use the WindowBid server (OpenAI reads the image). |
| The upload area says reading needs the WindowBid server | You opened the page from a static server or file. Run `node server/server.mjs` and open http://localhost:3000. |
| "The server's OpenAI API key was rejected" | Wrong or revoked key in `.env`. Paste the new key and restart the server. |
| "Model … isn't available to this API key" | Set `OPENAI_MODEL` to a vision model your account can use, then restart. |
| "OpenAI rate limit or quota reached" | Add billing or credits on the OpenAI Platform (ChatGPT Plus doesn't include API credits), or wait. |
| Reading stops with "more openings than one reading can return" | Raise `OPENAI_MAX_OUTPUT_TOKENS`, or crop the page to the floor plan. |
| Upload says "Hourly limit reached" | `EXTRACTIONS_PER_HOUR` protects your budget. Raise it in `.env` if needed. |
| Server prints "MOCK mode" | No `OPENAI_API_KEY` found. Check that `.env` sits next to `package.json` and the line has no spaces around `=`. |
| Edited `src/` but `dist/` didn't change | Run `python3 scripts/build.py`. |
| A new CSS/JS file doesn't load in `dist/` | Its tag must sit inside the `<!-- build:css -->` or `<!-- build:js -->` markers in `src/index.html`. |

## 13. Further reading
- **OpenAI docs used for the integration:** Background mode (`background: true`, poll `GET /v1/responses/{id}`, cancel), Structured Outputs (`text.format` with a strict `json_schema`), Images and vision (`input_image`).
- **`docs/DESIGN.md`**: every design decision and the reason for it, page by page, plus the checklist for adding new work.
- **`docs/PROJECT-NOTES.md`**: product details, the full demo data (openings, bids, prices, dates), the wording rule and version history.

© 2026 qBotica · WindowBid. Internal prototype; not licensed for redistribution.