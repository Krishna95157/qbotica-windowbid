# Accuracy test — RC-Mahesh Final FP-2.pdf (sheet 2 of 10, floor plan)

Date: 2026-10-03 · Model: OpenAI `gpt-6-astra`, image detail `high` · Input: page 1 rendered at 2000 × 1500 px (same as the browser upload) · 2 runs.
Raw outputs: `rc-mahesh-run1.json`, `rc-mahesh-run2.json`.

The answer key was built by reading the sheet at 6000 px. Scope follows the prompt: exterior windows and exterior doors only.

## Results

| Metric | Run 1 (2.4 min) | Run 2 (9.0 min) |
|---|---|---|
| Windows found (of 29: 25 with callouts + 4 without) | 29 / 29 (100%) | 28 / 29 (97%) |
| False windows (not on the plan) | 4 | 0 |
| Window callout + size exactly right (of 25) | **8 / 25 (32%)** | **14 / 25 (56%)** |
| Window size wrong and NOT flagged for review | 13 | 9 |
| Window size missing and flagged | 3 | 1 |
| Window operation type right (SH / XO / fixed) | 22 / 25 | 23 / 24 |
| Tempered glass detected (of 8) | 8 / 8 (+1 false) | 8 / 8 (+1 false) |
| Egress detected (of 1) | 0 / 1 | 0 / 1 |
| Exterior doors found (of ~15) | ~12 | 12 |
| Door size exactly right (of 14 labeled) | 7 / 14 | 7 / 14 |
| Interior doors wrongly included | ~1 | 0 |

**Summary:** the model finds the openings well (~97–100% of windows) and gets type and tempered glass right, but reads the size digits poorly at this resolution (32–56% exact). Most wrong sizes come back with confidence 0.7–0.8 and are not flagged, so the dealer review step is essential.

## Typical misreads (digits are ~8 px tall at 2000 px)

| On drawing | Run 1 | Run 2 |
|---|---|---|
| 2040 SH TEMP GL | 2030 | 2040 (bath 4, master) / 2030 (bath 2) |
| 2650 SH (Bedrm 3, Mstr bath) | 3050 / 2030 | 3060 / 2030 |
| 4050 XO | 4030 | 4030 |
| 3080 FIX (Study 1, 2) | 3050 FXD | 3080 FX ✓ |
| 3646 SH TEMP GL | null | 2040 |
| 80100 SL GL DR | null | 6080 |
| 12066 BIFOLD | null | 12080 |
| 2650 SH EGRESS WDW (Pooja) | 2030 SH TEMP | 2030 SH TEMP |

## Answer key — exterior windows

| # | Room | Callout | W × H in | Temp | Egress |
|---|---|---|---|---|---|
| 1 | Bath 2 | 2040 SH TEMP GL | 24 × 48 | ✓ | |
| 2 | Flex Rm (to Patio 2) | 4050 XO | 48 × 60 | | |
| 3 | Hall by Patio 2 | 2650 SH | 30 × 60 | | |
| 4 | Bath 3 | 3016 XO TEMP GL | 36 × 18 | ✓ | |
| 5–6 | Bedrm 3 | 2650 SH ×2 | 30 × 60 | | |
| 7 | Pooja | 2650 SH EGRESS WDW | 30 × 60 | | ✓ |
| 8 | Theater | 5050 XO | 60 × 60 | | |
| 9–10 | Theater | 3050 SH ×2 | 36 × 60 | | |
| 11–12 | Study 1 | 3080 FIX ×2 | 36 × 96 | | |
| 13–14 | Study 2 | 3080 FIX ×2 | 36 × 96 | | |
| 15 | Study 2 | 6050 XO | 72 × 60 | | |
| 16 | Bath 4 | 2040 SH TEMP GL HDR @ 8' | 24 × 48 | ✓ | |
| 17–18 | Garage | 3050 FXD ×2 | 36 × 60 | | |
| 19 | Kitchen sink | 3646 SH TEMP GL | 42 × 54 | ✓ | |
| 20 | Refrig nook / Breakfast | 2646 SH | 30 × 54 | | |
| 21 | Master Bedrm | 6050 XO | 72 × 60 | | |
| 22 | Master WC | 2040 SH TEMP GL | 24 × 48 | ✓ | |
| 23–24 | Mstr Bath | 2650 SH TEMP GL ×2 | 30 × 60 | ✓ | |
| 25 | Mstr Bath shower | 3620 FXD TEMP GL | 42 × 24 | ✓ | |
| 26–29 | Bedrm 2, Closet, Study 1 (south), Utility | no callout | — | | |

## Answer key — exterior doors

80100 SL GL DR TEMP (Flex) · 200100 POCKET TEMP (Great Rm) · 80100 SL GL DR TEMP (Breakfast side) · 12066 BIFOLD TEMP (Breakfast) · 120100 SL GL DR TEMP (Master) · 120100 BIFOLD TEMP (Loggia) · front door (Foyer, no callout) · 3080 (Study 1) · 3080 (Study 2) · 18' × 8' OVHD ×2 · MTL 2880 (by Bath 2) · 2880 ×2 (to Patio 2) · MTL 2880 (to Patio 3).
Not scored either way: courtyard gate, garage-to-house doors, kitchen-hall 3080.
