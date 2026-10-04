#!/usr/bin/env python3
"""
Build the single-file page from the multi-file source.

    python3 scripts/build.py           # writes dist/windowbid.html
    python3 scripts/build.py --check   # rebuilds in memory and compares with dist/windowbid.html
    python3 scripts/build.py --standalone   # also writes dist/windowbid-standalone.html (needs node)

The standalone file is the same page plus src/js/standalone-openai-direct.js and the takeoff prompt +
schema from server/takeoff-schema.mjs, so it reads plans with OpenAI straight from the browser
(the user pastes their own API key once; it is never written into the file).

What it does
------------
src/index.html contains three marked blocks:

    <!-- build:preload --> ... <!-- /build:preload -->   one <script src> (theme preload, runs in <head>)
    <!-- build:css -->     ... <!-- /build:css -->       the <link rel="stylesheet"> tags, in cascade order
    <!-- build:js -->      ... <!-- /build:js -->        the <script src> tags, in execution order

Each block is replaced by the inlined file contents:

  * preload -> <script>…</script>
  * css     -> one <style> block (files concatenated in the listed order)
  * js      -> one <script> block wrapping every file in a single (() => { … })(); scope.
               Every JS file except the first starts with a 'use strict'; line so the files
               also run in strict mode when loaded separately; the build removes those
               duplicate lines because the wrapper's first statement already is 'use strict'.

The output is self-contained apart from Google Fonts and, on demand, PDF.js from cdnjs,
which is the format claude.ai artifacts require. No third-party Python packages needed.
"""
import hashlib
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DIST = ROOT / "dist" / "windowbid.html"
STANDALONE = ROOT / "dist" / "windowbid-standalone.html"


def block(html, name):
    m = re.search(r"<!-- build:%s -->\n(.*?)\n<!-- /build:%s -->" % (name, name), html, re.S)
    if not m:
        sys.exit(f"build: missing <!-- build:{name} --> block in src/index.html")
    return m


def takeoff_js():
    """WB_TAKEOFF {system, schema, userPrompt} from server/takeoff-schema.mjs, as browser JS."""
    code = ("import('./server/takeoff-schema.mjs').then(m => console.log(JSON.stringify("
            "{system: m.SYSTEM_PROMPT, schema: m.TAKEOFF_SCHEMA, userPrompt: m.userPrompt.toString()})))")
    out = subprocess.run(["node", "--input-type=module", "-e", code], cwd=ROOT, capture_output=True, text=True, check=True)
    d = json.loads(out.stdout)
    return ("const WB_TAKEOFF = {system: %s, schema: %s, userPrompt: %s};\n"
            % (json.dumps(d["system"]), json.dumps(d["schema"]), d["userPrompt"]))


def build(standalone=False):
    html = (SRC / "index.html").read_text(encoding="utf-8")

    # 1) theme preload (head)
    m = block(html, "preload")
    src = re.findall(r'<script src="([^"]+)"></script>', m.group(1))
    pre = "".join((SRC / s).read_text(encoding="utf-8") for s in src).rstrip("\n")
    html = html[: m.start()] + "<script>" + pre + "</script>" + html[m.end():]

    # 2) stylesheets -> one <style>
    m = block(html, "css")
    hrefs = re.findall(r'<link rel="stylesheet" href="([^"]+)">', m.group(1))
    css = "".join((SRC / h).read_text(encoding="utf-8") for h in hrefs)
    html = html[: m.start()] + "<style>\n" + css + "</style>" + html[m.end():]

    # 3) scripts -> one <script> with a single shared scope
    m = block(html, "js")
    srcs = re.findall(r'<script src="([^"]+)"></script>', m.group(1))
    if standalone:
        srcs.insert(len(srcs) - 1, "js/standalone-openai-direct.js")   # before 99-boot.js
    parts = []
    for i, s in enumerate(srcs):
        text = (SRC / s).read_text(encoding="utf-8")
        if i > 0 and text.startswith("'use strict';\n"):
            text = text[len("'use strict';\n"):]
        if standalone and s.endswith("standalone-openai-direct.js"):
            text = takeoff_js() + text
        parts.append(text)
    js = "".join(parts)
    html = html[: m.start()] + "<script>\n(() => {\n" + js + "})();\n</script>" + html[m.end():]
    return html


def main():
    out = build()
    digest = hashlib.sha256(out.encode("utf-8")).hexdigest()
    if "--check" in sys.argv:
        current = DIST.read_text(encoding="utf-8") if DIST.exists() else ""
        if current == out:
            print(f"OK  dist/windowbid.html is up to date  ({len(out.encode())} bytes, sha256 {digest[:16]}…)")
            return
        sys.exit("DIFF  dist/windowbid.html does not match src/ — run: python3 scripts/build.py")
    DIST.parent.mkdir(parents=True, exist_ok=True)
    DIST.write_text(out, encoding="utf-8")
    print(f"built dist/windowbid.html  ({len(out.encode())} bytes, sha256 {digest[:16]}…)")
    if "--standalone" in sys.argv:
        sa = build(standalone=True)
        STANDALONE.write_text(sa, encoding="utf-8")
        print(f"built dist/windowbid-standalone.html  ({len(sa.encode())} bytes)")


if __name__ == "__main__":
    main()
