#!/usr/bin/env python3
from hashlib import sha256
from pathlib import Path
import re
import subprocess


def read(ref, filename):
    return subprocess.check_output(["git", "show", f"{ref}:{filename}"])


street = Path("public/street/street.js")
original = read("6713490", "support/assets/street.js")
hex_literal = rb'"#[0-9a-fA-F]{6}"'
if re.sub(hex_literal, b'"#000000"', street.read_bytes()) != re.sub(hex_literal, b'"#000000"', original):
    raise SystemExit(f"Changes outside the palette: {street}")
print(sha256(street.read_bytes()).hexdigest(), street, "(only palette literals changed)")
