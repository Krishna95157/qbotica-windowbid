#!/usr/bin/env python3
"""
Optional: capture reference screenshots of the current preview.

Needs Playwright:  pip install playwright && python3 -m playwright install chromium
Run a server first from the project root:  python3 -m http.server 8080
Then:  python3 scripts/screenshots.py            (dark theme, the default)
       python3 scripts/screenshots.py --light    (light theme)

Images are written to ./screenshots/. Internet access is needed so the Google Fonts load;
without it the browser falls back to Arial/Helvetica and the shots will not match the live page.
"""
import asyncio
import pathlib
import sys

from playwright.async_api import async_playwright

URL = "http://127.0.0.1:8080/dist/windowbid.html"
OUT = pathlib.Path(__file__).resolve().parent.parent / "screenshots"
THEME = "light" if "--light" in sys.argv else "dark"

SCROLL = """(([sel, f]) => { const s = document.querySelector(sel);
  const top = s.getBoundingClientRect().top + scrollY;
  scrollTo(0, top + Math.max(0, s.offsetHeight - innerHeight) * f); })"""


async def main():
    OUT.mkdir(exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1440, "height": 900})
        await ctx.add_init_script(f"localStorage.setItem('wb-theme', '{THEME}')")
        pg = await ctx.new_page()
        await pg.goto(URL)
        await pg.wait_for_timeout(6500)                      # hero blueprint assembly finishes
        await pg.screenshot(path=OUT / f"{THEME}-01-hero.png")
        shots = [("#stages", 0, "02-stages"), ("#review", .35, "03-review-markers"), ("#review", .82, "04-review-takeoff"),
                 ("#procure", .5, "05-procure-bids"), ("#procure", .82, "06-procure-accepted"),
                 ("#fulfill", .6, "07-fulfill-trace"), ("#fulfill", .95, "08-fulfill-complete"),
                 ("#metrics", 0, "09-metrics"), ("#cta", 0, "10-cta")]
        for sel, f, name in shots:
            await pg.evaluate(SCROLL, [sel, f]); await pg.wait_for_timeout(3600 if sel == "#stages" else 900)
            await pg.screenshot(path=OUT / f"{THEME}-{name}.png")
        await pg.goto(URL + "#about"); await pg.wait_for_timeout(7000)
        await pg.screenshot(path=OUT / f"{THEME}-11-about-logo.png")
        await pg.evaluate(SCROLL, ["#abUnf", .9]); await pg.wait_for_timeout(900)
        await pg.screenshot(path=OUT / f"{THEME}-12-about-unfold.png")
        await pg.goto(URL + "#contact"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT / f"{THEME}-13-contact.png")
        await pg.goto(URL + "#takeoff"); await pg.wait_for_timeout(800)
        await pg.screenshot(path=OUT / f"{THEME}-14-demo-upload.png")
        await pg.click("#useSample"); await pg.wait_for_timeout(5500)
        await pg.screenshot(path=OUT / f"{THEME}-15-demo-review.png")
        await b.close()
    print(f"wrote {len(list(OUT.glob(THEME + '-*.png')))} screenshots to {OUT}")


asyncio.run(main())
