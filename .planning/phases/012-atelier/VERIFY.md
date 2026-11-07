# Verify: phase 012 atelier

Evidence under `artifacts/evidence/atelier/`. Date 2026-11-07, Blender 5.2.1 LTS, Node 24.12, Python 3.13.

| # | Check | Result |
|---|---|---|
| A1 | Reuse map in `docs/atelier/PLAYBOOK.md` | written; adapted scripts carry source notes |
| A2 | `inspect` unit tests (`src/atelier/inspect-core.test.ts`, 4 tests: triangles, bounds through transforms, quantized positions, problems, non-GLB) | pass; run on the 12 shipped models, output in the playbook "Findings today" |
| A3 | `improve` on 6 megakit models (bollard, AC unit, drain, manhole cover, planter, 2-lane street) | each exits 0 and `inspect` is clean; records `artifacts/evidence/atelier/*.improve.json`. Bollard with `--keep-textures` then `palette`: binary 8,174,184 to 8,916 bytes |
| A4 | `atelier axis` | `ATELIER_AXIS_PROOF_PASSED 5.2.1 LTS`, `axis-proof/result.json` |
| A5 | `atelier status` | prints Node, Python, Blender, MCP port (up in this session), packs |
| A6 | `atelier candidates` | lists the six zips grouped; counts in the playbook |
| A7 | Page: `atelier-models.png`, `atelier-models-2.png` (viewer, palette mode, bounds, info, flagged problem) | seen; production build output has no atelier file (`vite build`, grep) |
| A8 | Camera tab: `atelier-camera.png` (stop 5, camera height patched to 6, scene reloaded in the preview, jumped to the stop) | seen; `patchShot` unit tests (2) pass; patch panel prints the JSON |
| A9 | Docs | `PLAYBOOK.md`, `GUIA.pt-BR.md`, README link |

Gates run: see the commit message and `docs/harness/progress.md`. Not verified: the page in a browser other than Chrome; the Khronos validator; a model taken all the way into the scene (non goal);
MCP tool signatures (sources disagree, the playbook says to read the connected server's list).
