# Verification

Technical checks passed; human visual and motion acceptance remains pending.

- `node tools/world-audit-capture.cjs`: exit 0. Ten stops, four transition frames, camera path and world-space mesh/instance bounds captured at 1280 x 800 with no page errors. Painted fallback faces hidden under visible cards; floodlight cones excluded from foreground layer.
- `python tools/world-audit-summary.py`: exit 0. 173 mesh groups, 127 building reservations; no reservation overlaps and no camera-path sample inside those reservations. See `artifacts/evidence/world-audit-015/WORLD-MAP.md` and individual JSON snapshots.
- `python tools/world-audit-overlap.py`: exit 0. At each sampled stop, no oriented-box intersections among 13 traffic instances or among 20 train-car instances. Earlier captures exposed overlaps among adjacent cars; car spacing now uses measured arc length and a 17-unit centre separation. A unit test samples the full cycle on all four tracks.
- Reviewed stops 0, 2, 4, 5, 6, 7 and 9 and transition frames 2 and 7. Floodlight beams are absent from cards; painted letters no longer duplicate the HTML during transitions. Still images are not a complete judgment of motion.
- First `python scripts/check_full.py` exited 1: seven imported landmarks versus the existing minimum of eight after collision reservations expanded. Scaled landmarks to fit their reserved footprint rather than changing the test. `check-full-attempt1.txt` records the failure.
- Final `python scripts/check_full.py` exit 0: 94 unit tests, 64 browser tests; lint, typecheck, build, budget and e2e passed. Full output: `check-full.txt`.

Limitations: merged district meshes do not expose individual component bounds; camera and model positions are sampled, not an exhaustive continuous mesh collision proof; moving vehicles wrap at the end of the avenue. Device performance and owner review are pending. The original over-budget `building-sample.glb` remains in assets as a registered source and is not the model used in the scene.
