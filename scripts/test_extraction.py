#!/usr/bin/env python3
"""
End-to-end test of plan reading through the WindowBid server (browser → server → OpenAI or mock).

Needs:  pip install playwright pillow && python3 -m playwright install chromium
Start the server first (real key, mock mode, or the fake OpenAI in server/test/), then:

    python3 scripts/test_extraction.py                       # http://127.0.0.1:3000
    python3 scripts/test_extraction.py http://127.0.0.1:3001
    python3 scripts/test_extraction.py URL path/to/plan.pdf  # use your own plan instead of the generated sketch

It uploads a plan in the demo, waits for the background reading (up to 5 minutes), and prints what came back.
"""
import asyncio
import pathlib
import sys
import tempfile

from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3000"
PLAN = sys.argv[2] if len(sys.argv) > 2 else None


def sketch_plan():
    """A simple line-drawing floor plan, so the test needs no real drawing."""
    from PIL import Image, ImageDraw
    im = Image.new("RGB", (1600, 1000), "white")
    d = ImageDraw.Draw(im)
    d.rectangle([150, 150, 1450, 880], outline="black", width=10)
    d.line([700, 150, 700, 880], fill="black", width=6)
    d.line([150, 520, 700, 520], fill="black", width=6)
    for x0, x1, y, label in [(300, 480, 150, "5050 XO"), (900, 980, 150, "2040 SH TEMP GL"), (1000, 1200, 880, "6068 SGD")]:
        d.rectangle([x0, y - 8, x1, y + 8], fill="white", outline="black", width=2)
        d.text((x0, y + 20 if y < 500 else y - 40), label, fill="black")
    d.text((350, 300), "BEDROOM 2", fill="black"); d.text((950, 400), "LIVING", fill="black")
    p = pathlib.Path(tempfile.gettempdir()) / "windowbid-test-plan.png"
    im.save(p)
    return str(p)


async def main():
    plan = PLAN or sketch_plan()
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.goto(BASE + "/#takeoff")
        await pg.wait_for_function("document.querySelector('#avail') && !/Checking/.test(document.querySelector('#avail').textContent)", timeout=10000)
        print("upload note :", await pg.text_content("#avail"))
        await pg.set_input_files("#file", plan)
        await pg.wait_for_selector("#rev:not([hidden])", timeout=300000)
        await pg.wait_for_timeout(800)
        rows = await pg.evaluate("[...document.querySelectorAll('#list tr[data-id], .olist tr[data-id]')].map(r => r.innerText.replace(/\\s+/g,' ').trim())")
        log = await pg.evaluate("[...document.querySelectorAll('#plog li')].map(l => l.textContent)")
        print("progress log:", " | ".join(log))
        print(f"rows ({len(rows)}):")
        for r in rows: print("   ", r)
        raw = await pg.evaluate("(() => { const d = document.querySelector('#detail .d-raw'); return d ? d.innerText.replace(/\\s+/g,' ') : '(no callout on selected row)'; })()")
        print("selected    :", raw)
        await pg.screenshot(path=str(pathlib.Path(tempfile.gettempdir()) / "windowbid-test-review.png"))
        print("page errors :", errors or "none")
        await b.close()


asyncio.run(main())
