# qBotica WindowBid — Project Notes (product, data and site history)

> These are the detailed working notes kept while the site was built. For setup, folder structure, build steps and the current state of the project, read **[../README.md](../README.md)** first. For the full design rationale, read **[DESIGN.md](DESIGN.md)**.

**Review. Procure. Fulfill.**

This README describes what the qBotica WindowBid demo website is, what it contains, how it was built, and the design system behind it. The design system section is meant to be the reference for anything added later, including new logos, partner marks, screenshots, slides and pages, so that new work matches what is already there.

Source: a single self-contained file, `windowbid.html`.

---

## 1. What WindowBid is

WindowBid is a platform for the business of buying windows and doors for construction projects. Three parties are involved. The **customer** (homeowner or project owner) needs windows installed. The **dealer** reads the architectural plans, works out exactly what is needed, gets prices from manufacturers, and sells the finished package to the customer. The **manufacturer** builds and ships the products. WindowBid sits in the middle and carries the project from plans through installation.

The website tells that story in three stages:

| Stage | Question it answers | What happens |
|---|---|---|
| **01 Review** | What do we actually need? | Openings are read from the drawing, then the dealer verifies them, edits anything wrong or missing, and marks the takeoff ready for RFQ. Identical openings are grouped into product configurations. |
| **02 Procure** | Which manufacturer should supply it, and at what cost? | The verified takeoff becomes an RFQ, manufacturers bid, bids are compared like for like, and the dealer sends a proposal that the customer accepts. |
| **03 Fulfill** | Did we complete it? | The customer-approved proposal becomes a purchase order. The manufacturer acknowledges it, and it is tracked through production, shipping, delivery and installation. |

The key idea is **one continuous record**: the same opening data (for example window W07) is never retyped. It moves from takeoff to RFQ to bid to PO to delivery.

**Who confirms what (wording rule).** Three different people confirm three different things, and the site never mixes their words:

| Who | Action | Wording to use | Never call it |
|---|---|---|---|
| Dealer | Checks the AI-extracted takeoff for technical accuracy | **Verify**, **Edit**, **Mark Ready for RFQ** | "Approve" |
| Customer | Accepts the products and price | **Accept** the proposal ("Customer accepted") | "Verify" |
| Manufacturer | Confirms it received the order | **Acknowledge** the PO ("PO acknowledged") | "Approve" |

So acceptance language appears only at the customer proposal. Per-opening statuses in the takeoff are **AI read** (extracted, not yet checked), **Needs review** (low confidence or a missing value), **Verified** (the dealer confirmed it) and **Edited** (the dealer changed a value, then confirmed it).

---

## 2. What is in the prototype

The site has four views, switched with hash links (`#about`, `#contact`, `#takeoff`). There is no build step and no server. Everything is in one HTML file.

### 2.1 Homepage, top to bottom

**01 · Hero: "Review. Procure. Fulfill."** On the left are the eyebrow "Window + door workflow", the headline, a short description, the Try Demo button and a "Scroll to follow the project" cue. On the right is a drafting frame with ruler ticks, corner registration crosses and sheet labels. On load, the floor plan assembles. Fourteen thin wall fragments fly in from all four sides and lock into place. Then the solid walls fade in, then furniture, fixtures, door swings and room names, then dimension strings, opening tags and the title block. Window W07 then gets an orange highlight, a "01" marker and a label (W07 · 36 × 60 IN · Single hung). The caption "This is where the workflow starts." appears and the sequence stops. After that the plan is interactive: the cursor snaps to any opening.

**02 · "Three stages. One continuous record."** The intro line reads: "Once the AI-extracted opening data is reviewed, the same information flows from takeoff to quoting, ordering and fulfillment." It is followed by three large ruled rows that animate as they come into view. Each row says who acts:

| Stage | Question | Who acts | Example |
|---|---|---|---|
| Review | Review the extracted takeoff | Dealer reviews AI-extracted data | Five rows from the sample plan: W02 changes from Needs review to Edited, and W09 stays at Needs review, so all three statuses (Verified, Edited, Needs review) are visible |
| Procure | Compare manufacturer options | Customer accepts the proposal | The RFQ line 01 price from each manufacturer, with Fastest and Lowest line cost tags |
| Fulfill | From order to installation | Manufacturer acknowledges the PO | Seven milestones fill in green; Installed shows an orange "Next" |

**03 · Review, a pinned scroll scene (720vh).** The headline changes as the scene progresses: "The project starts as a drawing", then "The structure becomes clear", then "Confirm the opening data", then "The drawing becomes data", then "Reviewed. Ready for RFQ." The drawing assembles again. Numbered orange markers then appear on all 12 openings. W02 is singled out with an orange highlight and a review note ("Height requires review"). The height is filled in, and the note changes from "Needs review" to "Edited · verified", turning from orange to green. The drawing then shrinks aside. The labels for W03, W04 and W07 detach from the plan and stretch into rows of the takeoff table, and the remaining rows fill in. A summary band appears (10 windows, 02 doors, 07 products, Ready for RFQ). Identical rows then slide together and collapse into seven product cards. The Single hung card (qty 5) stays on screen as the rest of the scene closes around it.

**04 · Procure, a pinned scroll scene (640vh): one procurement sheet.** The heading reads "Compare manufacturer options." with "Quote · Compare · Present" and "Dealer compares · Customer accepts". The scene plays out on a single ruled sheet, with no floating cards:

1. The Single hung card carried over from Review docks into the sheet, and its label changes from "Product 01 · Ready for RFQ" to "RFQ line 01".
2. The sheet draws outward from the card: RFQ #WB-1042, issued Oct 02, bids due Oct 16.
3. A bid schedule draws itself. Rules extend left to right, manufacturer names appear, then values rise out of masked cells (line 01 price, package landed cost, lead time).
4. Annotations appear: Cascade is tagged Fastest, and Mesa Ridge is tagged Lowest cost with an orange "⚠ Glass spec deviation".
5. A thin green line traces around Cascade, labelled "Selected for proposal".
6. The schedule wipes into a dealer-view ledger, which becomes the customer proposal. Dealer-only lines mask away, and the sheet header changes to "Customer proposal".
7. A signature draws, a green tick appears, a green rule runs along the bottom, and the label reads "Customer accepted · 18 Oct 2026".
8. The proposal compresses into a "Customer-accepted order · $42,500 · Cascade" card that carries into Fulfill.

**05 · Fulfill, a pinned scroll scene on charcoal (560vh): the order trace.** The heading reads "From order to installation." with "Order · Track · Complete" and "Manufacturer acknowledges the PO".

- **The PO card:** the order card becomes PO #WB-0048 (Cascade, Demo Residence, PO value $30,300).
- **The trace:** a single green leader line then draws downward. Each milestone appears only when the line reaches it, showing its owner and date:

  | Milestone | Owner | Date |
  |---|---|---|
  | PO created | Dealer | Oct 18 |
  | PO acknowledged | Manufacturer | Oct 20 |
  | Manufacturing | Manufacturer | Oct 22 |
  | Ready to ship | Manufacturer | Nov 18 |
  | In transit | Carrier | Nov 20 |
  | Delivered | Dealer · job site | Nov 24 |
  | Installed | Installer | Dec 01 |

- **W07 tag:** a small W07 tag rides the tip of the line.
- **Colours:** completed milestones are green, and only the next milestone gets an orange "Next".
- **Detail note:** one note sits beside the latest milestone.
- **Ending:** the trace folds away, leaving **W07** and "Complete." above "Drawing → Takeoff → RFQ → Bid → PO → Delivery → Installation".

The separate "One record. Every step after." section was removed, because this ending now tells the same story.

**06 · "One project. Fully traceable."** Four numbers count up from 00: 10 windows, 02 doors, 07 product configurations, 12 openings verified. These come from the demo plan. If a user reads their own plan in the demo, the numbers switch to that plan's counts.

**07 · "See the workflow yourself."** A dark green closing section with Try Demo and Contact Us buttons. A thin window outline draws itself once in the background.

**Footer.** The stacked qBotica logo, the product name WindowBid, "Review. Procure. Fulfill.", links, and "© 2026 qBotica · WindowBid".

### 2.2 About Us and Contact Us

**About Us** opens with an architectural brand reveal. A drafting frame fills the first screen and builds the qBotica cube by itself, steps 01 to 05, while the visitor stays in place. It takes about 5.6 seconds (4.2 seconds on phones), starts when the frame is in view, and shows its progress as a thin orange bar along the bottom of the frame. When it finishes, two controls appear: **Replay** and **Scroll to unfold ↓**.

| Share of the animation | What happens |
|---|---|
| 0–15% | Faint construction guides (baseline, centreline, isometric 30° diagonals, a dashed circle) draw outward from their midpoints |
| 15–40% | The three cube panels appear as thin charcoal outlines, staggered |
| 40–60% | Outlines strengthen, a faint charcoal fill adds definition, guides recede |
| 60–80% | Orange `#FF7805` fills the panels from the bottom up through a clip; the brand colour itself never changes |
| 80–92% | Outlines fade; the qBotica wordmark and the WINDOWBID label rise into place through masks |
| 92–100% | The finished logo holds, then the page continues |

After the reveal, the page switches to a deliberately different, colourful layout built from the logo itself. Because the homepage already covers the product, it stays short.

**The cube unfolds (pinned, 300vh).** The orange cube, identical to the logo, sits in the middle of the screen. As you scroll, its three faces separate, take on their own colours and flatten into three large panels:

| Face | Colour | Content |
|---|---|---|
| Top: 01 Who we are | qBotica orange `#FF7805`, dark text | "qBotica", an intelligent automation and agentic AI company headquartered in Phoenix, Arizona; founded 2017; Inc. 5000, 2022–2024 |
| Left: 02 What we do | Deep green `#173B31`, cream text | "Read. Understand. Act." We automate document-heavy work; chips for Document AI, Agentic AI and Automation |
| Right: 03 Our agenda | Mint `#A9DFC6`, deep green text | "Windows & doors, next." WindowBid brings that experience to window and door projects; three goals (drawings into trusted data, one shared record, people make the decisions) |

The panels are positioned with 2D matrix transforms that blend from the isometric cube faces to flat cards, so the change is continuous and reverses when you scroll back. The heading "One cube. Three sides." and the panel text appear once the panels are flat.

**Closing colour band.** Full-width qBotica orange with a faint grid, a large outlined cube that drifts slightly as you scroll, "Let's build it together.", a dark Contact Us button and a link to qbotica.com.

The About page is the one place where colour is used as a **brand moment** rather than a status signal: orange, deep green and mint are qBotica face colours here, not "detected" or "verified". Keep the status meaning everywhere else.

The company facts come from qBotica's website and press releases (October 2026). Check them with the company before publishing, especially the recognition line.

On phones the three coloured panels simply stack. With reduced motion turned on, everything shows in its final state. The About page starts its animation when the aperture transition finishes opening the page, replays each time you return, and stops its observers when you leave.

**Contact Us** is one fill-in-the-blank sentence set on a drawing sheet, using the same paper background, ruled frame, ruler ticks, registration crosses and sheet labels ("Contact / WindowBid", "Sheet / CT-01") as the homepage and About scenes. This follows how AI construction-software sites keep contact short and centred on booking a demo:

> Hi, I'm **[your name]** from **[company]**. I'd like **[a live demo ▾]**. Reach me at **[email]**.

- **Blanks:** each blank is underlined in orange and sizes itself to what's typed. The field being typed in gets a light orange tint. A correctly filled blank turns green, following the site's usual orange-to-green meaning. The choice offers a live demo, a pilot on our plans, to talk partnership, or something else.
- **Send:** the button uses the site's standard green **Send →** style, with the note "Prototype · nothing is sent yet".
- **Illustration:** beside the sentence, the qBotica cube is drawn as a construction detail ("Detail A · iso 30°"), with faint guides, outlined sides and an orange top face, echoing the About page.
- **Footer:** the bottom of the sheet reads "qBotica · Phoenix, Arizona", with a link to qbotica.com.
- **After sending:** the form checks the name and email, then replaces the sentence with "Thanks, [first name]." and an honest note that nothing was delivered or stored, plus **Start over**.
- **Phones:** the cube detail is hidden and the sentence uses smaller type.

Moving between pages uses the **aperture transition**: orange guide lines move in from the screen edges, the page closes to the centre, the content swaps, and the new page opens outward.

### 2.3 Try Demo (the working workspace)

Try Demo opens a full-screen workspace. The step bar groups the steps under the three stages: **Review** (Upload · Extract · Review), **Procure** (RFQ · Bids · Proposal) and **Fulfill** (Order).

| Step | What works |
|---|---|
| **Upload** | Drag in or browse for a PDF, JPG, PNG or WebP. Or use the built-in sample plan, which works anywhere. |
| **Read** | The sample plan plays a scan animation with a live log. An uploaded plan is really read: page 1 is rendered (PDFs via PDF.js) and sent to Claude, which returns each opening's mark, type, width, height, room, location box, confidence and a note. Marks appear in the log as they stream in. Errors get plain-language messages and retry options. |
| **Review** | The plan sits on the left (zoom, pan, fit) with detection boxes. The right panel has Openings and Grouped products tabs. Selecting a row or a box zooms the plan to that opening. You can edit type, room, width and height; **Verify** an opening; reject a false detection ("Not an opening"); or add an opening the reading missed by clicking the plan. Statuses: AI read, Needs review, Verified, Edited. Shortcuts: ↑/↓ or J/K to move, V to verify, Esc to cancel. "Verify high-confidence" confirms every high-confidence opening at once. **Mark Ready for RFQ →** unlocks once every opening is verified, with the helper line "All reviewed window and door data will be prepared for manufacturer quoting." After that, the footer reads "Ready for RFQ" and offers **Send to manufacturers →**, Reopen review and CSV export. |
| **RFQ** | RFQ #WB-1042 is built from your verified, grouped takeoff. Choose manufacturers, set a due date and add notes. |
| **Bids** | Three sample bids arrive one by one, then a normalized comparison (product, freight, landed cost, lead time, warranty, spec match) with lowest-cost, fastest and deviation badges. |
| **Proposal** | The dealer ledger (landed cost, installation, margin slider) sits beside the customer-facing proposal, which shows only the installed total. |
| **Order** | PO #WB-0048 with line items and a seven-step status tracker you advance by hand, ending in "Project complete." |

Detection colours on the plan follow the site rules: solid orange means AI read, dashed orange means needs review, and green means verified.

### 2.4 What is real and what is sample data

| Real | Sample data, labelled "Platform preview" |
|---|---|
| File upload, PDF rendering, AI reading of uploaded plans | Manufacturers (Northline, Cascade, Mesa Ridge) |
| Review, editing, verification, grouping, CSV export | Prices, lead times, warranties |
| Sample plan and its takeoff | RFQ sending, bid arrival, PO and delivery dates |
| | Contact form (does not send) |

### 2.5 The demo data (keep these consistent)

The sample plan, the homepage story and the demo all use the same numbers. If any number changes, change it everywhere.

**Sample plan:** "Demo Residence", sheet A1.0 Floor plan, scale 1/4" = 1'-0", Phoenix AZ, Rev 3. Seven rooms. Twelve exterior openings, ten windows and two doors, forming seven product configurations.

| Mark | Room | Type | Size (in) | Read confidence | Notes |
|---|---|---|---|---|---|
| W01 | Bedroom 2 | Single hung | 36 × 60 | 97% | |
| W02 | Bath | Awning | 24 × — | 63% | Height missing on the plan; corrected to 36 during review |
| W03 | Bedroom 3 | Single hung | 36 × 60 | 95% | |
| W04 | Primary bedroom | Single hung | 36 × 60 | 96% | |
| W05 | Primary bedroom | Single hung | 36 × 60 | 93% | |
| W06 | Kitchen | Casement | 30 × 48 | 91% | |
| W07 | Bedroom 2 | Single hung | 36 × 60 | 94% | The traced record used throughout the site |
| W08 | Living room | Picture | 72 × 60 | 92% | |
| W09 | Dining | Sliding | 60 × 48 | 81% | Flagged to check (operation read from symbol only) |
| W10 | Living room | Casement | 30 × 48 | 90% | |
| D01 | Living room | Hinged door | 36 × 80 | 96% | |
| D02 | Kitchen | Sliding door | 72 × 80 | 88% | |

**Procurement figures:**

| | Northline Window Co. | Cascade Fenestration | Mesa Ridge Windows |
|---|---|---|---|
| Product cost | $27,800 | $29,100 | $26,900 |
| Freight | $1,600 | $1,200 | $2,100 |
| Landed cost | $29,400 | $30,300 | $29,000 |
| Lead time | 7 weeks | 5 weeks | 9 weeks |
| Warranty | 20 years | 20 years | 15 years |
| Spec match | 12 / 12 | 12 / 12 | 11 / 12 (awning not offered) |

In the homepage story **Cascade is the selected bid**: it is the fastest (5 weeks) with no deviations, while Mesa Ridge's lower price comes with a glass spec deviation. The proposal adds up as manufacturer cost $29,100 + freight $1,200 + installation $5,500 + dealer margin $6,700 = **customer total $42,500**, with estimated delivery of 5–6 weeks. The PO to Cascade is $30,300 (product plus freight). The same Cascade supplier, PO #WB-0048 and dates carry through Fulfill.

The demo's pricing model is calibrated so that the sample plan, once W02 is corrected to 24 × 36, produces exactly these figures. The default margin is 6,700 ÷ 30,300 of landed cost (about 22.1%), so choosing Cascade in the demo also gives exactly $42,500.85% of landed cost and installation is $5,500 ÷ 12 per opening.

**Identifiers:** RFQ #WB-1042 (issued Oct 02, bids due Oct 16), PO #WB-0048 (issued Oct 18), sample dealer "Arizona Window Solutions". Milestones: confirmed Oct 20, production Oct 22 to est. Nov 28, ready to ship Nov 30, in transit Dec 02, delivered Dec 04, installed Dec 11.

---

## 3. Design system

### 3.1 Design idea

The site should feel like **an architectural drawing sheet that becomes a business workflow**. Think of an architectural editorial website crossed with a serious B2B product demo. It should not look like a generic SaaS dashboard or a flashy AI startup.

Three principles drive every decision. **The drawing is the hero:** real plan linework, dimensions and title blocks carry the visual identity, not illustrations or stock imagery. **Colour has meaning:** orange and green are never decorative (see 3.3). **Animation explains:** every motion shows the product doing something real, such as reading, verifying, transforming or tracing.

Reference influences were Heron AI (interaction on a drawing, blueprint assembly, the drafting cursor), Ronnsquare (editorial composition, whitespace, card choreography) and Randolph Scott Bell (oversized type, scroll rhythm). Their principles were rebuilt for WindowBid; no assets were copied.

### 3.2 Brand: qBotica WindowBid

WindowBid is presented as a qBotica product. The full name is **qBotica WindowBid**. In running text, write "WindowBid by qBotica" or "qBotica WindowBid". Always spell the company name **qBotica**: lowercase q, capital B. Never uppercase it, even inside uppercase labels.

**Important:** the qBotica symbol and wordmark on the site were rebuilt from a written specification, not traced from the official artwork. The wordmark is set in Poppins Bold as a stand-in. Before anything goes outside the company, replace both with the official vector files from qBotica's brand team and confirm that the horizontal header layout is approved.

**The symbol** is an isometric cube made of three orange panels with rounded corners, separated by a Y-shaped channel. It is drawn on a 92 × 100 viewBox, from a pointy-top hexagon (centre 46,50; radius 50; widened 1.06× horizontally), with a channel 8.5 units wide and corner radii of 7 (outer) and 3.5 (inner). It lives once in the file as `<symbol id="qmark">` and is reused everywhere with `<use href="#qmark"/>`.

| Logo element | Value |
|---|---|
| Symbol colour | `#FF7805` (qBotica orange), in light and dark mode; never recoloured, tinted or outlined |
| Wordmark | "qBotica", Poppins 700, letter-spacing −0.02em |
| Wordmark colour | `#000000` on light backgrounds; `#F1EFE4` on dark backgrounds |
| Style | Flat fills only; no gradients, shadows, bevels or effects |

**The three layouts used on the site:**

| Layout | Where | Construction |
|---|---|---|
| Horizontal (primary on the site) | Site header | Symbol 27 × 29 px, 12 px gap, wordmark 1.42rem, then a 1 px × 22 px divider in `--rule`, then "WINDOWBID" in Archivo 87.5% width, 700, 0.9rem, tracking 0.07em, colour `--ink-2` |
| Horizontal, compact | Demo workspace top bar | Symbol 22 × 24 px, wordmark 1.18rem, divider 18 px, product name 0.8rem |
| Stacked | Footer | Symbol 42 × 46 px centred above the wordmark (1.72rem) with a 10 px gap; "WINDOWBID" set separately below |
| Stacked, large | About page opening | Symbol 270 units tall in a 1000 × 640 scene, wordmark about 2.8× the symbol's width with a gap of about a quarter of the symbol's height, "WINDOWBID" label tracked 0.16em below |

**Working rules for the logo on this site** (these are not official qBotica guidelines):

1. Keep clear space around the logo of at least the symbol's channel width times three (about a quarter of the symbol height) on every side.
2. Don't place it smaller than a 20 px-tall symbol on screen.
3. Don't put it on orange, on photographs, or on busy linework. Use it on paper (`--paper`), card (`--card`), charcoal (`--dark`) or dark green (`--cta`) only.
4. Don't stretch it, rotate it, add a stroke, or recolour the symbol to match a section.
5. The product name WindowBid always uses the site's display face (Archivo) and never imitates the qBotica wordmark lettering.

**Adding other logos (partners, manufacturers, customers).** Show them in one colour, using `--ink` on light backgrounds or `--dark-ink` on dark ones, at a matching optical height of about 20–24 px, inside a ruled cell or a strip with 1 px `--rule` borders. Never put another full-colour logo next to the qBotica symbol, because the orange must stay qBotica's. If a partner's own guidelines require full colour, give it its own bordered cell with generous whitespace and keep it out of the header.

### 3.3 Colour

**The meaning rule (most important):** **orange means machine-read, attention or in progress.** **Green means confirmed by a person (dealer verified, customer approved) or complete.** Charcoal and paper are the structure. Never use orange or green just for decoration. A new feature that shows something the AI detected should use orange; anything a person has confirmed should turn green.

**Dark is the default theme.** Visitors switch to light (and back) by drawing a **W** with the cursor on desktop, or with the footer's theme switch on any device. The circle-reveal transition starts where the W ended, and the choice is remembered for the next visit.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#EAE8DC` | `#1A1A18` | Page background (warm drafting paper) |
| `--paper-2` | `#E1DFD2` | `#222220` | Hover rows, subtle fills |
| `--card` | `#F3F1E8` | `#232320` | Panels, tables, form surfaces |
| `--plan-bg` | `#F5F3EB` | `#20201D` | Drawing sheets and documents (slightly lighter than paper) |
| `--ink` | `#282828` | `#E8E6DA` | Main text, plan walls |
| `--ink-2` | `#5F5E59` | `#B5B3A8` | Body copy, secondary text |
| `--ink-3` | `#8C8B84` | `#85847C` | Labels, captions, inactive states |
| `--rule` | `#B3B3AF` | `#3E3E3A` | 1 px borders and dividers |
| `--rule-soft` | `rgba(40,40,40,.13)` | `rgba(232,230,218,.12)` | Row separators |
| `--orange` | `#FF7805` | `#FF8A2A` | Detection, markers, attention (matches the qBotica orange) |
| `--orange-ink` | `#A34A00` | `#FFA864` | Orange text on light backgrounds (readable contrast) |
| `--orange-tint` | `rgba(255,120,5,.14)` | `rgba(255,138,42,.15)` | Highlighted regions and rows |
| `--on-orange` | `#1F1F1F` | `#1A0E00` | Text on orange (always dark, never white) |
| `--green` | `#557D68` | `#86B29B` | Verified, approved, complete |
| `--green-hi` | `#8FC2A6` | `#8FC2A6` | Green on dark backgrounds |
| `--green-tint` | `rgba(85,125,104,.16)` | `rgba(134,178,155,.16)` | Verified rows and regions |
| `--brand` | `#173B31` | `#2E6B57` | Primary buttons (Try Demo) |
| `--dark` | `#282828` | `#111110` | Fulfill section background |
| `--cta` | `#173B31` | `#173B31` | Closing call-to-action section |
| `--q-orange` | `#FF7805` | `#FF7805` | qBotica symbol only |
| `--q-ink` | `#000000` | `#F1EFE4` | qBotica wordmark only |

Rules of thumb: white text never goes on orange. Orange text on paper uses `--orange-ink`. Mostly the page should be paper and charcoal; orange and green appear in small amounts where they mean something. There is one dark charcoal section (Fulfill) and one dark green section (closing call to action), and new pages should not add more dark sections without a reason.

### 3.4 Typography

| Role | Typeface | Settings | Used for |
|---|---|---|---|
| Display | Archivo (Google Fonts), semi-condensed | `font-stretch: 87.5%`, weight 700, UPPERCASE, line-height 0.84–0.86, letter-spacing −0.035em | Headlines, stage names, big numbers |
| Body | Instrument Sans | 400–600, sentence case, 17 px base, line-height 1.55 | Paragraphs, form fields |
| Technical | Geist Mono | 400–600, UPPERCASE for labels, tracking 0.06–0.12em | Marks, sizes, statuses, coordinates, captions, buttons |
| Brand wordmark | Poppins 700 (stand-in) | letter-spacing −0.02em, as written "qBotica" | Logo only |

Archivo stands in for a BT Grotesk-style compact grotesk. If a licence for BT Grotesk is obtained, it can replace Archivo in the `--disp` variable.

| Size | Value |
|---|---|
| Hero headline | `clamp(64px, 7vw, 118px)`; 56–68 px on phones |
| Section headline | `clamp(46px, 5.2vw, 92px)` |
| Medium display | `clamp(32px, 3.2vw, 54px)` |
| Lead paragraph | 1.05–1.28rem, max width 470 px |
| Body | 1–1.1rem |
| Labels and eyebrows | 0.62–0.76rem mono |

**Copy voice.** Headlines are short, uppercase statements ending with a full stop ("Price it. Compare it. Sell it."). Each line of a multi-line headline is a separate thought. Eyebrows follow the pattern `NN / SECTION` ("01 / Review"). Technical labels use slashes and middle dots ("W07 / 36 × 60 / Single hung", "Northline · 12 openings"). Sizes are always written with a multiplication sign, width first, in inches ("36 × 60 IN"). Body copy is plain sentence case. Sample data is always labelled "Platform preview".

### 3.5 Layout and spacing

| Item | Value |
|---|---|
| Max content width | 1520 px, centred |
| Page gutter | 40 px desktop, 20 px phone |
| Grid | 12 columns, 20 px gap |
| Typical split | Text in columns 1–4 or 1–5, visual in 5–12 or 6–12; Procure reverses this (visual 1–8, text 9–12) to vary the rhythm |
| Header height | 78 px desktop, 64 px phone |
| Space between major sections | 140–220 px |
| Heading to body | 30–36 px |
| Card padding | 16–28 px |
| Corner radius | 2 px everywhere (square, architectural); 0 px for frames |
| Borders | 1 px; 2 px only for status lines and stamps |
| Breakpoints | 1100 px (tablet), 900 px (stacked scenes), 767 px (phone) |

**Drafting-sheet details.** The page background has a faint 120 px grid and a light paper grain. Drawing frames have ruler ticks along the top and left edges, "+" registration crosses at the four corners, mono sheet labels above ("Project / Demo Residence", "Sheet / A1.0") and a coordinate tag below. Section breaks use a 1 px line that draws from left to right. Keep these details faint: they should be felt, not noticed.

### 3.6 Drawings and diagrams

All plan drawings share one style. Any new diagram, illustration or icon should follow these line weights.

| Element | Style |
|---|---|
| Exterior walls | 10-unit stroke, `--plan` |
| Interior walls | 6-unit stroke, `--plan` |
| Window symbols, jambs | 1.3-unit stroke |
| Door leaves | 2.2-unit stroke; swings dashed (3/3) in `--plan-2` |
| Furniture and fixtures | 1-unit stroke in `--plan-2`, no fill |
| Room names | Archivo 87.5%, 600, uppercase, tracking 0.1em |
| Dimensions and tags | Geist Mono 9–10 units, `--plan-2`; window tags in rounded rectangles, door tags in circles |
| Detections | Orange tint fill, 1.5 px orange outline, 2.5 px orange corner brackets, orange mark chip with dark text |
| Verified | The same shapes in green |
| Needs review | Dashed orange outline; a hatched fill when a size is missing |
| Highlight region | Orange at 24% opacity with `multiply` blending (`screen` in dark mode), turning green when verified |

No gradients, no glows, no drop shadows on linework. The only shadows on the site are soft paper shadows under floating sheets and cards.

### 3.7 Components

**Buttons.** The primary button ("Try Demo") is dark green, 44 px tall (52 px for large), mono uppercase text with tracking 0.08em, and a 2 px radius. On hover it lifts 2 px, a lighter green fills in from the left in seven pixel-like steps, and the arrow moves 4 px. The secondary button has a 1 px outline. Text links in the header use a "label roll": the text slides up and an identical copy rolls in from below in 280 ms.

**Cards.** Dark record cards (product, order) are charcoal with cream text and a faint 1 px light edge so they stay visible on dark sections. Comparison grids are a single bordered grid, never separate floating cards. Notes and review panels are off-white with a 1 px orange border and square corners, turning green once verified.

**Status labels.** These are small rounded labels: AI read (orange tint), Needs review (dashed orange; hatched when a size is missing), Verified (green tint), Edited (green tint).

### 3.8 Motion

Every animation belongs to one of six families. New animations should fit one of them.

| Family | Meaning | Example |
|---|---|---|
| **Assemble** | Pieces physically form the drawing | Wall fragments flying in and locking |
| **Reveal** | Registered layers appear in place | Walls, then furniture, then dimensions |
| **Annotate** | Orange marks call attention | Markers, the W02 highlight, the spec deviation |
| **Confirm** | A person confirms: orange turns green (dealer verifies; customer accepts) | Review note, status labels, timeline |
| **Transform** | One object becomes the next | Label to table row, product to RFQ to proposal to order to PO |
| **Trace** | The same identity stays visible | W07 through every stage |

| Motion | Timing |
|---|---|
| Button hover | 200–220 ms |
| Header label roll | 280 ms |
| Headline line reveal | 750 ms per line, lines staggered 100 ms (each line slides up from a mask) |
| Opening detection | 300–450 ms |
| Section line draw | 1.2 s |
| Page aperture transition | 420 ms close, 560 ms open |
| Number count-up | 850 ms, ease-out-quart |
| Hero assembly | About 5 s total, plays once, then stops |
| Cursor trail | Fades in 350 ms |

Rules: movement is mechanical and deliberate, with no bounce. Hero animations play once and stop; nothing loops forever. Scroll scenes are driven by scroll position, so they reverse when you scroll back. With "reduce motion" turned on, timed animations are skipped and final states are shown.

### 3.9 Cursor (desktop only)

| Context | Cursor |
|---|---|
| Default | A 4 px square with a thin orange pen trail that fades within 350 ms |
| Over a drawing | An 18 px crosshair with faint X/Y coordinates |
| Near an opening | Snaps to the opening as orange corner brackets with a label ("W07 / 36 × 60"); clicking pulses the brackets inward |
| Over actions | A small label: OPEN → (calls to action), VIEW BID (bid columns), DETAILS (milestones), TRACE (the W07 record), LOCATE (table rows), and PAN, SELECT, DRAGGING or PLACE in the demo plan viewer |
| Dark sections | Switches to a light colour |
| Text fields | The normal system cursor returns |

On touch devices the normal system behaviour is kept.

### 3.10 Accessibility and responsiveness

Body text and orange text are chosen for readable contrast (orange text always uses `--orange-ink`). The lightest grey (`--ink-3`) is lower contrast, so use it only for secondary labels, never for information someone must read. Every interactive element has a visible orange focus outline. Decorative SVGs are hidden from screen readers. Below 900 px, the pinned scenes stack the text above the visual. Below 767 px, the header collapses to a Menu button and grids become one or two columns. Dark mode is fully supported.

---

## 4. How it was built

The site is one HTML file with inline CSS and JavaScript and no framework. External resources are Google Fonts (Archivo, Instrument Sans, Geist Mono, Poppins) and PDF.js 3.11.174 from cdnjs, which loads only when someone uploads a PDF. The floor plan, the qBotica symbol, all icons and all animations are drawn in code (SVG plus JavaScript), with no image files.

When served by a host that provides an AI runtime, the page uses two permissions: **asking the host AI** (to read uploaded plans) and **saving files** (CSV export). Each asks the viewer for consent the first time it's used. Everything else runs in the browser.

**Where things live in the source (`src/`):**

| What | Where |
|---|---|
| Colours, fonts, spacing | `src/css/01-tokens-base.css` (`:root`, plus the dark-theme blocks) |
| qBotica symbol | `<symbol id="qmark">` near the top of `<body>` in `src/index.html`; lockup styles in `src/css/01-tokens-base.css` under `/* qBotica lockup */` |
| Floor plan | `src/js/02-plan-model.js`: `SEED` (openings), `ROOMS`, `FRAGS` (assembly pieces), `buildPlanLayers()` |
| Pricing | `src/js/03-pricing.js`: `BASE`, `SCALE`, `MFRS`, `INSTALL_PER` |
| Homepage scenes | `src/js/07-…` to `10-…`: `initHero`, `initStages`, `initReviewScene`, `initProcureScene`, `initFulfillScene`, `initMetrics` |
| About page | `src/js/11-about.js`: `About.prepare()` / `About.enter()` / `About.leave()` |
| Demo workspace | `src/js/13-…` to `16-…`: `runSample`, `runUpload`, `renderReview`, `openRFQ`, `renderBids`, `renderProposal`, `renderOrder` |

**To swap in the official qBotica logo**, replace the path inside `<symbol id="qmark">` in `src/index.html` (a standalone copy is in `assets/brand/qbotica-symbol.svg`) with the official symbol artwork (keep the `viewBox` matching the artwork), and replace the `.qb-word` text with the official wordmark, either as an SVG outline or with the official font. The header, footer, workspace and browser tab icon all update from those two places.

---

## 5. Version history

| Version | Summary |
|---|---|
| v1 | First demo: story page plus a working Smart Takeoff workspace (upload, AI reading, review, RFQ, bids, proposal). |
| v2 | Editorial redesign inspired by Ronnsquare: animated challenge cards, drawing-to-takeoff scene, openings-to-products scene, drafting cursor. |
| v3 | Restructured around Review → Procure → Fulfill: blueprint assembly hero, pinned Review/Procure/Fulfill scenes with objects carried between sections, one-record section, metrics, About and Contact pages, aperture transitions, pen-trail cursor, Order stage in the demo, and pricing calibrated to the story. |
| v4 | qBotica branding: rebuilt cube symbol and wordmark, three logo layouts, site accent changed to qBotica orange, dark text on orange for readability, "© 2026 qBotica". |
| v7 | Contact page simplified to a single fill-in-the-blank sentence on a drawing sheet, with a cube construction detail. |
| v9 | Dark theme by default; W cursor gesture and footer switch for light theme. |
| v8 | Procure redesigned as one procurement sheet (schedule draws, selection trace, signature acceptance); Fulfill redesigned as a single order trace ending in "W07 Complete."; Cascade selected throughout; stage copy updated; One-record section folded into Fulfill. |
| v6 | Takeoff table redesign; wording rule applied site-wide (dealer verifies and marks Ready for RFQ, customer approves the proposal, manufacturer acknowledges the PO). |
| v5 | About page: scroll-built brand construction scene, then the cube unfolding into three coloured panels (who we are, what we do, our agenda) and an orange closing band. |

---

## 6. Open items

1. Replace the rebuilt qBotica symbol and Poppins wordmark with the official brand files, and confirm the horizontal header layout with the brand team.
2. Confirm the About page facts and agenda wording with qBotica; add leadership or team details if wanted.
3. Connect the Contact form to a real inbox or CRM (it already collects name, company, request type and email).
4. Decide on the display font licence (Archivo now; BT Grotesk if licensed).
5. Before showing real customers, replace sample manufacturers, prices and dates with real data, or keep the "Platform preview" labels.
6. Uploaded plans: only page 1 of a PDF is read, and box positions from AI reading are approximate. Multi-sheet reading (plan plus window schedule) is the natural next step.
