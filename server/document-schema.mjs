/**
 * Multi-sheet drawing sets: the contracts for the two passes the browser runs over a full set.
 *
 *   1. classify — small images of a batch of pages → what each sheet is (floor plan, schedule, …),
 *                 which building level it shows, and where schedule tables sit on the page.
 *   2. page     — one sheet (or a crop of its schedule) at full detail → the openings drawn on it
 *                 (by tag, with location) and the schedule / legend rows defined on it.
 *
 * The browser then joins plan tags to schedule rows across sheets (src/js/17-app-document.js).
 * TYPES is shared with the single-page contract in takeoff-schema.mjs.
 */
import { TYPES } from './takeoff-schema.mjs';

export const SHEET_KINDS = ['floor_plan', 'window_schedule', 'door_schedule', 'window_door_schedule',
  'window_types', 'elevation', 'other_plan', 'other'];
export const PAGE_KINDS = ['auto', 'floor_plan', 'schedule', 'window_types', 'elevation'];

// ---------- 1. classify ----------
export const CLASSIFY_SYSTEM = `You sort the sheets of a construction drawing set for a window dealer (windows only, no doors).
Each page image is labelled with its page number. Say what each sheet is, so the right sheets can be read in detail later. Judge each page by its drawings and sheet title, not by an index or sheet list printed on it.

kind (pick the main purpose of the sheet):
- floor_plan: an architectural floor plan of a building level with the window and door openings drawn in the walls, usually with tags (numbered or lettered symbols) or size callouts. Includes noted, annotated and dimensioned floor plans. This is the sheet openings are counted from.
- window_schedule, door_schedule, window_door_schedule: a sheet whose main content is a table listing windows and/or doors by mark, with sizes, types or quantities.
- window_types: a legend or set of small elevations defining window or door TYPES (e.g. "Type A: fixed, 3'-0\\" x 5'-0\\"").
- elevation: exterior building elevations.
- other_plan: any other plan that shows the same walls and windows but is not the opening source: electrical, lighting, plumbing, mechanical, framing, roof, foundation, site, reflected ceiling, demolition, furniture, and enlarged plans of a small area (e.g. an enlarged bathroom) that repeat part of a floor plan.
- other: cover, general notes, sections, details, structural, energy and anything else.

Also return:
- sheet_number: the sheet number from the title block (e.g. "A-2.1"), or null.
- title: the sheet title (e.g. "NOTED FIRST FLOOR"), or null.
- level: for floor_plan and other_plan, the building level or structure shown ("first floor", "second floor", "basement", "casita"); null otherwise. Use the same wording for the same level on every sheet.
- opening_tags: how many window or door tag symbols or size callouts appear on the drawn openings: "many", "few" or "none".
- tag_style: how the openings are marked: "symbols" (tag symbols such as circles or hexagons holding a mark that a schedule defines), "callouts" (size/type notes such as "3050 SH" written at the openings), "both", or "none" (e.g. a dimensioned plan with only dimension strings).
- A level is sometimes split over several sheets ("NOTED FLOOR PLAN - CONTINUED", a casita, a wing): each such sheet is its own floor_plan.
- schedule_regions: for EVERY sheet that contains a window schedule or a window type legend (even a floor plan sheet with a small schedule in a corner), one box per window table. Do not box door schedules: [x0, y0, x1, y1] on a 0–1000 scale of that page image (y grows downward). Make the box generous: include the table title and every row. Empty array if none.
- confidence: 0 to 1.`;

export function classifyPrompt({ filename, total }) {
  return `These are pages from "${filename}" (${total} pages in the set). Classify every page shown below; return exactly one entry per page, using the page numbers given.`;
}

const nullableString = { type: ['string', 'null'] };
const nullableNumber = { type: ['number', 'null'] };
const nullableBool = { type: ['boolean', 'null'] };
const box4 = { type: 'array', items: { type: 'number' } };

export const CLASSIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['pages'],
  properties: {
    pages: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['page', 'kind', 'sheet_number', 'title', 'level', 'opening_tags', 'tag_style', 'schedule_regions', 'confidence'],
        properties: {
          page: { type: 'integer' },
          kind: { type: 'string', enum: SHEET_KINDS },
          sheet_number: nullableString,
          title: nullableString,
          level: nullableString,
          opening_tags: { type: 'string', enum: ['many', 'few', 'none'] },
          tag_style: { type: 'string', enum: ['symbols', 'callouts', 'both', 'none'] },
          schedule_regions: { type: 'array', items: box4 },
          confidence: { type: 'number' },
        },
      },
    },
  },
};

// ---------- 2. page ----------
export const PAGE_SYSTEM = `You are a construction estimator building a WINDOW takeoff (windows only, no doors) from ONE sheet of a multi-sheet drawing set.
Other sheets are read separately and combined later by matching tags, so report only what this sheet shows. Never guess what another sheet says, and never invent sizes or tags.

There are two kinds of output.

1. openings: every exterior window DRAWN on a floor plan on this sheet, one entry per physical location. category is always "window".
- tag: the text inside the tag symbol (circle, hexagon, diamond, square…) attached to the opening, exactly as written ("3", "12", "A", "W4"). Null if the opening has no tag.
- Window and door tags sit on, or right beside, an opening in a wall. These are NOT opening tags: keynote markers (numbers that refer to a numbered keynote list on the sheet and usually point at items inside rooms), room numbers, grid bubbles, section/detail/elevation callouts, revision deltas. If the sheet has a legend showing which symbol shape marks windows, doors or keynotes, follow it.
- Include every exterior window, including fixed/picture units, clerestories and transoms that have their own window tag or window callout.
- Do NOT include doors of any kind: entry, swing, patio, sliding glass, French, bifold, multi-slide, pocket, overhead/garage. Skip door tags, and sidelites that are part of a door unit. Also skip cased openings, closets, cabinets and furniture.
- raw_callout, width_in, height_in, type, tempered_glass, egress: only from notes written at that opening ON THIS SHEET (e.g. "3050 SH", "2040 SH TEMP GL"). When the opening only has a tag, set raw_callout, width_in and height_in to null and type to "Unknown" — the size comes from a schedule on another sheet. A null size is expected then; do not set needs_review just for that.
- Size codes: first two digits are feet and inches of width, last two of height: "5050" = 60 x 60 in, "2640" = 30 x 48 in, "3068" = 36 x 80 in. Operation codes: XO/OX = Sliding, SH = Single hung, DH = Double hung, CSMT = Casement, AWN = Awning, FX/FIX/PW = Picture.
- room: the room the opening serves, or null. quantity: > 1 only for identical units ganged at one location (a mulled pair), else 1.
- box: [x0, y0, x1, y1] tight box around the opening symbol, integers on a 0–1000 scale of the image width and height.
- confidence: 0 to 1, honest. needs_review: true when the tag or a written value is unclear. note: one short reason when needs_review is true, else "".

2. definitions: every row of every WINDOW schedule or window type legend on this sheet. Skip door schedules and door rows entirely.
- key: the mark exactly as written in the schedule's mark column ("1", "A", "W3", a type letter).
- applies_to: always "window".
- size_text: the size exactly as written ('3\\'-0" X 5\\'-0"', "3050"). width_in, height_in: converted to inches (width first). For a door listed like '6\\'-0" X 9\\'-0" / (2) 3\\'-0" X 9\\'-0"', use the overall opening size.
- type: from the operation or type column: FIXED/FX/PICTURE → "Picture", CASEMENT → "Casement", SH/SINGLE HUNG → "Single hung", DH → "Double hung", AWNING → "Awning", XO/SLIDER → "Sliding"; doors: sliding glass / multi-slide / bifold glass walls → "Sliding door", French → "French door", other swing doors → "Hinged door". A door schedule often has no operation column: then judge from the size and remarks (entry door, one-lite, fiberglass, solid core, a single or pair leaf → "Hinged door"; pocket and overhead garage doors → "Unknown"). "Unknown" when nothing says.
- quantity: from a quantity / # / QTY column, else null.
- tempered_glass, egress: true or false when the schedule states it (a TEMPERED column, or remarks such as TEMP, EGRESS); null when not stated.
- exterior: true when the unit is in an exterior wall (location EXTERIOR, entry doors, patio doors, overhead garage doors, all windows unless stated otherwise); false for interior doors, including fire-rated house-to-garage doors; null when unknown.
- remarks: short remarks text as written, or "".
- row_box: [x0, y0, x1, y1] around that whole table row (mark to last column), integers on a 0–1000 scale of this image; null if unsure.
- confidence: 0 to 1.
Return every window row. Do not skip window rows.`;

export function pagePrompt({ filename, page, total, kind, level, title, crop, width, height, textLayer }) {
  const where = `page ${page} of ${total} of "${filename}"${title ? ` (sheet: ${title})` : ''}`;
  const what = {
    auto: `This is ${where}. If it shows a floor plan, return the openings drawn on it. If it shows only exterior elevations, return the openings shown on them instead. Return definitions for any schedule or type legend on it.`,
    floor_plan: `This is ${where}, a floor plan${level ? ` of the ${level}` : ''}. Return the openings drawn on it. Return definitions only if a schedule or type legend is also on this sheet.`,
    schedule: `This image is ${crop ? 'a crop of the schedule area of' : ''} ${where}. Return the definitions for every window schedule row (skip door schedules). openings must be an empty array.`,
    window_types: `This image is ${crop ? 'a crop of the type legend on' : ''} ${where}. Return one definition per window type shown (skip door types). openings must be an empty array.`,
    elevation: `This is ${where}, an exterior elevation sheet. Do NOT return openings (they are counted from the floor plans): openings must be an empty array. For every window tag on the elevations that has a size or type note, return a definition with key = the tag.`,
  }[kind] || '';
  const base = `${what}\nThe image is ${width} x ${height} pixels.`;
  return textLayer
    ? `${base}\n\nThe text layer of this image, for exact spelling of tags, marks and sizes. One line per text item, "x,y: text", x and y on a 0-1000 scale of the image (y grows downward):\n${textLayer}`
    : base;
}

export const PAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sheet', 'openings', 'definitions'],
  properties: {
    sheet: { type: 'string', enum: ['floor plan', 'elevation', 'schedule', 'other'] },
    openings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['tag', 'category', 'type', 'raw_callout', 'width_in', 'height_in', 'room', 'quantity',
          'tempered_glass', 'egress', 'box', 'confidence', 'needs_review', 'note'],
        properties: {
          tag: nullableString,
          category: { type: 'string', enum: ['window', 'door'] },
          type: { type: 'string', enum: TYPES },
          raw_callout: nullableString,
          width_in: nullableNumber,
          height_in: nullableNumber,
          room: nullableString,
          quantity: { type: 'integer' },
          tempered_glass: { type: 'boolean' },
          egress: { type: 'boolean' },
          box: { type: ['array', 'null'], items: { type: 'number' } },
          confidence: { type: 'number' },
          needs_review: { type: 'boolean' },
          note: { type: 'string' },
        },
      },
    },
    definitions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'applies_to', 'size_text', 'width_in', 'height_in', 'type', 'quantity',
          'tempered_glass', 'egress', 'exterior', 'remarks', 'row_box', 'confidence'],
        properties: {
          key: { type: 'string' },
          applies_to: { type: 'string', enum: ['window', 'door'] },
          size_text: nullableString,
          width_in: nullableNumber,
          height_in: nullableNumber,
          type: { type: 'string', enum: TYPES },
          quantity: { type: ['integer', 'null'] },
          tempered_glass: nullableBool,
          egress: nullableBool,
          exterior: nullableBool,
          remarks: { type: 'string' },
          row_box: { type: ['array', 'null'], items: { type: 'number' } },
          confidence: { type: 'number' },
        },
      },
    },
  },
};
