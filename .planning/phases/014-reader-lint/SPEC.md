# Phase 014: reader lint

The accessibility reader executes browser callbacks via Playwright, but ESLint treats its `document` references as undefined. Correct the lint environment for this script without changing the reader or weakening rules for other scripts. Preserve existing uncommitted phase 010 files.
