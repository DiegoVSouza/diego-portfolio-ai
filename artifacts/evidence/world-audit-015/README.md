# World audit evidence

`WORLD-MAP.md` lists world coordinates, camera/card positions, aggregate bounds and building reservations. `world-0.json` through `world-9.json` contain actual world-space bounding boxes and transformation matrices for every mesh and instance at each stop, plus 181 camera path samples. `overlap-check.txt` records oriented-box checks for traffic and train cars. `stop-*.png` and `flight-*.png` are the reviewed camera captures. `capture.json` records capture errors.

To reproduce locally from p07: run `npm run dev -- --host 127.0.0.1 --port 5187 --strictPort`, then `node tools/world-audit-capture.cjs`, `python tools/world-audit-summary.py`, and `python tools/world-audit-overlap.py`. These tools overwrite this phase's evidence files. The audit uses a development-only client mount and is excluded from the production entry. No network services are required.

`check-full-attempt1.txt` records the landmark-count regression; `check-full.txt` records the corrected final run. The gates may update their own screenshot paths; existing changed screenshots were preserved around the final run.
