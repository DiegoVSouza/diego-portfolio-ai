# Performance run (2026-11-01)

Measured on the published site (https://diego-portfolio-ai.pages.dev/) and on the local build, in Microsoft Edge with the hardware GPU (NVIDIA GeForce RTX 5060 Ti, ANGLE Direct3D11), frame-rate limit and vsync off.
`perf-frames.mjs` scrolls the whole journey down and back a wheel notch at a time and records every animation frame.

| Scenario | p50 | p95 | p99 | frames over 33 ms | mean fps | long tasks |
| --- | --- | --- | --- | --- | --- | --- |
| 1440x900, dpr 1 | 1.3 ms | 4.6 ms | 7.4 ms | 1 of 3889 | 588 | 0 |
| 1920x1080, dpr 1.5 | 1.8 ms | 5.1 ms | 7.1 ms | 1 of 3705 | 484 | 0 |
| 1440x900, CPU 4x slower | 13.8 ms | 25.7 ms | 34.1 ms | 9 of 835 | 74 | 1 (74 ms) |
| 1366x768, dpr 2, CPU 6x slower | 25.1 ms | 50.4 ms | 65.6 ms | 163 of 553 | 42 | 11 (65 ms) |

Load on the published site: first heading 0.49 s, hero card 0.51 s, 3D scene running 1.03 s, all models (train included) 1.18 s. Decoded payload: JavaScript 833 KB, models 897 KB, CSS 50 KB, fonts 107 KB; JS heap 27 MB.
Lighthouse (local build): home desktop 92 then 96, mobile 97, project page 96; accessibility 100 on all.

What this does not show: a real phone or an integrated GPU. The hardware GPU here is far faster than most; the CPU throttle is a proxy for a slow main thread, not for a slow GPU.
The change after this run (no redundant attribute and style writes per frame, adaptive quality dropping at 22 ms instead of 27 ms) moved the throttled cases by noise; the
worst case now lowers the resolution to 0.8 but stays at about 25 ms because it is limited by the main thread, not by pixels.
