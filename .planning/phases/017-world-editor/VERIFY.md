# Verify

| Req | Evidence |
|---|---|
| E1 | `src/scene/world-edits.test.ts` (shipped file equals the empty edits; bad input falls back) |
| E2 | tests on `editMatrix`/`editPoint`; edits are applied in `settleTower` after every draw and reservation (`world.ts`). Browser: hiding `t0.3`, moving `t0.4` and a lamp, saving and reloading kept the other towers in place (`artifacts/evidence/world-editor-017/save-before.png`, `save-after.png`, `probe-save.mjs`) |
| E3 | same probe: lamp `l0` edited and listed as edited after reload |
| E4 | probe: `addProp("truck.glb")` creates a selectable prop; it was saved and loaded again after reload (`probe.mjs`, `editor-3.png`) |
| E5 | `editor-1.png` to `editor-3.png`: proxies, gizmo, orbit camera. The atelier panel itself was not driven by a browser session (extension offline); only the editor API was exercised through Playwright |
| E6 | `src/atelier/world-edits-endpoint.test.ts` (validation); the save in the probe wrote the file, which was then restored to the empty one |
| E7 | `check_full.py` exit 0: build, budget, e2e 64 passed; `grep` of `dist/` for `__worldEditor` and `world-editor` finds nothing. Output: `check-full.txt`, `check-fast.txt` |
| E8 | `docs/atelier/GUIA-MUNDO.pt-BR.md` |

Open: the World panel UI (lists, sliders) has no automated test; the owner should try it once. The shipped `world-edits.json` is empty, so the deployed city is unchanged. Not deployed.
