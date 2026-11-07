# Foreground traffic

Transparent traffic canvas is clipped to the active projected card and to the camera-facing half-space of its billboard. It does not intercept pointer events. A second WebGL context adds rendering cost and uses the same scene camera and vehicle instances.

`npx vitest run`: exit 0, 90 passed. `npx eslint src e2e`: exit 0. `npx playwright test e2e/scene.spec.ts e2e/v2.spec.ts e2e/city-fixes.spec.ts`: exit 0, 24 passed before draw-count accounting adjustment. `npx playwright test e2e/v2.spec.ts`: exit 0, 11 passed after accounting adjustment. `python scripts/check_fast.py`: exit 1, existing no-undef errors in scripts/a11y-reader.mjs.

Viewed `city/stop-4.png`: card remains readable, a car is visible beside it; that still image does not prove a crossing inside the card. Precise per-frame intersection and real-device performance remain unverified. Human review pending.
