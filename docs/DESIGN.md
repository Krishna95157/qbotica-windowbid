# qBotica WindowBid — Design README

**What we designed, how it works, and why — from the header to the footer of every page.**

Source: `src/` (built into the single file `dist/windowbid.html`). The project `README.md` covers setup, structure and status, `docs/PROJECT-NOTES.md` covers product details and demo data, and this file is only about design.

---

## 1. The design idea

WindowBid helps a window and door dealer turn architectural drawings into a priced, ordered and installed window package. The website has to explain that to a business person quickly, so the whole design follows one idea:

> **An architectural drawing sheet that turns into a business workflow.**

Every page looks like it is printed on drafting paper. The visitor first sees a real floor plan being drawn, then watches that drawing become data (Review), then a priced proposal (Procure), then a delivered order (Fulfill). Instead of reading about the product, the visitor watches it work.

We chose this over a typical software landing page (gradients, floating cards, dashboard screenshots) for three reasons. First, the audience works with drawings every day, so a plan is instantly familiar to them. Second, the plan is literally the product's input, so showing it is honest. Third, it makes the site look like nothing else in the market.

Three references shaped the style. **Heron AI** inspired the interactive drawing, the blueprint assembly and the drafting cursor. **Ronnsquare** inspired the editorial layout, generous whitespace and scroll choreography. **Randolph Scott Bell** inspired the oversized type and scroll rhythm. We took their principles, not their assets, and rebuilt everything around WindowBid's own story.

---

## 2. Five design principles

Every decision on the site traces back to one of these.

| Principle | What it means in practice | Why |
|---|---|---|
| **The drawing is the hero** | Real plan linework, dimensions, title blocks, ruler ticks and registration marks carry the visual identity. No stock photos, no abstract illustrations. | The plan is the product's input and the audience's daily material. |
| **Colour means something** | Orange = read by the machine / needs attention. Green = confirmed by a person / complete. Charcoal and paper are structure. | A business viewer understands the human-in-the-loop idea from colour alone, without reading. |
| **Motion explains** | Every animation shows the product doing something: assembling, reading, verifying, transforming, tracing. | Decorative motion distracts; explanatory motion teaches. |
| **One continuous record** | The same object (W07, or the "Single hung · 36 × 60 · Qty 5" card) is carried from section to section. | The product's core promise is "no retyping between handoffs". The design shows it physically. |
| **Honest preview** | Anything simulated is labelled "Platform preview", and forms say plainly that nothing is sent. | Credibility with a business audience matters more than looking finished. |

---

## 3. Brand: qBotica WindowBid

The product is presented as **qBotica WindowBid**, at the request of qBotica's CEO. The company name is always written **qBotica** (lowercase q, capital B), even inside uppercase labels.

**The symbol** is an isometric cube made of three orange panels with rounded corners, separated by a Y-shaped channel. We rebuilt it from a written specification on a 92 × 100 grid: a pointy-top hexagon widened 1.06× horizontally, an 8.5-unit channel, and corner radii of 7 (outer) and 3.5 (inner). The channels are real gaps, so the page shows through and there is never a white box around the logo. The wordmark is set in Poppins Bold as a stand-in. **Both should be replaced with qBotica's official vector files before anything leaves the company.**

| Logo layout | Where | Why |
|---|---|---|
| Horizontal: cube + qBotica + divider + WINDOWBID | Header, demo top bar | The header is only 78 px tall, so a stacked logo would not fit. The divider separates company from product. |
| Stacked: cube above qBotica | Footer, About opening | Matches the official stacked composition in the brand spec. |

We kept the symbol at exactly `#FF7805` everywhere and changed the **site's** accent orange to match it, instead of tinting the logo to fit the site. That way the page and the brand use one orange, not two that clash.

---

## 4. Colour

The palette is warm drafting paper plus charcoal, with orange and green used sparingly and always with meaning.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--paper` | `#EAE8DC` | `#1A1A18` | Page background (drafting paper) |
| `--plan-bg` | `#F5F3EB` | `#20201D` | Drawing sheets, frames, documents |
| `--card` | `#F3F1E8` | `#232320` | Panels, tables |
| `--ink` | `#282828` | `#E8E6DA` | Text, plan walls |
| `--ink-2` / `--ink-3` | `#5F5E59` / `#8C8B84` | `#B5B3A8` / `#85847C` | Secondary text / labels |
| `--rule` | `#B3B3AF` | `#3E3E3A` | 1 px lines |
| `--orange` | `#FF7805` | `#FF8A2A` | Machine-read, attention, in progress (qBotica orange) |
| `--orange-ink` | `#A34A00` | `#FFA864` | Orange text that stays readable on paper |
| `--green` | `#557D68` | `#86B29B` | Verified, approved, complete |
| `--brand` | `#173B31` | `#2E6B57` | Primary buttons (Try Demo, Send) |
| `--dark` | `#282828` | `#111110` | Fulfill section |
| Mint (About only) | `#A9DFC6` | same | Brand face colour on the About page |

**Rules we follow.** White text never goes on orange (dark text is used instead, because white on this orange is hard to read). Orange text on paper uses the darker `--orange-ink`. Most of every screen is paper and charcoal; orange and green are small accents.

**Why one dark section and one dark-green section.** The Fulfill scene switches to charcoal to show the environment changing once the buying decision is made: planning is over and the system is executing. The closing call-to-action is dark green so the last thing a visitor sees is the brand colour of the button they are about to press.

**The one exception: brand moments on About.** On the About page, orange, deep green and mint are used as the three faces of the qBotica cube, purely as brand colours, not as statuses. This is deliberate and limited to that page. Contact originally used a solid green background too, but it felt disconnected from the rest of the site, so it was moved back onto the drawing sheet (see section 11).

---

## 5. Typography

The site speaks in three voices, each with its own typeface.

| Voice | Typeface | Style | Used for |
|---|---|---|---|
| **Statement** | Archivo, semi-condensed (87.5% width), 700 | UPPERCASE, tight leading 0.84–0.86, tracking −0.035em | Headlines, stage names, big numbers |
| **Explanation** | Instrument Sans | Sentence case, 17 px base, line-height 1.55 | Paragraphs, form text, the Contact sentence |
| **Technical** | Geist Mono | UPPERCASE labels, tracking 0.06–0.12em | Marks, sizes, statuses, captions, coordinates, buttons |

**Why three voices.** The contrast between huge condensed statements ("REVIEW. PROCURE. FULFILL.") and tiny technical labels ("W07 / 36 × 60 / VERIFIED") is what makes the site feel like both an editorial piece and an engineering document. Archivo stands in for a BT Grotesk-style grotesk, which needs a licence.

| Size | Value |
|---|---|
| Hero headline | `clamp(64px, 7vw, 118px)` |
| Section headline | `clamp(46px, 5.2vw, 92px)` |
| Body | 1–1.1rem |
| Labels | 0.6–0.76rem mono |

**Copy style.** Headlines are short statements ending in a full stop, one thought per line ("Price it. Compare it. Sell it."). Eyebrows follow `NN / Section`. Technical labels use slashes and middle dots. Sizes are always width × height in inches with a real multiplication sign ("36 × 60 IN").

---

## 6. Layout, spacing and the drafting-sheet details

The layout is a 12-column grid (20 px gap) inside a 1520 px maximum width with 40 px gutters (20 px on phones). The header is 78 px tall (64 px on phones). Most sections put text in columns 1–4 or 1–5 and the visual in the rest; Procure flips this (visual left, text right) so consecutive scenes don't feel identical.

Whitespace is generous on purpose: 140–220 px between major sections. Corners are 2 px or square everywhere, because rounded app-style cards would break the architectural feel.

The page background carries a faint 120 px grid and a light paper grain. Drawing frames have ruler ticks along the top and left, "+" registration crosses at the corners, mono sheet labels above ("Project / Demo Residence", "Sheet / A1.0") and a coordinate tag below. These details are kept very faint. They should be felt more than noticed, and they are what make every page look like part of the same drawing set.

---

## 7. The drawing system

Every plan, diagram and icon on the site is drawn in code (SVG), from one sample floor plan: a seven-room "Demo Residence" with twelve exterior openings. This keeps everything pixel-consistent and lets us animate individual layers.

| Element | Style |
|---|---|
| Exterior / interior walls | 10 / 6 unit strokes in `--plan` |
| Window symbols | 1.3 unit lines; door leaves 2.2; door swings dashed |
| Furniture and fixtures | 1 unit in a lighter grey, no fill |
| Room names | Archivo, uppercase, tracked |
| Dimensions and tags | Geist Mono; window tags in rounded rectangles, door tags in circles (drafting convention) |
| AI detection | Orange tint, 1.5 px outline, corner brackets, orange mark chip with dark text |
| Needs review | Dashed orange outline; hatched when a size is missing |
| Verified | Same shapes in green |
| Highlight region | Orange at 24% opacity, `multiply` blending (so it looks like a highlighter on paper), turning green when verified |

**Why layers.** The plan is built in four registered layers (wall fragments, solid walls, interior details, dimensions and tags). That is what lets the site "assemble" the drawing piece by piece without anything jumping out of place.

---

## 8. Motion

Every animation belongs to one of six families. If a new animation doesn't fit one of these, it probably shouldn't exist.

| Family | Meaning | Where you see it |
|---|---|---|
| **Assemble** | Pieces form the drawing | Hero and Review: 14 wall fragments fly in and lock |
| **Reveal** | Registered layers appear in place | Walls → furniture → dimensions; headline lines sliding up from masks |
| **Annotate** | Orange marks call attention | Opening markers, the W02 review note, the spec-deviation flag |
| **Confirm** | A person confirms; orange turns green | W02 verified, statuses, the Fulfill timeline |
| **Transform** | One object becomes the next | Plan label → table row → product card → RFQ → proposal → order → PO |
| **Trace** | The same identity stays visible | W07 riding the Fulfill line down to "Complete." |

| Motion | Timing |
|---|---|
| Button hover | about 0.2 s |
| Header label roll | 0.28 s |
| Headline line reveal | 0.75 s per line, 0.1 s stagger |
| Page transition (aperture) | 0.42 s close, 0.56 s open |
| Number count-up | 0.85 s, easing out |
| Hero assembly | about 5 s, plays once |
| About logo construction | 5.6 s (4.2 s on phones), plays once, Replay available |

**Rules.** Movement is mechanical and deliberate, never bouncy. Timed animations play once and stop; nothing loops for attention. Long story sections are driven by scroll position, so they reverse naturally when you scroll back. With "reduce motion" turned on, timed animations are skipped and final states are shown.

---

## 9. The drafting cursor (desktop)

| Context | Cursor |
|---|---|
| Anywhere | A 4 px square with a thin orange pen trail that fades in 0.35 s |
| Over a drawing | An 18 px crosshair with faint X/Y coordinates |
| Near an opening | Snaps to it as orange corner brackets with a label ("W07 / 36 × 60") |
| Over actions | Small labels: OPEN →, VIEW BID, DETAILS, TRACE, LOCATE, SEND →; in the demo plan, PAN, SELECT, DRAGGING, PLACE |
| Dark sections | Switches to a light colour |
| Text fields | The normal system cursor returns |

**Why.** The cursor turns the visitor into the inspector. Hovering over the plan and watching the cursor snap to a window is the fastest way to communicate "this software recognises openings". Phones and tablets keep their normal behaviour.

---

## 9b. Theme: dark by default, switched by drawing a W

The site opens in the **dark theme** by default; the charcoal drafting sheet makes the orange and green read strongest. Visitors can switch to the light (paper) theme in two ways:

| Way | How it works |
|---|---|
| **Draw a W with the cursor** (desktop) | Move the mouse in a W shape anywhere on the page. The pen trail shows the motion; when a W is recognised, the stroke flashes mint and the new theme opens as a circle growing from the point where the W ended. A small note confirms "Light theme · draw W again for dark". |
| **Footer switch** (everyone) | A "◐ Light theme / Dark theme" button in the footer, with the hint "or draw a W with your cursor" on desktop. It is the accessible route for touch screens and keyboards. |

The choice is remembered in the browser for the next visit. The W recogniser looks for four alternating strokes (down, up, down, up) moving left to right. Each stroke must be clearly drawn, the strokes must be similar in size, and the whole W must be at least about 100 × 60 px and take between 0.3 and 2 seconds. That keeps reading, scrolling and random mouse movement from switching the theme by accident.

**Why.** A W for WindowBid turns the drafting cursor into something playful and memorable for demos, without adding interface clutter. The footer switch makes sure nobody is locked out of the light theme.

## 10. Language is part of the design

We separated the words for three different confirmations, because "approve" was being used for things that are not approvals:

| Who | What they confirm | Words on screen |
|---|---|---|
| Dealer | The AI-extracted takeoff is technically correct | **Verify**, **Edit**, **Mark Ready for RFQ** |
| Customer | The products and price | **Accept** the proposal ("Customer accepted") |
| Manufacturer | Receipt of the order | **Acknowledge** the PO ("PO acknowledged") |

Takeoff statuses are **AI read**, **Needs review**, **Verified** and **Edited**. This matters for design because the colour rule depends on it: orange means the machine read it, green means a person confirmed it, and a business viewer can follow who did what.

---

## 11. Page by page, top to bottom

### Header (every page)

**What.** The horizontal qBotica WindowBid logo on the left; About Us, Contact Us and a dark green **Try Demo →** button on the right. It sits on paper with a blur, gains a solid background and a thin line once you scroll, and collapses to a Menu button on phones.

**Why.** Only three choices, so attention goes to Try Demo. The text links use a "label roll" hover (text slides up, an identical copy rolls in) and the button fills in seven small steps, like pixels being drawn. Both are subtle, mechanical and match the drafting theme.

### Page transitions

**What.** Moving between Home, About and Contact uses an **aperture**: orange guide lines move in from the screen edges, the page closes to the centre, then the new page opens outward.

**Why.** A plain fade feels like a website; an aperture feels like changing drawing sheets.

---

### Home

**01 · Hero: "Review. Procure. Fulfill."**
*What:* Left: eyebrow "Window + door workflow", the three-word headline, one line of copy, **Try Demo**, and a "Scroll to follow the project" cue. Right: a drawing frame where the floor plan assembles. Fourteen thin wall pieces fly in from all four sides and lock, then solid walls fade in, then furniture and room names, then dimensions and tags. Window W07 gets an orange highlight, a "01" marker and a label, and the caption "This is where the workflow starts." appears. Then it stops and becomes interactive (the cursor snaps to openings).
*Why:* The first five seconds show the raw material (a drawing) becoming something structured, which is the entire product in miniature. Starting from W07 sets up the record that is traced through the rest of the page.

**02 · "Three stages. One continuous record."**
*What:* The intro line reads "Once the AI-extracted opening data is reviewed, the same information flows from takeoff to quoting, ordering and fulfillment." Below it are three large ruled rows. Each has a big name, a plain business question and a green line naming who acts:
- **Review** · "Review the extracted takeoff" · dealer reviews AI-extracted data
- **Procure** · "Compare manufacturer options" · customer accepts the proposal
- **Fulfill** · "From order to installation" · manufacturer acknowledges the PO

Each row has a small animated example. The Review rows show all three takeoff statuses: Verified, Edited (W02's missing height filled in) and Needs review (W09). The Procure row shows three supplier prices. The Fulfill row shows seven milestones turning green, with only "Installed" marked as the orange "Next".
*Why:* This is the "understand WindowBid in fifteen seconds" section. The questions are worded as business actions, and the who-acts line teaches the role rule before the detailed scenes.

**03 · Review (pinned scroll scene)**
*What:* The headline changes as you scroll: "The project starts as a drawing" → "The structure becomes clear" → "Confirm the opening data" → "The drawing becomes data" → "Reviewed. Ready for RFQ." The plan assembles again; orange markers appear on all twelve openings; W02 gets an orange highlight and a review note; its height is filled in and the note turns green. The drawing then shrinks aside, and the labels for W03, W04 and W07 detach and stretch into rows of a takeoff table. The table is one sheet with a shaded header, marks as small tags, aligned sizes, full "Verified"/"Edited" statuses, and a separate summary band (10 windows, 02 doors, 07 products, Ready for RFQ). Finally, identical rows collapse into seven product cards, and the Single hung card stays on screen as the scene closes around it.
*Why:* This is the signature section. The visitor sees "drawing → data" happen rather than reading about it. The table was redesigned after rows overlapped the summary: everything now lives on one sheet with the summary in its own band, and row heights adapt to the screen.

**04 · Procure: one procurement sheet (pinned scroll scene)**
*What:* The headline reads "Compare manufacturer options." The whole scene happens on a single ruled sheet, with no floating cards:
- **Docking:** the Single hung product card from Review docks into the sheet, and its label changes from "Product 01 · Ready for RFQ" to "RFQ line 01".
- **The sheet:** it draws outward from the card (RFQ #WB-1042).
- **The bid schedule:** it lays itself out like a drawing schedule. Rules extend left to right, manufacturer names appear, then prices and lead times rise out of masked cells in a quick stagger.
- **Annotations:** objective differences are noted, not a "winner": Cascade is the Fastest; Mesa Ridge is the Lowest cost, with an orange "⚠ Glass spec deviation".
- **Selection:** a thin green line traces around Cascade, labelled "Selected for proposal".
- **Proposal:** the schedule wipes into the dealer's ledger. The internal lines (manufacturer cost, freight, margin) then mask away, leaving the customer proposal at $42,500.
- **Acceptance:** instead of a rubber stamp, a signature draws on a line, a green tick appears, and a green rule runs across the bottom: "Customer accepted · 18 Oct 2026".
- **Handoff:** the proposal compresses into a "Customer-accepted order" card.

*Why:* We studied clean scroll-storytelling sites, such as line-drawing scroll pieces (Behave, Christy's) and minimal vector transitions (Portal-1 for MOD). They feel premium because the composition stays still while lines draw and information reveals. Every movement here represents data moving to its next business state, and the dealer's decision (speed versus lowest price) is visible without explanation.

**05 · Fulfill: the order trace (pinned scroll scene, charcoal)**
*What:*
- **The PO:** the customer-accepted order card becomes the PO header (PO #WB-0048 · Cascade · Demo Residence).
- **The line:** a single leader line draws downward like a line on a drawing. Each milestone appears only when the line reaches it, with who owns it and when: PO created (dealer), PO acknowledged (manufacturer), manufacturing, ready to ship, in transit (carrier), delivered (job site), installed (installer).
- **W07 tag:** a small W07 tag rides the tip of the line.
- **Colours:** completed milestones turn green, and only the next one gets an orange "Next". "Delivered" is green, because delivery is complete.
- **Detail note:** one small note at a time sits beside the latest milestone.
- **Ending:** the trace folds away, leaving **W07 — Complete.** and "Drawing → Takeoff → RFQ → Bid → PO → Delivery → Installation".

*Why:* The dark background marks the shift from deciding to executing. One line with large whitespace feels calmer and more premium than a stack of status cards. Carrying W07 to the end proves traceability from drawing to installation. That ending replaces the old separate "One record" section, which repeated the same idea.

**Handoffs between scenes.** At the end of Review and Procure, the scene closes like an aperture around the product or order card. The card stays fixed in the middle of the screen, and the next scene opens around it.
*Why:* It physically demonstrates "same data, next process", and the qBotica logo stays out of the product story on purpose: the drawing and the data are the heroes here.

**06 · "One project. Fully traceable."**
*What:* Four numbers count up: 10 windows, 02 doors, 07 product configurations, 12 openings verified. If a visitor reads their own plan in the demo, the numbers switch to theirs.
*Why:* A calm, wide statistic moment, using only real demo values, with no invented marketing figures.

**07 · "See the workflow yourself."**
*What:* A dark green section with Try Demo and Contact Us buttons, and a thin window outline whose corners slide in and connect, once.
*Why:* The window outline ties the close back to the product, and dark green makes the final call to action the brand colour.

**Footer.** Stacked qBotica logo, "Review. Procure. Fulfill.", three links, and "© 2026 qBotica · WindowBid", with a note that RFQ, bids and fulfillment use sample data.

---

### About

The About page was redesigned several times based on feedback. The final version is short, company-focused, colourful, and built from the logo itself, so it doesn't repeat the homepage.

**1 · The logo builds itself.**
*What:* A drawing frame fills the first screen and constructs the qBotica cube on its own, step 01 to 05: construction guides, panel outlines, definition, orange fill, then the qBotica wordmark and WINDOWBID label. A thin orange progress bar runs along the bottom; when it finishes, **Replay** and **Scroll to unfold ↓** appear. The sheet starts blank, so the finished logo never flashes before the animation.
*Why:* It introduces the company through its mark, in the same drafting language as the homepage. It plays in place (no scrolling needed) because visitors expected to watch it, not scrub it.

**2 · "One cube. Three sides."**
*What:* As you scroll, the cube's three faces separate, take on their own colours, and flatten into three panels: **orange** "Who we are" (qBotica, founded 2017, Inc. 5000 2022–2024), **deep green** "What we do" ("Read. Understand. Act." with Document AI, Agentic AI and Automation tags), and **mint** "Our agenda" ("Windows & doors, next." with three short goals). Each panel has a large faded number.
*Why:* Minimal text, maximum personality, and the content literally comes out of the brand mark.

**3 · "Let's build it together."**
*What:* A full-width qBotica-orange band with a faint grid, a large outlined cube that drifts slightly as you scroll, a dark Contact Us button and a qbotica.com link.
*Why:* A confident, colourful close that hands off to Contact.

---

### Contact

**What.** One fill-in-the-blank sentence on a drawing sheet with the same frame, rulers, crosses and labels ("Contact / WindowBid", "Sheet / CT-01") as everywhere else:

> Hi, I'm **[your name]** from **[company]**. I'd like **[a live demo ▾]**. Reach me at **[email]**.

The blanks are underlined in orange and size themselves to what's typed. The active blank gets a light orange tint, and a correctly filled blank turns green, following the site's colour rule. The site's standard green **Send →** button sits below, with "Prototype · nothing is sent yet". Beside the sentence, the qBotica cube is drawn as a construction detail ("Detail A · iso 30°"). After sending, the sentence becomes "Thanks, [first name]." with an honest note and **Start over**.

**Why.** We looked at how AI construction-software companies handle contact. Heron AI closes with one line inviting visitors to see the product on their own project; Togal.AI mostly asks visitors to book a demo. So the page asks for exactly four things in one natural sentence and nothing else. The sentence first sat on a solid green page, but that broke the site's consistency, so it was moved onto the drawing sheet. An earlier "inquiry sheet" form with role, topic chips and a message box was dropped as too heavy.

---

### Demo workspace (Try Demo)

**What.** A full-screen workspace using the same paper, type and colours. The top bar groups the steps under the three stages: **Review** (Upload · Extract · Review), **Procure** (RFQ · Bids · Proposal), **Fulfill** (Order).

| Screen | Design |
|---|---|
| Upload | A dashed drop zone and a sample-plan card with a thumbnail of the drawing |
| Extract | The plan on the left with a moving orange scan line; a checklist and live log on the right |
| Review | Plan on the left (zoom, pan, fit) with coloured boxes; Openings and Grouped products tabs on the right; the selected opening's editable card; statuses AI read / Needs review / Verified / Edited; **Mark Ready for RFQ →** with the helper line "All reviewed window and door data will be prepared for manufacturer quoting." |
| RFQ | An RFQ document styled as a drawing sheet, with manufacturer checkboxes beside it |
| Bids | One comparison table with Lowest landed cost, Fastest delivery and deviation badges |
| Proposal | Dealer ledger with a margin slider beside the customer-facing proposal |
| Order | The PO sheet beside a seven-step status tracker |

**Why.** The workspace has to feel like the same product the story described, so it reuses every visual rule. Every sample-data screen is labelled "Platform preview".

---

## 12. Responsive, dark mode and accessibility

- **Phones:** on screens under 900 px, pinned scenes stack text above the visual; under 767 px, the header becomes a Menu button and grids become one or two columns. Long scroll animations become short or timed, and the About logo plays faster.
- **Dark mode:** the whole system has dark equivalents, including the plan linework (cream on charcoal) and highlight blending (`screen` instead of `multiply`).
- **Contrast:** body text and orange text are chosen to stay readable. The lightest grey is only used for secondary labels, never for information someone must read.
- **Keyboard and motion:** every control shows an orange focus outline, decorative drawings are hidden from screen readers, and "reduce motion" shows final states instead of animating.

---

## 13. How the design evolved, and why

| Step | Change | Reason |
|---|---|---|
| 1 | First version: story page plus working demo | Prove the core capability: plan → takeoff |
| 2 | Editorial redesign with scroll choreography (Ronnsquare-inspired) | Feel premium and distinct; replace decorative shapes with window and drawing objects |
| 3 | Rebuilt around **Review → Procure → Fulfill**; blueprint assembly as signature | One clear workflow a business person can remember; remove clutter |
| 4 | qBotica branding; site orange matched to the logo | CEO request; one orange instead of two |
| 5 | About page: logo construction, then cube unfold in brand colours | Company-focused, colourful, not a repeat of the homepage |
| 6 | Logo construction made to play by itself; blank start | Visitors wanted to watch it, not scroll it; no flash of the finished logo |
| 7 | Takeoff table redesigned | Rows overlapped the summary; names were cut off |
| 8 | Wording rule: verify / approve / acknowledge | "Approve" was confusing at the takeoff stage |
| 9 | Contact: inquiry sheet → one sentence → on the drawing sheet | Too much information, then a background that didn't match the site |
| 12 | Dark theme by default; draw a W with the cursor (or use the footer switch) for light | The client preferred a black theme; the W gesture adds a memorable WindowBid moment |
| 10 | Procure became one procurement sheet; Fulfill became a single order trace; Cascade carried from bid to PO; stage questions reworded | Make "one continuous record" believable, show each role's action, and keep motion meaningful and calm |

---

## 14. Rules for anything new

Before adding a page, section, logo or visual, check it against this list:

1. Does it sit on paper with drafting details (thin rules, registration crosses, mono sheet labels), or is there a clear reason it's a brand moment?
2. Is orange used only for machine-read or attention, and green only for confirmed or complete?
3. Does the headline use the statement voice (Archivo, uppercase, short, full stop) and do labels use the technical voice (Geist Mono)?
4. Does any animation belong to one of the six motion families, play once, and respect "reduce motion"?
5. Are corners 0–2 px, borders 1 px, and is there plenty of whitespace?
6. Is the qBotica cube untouched (`#FF7805`, no recolouring, strokes or effects), and is any partner logo shown in one colour, never in full colour next to the cube?
7. Is sample data labelled "Platform preview"?
8. Do the words follow the rule: dealer verifies, customer accepts, manufacturer acknowledges?

---

## 15. Open design items

1. Replace the rebuilt qBotica symbol and Poppins wordmark with official brand files, and confirm the horizontal header layout with qBotica's brand team.
2. Decide on a licensed display face (BT Grotesk) or keep Archivo.
3. Confirm the About page facts and agenda wording with the company.
4. Connect the Contact sentence to a real inbox or CRM.
