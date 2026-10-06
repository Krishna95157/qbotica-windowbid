# qBotica WindowBid — Demo (v18, saved working version)

**Review. Procure. Fulfill.** Upload an architectural drawing set — one sheet or a 90-page PDF — and get a
**window takeoff**: every window with its tag, type, size, room and glass, read from the drawings, shown on
the plan, explained in plain words, and ready to check, export and send for quotes.

| | |
|---|---|
| **Run it** | `node server/server.mjs` → open the address it prints (section 2) |
| **What's real** | Uploading, reading the drawings, the takeoff and the review screen |
| **What's sample data** | RFQ, bids, proposal and order tracking (labelled "Platform preview") |
| **Reads plans with** | OpenAI `gpt-6-astra`, called only by this project's own server (the key never reaches the browser) |
| **Built with** | Plain HTML/CSS/JavaScript, PDF.js, SVG, Node.js (no npm packages) — section 6 |
| **Tested on** | Two real 30-page drawing sets and a single floor plan — section 5 |
| **Owner** | Internal demo for qBotica |

---

## Contents

1. [What it does](#1-what-it-does)
2. [Getting it running](#2-getting-it-running)
3. [How the extraction works — the pipeline](#3-how-the-extraction-works--the-pipeline)
4. [Why it is built this way](#4-why-it-is-built-this-way)
5. [Results on real drawings](#5-results-on-real-drawings)
6. [Technologies](#6-technologies)
7. [The review screen](#7-the-review-screen)
8. [Design](#8-design)
9. [Project structure](#9-project-structure)
10. [Server API](#10-server-api)
11. [Configuration](#11-configuration-env)
12. [Security and cost](#12-security-and-cost)
13. [Testing](#13-testing)
14. [Limits and known issues](#14-limits-and-known-issues)
15. [Version history](#15-version-history)
16. [Related projects](#16-related-projects)

---

## 1. What it does

A window dealer has to turn an architect's drawing set into a list of windows to price. In a real set the
facts about one window are **spread over several sheets**:

```
 Floor plan (sheet A-2.1, page 7)                 Window schedule (sheet A-4.1, page 15)
 ───────────────────────────────                  ──────────────────────────────────────────────
   wall ═══╡ ⬡6 ╞═══ wall                          MARK  SIZE           OPERATION  TEMPERED  QTY
          (just a tag — no size here)              ⬡6    4'-0" X 2'-6"  FIXED      NO        5
```

WindowBid reads the set the way an estimator does — find the floor plans, find the schedule, match every
tag on the plan to its row in the schedule — and produces one takeoff:

| Mark | Room | Type | Size (in) | Found in |
|---|---|---|---|---|
| 6·1 … 6·5 | Great Room | Picture (fixed) | 48 × 30 | Tag 6 on A-2.1 (p.7) · Schedule on A-4.1 (p.15) |

Then the dealer reviews it: every window is boxed on the plan, explained in plain words, and verified,
corrected or removed. The verified takeoff becomes an RFQ for manufacturers (sample screens from there on).

**Windows only.** Doors of every kind are left out on purpose; this is a window bid.

---

## 2. Getting it running

### What you need

| | Why |
|---|---|
| **Node.js 18+** | runs the server (`server/server.mjs`); nothing to install with npm |
| **An OpenAI API key with billing** | reading the drawings (a ChatGPT subscription is not API credit) |
| **Internet access** | OpenAI, Google Fonts, and PDF.js (loaded from cdnjs when a PDF is opened) |
| Python 3 *(only to change the page)* | `scripts/build.py` rebuilds `dist/windowbid.html` from `src/` |

### Start it

```bash
cd qbotica-windowbid-release-v18
cp .env.example .env              # once; then put your key after OPENAI_API_KEY=
node server/server.mjs            # or: npm start
```

It prints `WindowBid running at http://localhost:<PORT>` and `Plan reading: OpenAI gpt-6-astra …`. Open that
address, click **Try Demo**, then upload a PDF or use the sample plan. With no key the server runs in
**mock mode** (sample answers, free), so the whole flow can be tried first.

### Share it

| Way | How | Notes |
|---|---|---|
| **Instant link** | in a second terminal: `cloudflared tunnel --url http://localhost:<PORT>` → prints `https://….trycloudflare.com` | free, no sign-up; works only while this computer is on and both terminals run; a new address each time |
| **Permanent link** | push to a (private) GitHub repo → Render → New → Blueprint → pick the repo (uses `render.yaml`) → paste `OPENAI_API_KEY` | fixed `https://….onrender.com`; free plan sleeps when idle (first visit ~30 s) |
| Docker | `docker build -t windowbid . && docker run -p 3000:3000 -e OPENAI_API_KEY=… windowbid` | any host |
| Static only | upload `dist/windowbid.html` anywhere | the sample plan works; reading your own plans needs the server |

---

## 3. How the extraction works — the pipeline

Two parts work together: **the page in the visitor's browser** does the PDF handling, the choosing and all
the matching; **the server** holds the OpenAI key and asks OpenAI to read images. OpenAI only ever *reads
pictures of sheets*; everything else is ordinary, traceable code.

```
 BROWSER  (dist/windowbid.html)                         SERVER (server/server.mjs)        OpenAI
 ─────────────────────────────────                      ──────────────────────────        ──────
 0  OPEN       PDF.js renders pages, reads the text layer
 1  SORT       every page → 1000 px JPEG + its biggest text ──"classify" (8 pages/call)──►  gpt-6-astra
                                                           ◄── kind · sheet no. · level · tag style · schedule boxes
 2  CHOOSE     tagged floor plans + schedule tables (plain code)
 3  READ       first: schedules → 2400 px crops + text layer ───"page"──────────────────►  gpt-6-astra
                                                           ◄── schedule rows + row boxes (strict JSON)
               schedule gives every size and count? → takeoff ready, review opens;
                 the plans are then read in the background and each unit placed on its plan
               otherwise: plans → 4000 px PNG + text layer ─────"page"──────────────────►  (full detail)
                                                           ◄── openings by tag (strict JSON)
 3b ELEVATIONS only if many tags are still unexplained ─────"page"──────────────────►
 4  JOIN       tag ↔ schedule row, quantities, conflicts, doors out (plain code)
 5  REVIEW     boxes on the plan, cards, plain words, preview, CSV
```

Each call to OpenAI is a **background job**: the server starts it and returns an id at once; the browser
asks for the result every 2.5 s (that's the live "Reading drawing set · 2:41" timer). Up to 3 jobs run at a
time. **Stop** cancels the running jobs.

### Step 0 — Open the file (browser, `17-app-document.js`)

- **PDF.js 3.11.174** opens the PDF in the browser; nothing is uploaded as a file.
- For each page it renders an image and extracts the **text layer**: every text item with its position
  (tags, size callouts like `5050 XO`, room names, sheet titles). CAD-exported PDFs carry this text exactly,
  so it is sent along with every image as a spelling reference ("x,y: text", positions on a 0–1000 scale).
- Images (PNG/JPG/WebP) and one-page PDFs skip step 1 and go straight to step 3.

### Step 1 — Sort every page (AI, cheap pass)

- Every page becomes a **1000 px JPEG** (quality 0.72) plus the **largest text on the sheet** (title block
  and sheet titles, up to 500 characters) — enough to tell a floor plan from an electrical plan.
- Pages go to the server in **batches of 8**, task `classify`, at image detail `high`.
- For each page the model returns (strict JSON, `server/document-schema.mjs`):
  `kind` (floor_plan · window_schedule · door_schedule · window_door_schedule · window_types · elevation ·
  other_plan · other), `sheet_number` (e.g. A-2.1), `title`, `level` (first floor, casita…),
  `opening_tags` (many/few/none), `tag_style` (symbols / callouts / both / none) and `schedule_regions`
  (boxes around every window schedule or type-legend table on the page).
- The model is told to judge each page by its drawings and title, not by a sheet index printed on a cover.

### Step 2 — Choose the sheets (plain code)

- **Floor plans tagged with symbols** (⬡6, ①…): *all* of them are read (up to 6), so a level split over a
  "NOTED FLOOR PLAN – CONTINUED" sheet stays whole. Dimensioned plans and electrical/framing/roof plans
  repeat the same walls and are skipped, so nothing is counted twice.
- If no plan uses tag symbols: **one plan per level** — the one with the most size callouts.
- **Every window schedule / window type legend** (up to 6 pages, up to 3 tables per page), read as a
  zoomed crop of the table (its box padded a little), also when the table sits on a plan sheet.
- The log lists the chosen sheets and how many were skipped.

### Step 3 — Read the chosen sheets (AI, full detail) — one thing first, the rest only if needed

**The rule:** read the **window schedule first**. If every window row in it has a size and a count (a
`#` / `QTY` column), the schedule *is* the takeoff: the floor plans and elevations are **not read**, and the
takeoff is built straight from the schedule rows (mark 5 × 15 → fifteen windows `5·1 … 5·15`). The log says
"The window schedule lists all 65 windows (12 marks) with sizes and counts · floor plans not needed". The
viewer then shows the schedule sheet, with one box per row (`5 ×15`), so clicking a product highlights its row.
Only when the schedule is missing, has no count column, or has rows without a size (the log says which) are
the floor plans read and joined as below, before the review opens.

**Every schedule, not just the first.** Page sorting looks at every page, so every page carrying a window
schedule is read (up to 12) and the log names them: "Window schedules found on 2 pages: A-2.1, A-2.2". A table
that repeats one already read (most rows the same mark and size) is **counted once** ("A-2.1 repeats A-2.2 ·
counted once"); a table that reuses marks with other sizes is kept as a **separate schedule** (marks
`A-4.2/1…`, flagged); new marks simply continue the list.

**Plans mapped in the background (v16).** When the takeoff comes from the schedule, the review opens at once
on the schedule sheet, unchanged. Behind it, the floor plans (same choice as step 2) are read and every plan
window is matched by its tag to its schedule mark and placed on the next unplaced unit of that mark (`mapPlans`).
Counts never change — the schedule stands; "the plans show 16, the schedule lists 15" or "not found on the floor
plans" is noted on the product. A line above the list shows progress, then "64 of 65 windows located on A-2.1".
From then on, selecting a product switches the viewer to the plan page and highlights its windows, each with
its room. (37th Place: review in ~1 min, plans mapped ~2 min later; 8887: 66 of 78 placed.)

- **Plans**: rendered at **4000 px** (PNG) and sent with the page's text layer, at image detail
  **`original`** (see section 4 for why). A 3000 px JPEG copy is kept for the review viewer.
- **Schedule tables**: rendered as **2400 px crops** of just the table.
- Task `page`; the model returns two lists (strict JSON):
  - `openings` — every **exterior window drawn on the plan**: `tag` exactly as written, `box` on the
    sheet, `room`, and only what is written *at* the opening (`raw_callout` such as "3050 SH", size, type,
    tempered, egress). A window with only a tag gets size `null` — its size comes from the schedule.
  - `definitions` — every **window schedule row**: `key` (the mark), `size_text` exactly as written,
    `width_in`/`height_in`, `type`, `quantity`, `tempered_glass`, `egress`, `exterior`, `remarks`, and
    `row_box` (where that row sits, to highlight it on the schedule sheet).
- The instructions are strict: report only what this sheet shows; never invent sizes or tags; keynote
  bubbles, room numbers, grid bubbles and detail callouts are **not** window tags; skip every kind of door;
  size codes mean feet+inches (`5050` = 60 × 60 in, `2640` = 30 × 48 in); `XO` = sliding, `SH` = single
  hung, `FX/FXD/PW` = picture…
- If a model doesn't accept `original` detail, the server retries at `high` automatically.

### Step 3b — Elevations (only when needed)

If many plan tags still have no schedule row (or the set has no schedule at all), up to 4 **exterior
elevation** sheets are read for tag → size/type notes. A stray keynote read as a tag doesn't trigger this.

### Step 4 — Join everything (plain code, `mergeSet` in `17-app-document.js`)

| Situation | Result |
|---|---|
| Plan tag matches a schedule row | size, type, tempered, egress come from the schedule; **Found in** lists both sheets |
| Tag spelled differently (`3` vs `W3`, `03`) | normalized and matched |
| Same mark read from two sources | schedule beats type legend beats a schedule on a plan sheet beats an elevation; disagreements are flagged |
| A lone "window" row read from a door table (or the reverse) | treated as a misread; can't override the proper table |
| Schedule quantity > windows found on the plans | the missing units are added without a location, flagged "A-4.1 lists 11; 8 found on the plans" |
| More on the plans than the schedule lists, or the schedule lists **0** | flagged |
| Tag with no schedule row (often a keynote read as a tag) | flagged "Tag 21 isn't in any schedule found in this set" |
| Plan note and schedule disagree on size | schedule wins, both values shown, flagged |
| Anything that is a door (by tag, type or a door row) | left out; the log says how many |
| Schedules but no floor plan | one row per scheduled window, without a location |

**Marks** follow the drawing: tag `6` found five times becomes `6·1 … 6·5`; untagged windows get `W01, W02…`.
**Confidence** comes from the model, capped when it asked for review or when sources disagree; below 85 % a
window shows **Needs review**, and a missing width or height always does.

### Single sheets

A one-page PDF or an image goes through the same READ step with `kind: auto` (floor plan, elevation or
schedule, whichever it is) and the same JOIN, so a plan whose windows carry their size in a callout
(`5050 XO`) works with no schedule at all.

### The server's part (`server/server.mjs`)

- Serves the page (`dist/`) and three tasks on `POST /api/extract`: `classify`, `page`, and `takeoff`
  (the older single-page format).
- Builds the request to the **OpenAI Responses API** with `background: true`, the instructions, the image(s)
  as `input_image` data URLs with the chosen detail, and a **strict JSON schema** (Structured Outputs), so
  every answer has exactly the expected fields.
- Polling (`GET /api/extract/:id`) and cancel (`POST /api/extract/:id/cancel`); it only answers for jobs it
  started itself, so it can't be used as a proxy to the OpenAI account.
- Limits each visitor (by IP) to `EXTRACTIONS_PER_HOUR` reading calls and requests to `MAX_UPLOAD_MB`.
- Error messages shown in the page never name the provider ("the reading service"); details go to the
  server's log.
- No key → **mock mode**: sample sorting and sheet results after a short wait, free.

---

## 4. Why it is built this way

These choices came from measuring, not guessing.

- **Image detail `original` for sheet reads.** With `high`, the model shrinks *every* image to about 3,000
  tokens, however large it is; tag digits and size codes blur. At `original` a 4000 px sheet is about
  13,500 tokens. On the RC-Mahesh sheet this alone took exact window sizes from **32–56 % to 96 %**.
- **Sort first, then read only what matters.** A 30-page set has 2–4 sheets that carry the windows.
  Reading only those at full detail keeps it to about 10–15 calls and 2–3 minutes.
- **Crops for schedules.** A schedule is a small table on a big sheet; a 2400 px crop of the table gives the
  model far more pixels per character than the whole sheet.
- **The text layer goes with every image.** CAD PDFs contain the exact characters; the model uses them for
  spelling and the image for meaning (which number is a tag, which is a keynote).
- **Tag symbols decide which plans to read.** Real sets split one floor over "continued" sheets (8887-25:
  A-2.1 + A-2.2); reading one plan per level lost windows, reading every *tagged* plan doesn't.
- **The AI reads; code decides.** Matching, counting, quantity checks and the plain-words summaries are
  deterministic, so every number in the takeoff can be traced to a sheet and a line.
- **Background jobs + polling.** A full-detail read can take minutes; the page never waits on one long
  request and shows real progress instead.
- **Strict JSON schemas.** No parsing of free text; the model can't return a malformed answer.

---

## 5. Results on real drawings

Measured with `gpt-6-astra` (October 2026). The two sets are real 30-page architectural sets with
window schedules; RC-Mahesh is a single plan whose windows carry their size in callouts.

| File | Pages | Sheets chosen | Result | Time |
|---|---|---|---|---|
| 37TH PLACE – FULL SET (v15, schedule first) | 31 | schedule A-4.1 (p.15) only — plans not needed | **65 windows, 12 products**, equal to the schedule's # column | ~1 min |
| 8887-25 APPROVED – FULL SET (v15, schedule first) | 30 | schedules on A-2.1/A-2.2 only — plans not needed | **78 windows, 15 products** from the schedule's counts | ~1 min |
| 37TH PLACE – FULL SET (v14, plans + schedule) | 31 | noted floor plan A-2.1 (p.7), schedules A-4.1 (p.15) | **65 of 65 windows**, every tag count equal to the schedule's quantity; doors left out | ~2 min |
| 8887-25 APPROVED – FULL SET (v14, plans + schedule) | 30 | A-2.1 (p.3) + A-2.2 "continued" (p.4), schedules on both | **12 of 15 tags counted exactly**; the other 3 flagged (one is a real drawing conflict: three ⬡2 tags on the plan, schedule quantity 0) | ~2.5 min |
| RC-Mahesh – Final FP-2 | 1 | page 1 | **24 of 25 window sizes exactly right** (32–56 % before the detail change); untagged symbols flagged | ~2 min |

Page sorting picked the right sheets in every test (e.g. 2 of 31 pages on 37TH PLACE).

---

## 6. Technologies

| Layer | Technology | Used for |
|---|---|---|
| Page | **HTML, CSS, JavaScript** — no framework, no bundler | the whole site and demo; about 20 classic scripts sharing one scope |
| Drawing | **SVG** | the plan viewer, detection boxes, previews, the animated homepage plans and logo |
| PDF | **PDF.js 3.11.174** (Mozilla, from cdnjs, loaded on demand) | rendering pages, crops and thumbnails; extracting the text layer |
| Canvas | **HTML Canvas** | rendering pages/crops to PNG/JPEG for the model and the viewer |
| Server | **Node.js 18+** built-ins only (`http`, `fs`, `crypto`, `fetch`) | serving the page, the reading API, rate limits, mock mode |
| AI | **OpenAI Responses API**: background mode, **Structured Outputs** (strict JSON schema), `input_image` with detail `original`/`high` | page sorting and sheet reading |
| Model | **`gpt-6-astra`** (set by `OPENAI_MODEL`) | vision + structured extraction |
| Build | **Python 3** (`scripts/build.py`, standard library) | combines `src/` into the single file `dist/windowbid.html` |
| Fonts | **Google Fonts**: Archivo, Instrument Sans, Geist Mono, Poppins | statements, body text, technical labels, logo |
| Hosting | **Cloudflare quick tunnel**, **Render** (`render.yaml`), **Docker** (`Dockerfile`) | sharing the demo |
| Testing | mock mode, a fake Responses API (`server/test/fake-openai.mjs`), **Playwright** with Chrome | end-to-end checks of upload → reading → review |

No database: a takeoff lives in the page while it's open, and the CSV export is the saved result.

---

## 7. The review screen

`src/js/16-app-review-rfq-bids.js` (cards, list, preview, CSV) and `src/js/14-app-upload-viewer.js` (viewer).

- **Plan viewer**: zoom and pan; every window boxed with its mark; a **sheet switcher** when several plan
  sheets were read (`A-2.1 · 70`, `A-2.2 · 28`).
- **Statuses**: *AI read* (orange) · *Needs review* (orange, dashed) · *Verified* (green) · *Edited*.
  The window you select turns **blue** everywhere (box, list row, card).
- **The card** for each window:
  - **In plain words** — what it is ("a casement window — it swings outward on side hinges"), its size in
    feet and inches, the room, the sheet and the part of the drawing it sits in, its tag and the schedule
    that explains it, how many like it the house has, tempered/egress glass, and what to do next.
    Written by code from what was read — no extra AI call — and it follows edits.
  - **No number on the plan?** It says so and gives the likely reason it was counted: a clerestory (set
    high in the wall, so drawn only as a dashed line), a transom, a size note on a plan that names windows
    by size, a note that may belong to a neighbour, or only a window-like symbol ("it may not be a window
    at all"); and "count the arrows" when one note covers several windows.
  - editable type, room, width, height; the **drawing callout as written** with Tempered/Egress badges;
    **Found in** (the sheets each fact came from); review notes; **Not an opening**.
- **All N**: a grid of every window with a zoomed preview of its spot on the plan, type, size, room and
  status; click one to open it, Back/Esc returns.
- **Grouped products** (the view it opens on): identical windows (type + size) become one product line
  with a quantity. **Click** a product to see its windows on the plan; **double-click** to open it — it lists
  its windows and the plan zooms to frame them; click one for its card (**← Products** goes back).
- **One header that flips**: click *Grouped products ⇄* to see every opening; click *Openings ⇄* to go back.
- **Pre-processing** (automatic): openings with neither a window number nor a size on the drawing are left
  out when the review opens; a line under the list names them, with **Put them back**.
- **Verify all** confirms every window at once (there is no per-window Verify). **Mark Ready for RFQ** is
  always available — it verifies any window left — then **Export CSV** (adds *Plan sheet* and *Found in*).
- Keyboard: ↑/↓ or J/K to move, Esc.
- After that: RFQ → bids from three sample manufacturers → customer proposal (margin slider) → purchase
  order with a seven-step tracker — **sample data**, labelled "Platform preview".

---

## 8. Design

- **Drafting-paper look**: ruled frames, sheet labels, registration marks — the industry's own visual
  language, not a generic dashboard. Typefaces: Archivo (statements), Instrument Sans (text), Geist Mono
  (technical labels).
- **Colour rule**: **orange** = read by the machine / needs attention · **green** = confirmed by a person ·
  **blue** = the window you selected.
- **Dark theme by default**; draw a **W** with the mouse or use the footer switch to change it.
- **Wording rule**: the dealer *verifies* the takeoff, the customer *accepts* the proposal, the manufacturer
  *acknowledges* the PO.
- The homepage tells the story in three animated, scroll-driven scenes (Review → Procure → Fulfill).
- Full design notes: `docs/DESIGN.md`. How to design anything new so it matches: `docs/DESIGN-PATHWAY.md`. The idea in plain words: `docs/CONCEPT.md`.

---

## 9. Project structure

```
qbotica-windowbid-release-v18/
├── README.md                     ← this file   (the previous README: docs/README-v13-previous.md)
├── .env / .env.example           ← settings and the OpenAI key (.env is never committed)
├── package.json                  ← npm start / build / check shortcuts (no dependencies)
├── Dockerfile, render.yaml       ← hosting
├── server/
│   ├── server.mjs                ← serves dist/, the reading API, background jobs, rate limits, mock mode
│   ├── document-schema.mjs       ← drawing sets: sorting + sheet-reading instructions and JSON schemas
│   ├── takeoff-schema.mjs        ← single-page instructions and schema (older format, standalone build)
│   ├── mock.mjs                  ← sample answers without a key
│   └── test/fake-openai.mjs      ← fake Responses API for offline tests
├── src/                          ← SOURCE — edit here, then: python3 scripts/build.py
│   ├── index.html
│   ├── css/01…10-*.css           ← tokens (colours/fonts, light + dark) … demo app … additions
│   └── js/
│       ├── 01–12                 ← helpers, sample plan, homepage scenes, About, Contact
│       ├── 13-app-state-order.js        demo state, steps, proposal + order screens
│       ├── 14-app-upload-viewer.js      upload, server detection, plan viewer, sheet switcher
│       ├── 15-app-processing.js         sample run, single-page reading
│       ├── 16-app-review-rfq-bids.js    review cards, plain words, All-windows preview, CSV, RFQ, bids
│       ├── 17-app-document.js           drawing sets: sort → choose → read → join
│       └── 99-boot.js
├── dist/windowbid.html           ← BUILT single file the server serves (don't edit by hand)
├── scripts/build.py              ← src/ → dist/ (and --check)
└── docs/                         ← DESIGN.md, PROJECT-NOTES.md, accuracy/ (RC-Mahesh answer key)
```

---

## 10. Server API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | `{ok, mock, tasks}` — the page uses it to switch reading on |
| `POST` | `/api/extract` | start a reading job → `202 {id, status}`; body by task below |
| `GET` | `/api/extract/:id` | `{status: queued \| in_progress \| completed \| failed \| incomplete \| cancelled, elapsed, result?}` |
| `POST` | `/api/extract/:id/cancel` | cancel a job |

| Task | Body | Returns |
|---|---|---|
| `classify` | `{filename, total, pages: [{page, image, text}]}` (≤ 16 pages) | `{pages: [{page, kind, sheet_number, title, level, opening_tags, tag_style, schedule_regions, confidence}]}` |
| `page` | `{filename, page, total, kind, level, title, crop, width, height, image, textLayer}` | `{sheet, openings: [...], definitions: [...]}` |
| `takeoff` | `{filename, width, height, pages, image, textLayer}` | `{sheet, summary, openings}` (single page, older format) |

---

## 11. Configuration (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | *(empty → mock mode)* | the key; server only |
| `OPENAI_MODEL` | `gpt-6-astra` | the reading model |
| `OPENAI_PAGE_DETAIL` | `original` | image detail for sheet reads |
| `OPENAI_CLASSIFY_DETAIL` | `high` | image detail for page sorting |
| `OPENAI_IMAGE_DETAIL` | `high` | image detail for the older single-page task |
| `OPENAI_REASONING_EFFORT` | *(empty)* | optional `low` / `medium` / `high` |
| `OPENAI_MAX_OUTPUT_TOKENS` | `32000` | raise if a very large plan comes back "incomplete" |
| `PORT` | `3000` | local port (hosts set it themselves) |
| `MAX_UPLOAD_MB` | `20` | largest request (one sheet image or one batch of thumbnails) |
| `EXTRACTIONS_PER_HOUR` | `200` | reading calls per visitor per hour; one drawing set uses about 10–15 (use ~30 on a public link) |
| `WB_MOCK` / `WB_MOCK_SECONDS` | — / `12` | force mock mode; how long a mock reading takes |

---

## 12. Security and cost

- **The key stays on the server** (`.env`, or the host's secret settings). `.env` is in `.gitignore` and
  `.dockerignore`; the page and the repository never contain it.
- **Every reading is billed to that key**, including readings by anyone with a public link. Set a
  **monthly spend limit** in the OpenAI dashboard and keep `EXTRACTIONS_PER_HOUR` low on public links.
- If a key is ever pasted into a chat, email or repository, replace it at
  https://platform.openai.com/api-keys.
- The server only polls or cancels jobs it started, and accepts only image data URLs of limited size.

---

## 13. Testing

- **Mock mode** (no key): `WB_MOCK=1 node server/server.mjs` — upload any multi-page PDF and watch sorting,
  the tag join, a door left out, a quantity shortfall and an unknown tag being flagged, at no cost.
- **Fake OpenAI**: `node server/test/fake-openai.mjs 4010`, then
  `OPENAI_BASE_URL=http://127.0.0.1:4010/v1 OPENAI_API_KEY=sk-test node server/server.mjs` — checks every
  request the server sends (background mode, strict schema, image input).
- **End to end**: `scripts/test_extraction.py` (Playwright) drives upload → reading → review in a browser.
- **Build check**: `python3 scripts/build.py --check` confirms `dist/` matches `src/`.
- **Accuracy**: `docs/accuracy/RC-MAHESH-ACCURACY.md` holds a hand-built answer key for the RC-Mahesh sheet.

---

## 14. Limits and known issues

- **Untagged symbols.** A window-like symbol with no number, no size and no note is a guess from the
  drawing's shape (e.g. a refrigerator space). It is shown as *Needs review* with that explanation; check
  it or remove it with **Not an opening**.
- **Keynote bubbles** are sometimes read as window tags; they show up as "isn't in any schedule".
- **Shared callouts** (one note with arrows to several clerestories) are counted from the arrows — verify
  the count.
- Up to **6 plan sheets and 6 schedule pages** per set; very large sets take longer to sort (every page is
  rendered in the browser).
- Reading results depend on the model; the same sheet can come back slightly differently on another run.
  The review step is there for exactly this reason.
- The RFQ, bids, proposal and order screens are **sample data**.
- An instant (tunnel) link stops when the hosting computer sleeps.

---

## 15. Version history

| Version | Change |
|---|---|
| **v18** | **Review:** drawing sets go through the schedule-first reader, with no left-out list; while the plan is found, a page strip and scan beam show the scan and the product cards show a searching line; the review then settles on the plan page ("On plan A-2.1 · 15 of 15"). **Procure, decision first:** RFQ, Bids, Proposal and Purchase order as progressively finished documents. Summaries are on screen and the evidence sits behind "View …" (issues are never hidden), with one bottom action bar. Bids: comparison first, the preference near the end, then the recommendation. Proposal: the installed total as the hero, with private dealer pricing and *Markup on landed cost*. PO: status first, a four-stage tracker, confirmed vs estimated dates. Calm app motion. New docs: `docs/CONCEPT.md`, `docs/DESIGN-PATHWAY.md` |
| **v17** | **RFQ and Bids redesigned**: a specification to quote against (NFRC U-factor/SHGC per ENERGY STAR v7, glass package, tempered, finish, warranty, terms); bids leveled on cost, schedule, energy performance, glass, frame, warranty and terms, with a *What matters most* switch; light motion |
| **v16** | **Every window schedule** read (all pages, copies counted once, separate schedules kept apart); **floor plans mapped in the background** after the review opens — products then show on the plan page with rooms, counts stay the schedule's |
| **v15** | **Schedule first**: the window schedule is read before anything else; when it gives every size and count the plans aren't read (37th Place: 65 windows in ~1 min). Schedule-only takeoffs shown on the schedule sheet, one box per row. **Simpler review**: opens on Grouped products, one header that flips to Openings, double-click a product to open it, **Verify all**, Mark Ready for RFQ always available, pre-processing applied automatically |
| **v14.1** | **Pre-processed** tab: the takeoff without openings that have neither a window number nor any size on the drawing; the counts, plan boxes, All preview and ↑/↓ follow it; *Remove them from the takeoff* applies it |
| **v14** | **In plain words** on every window card; the "no number on the plan" explanation; **All N** preview of every window; selected window in blue |
| v13.3 | **Windows only**: doors left out of the instructions and filtered in code |
| v13.1 | Accuracy fixes from live tests: "continued" plan sheets read whole (`tag_style`), schedule crops on plan sheets, quantity-0 rows, stray door-table rows, door types from remarks |
| v13 | **Full drawing sets**: sort every page → read chosen sheets at full detail → join tags to schedules |
| v12.1 | Neutral wording: the page never names the AI provider |
| v12 | PDFs send their text layer with the image |
| v11 | The reading server (OpenAI Responses API, background mode, strict JSON), mock mode, Docker/Render |
| v10 | Source split into `src/` with a lossless build to `dist/` |
| v1–v9 | Demo site, design system, homepage story, dark theme, About/Contact pages |

The full earlier history is in `docs/README-v13-previous.md` and `docs/PROJECT-NOTES.md`.

---

## 16. Related projects

- **`qbotica-windowbid-release-v18`** — this folder: the latest saved working copy (port 3005 when started).
- **`qbotica-windowbid-release-v17`** — RFQ/Bids redesign before the decision-first Procure documents, kept unchanged.
- **`qbotica-windowbid-release-v16`** — the version currently behind the public demo link, also on GitHub as a private repository.
- **`qbotica-windowbid-release-v15`** — the previous saved version (schedule first, plans not read), kept unchanged.
- **`qbotica-windowbid-release-v14`** — the previous saved version, kept unchanged.
- **`qbotica-windowbid-experiment`** — a duplicate of this demo that reads plans with the local, offline
  WindowBid OCR app instead of OpenAI (faster and free, but leaves more for the dealer to fill in).
- **`~/windowbid` / `~/windowbid-experiment`** — that local OCR app (Python, FastAPI, PaddleOCR, Tesseract,
  PyMuPDF): rule-based extraction with evidence for every value; the experiment copy is about 3.4× faster.

---

## 17. Contributors

| | |
|---|---|
| [@Krishna95157](https://github.com/Krishna95157) | Vamsi Krishna |
| [@x-anudeep](https://github.com/x-anudeep) | Anudeep |

---

© 2026 qBotica · WindowBid. Internal prototype; not licensed for redistribution.
