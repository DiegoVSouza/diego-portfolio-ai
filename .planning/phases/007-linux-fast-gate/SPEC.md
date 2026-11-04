# Phase 007 — Linux fast gate

The clean Linux clone must pass `scripts/check_fast.py` without asynchronous module imports continuing after Vitest tears down a test environment. Disclosure animation remains available after user interaction, and its native `<details>` fallback remains usable before the animation module loads.

Acceptance: the previously failing clean Linux fast gate exits 0; the local fast gate exits 0; no browser, provider, or external service is required.
