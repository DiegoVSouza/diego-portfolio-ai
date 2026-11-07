# Plan

allowed_write_paths:
- .planning/phases/013-model-pass/
- artifacts/evidence/model-pass-013/
- artifacts/evidence/atelier/
- .cache/
- tools/assets.mjs
- tools/atelier/
- src/scene/
- src/styles/site.css
- e2e/city-fixes.spec.ts
- assets/ (only through tools/assets.mjs)
- docs/harness/progress.md
- docs/knowledge/

1. Record baseline inspection and Blender status; save the live session before changes.
2. Export repeatable cleanup candidates in staging; preserve shape proportions and compare bounds.
3. Review palette/wire views and integrate only accepted candidates through the asset CLI and ledger.
4. Run audit, tests, lint, requested browser suite and project gates; read screenshots.
5. Review staged diff and make atomic local commits with Co-Authored-By trailers.

Preserve unrelated dirty files and prior evidence. If asset CLI lacks a safe promotion route, extend and verify it before promotion.

## Follow-up: world pass

Owner requested improvements to the remaining generated models and the world overall. Refine procedural tower silhouettes with setbacks, plinths and roof service volumes; refine street lamps with tapered shafts and broad luminaires. Keep merged district geometry and instancing so these details do not introduce additional draw calls. Preserve board clearances and seeded placement. Validate with the existing scene suite and new phase-specific screenshots.

Follow-up: add a faint non-interactive light wash above the projected HTML card, which otherwise covers the WebGL billboard lights. Restrict it to the 3D stage and retain the projected card transform.

Follow-up: render traffic in a transparent foreground layer, clipped to the camera-facing side of the active billboard plane, while keeping card controls clickable. Preserve renderer cleanup, resizing and first-frame budget; test crossing and scene lifecycle.
