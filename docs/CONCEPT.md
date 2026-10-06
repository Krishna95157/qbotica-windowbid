# qBotica WindowBid — The Concept

**From an architectural drawing set to installed windows, as one continuous, checkable record.**

This document explains *the idea* behind WindowBid: the problem, the way we solve it, and the principles behind every decision. Short sections at the end cover how it is built, how it looks, what is real versus simulated, and what comes next.

| Other documents | What they cover |
|---|---|
| `README.md` | Setup, the reading pipeline in technical detail, configuration, results, version history |
| `docs/DESIGN.md` | Why every page looks the way it does, page by page |
| `docs/DESIGN-PATHWAY.md` | How to design anything new so it matches |

---

## 1. The problem

A window dealer wins work by pricing windows for a new house. Today that starts with a person and a PDF:

1. **The drawing set arrives:** 30 to 90 pages of architecture, structure, electrical and landscape. The window information is scattered across it:
   - a **floor plan** shows a tag (⬡5) in a wall;
   - a **window schedule**, often on another page, says what "5" means (30 × 72 in, casement, 15 of them);
   - sometimes an **elevation** adds a note.
2. **Someone does the takeoff by hand.** They find the right pages, count every opening, match tags to the schedule, and type it all into a spreadsheet. It takes hours, and one missed window or wrong size becomes a costly error.
3. **The takeoff is retyped again and again:** into an RFQ for manufacturers, into a bid comparison, into a customer proposal, into a purchase order. Every handoff is another chance for a mistake, and nobody can trace a number back to the drawing.

---

## 2. The idea

> **Read the drawings once, let a person confirm what was read, and carry that same record, unchanged, all the way to installation.**

WindowBid follows the project through three stages. The same windows, with the same marks, travel through all of them:

```
   REVIEW                        PROCURE                              FULFILL
   ──────                        ───────                              ───────
   Upload → Extract → Review  →  RFQ → Bids → Proposal         →      Purchase order → Delivery → Installed
   the drawing becomes data      the data becomes a priced deal       the deal becomes delivered windows
```

| Stage | The question it answers | Who acts |
|---|---|---|
| **Review** | "What windows does this house need?" | The **dealer** verifies what WindowBid read |
| **Procure** | "Who should make them, and at what price?" | The **customer** accepts the proposal |
| **Fulfill** | "Where is my order?" | The **manufacturer** acknowledges and delivers |

The promise is **one continuous record**. Window 5·3 on the plan is line 01 on the RFQ, part of Northline's bid, a line on the customer's proposal and a line on the purchase order. Nothing is retyped, and every number can be traced back to the sheet it came from.

---

## 3. The principles behind every decision

| Principle | What it means in practice |
|---|---|
| **AI reads, a person confirms** | Everything the machine read is marked *AI read* (orange); what a person confirmed is *Verified* (green). The dealer stays in charge. |
| **Read only what is needed** | The window schedule is read first. If it already lists every window with its size and count, that **is** the takeoff, so the rest of the set isn't read just in case. |
| **Find everything, not the first thing** | Every page is checked; a set may hold two or three schedules on different pages. Copies of the same schedule are counted once. |
| **Never hide uncertainty** | A window with no number on the plan says so, and explains why it was still counted. An issue stays visible in the summary ("2 without a size", "! 3 / 6") until it is fixed. |
| **Show the evidence** | Every window keeps where it came from: the plan sheet, the schedule row, the tag, the note. "Found in: Tag 5 on A-2.1 · Schedule on A-4.1." |
| **Decision first** | Each screen leads with what you must decide (65 windows, 3 bids, Northline meets everything, $123,635 installed, manufacturing). The detail is one click away under "View …". |
| **Windows only, honestly** | Doors are left out on purpose. Anything simulated is labelled "Preview environment". |

---

## 4. How it works, step by step

### Review: the drawing becomes data

**1. Upload.** A single plan image or a full PDF set of any length.

**2. Sort every page.** Each page gets a quick, cheap look: floor plan? window schedule? elevation? other? Which level? This takes about half a minute for a 31-page set.

**3. Schedule first.** Every page holding a window schedule is read closely.
- If the schedules give every window a **size and a count**, the takeoff is ready. 37th Place: 12 marks and 65 windows in about one minute.
- If they don't (no count column, missing sizes, no schedule at all), the floor plans are read and joined to the schedule by tag, as before.

**4. Show it right away.** The review opens on **Grouped products**, with the schedule page on the left and each product's row highlighted.

**5. Find the plan while you review.** In the background, WindowBid finds the house plan in the PDF and places every scheduled window on it.
- While it works, a strip of page thumbnails shows the scan, and a soft line runs along each product card.
- When it's done, the viewer settles on the plan, and each product reads "On plan A-2.1 · 15 of 15".
- Clicking a product highlights its windows in blue.
- The schedule stays the source of truth for counts. The plan only adds *where* each window is and *which room* it serves.

**6. Review and confirm.**
- Click a product to see it on the plan. Double-click it to list its windows.
- Each window card explains itself **in plain words**, e.g. "A casement window, 2 ft 6 in × 6 ft, in the Primary Bedroom, on the upper part of sheet A-2.1…".
- One **Verify all**, then **Mark Ready for RFQ**.
- Openings with neither a number nor a size on the drawing are left out automatically, because they can't be quoted.

### Procure: the data becomes a priced deal

**7. RFQ.** The verified list is packaged with a **specification**, so every manufacturer prices the same thing:
- whole-window NFRC ratings (U-factor ≤ 0.32, SHGC ≤ 0.23, per ENERGY STAR v7 for a hot climate);
- the glass package (Low-E, argon, warm-edge spacer);
- tempered glass where marked;
- finish, warranty and terms.

**8. Bids.**
- **Comparison first:** total, delivery, and how many requirements each bid meets.
- **Then the evidence:** product prices, the full specification comparison, and the ranking.
- **Then a preference:** Balanced, Lowest cost, Fastest delivery or Best performance.
- **Then a recommendation, with its reasons.** The dealer can always pick a different bid.

**9. Proposal.**
- **What the customer sees:** a clean document with **one installed price**.
- **What only the dealer sees:** landed cost, installation and **markup on landed cost**, kept in a private panel that never goes to the customer.
- The customer accepts it.

### Fulfill: the deal becomes delivered windows

**10. Purchase order.**
- **Status first:** e.g. "Manufacturing · expected delivery Nov 24".
- A four-stage tracker: Confirmed → Manufacturing → Delivery → Installed.
- Confirmed events (✓) are kept apart from estimates (○).
- The project ends in one clear state: **Project complete**.

---

## 5. Results on real drawing sets

| Drawing set | What WindowBid did | Result |
|---|---|---|
| **37th Place**: 31 pages | Found the schedule on A-4.1; plans mapped in the background | **65 windows, 12 products** in about 1 min, matching the schedule exactly; **65 of 65** then placed on plan A-2.1 |
| **8887-25**: 30 pages | Found the schedule on two pages and recognised them as copies | **78 windows, 15 products** (not doubled); **70 of 78** placed on plans A-2.1 / A-2.2 |
| **RC-Mahesh**: one plan with size notes, no schedule | Read the plan directly | Sizes read from notes like "2650 SH"; untagged openings explained |

---

## 6. How it is built

| Part | Technology | Role |
|---|---|---|
| **The page** | Plain HTML, CSS and JavaScript (no framework), built into one file (`dist/windowbid.html`) | Everything you see; the PDF handling, sorting logic, matching and review |
| **PDF handling** | PDF.js in the browser | Renders pages and reads their text layer (tags, sizes, titles) |
| **Drawings** | SVG | The plan viewer, highlights, the animated sample plan |
| **The server** | Node.js with no add-on packages (`server/server.mjs`) | Serves the page and holds the AI key. The browser never sees the key; usage is rate-limited per visitor. |
| **The reading service** | A vision AI model, called only by the server, with strict JSON answers | Looks at page images: sorts pages, reads schedules and plans. The interface never names the provider. |
| **Local reader** (alternative) | Python, PaddleOCR, Tesseract, PyMuPDF (`~/windowbid-experiment`) | A free, offline reader with evidence for every value; kept as a fallback |

The matching (tag ↔ schedule row, copies versus separate schedules, counts, conflicts) is ordinary, traceable code. The AI only reads pictures.

---

## 7. How it looks (in short)

- **A drafting sheet that turns into a workflow:** warm paper, a faint grid, thin 1 px rules, corners of 2 px at most, and no stock imagery.
- **Three type voices:**
  - condensed uppercase **statements** (Archivo);
  - plain **sentences** (Instrument Sans);
  - small **technical** labels and numbers (Geist Mono).
- **Colour means something:**
  - **orange** = read by the machine / needs attention;
  - **green** = confirmed by a person / meets the spec;
  - **blue** = what you selected;
  - dark green = the main button.
- **Motion:** the website tells the story with motion, while the working app stays calm (opening sections, selection, status changes).
- **Theme:** dark by default; draw a **W** with the cursor (or use the footer switch) for light.

Full detail: `docs/DESIGN.md` and `docs/DESIGN-PATHWAY.md`.

---

## 8. What is real and what is simulated

| Real today | Simulated ("Preview environment") |
|---|---|
| Uploading any plan or drawing set | The three manufacturers (Northline, Cascade, Mesa Ridge) |
| Reading schedules and plans, the takeoff, mapping onto the plan | Their prices, lead times and product specifications |
| Review, verification, plain-words explanations, CSV export | The customer's acceptance of the proposal |
| The RFQ contents and the specification | Purchase-order dates and the delivery tracker |

---

## 9. Where it runs

| Copy | Folder | Address | Purpose |
|---|---|---|---|
| Main demo | `~/Downloads/qbotica-windowbid-main` | localhost:3001 | Original working version, kept untouched |
| **Duplicate** (experiments) | `~/Downloads/qbotica-windowbid-experiment` | localhost:3003 | Where every new change is made and tested first |
| Saved releases | `…-release-v14` to `v17` | v16 on port 3005 | Frozen, verified versions; the live one sits behind the public link |
| Public link | Cloudflare quick tunnel to port 3005 | changes when the tunnel restarts | For teammates; runs only while the Mac is on |
| Permanent hosting | Render (blueprint in each release repo) | needs the owner's sign-in | Always-on link, later |

---

## 10. What comes next

1. **Three accounts.**
   - The **client** uploads plans and sees "your dealer will get back to you".
   - The **dealer** finds the takeoff already prepared, sends the RFQ and builds the proposal.
   - **Manufacturers** receive RFQs and submit real bids.
   - The client accepts and signs, and everyone sees the order move.
   - This needs server-side reading, accounts and a database.
2. **Real bids** replacing the sample manufacturers.
3. **Versioned documents:** each RFQ and proposal stored exactly as sent (v1, v2…).
4. **Signature and order acknowledgement** inside the platform.
5. **Official qBotica brand files** and permanent hosting.

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **Takeoff** | The list of every window in a project, with size, type and quantity |
| **Opening** | A hole in the wall that gets a window (one opening = one unit) |
| **Mark / tag** | The window's label on the drawing (⬡5); repeated units become 5·1, 5·2 … |
| **Window schedule** | The table on the drawings that defines each mark: size, operation, glass, count |
| **Product (line)** | Identical windows grouped together: "Casement 30 × 72 in · 15" |
| **RFQ** | Request for quote: the takeoff plus specification, sent to manufacturers |
| **Landed cost** | The manufacturer's price plus freight, delivered to the dealer |
| **Markup** | What the dealer adds, as a percentage of landed cost |
| **NFRC** | National Fenestration Rating Council: independent whole-window ratings |
| **U-factor** | How fast heat passes through the window (lower insulates better) |
| **SHGC** | Solar heat gain coefficient: how much sun heat comes through (lower keeps a hot house cooler) |
| **PO** | Purchase order: the dealer's order to the chosen manufacturer |
