# Camera motion samples (phase 016)

Source: `motion-frames.json`, one record per rendered frame; speed, acceleration and turn rate are computed over windows of about 100 ms (a per-frame step over a jittery timestamp is not a rate). A cut or a reduced-motion jump is one big step by design. from the real scene (1280x800, headless Chrome with software or default GL; frame times are listed because a slow frame rate exaggerates per-frame steps).

| run | frames | s | median dt ms | max dt ms | max speed u/s | median speed | max accel u/s2 | max turn rad/s | max 100ms step u | windows>30u | cCur reversals | max dfov |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| fwd-0-1 | 294 | 2.93 | 104.85 | 111.10 | 105.36 | 17.51 | 656.45 | 2.19 | 11.42 | 0 | 0 | 0.32 |
| fwd-1-2 | 392 | 3.91 | 100.55 | 110.20 | 137.96 | 26.24 | 97.18 | 2.15 | 15.09 | 0 | 0 | 0.22 |
| fwd-2-3 | 255 | 2.53 | 104.70 | 117.80 | 92.90 | 16.30 | 103.82 | 5.12 | 10.11 | 0 | 0 | 0.36 |
| fwd-3-4 | 362 | 3.59 | 109.00 | 114.10 | 94.82 | 20.38 | 64.17 | 1.99 | 10.39 | 0 | 0 | 0.25 |
| fwd-4-5 | 232 | 2.31 | 108.70 | 112.00 | 106.32 | 12.95 | 177.84 | 2.63 | 11.72 | 0 | 0 | 0.41 |
| fwd-5-6 | 341 | 3.36 | 105.00 | 110.30 | 98.87 | 18.19 | 90.11 | 2.99 | 10.84 | 0 | 0 | 0.26 |
| fwd-6-7 | 392 | 3.91 | 100.80 | 118.20 | 129.57 | 25.79 | 107.32 | 5.00 | 13.35 | 0 | 0 | 0.23 |
| fwd-7-8 | 257 | 2.54 | 109.45 | 110.10 | 93.10 | 14.88 | 98.63 | 5.02 | 10.22 | 0 | 0 | 0.37 |
| fwd-8-9 | 353 | 3.52 | 101.20 | 110.20 | 94.60 | 19.59 | 63.87 | 2.13 | 10.39 | 0 | 0 | 0.25 |
| back-9-8 | 352 | 3.51 | 100.30 | 110.50 | 107.92 | 17.41 | 81.10 | 1.17 | 11.79 | 0 | 0 | 0.25 |
| back-8-7 | 257 | 2.56 | 100.30 | 110.30 | 104.49 | 14.49 | 150.22 | 5.01 | 11.43 | 0 | 0 | 0.37 |
| back-7-6 | 391 | 3.86 | 100.50 | 110.10 | 130.67 | 26.77 | 94.12 | 3.16 | 14.35 | 0 | 0 | 0.22 |
| back-6-5 | 341 | 3.36 | 104.75 | 110.50 | 93.83 | 19.19 | 68.86 | 2.78 | 10.32 | 0 | 0 | 0.26 |
| back-5-4 | 232 | 2.30 | 100.55 | 110.30 | 89.68 | 16.37 | 98.79 | 1.93 | 9.42 | 0 | 0 | 0.41 |
| back-4-3 | 361 | 3.55 | 100.80 | 110.10 | 105.85 | 19.34 | 85.40 | 1.04 | 10.63 | 0 | 0 | 0.25 |
| back-3-2 | 256 | 2.52 | 105.05 | 110.20 | 102.61 | 15.25 | 153.87 | 5.02 | 10.32 | 0 | 0 | 0.37 |
| back-2-1 | 393 | 3.92 | 109.10 | 111.00 | 137.37 | 27.03 | 106.25 | 1.42 | 14.90 | 0 | 0 | 0.23 |
| back-1-0 | 293 | 2.92 | 109.30 | 110.20 | 93.06 | 16.73 | 81.54 | 1.40 | 10.24 | 0 | 0 | 0.32 |
| menu-0-4 | 255 | 2.51 | 100.70 | 109.90 | 6029.41 | 0.01 | 54936.49 | 12.49 | 661.43 | 1 | 0 | 0.00 |
| menu-4-5 | 254 | 2.52 | 104.85 | 110.50 | 1417.55 | 0.01 | 12907.07 | 22.70 | 142.04 | 1 | 0 | 0.00 |
| menu-5-0 | 252 | 2.51 | 100.75 | 110.40 | 7846.31 | 0.01 | 71187.99 | 9.18 | 792.48 | 1 | 0 | 0.00 |
| wheel-down | 1373 | 13.72 | 108.70 | 110.90 | 99.70 | 0.00 | 255.83 | 2.13 | 10.90 | 0 | 0 | 0.32 |
| wheel-up | 1368 | 13.77 | 100.70 | 208.00 | 93.52 | 0.00 | 218.07 | 1.44 | 10.29 | 0 | 1 | 0.31 |
| arrow-down | 251 | 2.50 | 100.80 | 109.80 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0 | 0 | 0.00 |
| reduced-0-1 | 181 | 1.77 | 100.10 | 110.00 | 810.14 | 0.00 | 8101.41 | 12.42 | 88.39 | 1 | 0 | 0 |
| reduced-1-2 | 175 | 1.76 | 100.10 | 110.00 | 1373.74 | 0.00 | 12499.87 | 13.39 | 151.11 | 1 | 0 | 0 |
| reduced-2-3 | 179 | 1.79 | 106.70 | 111.00 | 563.15 | 0.00 | 5631.46 | 18.10 | 61.83 | 1 | 0 | 0 |
| reduced-3-4 | 175 | 1.80 | 109.40 | 110.20 | 1132.36 | 0.00 | 10294.23 | 5.51 | 113.24 | 1 | 0 | 0 |

## Camera inside solids

9507 camera samples tested against the merged district meshes (ray in six directions; the first face hit pointing away from the ray means the point may be inside). Smallest distance from any camera sample to any solid face: 7.35 units (near plane 0.5), so the camera never touched a solid.
'Inside' flags: 403 by mesh {'district-0-landmarks': 70, 'district-1-landmarks': 8, 'district-2-landmarks': 325}; the closest face to a flagged sample was 12.110786648683984 units away. Flags on imported landmark meshes are false positives: those GLBs are not closed shells (a ray from open air reaches the back face of the far wall). Flags on generated meshes: 0.


## Flags

- wheel-up: cCur reversed direction 1 time(s) (oscillation candidate)
- reduced-0-1: 1 frame step(s) over 30 units (largest 88.4 at c=1.00, dt 109 ms)
- reduced-1-2: 1 frame step(s) over 30 units (largest 151.1 at c=2.00, dt 110 ms)
- reduced-2-3: 1 frame step(s) over 30 units (largest 61.8 at c=3.00, dt 110 ms)
- reduced-3-4: 1 frame step(s) over 30 units (largest 113.2 at c=4.00, dt 100 ms)

Page errors: [] / reduced: []
Reduced-motion end state: {'stage': '3d', 'shown': '4', 'probe': {'t': 8696, 'time': 0, 'cCur': 4, 'vel': 0, 'fov': 58, 'shown': '4', 'flight': '', 'scrollY': 3263, 'snap': False, 'frames': 8, 'pos': [-4.857761623877363, 1.7, -341.235159772492], 'quat': [0.05806851881571235, 0.8044527585592023, -0.07974723397211393, 0.5857680300621024], 'cards': '1'}}
