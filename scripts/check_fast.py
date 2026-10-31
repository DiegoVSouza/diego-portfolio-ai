#!/usr/bin/env python3
"""Fast local gate: structure, catalog and evidence drift, flow checks, lint, types and unit tests."""
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
REQUIRED = ["harness.yaml", "AGENTS.md", ".harness/modules.lock", "package-lock.json", "src/data/catalog.generated.json"]
missing = [path for path in REQUIRED if not (ROOT / path).exists()]
for path in missing:
    print("missing:", path)
if missing:
    print("check-fast: FAIL")
    sys.exit(1)
npm = shutil.which("npm") or "npm"
for script in ("lint", "typecheck", "catalog:check", "evidence:check", "flow:check", "test"):
    result = subprocess.run([npm, "run", "-s", script], cwd=ROOT)
    print(f"{script}: exit {result.returncode}")
    if result.returncode:
        print(f"check-fast: FAIL, run npm run {script} and fix the first error")
        sys.exit(1)
print("check-fast: OK")
