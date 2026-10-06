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

// Drawing sets in mock mode: page 1 is "the floor plan" (tags only), page 2 "the schedule" that defines them.
export function mockClassify({ pages }) {
  return {
    pages: pages.map(page => ({
      page, kind: page === 1 ? 'floor_plan' : page === 2 ? 'window_door_schedule' : 'other',
      sheet_number: `A-${page}`, title: page === 1 ? 'FLOOR PLAN' : page === 2 ? 'SCHEDULES' : null, level: page === 1 ? 'first floor' : null,
      opening_tags: page === 1 ? 'many' : 'none', tag_style: page === 1 ? 'symbols' : 'none', schedule_regions: page === 2 ? [[100, 100, 900, 600]] : [], confidence: 0.9,
    })),
  };
}
export function mockPage({ kind }) {
  let n = 0;
  const tagged = (tag, category, room) => ({ tag, category, type: 'Unknown', raw_callout: null, width_in: null, height_in: null, room,
    quantity: 1, tempered_glass: false, egress: false, box: [120 + 130 * n, 300 + 40 * (n++ % 2), 180 + 130 * (n - 1), 330 + 40 * ((n - 1) % 2)],
    confidence: 0.92, needs_review: false, note: '' });
  const def = (key, applies_to, size_text, w, h, type, quantity, extra = {}) => ({ key, applies_to, size_text, width_in: w, height_in: h, type,
    quantity, tempered_glass: false, egress: null, exterior: true, remarks: '', row_box: null, confidence: 0.95, ...extra });
  if (kind === 'schedule' || kind === 'window_types') {
    return { sheet: 'schedule', openings: [], definitions: [
      def('1', 'window', '3\'-0" X 5\'-0"', 36, 60, 'Casement', 3, { row_box: [40, 180, 960, 300] }),
      def('2', 'window', '2\'-0" X 4\'-0"', 24, 48, 'Single hung', 1, { tempered_glass: true, row_box: [40, 300, 960, 420] }),
      def('A', 'door', '6\'-0" X 8\'-0"', 72, 80, 'Sliding door', 1),
      def('B', 'door', '3\'-0" X 8\'-0"', 36, 96, 'Hinged door', 4, { exterior: false }),
    ] };
  }
  return { sheet: 'floor plan', definitions: [], openings: [
    tagged('1', 'window', 'Bedroom 2'), tagged('1', 'window', 'Bedroom 3'), tagged('2', 'window', 'Bath 2'),
    tagged('A', 'door', 'Great room'), tagged('B', 'door', 'Hall'), tagged('7', 'window', 'Study'),
  ] };
}
