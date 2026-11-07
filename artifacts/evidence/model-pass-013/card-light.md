# Billboard light overlay

`npx eslint src e2e`: exit 0. `npx playwright test e2e/city-fixes.spec.ts`: exit 0, 4 passed. `python scripts/check_fast.py`: exit 1, existing eight `document` no-undef errors in `scripts/a11y-reader.mjs`.

Viewed `city/stop-1.png`: faint light streaks overlay the card; text remains legible. Human review pending.
