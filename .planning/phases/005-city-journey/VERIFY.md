# Verify 005

- [ ] `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `python scripts/check_fast.py` exit 0
- [ ] `npm run budget` PASS (route under 100 KB gzip, scene chunk under 500 KB)
- [ ] `canvas[data-draws]` at most 100 on the first frame on the home
- [ ] Screenshot of each of the six districts at rest; the content panel readable (opaque), the city visible between menu and panel
- [ ] Mid-flight screenshot: the camera swings; at a stop `data-travel` is about 0
- [ ] Menu: click, number keys, arrows and `j`/`k` reach each district; reduced motion jumps at once
- [ ] Reduced motion: no swing, no events, static frame
- [ ] No WebGL, portrait and simple version keep the content and a working menu or bar
- [ ] Full Playwright suite in Edge passes; axe clean at 1000 and 360 px
- [ ] Models load (`data-landmarks`, `data-vehicle-kinds`, `data-stations`), no fallback warning
