# qBotica WindowBid — Design Pathway

**How the interface is built, which rules it follows, and the exact path to design anything new so it looks like it was always there.**

| | |
|---|---|
| **Read this when** | You are adding a page, a demo step, a panel, a control or an animation |
| **Companion doc** | `docs/DESIGN.md` explains *why* each existing page looks the way it does, page by page. This file is the *how*: the system, the templates and the step-by-step path. |
| **Source of truth** | `src/` (CSS in `src/css/`, markup in `src/index.html`, behaviour in `src/js/`). `python3 scripts/build.py` turns it into the single file `dist/windowbid.html`. |

---

## 0. The question this answers

> *"How did we design WindowBid? How is the page (the DOM) put together, what template and branding do we follow, and what is the path I should follow so that any new option I add matches the earlier designs?"*

Restated as the questions a designer or developer actually needs answered:

1. **Brand:** what are the fixed brand elements (name, logo, colours, type, voice)?
2. **System:** which design tokens, type styles, spacing, corners and lines does every screen use?
3. **Structure:** how is the DOM organised (site pages, the demo app, its stages), and where does new markup go?
4. **Components:** which ready-made pieces exist (buttons, pills, cards, tables, toggles, notes, the plan viewer), and when is each one used?
5. **Meaning:** what does each colour and each kind of motion *mean*, so new work doesn't break the language?
6. **Templates:** what is the skeleton for a new section, a new demo step, a new card or table?
7. **Pathway:** what is the step-by-step routine, and the final checklist, for designing a new option?

---

## 1. The design idea in one paragraph

**An architectural drawing sheet that turns into a business workflow.**
- Every screen sits on drafting paper: a warm paper colour, a faint 120 px grid, light grain, and thin 1 px rules.
- Three typefaces play three roles:
  - a condensed **statement** face for headlines;
  - a calm **explanation** face for sentences;
  - a **technical** mono face for labels, marks and numbers.
- Colour is rare and always means something.
- Motion only shows the product doing work, and it is short and light.

The audience reads drawings every day, so the design speaks their language instead of looking like a generic SaaS dashboard.

---

## 2. Brand at a glance

| Element | Rule |
|---|---|
| **Name** | **qBotica WindowBid**: lowercase *q*, capital *B*, even inside uppercase labels. The product is "WindowBid". |
| **Logo** | The orange isometric cube (`<symbol id="qmark">` in `src/index.html`) + "qBotica" wordmark + divider + WINDOWBID. Horizontal in headers (`.qb`, `.qb-sm`), stacked in the footer (`.qb-stack`). |
| **Logo colour** | Always `#FF7805` (`--q-orange`). Never recoloured, outlined, shadowed or placed on a white box. |
| **Brand green** | `--brand` `#173B31` (dark theme `#2E6B57`): the colour of primary actions (*Try Demo*, *Send RFQ*, *Mark Ready for RFQ*). |
| **Accent orange** | `--orange` equals the logo orange, so the page and the brand share one orange. |
| **Voice** | Plain, short and factual. Statements end with a full stop ("Review. Procure. Fulfill."). The interface **never names the AI provider**: say "WindowBid reading service" or "read by AI". |
| **Sample data** | Anything simulated says **"Platform preview"** (the `.preview-note` banner). |
| **Not yet official** | The cube is rebuilt from a spec and the wordmark uses Poppins. Swap in official qBotica files before external use. |

---

## 3. Design tokens

All colours, fonts and the header height are CSS custom properties defined once in `src/css/01-tokens-base.css`. **Never type a hex value in a component; use a token.** Each token is redefined for dark mode, so new work gets both themes for free.

### Colour

| Token | Light | Dark | Use it for |
|---|---|---|---|
| `--paper` / `--paper-2` | `#EAE8DC` / `#E1DFD2` | `#1A1A18` / `#222220` | Page background / recessed areas (viewer, group headers) |
| `--card` | `#F3F1E8` | `#232320` | Panels, sheets, tables, cards |
| `--plan-bg` | `#F5F3EB` | `#20201D` | Drawing frames and document sheets |
| `--ink` / `--ink-2` / `--ink-3` | `#282828` / `#5F5E59` / `#8C8B84` | `#E8E6DA` / `#B5B3A8` / `#85847C` | Main text / secondary text / labels (never essential info) |
| `--rule` / `--rule-2` / `--rule-soft` | `#B3B3AF` / `#8F8F8A` / 13 % ink | `#3E3E3A` / `#5A5A55` / 12 % ink | 1 px borders / stronger borders / row dividers, tracks |
| `--brand` / `--brand-2` / `--on-brand` | `#173B31` / `#235443` / `#EAE8DC` | `#2E6B57` / `#3A7F68` / `#F1EFE4` | Primary buttons, checked checkboxes |
| `--orange` / `--orange-ink` / `--orange-tint` | `#FF7805` / `#A34A00` / 14 % | `#FF8A2A` / `#FFA864` / 15 % | **Machine-read, attention, misses** / orange text / orange fills |
| `--green` / `--green-tint` | `#557D68` / 16 % | `#86B29B` / 16 % | **Confirmed by a person, complete, best, meets spec** |
| `--sel` / `--sel-ink` / `--sel-tint` / `--on-sel` | `#1F5FD6` / … | `#5C9DFF` / … | **The thing you selected** in the demo (and "being read now") |
| `--panel` / `--panel-ink` | `#282828` / `#EAE8DC` | `#30302C` / … | Dark inset panels (the reading log) |
| `--dark`, `--cta` | `#282828`, `#173B31` | `#111110`, `#173B31` | The dark Fulfill scene, the green closing band |

### Type and size tokens

| Token | Value |
|---|---|
| `--disp` | **Archivo** (variable width): statements, big numbers |
| `--sans` | **Instrument Sans**: sentences, form text (body 17 px / 1.55) |
| `--mono` | **Geist Mono**: labels, marks, sizes, statuses, buttons |
| `--navh` | 78 px header (64 px under 767 px) |

Fonts load from Google Fonts in `src/index.html`. That is the only external file the page uses.

---

## 4. Typography: three voices

| Voice | Recipe | Classes / examples |
|---|---|---|
| **Statement** | `font-family:var(--disp)`, condensed (`font-stretch` 72–87.5 %), weight 650–700, UPPERCASE, line-height 0.84–1.05 | Site: `.disp.xl` (64–118 px), `.disp.lg` (46–92 px), `.disp.md`. App: `.doc h1`, `.up h1`, `.work-top .title b`, `.d-mark`, product names in `.grp b`, numbers in `.stats b`, `.wb-proj`, `.pp-price b`, `.po-st` |
| **Explanation** | `var(--sans)`, sentence case, 0.85–1.1 rem, `--ink-2` for secondary | `.lede`, `.sub`, `.doc .lead`, card copy, plain-words summary `.d-sum` |
| **Technical** | `var(--mono)`, 0.56–0.76 rem, UPPERCASE, letter-spacing 0.04–0.12 em, usually `--ink-3` | `.eyebrow`, `.wb-k` section labels, `.wb-nums b` figures, table headers, `.steps`, `.tabs`, legends, pills, buttons (`.btn`) |

**Copy patterns:**
- Eyebrows: `NN / Section` or `RFQ #WB-1042 · Issued Oct 6, 2026`.
- Separators: a middle dot ` · `.
- Sizes: `30 × 72 in`, with a real × and width first.
- Marks: as written on the drawing (`5·3` = the 3rd unit tagged 5).
- Numbers that line up use `font-variant-numeric: tabular-nums`.

---

## 5. Layout, spacing, shape

| Rule | Value |
|---|---|
| Site container | `.wrap`: max 1520 px, 40 px side padding (20 px on phones); `.g12` = 12-column grid, 20 px gap |
| App documents | `.doc`: max 1180 px, centred (RFQ, Bids, Proposal, Order) |
| Review workspace | `.work-grid`: plan viewer `1.55fr` · side panel `minmax(340px, 1fr)` |
| Section rhythm | Site sections 140–220 px apart; app blocks 16–32 px apart |
| Corners | **0–2 px** everywhere. Fully round only for pills, toggles and the segmented control. |
| Lines | 1 px `--rule` borders; `--rule-soft` between rows; 2 px only for emphasis (sheet headers, selected tabs, "best" column) |
| Shadows | Almost none. Only drawing sheets get a soft drop. Depth comes from paper versus card colour, not shadows. |
| Breakpoints | **900 px** (stack two-column layouts), **767 px** (phone header, smaller gutters), **640 px** (single-column details); 1100 / 1020 / 480 / 420 px for local fixes |

---

## 6. How the DOM is organised

Everything is one HTML document (`src/index.html`). There are three layers: the **site** (marketing pages), the **app** (the full-screen demo that opens over the site) and **global helpers**.

```
<body>
├─ <svg> defs ............ shared symbols: #qmark (logo), #hatch (missing-size pattern)
├─ #trail, #cur, #curBr .. drafting cursor (desktop only, 05-theme-cursor.js)
├─ <header class="nav"> .. logo · About · Contact · [Try Demo]
├─ <div id="view"> ....... the site; one <main data-page> visible at a time (06-router-reveals.js)
│   ├─ <main data-page="home">     sections: hero · stages · review · procure · fulfill · metrics · cta
│   ├─ <main data-page="about">    logo construction · cube unfold · band
│   └─ <main data-page="contact">  the fill-in sentence
├─ <footer class="foot">
├─ <div class="app" id="app" hidden> ..... the demo, fixed over the page
│   ├─ <header class="app-bar">  logo · crumb · <ol class="steps"> (Review / Procure / Fulfill) · Exit
│   └─ <div class="app-body" id="appBody">
│       ├─ section.stage[data-stage="upload"]   drop zone + sample card
│       ├─ section.stage.work[data-stage="work"] (extract + review share it)
│       │    .work-top (title, stats) │ .work-grid → .viewer (plan) + aside.side (.proc reading │ .rev review)
│       ├─ section.stage[data-stage="rfq"]       <div class="doc" id="rfqDoc">  (rendered by JS)
│       ├─ section.stage[data-stage="bids"]      <div class="doc" id="bidsDoc">
│       ├─ section.stage[data-stage="proposal"]  <div class="doc" id="propDoc">
│       └─ section.stage[data-stage="order"]     <div class="doc" id="orderDoc">
└─ #toast ................ one-line confirmations
```

**Navigation:**
- `data-route="about|contact|home"` switches site pages with the aperture transition.
- `data-go="app"` / `data-go="home"` opens or closes the demo.
- Inside the app, `goStage('rfq')` shows one stage and updates the step indicator. The stages are listed in `STAGES` and `STEP_GROUPS` in `src/js/13-app-state-order.js`.

**Data attributes are the wiring.** Keep using them instead of inline handlers:

| Attribute | Meaning |
|---|---|
| `data-act="…"` | A button action inside the review panel (handled in one delegated listener) |
| `data-tab`, `data-group`, `data-pick`, `data-id` | Review header flip, product card, preview card / bid choice, table row |
| `data-cursor="Locate"` | The label the drafting cursor shows on hover |
| `data-r` + `style="--i:N"` | Joins the staggered entrance (section 9) |
| `data-dark` | A dark section (the cursor switches colour) |
| `data-c="0..2"` | A manufacturer column in the bid table (for column hover / best) |

**App screens are rendered by JavaScript.** RFQ, Bids, Proposal and Order are template strings written into their `.doc` container, which is why their structure lives in `src/js/19-app-procure.js` and `13-app-state-order.js`, not in `index.html`.

---

## 7. Where the code for design lives

### CSS (cascade order, as listed in `index.html`)

| File | Owns |
|---|---|
| `01-tokens-base.css` | Tokens (light and dark), reset, type classes, buttons, header, logo lockup, `.rv` line reveal |
| `02-plan-drawing.css` | Plan linework, detection boxes, chips, the drawing `.frame` (rulers, registration crosses, sheet labels) |
| `03`–`05` | Home page sections, pinned scroll scenes, metrics, CTA, footer |
| `06-contact.css`, `09-about.css` | Contact and About pages |
| `07-status-cursor.css` | Status pills, progress bars, the drafting cursor |
| `08-demo-app.css` | App shell, upload, workspace, viewer, review panel, tables, documents, toast |
| `10-additions-theme-motion.css` | Later additions: sheet switcher, selected blue, plain-words summary, preview grid, background-mapping note, page strip, product "searching" state, theme transition |
| `11-procure.css` | The app documents: RFQ, Bids, Proposal, Purchase order (`wb-` document pattern, `pp-` proposal, `po-` order, `bd-` spec table) |

**New feature → new numbered file** (e.g. `12-accounts.css`), added to the `build:css` block in `index.html`.

**Prefix your classes** so they never collide:
- existing prefixes: `wb-` app documents, `pp-` proposal, `po-` purchase order, `bd-` spec table, `d-` detail card, `pv-` preview, `vt` page strip;
- pick a new 2–3 letter prefix per feature.

### JS (execution order)

`00`–`12` are the site, `13`–`19` are the app, and `99-boot.js` starts everything. All files share one scope after the build, so helpers are available everywhere.

| Design helpers to reuse | Where |
|---|---|
| `$`, `$$`, `esc`, `money`, `pad2`, `clamp`, `wait`, `REDUCED` | `01-core-helpers.js` |
| `tween(ms, fn, easing)`, `easeOutQuart`; skips itself under reduced motion | `01-core-helpers.js` |
| `toast("…")` | `01-core-helpers.js` |
| `setHead(el, lines)`: the masked-line headline reveal | `01-core-helpers.js` |
| `mountDoc(host, html, enter)`, `headHtml(title, ref, project, sub)`, `numsHtml([[n, label]…])`, `dis(id, label, count, body)`, `linesHtml(groups)`, `barHtml(back, mid, primary)`, `PREVIEW` | `19-app-procure.js` (the app documents: RFQ, Bids, Proposal, Purchase order) |
| `goStage(name)`, `renderSteps()` | `13-app-state-order.js` |

---

## 8. Component catalogue

| Need | Use | Notes |
|---|---|---|
| Primary action (one per view) | `.btn` (app) / `.btn-demo` (site) + `<span class="arr">→</span>` | Brand green, mono uppercase; arrow nudges on hover |
| Secondary action | `.btn-ghost` (`.sm` in tight spots) | Paper with a 1 px rule |
| Inline action | `.btn-text` | Underlined, e.g. "Preview all", "Put them back" |
| Status | `.pill.st-ready` / `.st-review` / `.st-missing` / `.st-ok` | AI read · Needs review (dashed) · missing size (hatched) · Verified (green) |
| Small fact tag | `.wb-tag` (outlined), `.wb-t` (bid tags), `.badge`, `.pill-ok` / `.pill-x` | Mono, tiny, uppercase |
| Document header | `headHtml()` → `.wb-head` | Page title (statement) + reference (mono) on one line, then the project and one short line |
| Number blocks | `numsHtml()` → `.wb-nums` | Thin rule above, mono figure, condensed label; no card behind them |
| Section | `.wb-blk` with `.wb-k` label + `.wb-s` summary | Separated by 1 px rules, **not boxes** |
| Disclosure ("View …") | `dis(id, label, count, body)` → `.wb-dis` | The one way to reveal evidence; remembers what was open; 0.25 s open |
| Bottom action bar | `barHtml(back, mid, primary)` → `.wb-bar` | Sticky; ← back · context · one primary action — the same on every app document |
| Card / panel | `.panel`, `.pp-doc` (client document), `.pp-priv` (private, dashed) | Use only when it is a real separate object (a document, a private panel) |
| Product card | `.grp` (+ `.sel`, `.loc` location line) | Name in statement voice, size in mono, big quantity on the right |
| Data table | `.ttable` (simple), `linesHtml()` → `.wb-line` rows with a `<details class="wb-mk">` marks summary, `.wb-tbl`, `.bd-cmp` (comparison, collapsible groups) | Mono headers; numbers right-aligned; `--rule-soft` row lines; marks as a range (`5·1–5·15`), every mark one click away |
| Choice among options | `.wb-bid` rows (button, `aria-pressed`) | The selected one gets the blue `--sel` edge |
| Status tracker | `.po-track` (four stages) + `.po-hist` (full history) | ✓ = confirmed event, ○ = estimate |
| Form field | `.field` (label above, mono), `.d-grid` (two-column editor) | Missing values get `.need` (dashed orange) |
| On/off requirement | `.wb-req` (switch) | Green when on; text dims when off |
| Multi-select | `.wb-mfr` (custom checkbox with a drawn tick) | Checked fill = brand green |
| Choice of views | `.seg` segmented control | Ink fill on the chosen option |
| Notices | `PREVIEW` → `.wb-pv` (one small line: "Preview environment · … simulated"), `.bg-note` (work in background), `.d-note` (orange caution), `.d-sum` (plain words, blue-tinted), `.wb-warn` (an issue inside a summary line) | One idea per note, one or two lines |
| Progress | `.prog` + `.bar`, `.qbar`, score `.bar`, the reading checklist `.psteps` | Thin (2–6 px), fill animates via `scaleX` |
| Plan viewer | `.viewer` + `#vstage` SVG, `.vsheets` tabs, `.vstrip` page strip, `.vtools` zoom, `.vlegend` | Detection classes: `.det`, `.st-*`, `.sel` |
| Drawing frame | `.frame` with `.ruler.rx/.ry`, `.reg.tl…`, `.fl` labels, `.fco` | For any "this is a sheet" visual on the site |
| Confirmation | `toast()` | Short past tense: "Takeoff exported" |

**Gotchas, from real bugs:** a few old generic class names are styled globally and will silently restyle anything new that reuses them:
- `.bar i` gets `position:absolute` (07-status-cursor.css), so scope new bars (`.wb-rank .bar i { position:static; width:100% }`);
- `.swap` gets `inline-grid` and a fixed `1.35em` height (03-home-hero-stages.css). It once made the Bids recommendation collapse, so use a prefixed name (`wb-swap`).

Always prefix new classes.

---

## 9. Colour meaning (the rule that holds everything together)

| Colour | Means | Never use it for |
|---|---|---|
| **Orange** | The machine read it / needs attention / a miss or deviation / in progress | Success, decoration, selection |
| **Green** | A person confirmed it / complete / meets the spec / best choice | Primary buttons (those use brand green) |
| **Blue (`--sel`)** | What the user has selected right now, or the page being read right now | Status of any kind |
| **Brand green** | The primary action on the screen | Status |
| **Ink and paper** | Structure: text, rules, surfaces | — |

Most of every screen stays paper and ink, and colour is a small accent. Orange text uses `--orange-ink`, so it stays readable on paper. White text is never put on orange.

---

## 10. Motion system

**Two kinds of motion:**
1. **Story motion** (site): assembling, revealing, annotating, confirming, transforming and tracing. These are the six families in `DESIGN.md` §8, scroll-driven or played once.
2. **Interface motion** (app): short micro-animations that confirm what happened or show that work is in progress.

**The app is calmer than the site.** Working screens should feel *precise, not playful*. In the app, avoid count-up numbers, cascading rows, scroll-triggered effects and large transformations; those belong to the marketing pages only.

| Recipe | How | Duration |
|---|---|---|
| Headline in (site only) | `.rv` + `.ln > span` masks; add `.in` | 0.75 s, 0.1 s per line |
| Page opens (app) | `mountDoc(host, html, true)`: one short fade and rise of the whole document | 0.3 s |
| Disclosure | `.wb-dis` (grid rows 0fr → 1fr) + chevron rotation | 0.25 s |
| Something arrives / changes | a single fade of just that element (a bid row arriving, the recommendation updating) | 0.25–0.35 s |
| Bars | `transform: scaleX()` with `transform-origin:left`, only when a value changes | 0.4 s |
| Hover / press | colour, border or 1–3 px nudge | 0.2 s |
| Toggle / check | knob slide, tick drawn with `stroke-dashoffset` | 0.25–0.3 s |
| Work in progress | hairline sweep (`.groups.mapping`), scan beam over the plan, page strip `.vt.reading`, spinner in `.psteps` | Loops **only while the work is really running**, then stops |

**Rules:**
- Mechanical and calm, never bouncy.
- Nothing loops for attention.
- Only animate `opacity` and `transform`.
- Everything has a `@media (prefers-reduced-motion: reduce)` branch that shows the final state; `tween` and `REDUCED` handle the JS side.
- No decorative house drawings or illustrations in app screens. The plan appears only where it is the actual data.

---

## 11. Theme and accessibility

**Theme:**
- Dark is the default. The `<html data-wb="dark|light">` attribute is set before first paint by `00-theme-preload.js`, and switched by the footer button or by drawing a **W** with the cursor.
- Because every component uses tokens, it themes automatically. Check new work in both themes.

**Focus and controls:**
- Focus is the global `:focus-visible` orange outline.
- Custom controls (switches, checkboxes) hide the real input visually but keep it for keyboard and screen readers. Show focus on the drawn element.
- Use `aria-pressed` / `aria-checked` / `aria-expanded` for toggles, segmented controls and collapsible groups.
- Decorative SVG gets `aria-hidden="true"`. A meaningful drawing gets `role="img"` and an `aria-label`.
- Never put essential information in `--ink-3` alone.

---

## 11b. Information hierarchy for app screens

**Decision first → summary second → evidence only when asked for.** Every app screen uses three levels:

| Level | What | How it looks |
|---|---|---|
| 1 · Must know now | The project, the decision or status, the one important number, the primary action | Statement type, large; the primary button in the bottom bar |
| 2 · Useful summary | Counts, price, delivery, requirement status, the chosen supplier | Number blocks and one-line summaries (`.wb-s`) |
| 3 · Evidence | Tables, every mark, full specs, source file, calculations, history | Behind a `View …` disclosure |

**Rules:**
- **Never hide a problem.** If something needs attention, it stays in the level-2 summary (`2 without a size`, `! 3 / 6`, `5 resolved · 1 needs attention`) and doesn't wait behind a disclosure.
- **Simplify the screen, not the data.** Every mark, coordinate, source and version is still kept and one click away.
- **Separate certain from estimated.** Confirmed events get a ✓ and a date; predictions say "Estimated" or "Est." with a ○.
- **Version what was sent:** `RFQ v1`, `Proposal v1`. Change something after sending, and the next send is v2.
- **The documents get more finished as the project moves:**
  - RFQ is technical (rules, switches);
  - Bids is analytical (comparison, recommendation);
  - Proposal is client-ready (whitespace, one big price, the dealer's numbers in a separate private panel);
  - Purchase order is operational (status, dates, tracker).
- **Phones:** the same hierarchy, with tables turning into stacked rows.

---

## 12. Templates

### A. A new section on a site page

```html
<section class="sec sheet-sec" id="myFeature">
  <div class="wrap">
    <p class="eyebrow">04 / Accounts</p>
    <h2 class="disp lg rv"><span class="ln"><span>One project.</span></span><span class="ln"><span>Three seats.</span></span></h2>
    <p class="sub">One sentence that says what the visitor gets.</p>
    <!-- content on the 12-column grid: <div class="g12">…</div> -->
  </div>
</section>
```
`.rv` headlines reveal automatically when scrolled into view (`06-router-reveals.js`).

### B. A new demo step (an app "stage")

1. **Markup:** add `<section class="stage" data-stage="myStep"><div class="doc" id="myStepDoc"></div></section>` inside `#appBody`.
2. **Registration:** add `['myStep','My step']` to `STAGES`, and to the right group in `STEP_GROUPS` (Review / Procure / Fulfill).
3. **Render** with the shared document helpers (`19-app-procure.js`):
```js
function openMyStep(enter = true) {
  mountDoc($('#myStepDoc'), `<div class="wb">${PREVIEW}
    ${headHtml('My step', 'REF #WB-0001', S.src.title, 'One short line on what happens here.')}
    ${numsHtml([[65, 'Openings'], [12, 'Product lines']])}
    <section class="wb-blk"><h3 class="wb-k">Section</h3><p class="wb-s">Level-2 summary · <b class="wb-warn">1 issue</b></p>
      ${dis('my-details', 'View details', 12, '<p>Level-3 evidence…</p>')}</section>
    ${barHtml('<button class="btn-ghost sm" id="myBack">← Back</button>', 'Context for the action',
              '<button class="btn" id="myNext">Continue <span class="arr">→</span></button>')}
  </div>`, enter);
  goStage('myStep');
}
```
4. **Styles:** put them in a new numbered CSS file with your own prefix, reusing the tokens.

### C. A card

```html
<div class="panel"><h3 class="wb-k">Section label</h3>
  <p>Explanation in sentence case.</p>
  <span class="pill st-ok">Verified</span></div>
```

### D. A data row list

Use `linesHtml(groups)` (`.wb-line` rows: index · product · size · qty · marks summary) for product lists. Use `.ttable` when rows are clickable (`data-id`, `data-cursor="Locate"`). Mono for numbers, right-aligned.

### E. A new status

1. Map it to the colour meaning first (machine, person or selected).
2. Add a `.pill.st-<name>` in `07-status-cursor.css`, and the matching `.det.st-<name>` look in `08-demo-app.css` if it appears on the plan.
3. Add the word to `ST_LABEL` in `02-plan-model.js`.

### F. An overlay on the plan viewer

Position it absolutely inside `.viewer`:
- top-left under the sheet tabs (like `.vstrip`);
- bottom-left (legend);
- bottom-right (zoom tools).

Give it a `color-mix(in srgb, var(--card) 88%, transparent)` background with a 1 px rule, and add its class to the pointer exclusion list in `initViewer`, so clicks don't pan the plan.

---

## 13. The pathway: designing a new option, step by step

1. **Name the job.** Who is acting (client, dealer or manufacturer), what they decide, and what they see next.
2. **Place it.**
   - A site page? A new app stage? A panel inside an existing stage? An overlay?
   - Prefer extending what exists: the right-hand review panel, the `.doc` documents, the viewer.
3. **Sketch with existing parts.** Build the layout from section 8's components before inventing anything. A new component is justified only when nothing fits.
4. **Choose the voices.**
   - One statement headline.
   - Short sentences for explanation.
   - Mono for every label, number, mark and status.
5. **Apply colour by meaning** (section 9). If you want orange, green or blue, say which meaning it carries.
6. **Use tokens only.** No raw hex values, no new fonts, corners ≤ 2 px, 1 px rules.
7. **Design every state:**
   - empty (what to do first);
   - loading / in progress (honest progress, which may loop while real work runs);
   - success;
   - error (what went wrong and what to do);
   - long content (a 200-item list must not flood the screen; summarise and let people open the details).
8. **Add motion last,** from section 10's recipes. Ask: does it confirm an action or show real progress? If not, leave it out.
9. **Write the words.**
   - Plain language; no AI provider names.
   - Verbs: dealer *verifies*, customer *accepts*, manufacturer *acknowledges*.
   - Sample data says "Platform preview".
10. **Check it on screen:**
    - 1440 px, 900 px and 390 px widths;
    - dark and light theme;
    - reduced motion on;
    - keyboard only.
11. **Build and test:**
    - `python3 scripts/build.py`;
    - open the duplicate demo (localhost:3003);
    - run a real drawing set through it;
    - check the browser console for errors.
12. **Record it:**
    - add a line to the README version table;
    - add the "why" to `docs/DESIGN.md` if it is a visible design decision.

---

## 14. Final checklist

- [ ] Sits on paper or card surfaces with 1 px rules; corners 0–2 px; generous whitespace
- [ ] Statement / explanation / technical voices used correctly
- [ ] Orange = machine or attention, green = confirmed or best, blue = selected; brand green only for the primary action
- [ ] Only tokens (works in dark and light)
- [ ] Reuses existing components and helpers; new classes have a feature prefix
- [ ] Decision first: level 1 on screen, level 3 behind `View …`; problems never collapsed away
- [ ] One primary action, in the bottom bar
- [ ] Empty, loading, success, error and long-content states designed
- [ ] Motion: short, purposeful, `opacity` / `transform` only, loops only while work runs, reduced-motion branch
- [ ] No decorative architecture drawings in app screens
- [ ] Words: plain, no AI provider name, verify / accept / acknowledge, sizes as `W × H in`
- [ ] Sample data labelled "Platform preview"
- [ ] Keyboard focus visible; toggles have `aria-*` state; decorative SVG hidden
- [ ] Built, tested in the duplicate, README and DESIGN notes updated

---

## 15. Worked example: how the Procure documents followed this path

| Step | Decision |
|---|---|
| Job | The dealer prices the verified takeoff, compares bids, sends the customer one price, then tracks the order |
| Place | The existing `rfq` / `bids` / `proposal` / `order` stages, rendered into `.doc` |
| Hierarchy | **RFQ:** project + 3 number blocks + quote basis; products, requirements and source behind `View …`; issues stay in the summary. **Bids:** a 5-second table (total · delivery · requirements met), then evidence, then *Optimize recommendation for*, then the recommendation. **Proposal:** the installed total is the hero; dealer pricing in a private panel. **PO:** current status, a 4-stage tracker, history and products behind `View …` |
| Parts | `headHtml`, `numsHtml`, `.wb-blk`, `dis()`, `linesHtml`, `.wb-bid` rows, `.seg`, `.bd-cmp`, `.pp-doc` / `.pp-priv`, `.po-track`, `barHtml` |
| Colour | Green = meets the spec / best match / done; orange = a miss or an issue; blue edge = the bid you chose; brand green = the one primary action |
| Words | "Markup on landed cost" (not "margin": $ added ÷ landed), "Estimated delivery", "Private · not included in the customer proposal", "Preview environment" |
| Motion | Page fade, disclosures, one fade per arriving bid, the recommendation fading on a preference change; no count-ups or cascades |

---

## 16. Known gaps to tidy

1. **Focus colour:** the Procure documents now use the orange focus ring like the rest of the site; check any older control that still shows blue.
2. `docs/DESIGN.md` §11 still describes the older Review panel (Openings tabs, per-window Verify) and the older Procure pages. Update it with the flip header, Verify all, the product location line and the decision-first Procure documents.
3. The official qBotica logo files and a licensed display face are still pending (see `DESIGN.md` §15).
