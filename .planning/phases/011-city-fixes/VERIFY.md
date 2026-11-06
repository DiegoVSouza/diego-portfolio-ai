# Verify

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Types | `npx tsc --noEmit -p .` | exit 0 | this session |
| Unit (81 tests, incl. train turnaround, board frame, rail extension) | `npx vitest run` | exit 0 | `artifacts/evidence/city-fixes-011/unit.txt` |
| Scene + v2 e2e (20) | `npx playwright test e2e/scene.spec.ts e2e/v2.spec.ts` | exit 0 | `artifacts/evidence/city-fixes-011/e2e.txt` |
| Menu cut + shown sync, street past last stop | `npx playwright test e2e/city-fixes.spec.ts` | exit 0 | `e2e-city.txt`, `last-stop.png`, `menu-cut.png` |
| `check_fast.py` | `python scripts/check_fast.py` | **exit 1**: lint error in `scripts/a11y-reader.mjs` (phase 010, uncommitted, not part of this phase). `eslint src e2e` is clean. | `check-fast.txt` |

Status: `incomplete` for the full gate (`check_full.py` not run; phase 010's file blocks lint). Not deployed.
Not verified by eye: wall/roof sign density in each district and the cross streets from the camera's view in districts 1 to 4; owner review needed.
