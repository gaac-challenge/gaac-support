#!/usr/bin/env python3
from hashlib import sha256
from pathlib import Path
import re
import subprocess


def read(ref, filename):
    return subprocess.check_output(["git", "show", f"{ref}:{filename}"])


def check(path, original):
    digest = sha256(original).hexdigest()
    if Path(path).read_bytes() != original:
        raise SystemExit(f"Artwork bytes differ: {path}")
    print(digest, path)


for file, slug in {
    "01-安装AgentX.html": "install-agentx",
    "02-假服务端.html": "mock-server",
    "03-393条流量从哪来.html": "393-traces",
}.items():
    page = read("f90b82d", f"public/legacy/blog/{file}")
    drawing = re.search(rb"<script>\r?\n([\s\S]*?)</script>\s*</body>", page)
    if not drawing:
        raise SystemExit(f"Original drawing missing: {file}")
    check(f"public/blog-art/{slug}.js", drawing[1])

street = Path("public/street/street.js")
original = read("6713490", "support/assets/street.js")
hex_literal = rb'"#[0-9a-fA-F]{6}"'
if re.sub(hex_literal, b'"#000000"', street.read_bytes()) != re.sub(hex_literal, b'"#000000"', original):
    raise SystemExit(f"Changes outside the palette: {street}")
print(sha256(street.read_bytes()).hexdigest(), street, "(only palette literals changed)")
