/**
 * Canned result used when the server runs without OPENAI_API_KEY (or with WB_MOCK=1).
 * It lets you test the full upload → poll → review flow for free. The openings have no
 * boxes (box: null), so they appear as "read from a schedule" rows, because a mock
 * can't know where things are on your drawing.
 */
export function mockResult() {
  const o = (mark, type, raw, w, h, room, extra = {}) => ({
    mark, category: /door/i.test(type) ? 'door' : 'window', type, raw_callout: raw, width_in: w, height_in: h, room,
    quantity: 1, tempered_glass: false, egress: false, box: null, confidence: 0.93, needs_review: false, note: '', ...extra,
  });
  const openings = [
    o('W01', 'Sliding', '5050 XO', 60, 60, 'Bedroom 2', { egress: true }),
    o('W02', 'Single hung', '2040 SH TEMP GL', 24, 48, 'Bath 2', { tempered_glass: true }),
    o('W03', 'Sliding', '4050 XO', 48, 60, 'Flex room'),
    o('W04', 'Single hung', '2650 SH', 30, 60, 'Bedroom 3'),
    o('W05', 'Sliding', '6050 XO', 72, 60, 'Master bedroom', { egress: true }),
    o('W06', 'Unknown', '40?? FX', 48, null, 'Living area', { confidence: 0.58, needs_review: true, note: 'Height not legible on the drawing.' }),
    o('D01', 'Sliding door', '6068 SGD', 72, 80, 'Dining'),
  ];
  return { sheet: 'floor plan', summary: { total_windows: 6, total_doors: 1, unique_configurations: 7 }, openings, _mock: true };
}
