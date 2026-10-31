#!/usr/bin/env python3
"""Full local gate: fast checks, production build, bundle budget and browser e2e with axe."""
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
npm = shutil.which("npm") or "npm"
STEPS = [
    ([sys.executable, "scripts/check_fast.py"], "fast"),
    ([npm, "run", "-s", "build"], "build"),
    ([npm, "run", "-s", "budget"], "budget"),
    ([npm, "run", "-s", "e2e"], "e2e"),
]
for command, name in STEPS:
    result = subprocess.run(command, cwd=ROOT)
    print(f"{name}: exit {result.returncode}")
    if result.returncode:
        print(f"check-full: FAIL at {name}")
        sys.exit(1)
print("check-full: PASS")
