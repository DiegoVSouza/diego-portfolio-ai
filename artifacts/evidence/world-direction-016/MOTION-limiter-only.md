# Camera motion samples (phase 016)

Source: `motion-frames.json`, one record per rendered frame; speed, acceleration and turn rate are computed over windows of about 100 ms (a per-frame step over a jittery timestamp is not a rate). A cut or a reduced-motion jump is one big step by design. from the real scene (1280x800, headless Chrome with software or default GL; frame times are listed because a slow frame rate exaggerates per-frame steps).

| run | frames | s | median dt ms | max dt ms | max speed u/s | median speed | max accel u/s2 | max turn rad/s | max 100ms step u | windows>30u | cCur reversals | max dfov |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| fwd-0-1 | 273 | 2.72 | 109.05 | 110.40 | 106.80 | 21.02 | 527.12 | 2.16 | 11.76 | 0 | 0 | 0.44 |
| fwd-1-2 | 271 | 2.66 | 109.20 | 110.80 | 302.58 | 11.38 | 610.17 | 5.00 | 32.92 | 1 | 0 | 0.43 |
| fwd-2-3 | 269 | 2.72 | 107.80 | 111.40 | 126.46 | 18.55 | 636.07 | 5.62 | 12.65 | 0 | 0 | 0.42 |
| fwd-3-4 | 271 | 2.70 | 109.35 | 110.10 | 124.00 | 19.25 | 228.06 | 2.46 | 13.28 | 0 | 0 | 0.44 |
| fwd-4-5 | 271 | 2.70 | 100.60 | 110.00 | 104.95 | 14.36 | 176.41 | 2.31 | 10.53 | 0 | 0 | 0.44 |
| fwd-5-6 | 271 | 2.71 | 104.80 | 110.20 | 111.56 | 20.39 | 157.67 | 4.06 | 12.23 | 0 | 0 | 0.44 |
| fwd-6-7 | 272 | 2.71 | 100.70 | 112.10 | 287.64 | 11.61 | 536.99 | 10.69 | 30.78 | 1 | 0 | 0.43 |
| fwd-7-8 | 271 | 2.70 | 100.45 | 110.40 | 127.90 | 18.58 | 669.59 | 4.75 | 12.84 | 0 | 0 | 0.43 |
| fwd-8-9 | 271 | 2.66 | 109.40 | 110.30 | 122.84 | 22.67 | 199.75 | 2.52 | 13.24 | 0 | 0 | 0.43 |
| back-9-8 | 272 | 2.71 | 104.95 | 110.20 | 137.97 | 15.18 | 155.73 | 1.52 | 15.20 | 0 | 0 | 0.43 |
| back-8-7 | 273 | 2.72 | 101.75 | 111.30 | 101.99 | 10.26 | 199.05 | 10.66 | 10.20 | 0 | 0 | 0.43 |
| back-7-6 | 272 | 2.71 | 100.90 | 110.40 | 153.15 | 41.01 | 630.02 | 5.59 | 16.32 | 0 | 0 | 0.43 |
| back-6-5 | 271 | 2.70 | 104.95 | 110.50 | 130.62 | 15.21 | 147.30 | 4.12 | 13.63 | 0 | 0 | 0.43 |
| back-5-4 | 272 | 2.71 | 107.60 | 110.60 | 80.70 | 17.21 | 113.31 | 1.54 | 8.07 | 0 | 0 | 0.43 |
| back-4-3 | 272 | 2.71 | 109.45 | 110.70 | 142.58 | 15.09 | 182.10 | 1.40 | 15.68 | 0 | 0 | 0.43 |
| back-3-2 | 271 | 2.70 | 108.90 | 110.30 | 111.84 | 9.19 | 202.31 | 11.91 | 11.25 | 0 | 0 | 0.43 |
| back-2-1 | 274 | 2.73 | 105.10 | 111.40 | 180.39 | 40.59 | 527.10 | 2.10 | 18.07 | 0 | 0 | 0.43 |
| back-1-0 | 272 | 2.72 | 101.30 | 117.20 | 110.96 | 17.88 | 165.61 | 1.67 | 12.14 | 0 | 0 | 0.43 |
| menu-0-4 | 259 | 2.54 | 108.85 | 110.50 | 6090.44 | 0.02 | 60823.19 | 12.62 | 661.42 | 1 | 0 | 0.00 |
| menu-4-5 | 254 | 2.52 | 104.80 | 110.10 | 1297.04 | 0.01 | 12935.88 | 20.67 | 142.54 | 1 | 0 | 0.00 |
| menu-5-0 | 255 | 2.50 | 101.65 | 110.40 | 7815.78 | 0.01 | 76995.43 | 9.12 | 792.52 | 1 | 0 | 0.00 |
| wheel-down | 1370 | 13.68 | 108.45 | 111.00 | 103.79 | 0.00 | 311.23 | 2.09 | 11.25 | 0 | 0 | 0.43 |
| wheel-up | 1344 | 13.43 | 108.60 | 111.90 | 114.47 | 0.00 | 226.17 | 1.67 | 11.52 | 0 | 1 | 0.43 |
| arrow-down | 239 | 2.51 | 109.00 | 185.60 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0 | 0 | 0.00 |
| reduced-0-1 | 181 | 1.77 | 100.20 | 111.00 | 803.51 | 0.00 | 8035.12 | 12.32 | 88.39 | 1 | 0 | 0 |
| reduced-1-2 | 177 | 1.80 | 100.10 | 109.90 | 1376.24 | 0.00 | 12534.04 | 13.41 | 151.11 | 1 | 0 | 0 |
| reduced-2-3 | 181 | 1.77 | 100.10 | 110.00 | 617.72 | 0.00 | 5615.60 | 19.85 | 61.83 | 1 | 0 | 0 |
| reduced-3-4 | 181 | 1.79 | 109.00 | 110.10 | 1027.72 | 0.00 | 10256.73 | 5.03 | 113.15 | 1 | 0 | 0 |

## Camera inside solids

8610 camera samples tested against the merged district meshes (ray in six directions, first face hit pointing away = inside). Inside: 409. Smallest distance to any solid face: 8.11.

- fwd-0-1: inside=True nearest=49.11 by=district-0-landmarks pos=(9.9, 12.0, 13.0)
- fwd-0-1: inside=True nearest=47.53 by=district-0-landmarks pos=(10.2, 12.0, 9.0)
- fwd-0-1: inside=True nearest=30.12 by=district-0-landmarks pos=(10.5, 12.0, 2.2)
- fwd-0-1: inside=True nearest=30.32 by=district-0-landmarks pos=(10.5, 12.0, 1.2)
- fwd-0-1: inside=True nearest=30.52 by=district-0-landmarks pos=(10.5, 12.0, 0.3)
- fwd-0-1: inside=True nearest=58.33 by=district-0-landmarks pos=(10.5, 12.0, -0.6)
- fwd-0-1: inside=True nearest=57.90 by=district-0-landmarks pos=(10.5, 12.0, -2.5)
- fwd-0-1: inside=True nearest=49.95 by=district-0-landmarks pos=(10.6, 12.0, -3.3)
- fwd-0-1: inside=True nearest=57.26 by=district-0-landmarks pos=(10.6, 12.0, -5.1)
- fwd-0-1: inside=True nearest=41.63 by=district-1-landmarks pos=(10.3, 12.0, -52.1)
- fwd-0-1: inside=True nearest=41.60 by=district-1-landmarks pos=(10.3, 12.0, -52.3)
- fwd-0-1: inside=True nearest=40.49 by=district-1-landmarks pos=(10.6, 12.0, -59.7)
- fwd-0-1: inside=True nearest=40.49 by=district-1-landmarks pos=(10.6, 12.0, -59.7)
- fwd-1-2: inside=True nearest=62.95 by=district-2-landmarks pos=(35.0, 10.5, -203.3)
- fwd-1-2: inside=True nearest=63.04 by=district-2-landmarks pos=(36.2, 10.4, -204.1)
- fwd-1-2: inside=True nearest=63.72 by=district-2-landmarks pos=(36.8, 10.2, -204.3)
- fwd-1-2: inside=True nearest=25.94 by=district-2-landmarks pos=(37.4, 10.1, -204.6)
- fwd-1-2: inside=True nearest=26.14 by=district-2-landmarks pos=(38.0, 9.9, -204.9)
- fwd-1-2: inside=True nearest=26.16 by=district-2-landmarks pos=(38.7, 9.8, -205.1)
- fwd-1-2: inside=True nearest=26.41 by=district-2-landmarks pos=(39.2, 9.6, -205.3)
- fwd-1-2: inside=True nearest=26.48 by=district-2-landmarks pos=(39.8, 9.5, -205.4)
- fwd-1-2: inside=True nearest=27.05 by=district-2-landmarks pos=(42.3, 9.0, -205.9)
- fwd-1-2: inside=True nearest=27.15 by=district-2-landmarks pos=(42.8, 8.9, -205.9)
- fwd-1-2: inside=True nearest=27.33 by=district-2-landmarks pos=(43.9, 8.7, -206.0)
- fwd-1-2: inside=True nearest=27.50 by=district-2-landmarks pos=(44.4, 8.5, -206.0)
- fwd-1-2: inside=True nearest=27.60 by=district-2-landmarks pos=(44.9, 8.4, -206.0)
- fwd-1-2: inside=True nearest=27.70 by=district-2-landmarks pos=(45.5, 8.3, -206.0)
- fwd-1-2: inside=True nearest=58.50 by=district-2-landmarks pos=(46.0, 8.1, -205.9)
- fwd-1-2: inside=True nearest=58.68 by=district-2-landmarks pos=(46.5, 8.0, -205.9)
- fwd-1-2: inside=True nearest=58.81 by=district-2-landmarks pos=(46.9, 7.9, -205.9)

## Flags

- fwd-1-2: 1 frame step(s) over 30 units (largest 32.9 at c=1.27, dt 109 ms)
- fwd-6-7: 1 frame step(s) over 30 units (largest 30.8 at c=6.26, dt 107 ms)
- wheel-up: cCur reversed direction 1 time(s) (oscillation candidate)
- reduced-0-1: 1 frame step(s) over 30 units (largest 88.4 at c=1.00, dt 110 ms)
- reduced-1-2: 1 frame step(s) over 30 units (largest 151.1 at c=2.00, dt 110 ms)
- reduced-2-3: 1 frame step(s) over 30 units (largest 61.8 at c=3.00, dt 100 ms)
- reduced-3-4: 1 frame step(s) over 30 units (largest 113.2 at c=4.00, dt 110 ms)

Page errors: [] / reduced: []
Reduced-motion end state: {'stage': '3d', 'shown': '4', 'probe': {'t': 8314.899999999441, 'time': 0, 'cCur': 4, 'vel': 0, 'fov': 58, 'shown': '4', 'flight': '', 'scrollY': 3263, 'pos': [-6.125187060692808, 1.7, -340.94596647707664], 'quat': [0.05983294288748621, 0.8050534520839377, -0.08242522924910804, 0.5843928813875043], 'cards': '1'}}
