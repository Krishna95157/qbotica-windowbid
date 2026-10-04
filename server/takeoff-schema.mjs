/**
 * The WindowBid takeoff contract: what the model is told, and the exact JSON shape it must return.
 *
 * Keep TYPES in sync with TYPES in src/js/13-app-state-order.js (the review UI uses the same list).
 * Structured Outputs in strict mode: every property is required and additionalProperties is false;
 * "optional" values are expressed as nullable types.
 */
export const TYPES = ['Single hung', 'Double hung', 'Casement', 'Awning', 'Picture', 'Sliding',
  'Hinged door', 'Sliding door', 'French door', 'Unknown'];

export const SYSTEM_PROMPT = `You are a construction estimator building a window and door takeoff for a window dealer from an architectural drawing.
Read only what is on the drawing. Never invent sizes or marks. When something is not legible or not shown, return null and mark the opening for review.

Rules:
- Include every EXTERIOR window and EXTERIOR door shown on the page. Skip interior doors, cased openings, closets, cabinets and furniture.
- Return one entry per physical opening location. Use quantity > 1 only for identical units ganged at the same location (for example a mulled pair).
- If the page is a window or door schedule, return one entry per schedule row, use the row's quantity, and set box to null.
- raw_callout: copy the size or type note exactly as written on the drawing (for example "5050 XO", "2040 SH TEMP GL", "3068 EXT"). Null if there is none.
- Size codes: the first two digits are feet and inches of width, the last two are feet and inches of height. "5050" = 5'-0" x 5'-0" = 60 x 60 in. "2640" = 2'-6" x 4'-0" = 30 x 48 in. "3068" = 3'-0" x 6'-8" = 36 x 80 in.
- Operation codes: XO / OX = sliding window, SH = single hung, DH = double hung, CSMT = casement, AWN = awning, FX / PW = picture (fixed). Doors: sliding glass door, hinged (swing) door, French door.
- width_in and height_in are numbers in inches, converted from feet-inches. Null when not written.
- tempered_glass: true only when the drawing says TEMP, TEMPERED or TG. egress: true only when the drawing says EGRESS or EGR.
- box: [x0, y0, x1, y1] tight box around the opening symbol, integers on a 0–1000 scale of the image width and height. Null for schedule rows.
- confidence: 0 to 1, honest. needs_review: true when any value is missing, ambiguous or guessed.
- note: one short reason when needs_review is true, otherwise "".
- summary counts the openings you returned (windows and doors by quantity) and the number of unique type + size configurations.`;

export function userPrompt({ filename, width, height, pages, textLayer }) {
  const base = `Build the takeoff for page 1${pages > 1 ? ` of ${pages}` : ''} of "${filename}". The image is ${width} x ${height} pixels.`;
  // PDFs exported from CAD carry their text: exact tags, size callouts and room names with positions.
  return textLayer
    ? `${base}\n\nThe page's text layer, for exact spelling of tags and callouts. One line per text item, "x,y: text", x and y on a 0-1000 scale of the image (y grows downward):\n${textLayer}`
    : base;
}

const nullableNumber = { type: ['number', 'null'] };
const nullableString = { type: ['string', 'null'] };

export const TAKEOFF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sheet', 'summary', 'openings'],
  properties: {
    sheet: { type: 'string', enum: ['floor plan', 'elevation', 'schedule', 'other'] },
    summary: {
      type: 'object',
      additionalProperties: false,
      required: ['total_windows', 'total_doors', 'unique_configurations'],
      properties: {
        total_windows: { type: 'integer' },
        total_doors: { type: 'integer' },
        unique_configurations: { type: 'integer' },
      },
    },
    openings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['mark', 'category', 'type', 'raw_callout', 'width_in', 'height_in', 'room', 'quantity',
          'tempered_glass', 'egress', 'box', 'confidence', 'needs_review', 'note'],
        properties: {
          mark: { type: 'string', description: 'Tag shown on the drawing, or W01/D01… if none' },
          category: { type: 'string', enum: ['window', 'door'] },
          type: { type: 'string', enum: TYPES },
          raw_callout: { ...nullableString, description: 'Exact text from the drawing, e.g. "5050 XO"' },
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
  },
};
