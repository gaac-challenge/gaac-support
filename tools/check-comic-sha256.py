#!/usr/bin/env python3
from hashlib import sha256
from pathlib import Path
import subprocess

source = "f90b82d"
prefix = "public/legacy/comic/"
tracked = subprocess.check_output(["git", "ls-tree", "-r", "--name-only", "-z", source, "--", prefix]).decode().split("\0")
original = {path.removeprefix(prefix) for path in tracked if path.endswith(".jpg")}
current = {path.relative_to("public/comic").as_posix() for path in Path("public/comic").rglob("*.jpg")}
if len(original) != 87 or original != current:
    raise SystemExit(f"Image inventory differs: expected {len(original)}, found {len(current)}, differences {sorted(original ^ current)}")
for name in sorted(original):
    old = subprocess.check_output(["git", "show", f"{source}:{prefix}{name}"])
    new = Path("public/comic", name).read_bytes()
    digest = sha256(old).hexdigest()
    if digest != sha256(new).hexdigest():
        raise SystemExit(f"SHA-256 mismatch: {name}")
    print(digest, name)
print("87 image hashes match")
