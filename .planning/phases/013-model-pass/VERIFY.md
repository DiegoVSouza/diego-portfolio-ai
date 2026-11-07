# Verification

Status: INCOMPLETE.

Baseline interactive inspection: building-sample has 23,366 triangles, bounds 549.99 x 1280.01 x 1120.00, base offset -699.59. Three CC0 buildings and metro station have off-centre origins. Cars have large source units. Saved reproducible evidence pending.

Sample derivative: 7,799 triangles, bounds 5.4998 x 12.8 x 11.2, inspect clean. Integrated with the existing procedural fallback and token tint. Original remains registered as source; derivative retains OWNER-DECLARED authorization.

Evidence: `artifacts/evidence/model-pass-013/run-log.md` and `artifacts/evidence/atelier/building-sample-013.improve.json`. Browser suite: 24 passed. Audit exit 0. Full gate blocked by pre-existing phase 010 lint errors. Live Blender four-angle review performed; one city screenshot read. Atelier palette/wire review blocked by browser tool startup failure.

Technical acceptance: PARTIAL. Agent visual acceptance: PARTIAL. Human acceptance: PENDING. Other model groups remain PENDING.

World follow-up: procedural tower and lamp geometry refined; 90 unit and 24 browser tests passed, lint and audit passed. Evidence and limitations: `artifacts/evidence/model-pass-013/world-pass.md`. Full gate remains blocked by unrelated phase 010 lint errors.

S64/floodlight correction: four separate low-poly wheels added to the wheel-less S64 source, and actual floodlight cones rendered over the card. Full gate passed (90 unit, 64 browser); see `artifacts/evidence/model-pass-013/fix-wheel-light.md` for visual evidence and limits. Human review remains pending.
