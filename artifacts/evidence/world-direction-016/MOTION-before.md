# Camera motion samples (phase 016)

Source: `motion-frames.json`, one record per rendered frame from the real scene (1280x800, headless Chrome with software or default GL; frame times are listed because a slow frame rate exaggerates per-frame steps).

| run | frames | s | median dt ms | max dt ms | max speed u/s | median speed | max accel u/s2 | max turn rad/s | max step u | steps>30u | cCur reversals | max dfov |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| fwd-0-1 | 273 | 2.72 | 10.00 | 12.30 | 129.51 | 22.49 | 5507.40 | 2.76 | 1.17 | 0 | 0 | 0.44 |
| fwd-1-2 | 272 | 2.71 | 10.00 | 19.40 | 331.28 | 11.87 | 25964.31 | 5.80 | 3.26 | 0 | 0 | 0.43 |
| fwd-2-3 | 272 | 2.71 | 10.00 | 11.10 | 136.64 | 19.78 | 2505.48 | 6.55 | 1.39 | 0 | 0 | 0.43 |
| fwd-3-4 | 272 | 2.71 | 10.00 | 11.60 | 155.99 | 25.34 | 5560.82 | 2.87 | 1.37 | 0 | 0 | 0.43 |
| fwd-4-5 | 272 | 2.71 | 10.00 | 14.70 | 121.83 | 15.83 | 8247.01 | 2.61 | 1.23 | 0 | 0 | 0.43 |
| fwd-5-6 | 273 | 2.72 | 9.90 | 12.70 | 147.60 | 25.57 | 7578.33 | 5.17 | 1.22 | 0 | 0 | 0.43 |
| fwd-6-7 | 272 | 2.71 | 10.00 | 13.00 | 310.74 | 10.34 | 14942.62 | 20.93 | 2.99 | 0 | 0 | 0.44 |
| fwd-7-8 | 273 | 2.72 | 10.00 | 13.50 | 145.51 | 19.69 | 2644.06 | 5.62 | 1.43 | 0 | 0 | 0.44 |
| fwd-8-9 | 272 | 2.71 | 10.00 | 13.00 | 161.70 | 23.83 | 8915.98 | 3.30 | 1.30 | 0 | 0 | 0.42 |
| back-9-8 | 273 | 2.72 | 10.00 | 12.30 | 157.40 | 17.44 | 7926.90 | 1.93 | 1.49 | 0 | 0 | 0.43 |
| back-8-7 | 273 | 2.72 | 10.00 | 12.10 | 140.91 | 10.06 | 9142.97 | 12.66 | 1.41 | 0 | 0 | 0.43 |
| back-7-6 | 272 | 2.71 | 10.00 | 12.20 | 172.60 | 46.85 | 4224.53 | 6.33 | 1.71 | 0 | 0 | 0.43 |
| back-6-5 | 269 | 2.71 | 10.00 | 54.30 | 697.05 | 19.15 | 232699.50 | 5.18 | 1.60 | 0 | 0 | 0.43 |
| back-5-4 | 273 | 2.72 | 10.00 | 11.90 | 100.63 | 20.17 | 6221.91 | 1.93 | 1.00 | 0 | 0 | 0.43 |
| back-4-3 | 271 | 2.71 | 10.00 | 32.50 | 603.64 | 17.91 | 244041.45 | 2.56 | 2.81 | 0 | 0 | 0.43 |
| back-3-2 | 271 | 2.71 | 10.00 | 31.30 | 141.15 | 10.50 | 4796.95 | 13.95 | 1.40 | 0 | 0 | 0.43 |
| back-2-1 | 271 | 2.71 | 10.00 | 32.00 | 202.35 | 44.04 | 4872.15 | 3.42 | 1.98 | 0 | 0 | 0.43 |
| back-1-0 | 273 | 2.72 | 10.00 | 13.90 | 145.26 | 20.05 | 11351.28 | 2.06 | 1.41 | 0 | 0 | 0.43 |
| menu-0-4 | 255 | 2.54 | 10.00 | 11.70 | 62991.91 | 0.06 | 6175403.99 | 130.52 | 661.42 | 1 | 0 | 0.00 |
| menu-4-5 | 254 | 2.53 | 10.00 | 20.30 | 13576.47 | 0.05 | 1292997.07 | 216.37 | 142.55 | 1 | 0 | 0.00 |
| menu-5-0 | 253 | 2.52 | 10.00 | 11.80 | 67162.51 | 0.07 | 7299554.64 | 78.35 | 792.52 | 1 | 0 | 0.00 |
| wheel-down | 1354 | 13.58 | 10.00 | 65.90 | 114.10 | 0.00 | 10870.52 | 2.35 | 1.17 | 0 | 0 | 0.43 |
| wheel-up | 1381 | 13.80 | 10.00 | 11.60 | 158.11 | 0.00 | 12077.10 | 1.96 | 1.42 | 0 | 0 | 0.43 |
| arrow-down | 252 | 2.51 | 10.00 | 11.10 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0 | 0 | 0.00 |
| reduced-0-1 | 181 | 1.80 | 10.00 | 18.80 | 4701.40 | 0.00 | 1679071.80 | 72.09 | 88.39 | 1 | 0 | 0 |
| reduced-1-2 | 178 | 1.80 | 10.00 | 47.80 | 15111.09 | 0.00 | 316131.66 | 147.26 | 151.11 | 1 | 0 | 0 |
| reduced-2-3 | 182 | 1.81 | 10.00 | 10.70 | 6309.53 | 0.00 | 643829.77 | 202.75 | 61.83 | 1 | 0 | 0 |
| reduced-3-4 | 181 | 1.80 | 10.00 | 10.30 | 11546.17 | 0.00 | 1154616.68 | 56.52 | 113.15 | 1 | 0 | 0 |

## Camera inside solids

8646 camera samples tested against the merged district meshes (ray in six directions, first face hit pointing away = inside). Inside: 417. Smallest distance to any solid face: 7.95.

- fwd-0-1: inside=True nearest=47.54 by=district-0-landmarks pos=(10.2, 12.0, 9.0)
- fwd-0-1: inside=True nearest=30.09 by=district-0-landmarks pos=(10.5, 12.0, 2.2)
- fwd-0-1: inside=True nearest=30.31 by=district-0-landmarks pos=(10.5, 12.0, 1.3)
- fwd-0-1: inside=True nearest=30.52 by=district-0-landmarks pos=(10.5, 12.0, 0.3)
- fwd-0-1: inside=True nearest=58.36 by=district-0-landmarks pos=(10.5, 12.0, -0.5)
- fwd-0-1: inside=True nearest=50.43 by=district-0-landmarks pos=(10.5, 12.0, -1.5)
- fwd-0-1: inside=True nearest=57.94 by=district-0-landmarks pos=(10.6, 12.0, -2.4)
- fwd-0-1: inside=True nearest=49.95 by=district-0-landmarks pos=(10.6, 12.0, -3.3)
- fwd-0-1: inside=True nearest=57.27 by=district-0-landmarks pos=(10.6, 12.0, -5.1)
- fwd-0-1: inside=True nearest=41.64 by=district-1-landmarks pos=(10.3, 12.0, -52.1)
- fwd-0-1: inside=True nearest=41.60 by=district-1-landmarks pos=(10.3, 12.0, -52.3)
- fwd-0-1: inside=True nearest=40.49 by=district-1-landmarks pos=(10.6, 12.0, -59.7)
- fwd-0-1: inside=True nearest=40.49 by=district-1-landmarks pos=(10.6, 12.0, -59.7)
- fwd-1-2: inside=True nearest=91.21 by=district-2-landmarks pos=(33.4, 10.8, -202.2)
- fwd-1-2: inside=True nearest=65.40 by=district-2-landmarks pos=(34.1, 10.7, -202.7)
- fwd-1-2: inside=True nearest=63.49 by=district-2-landmarks pos=(36.5, 10.2, -204.3)
- fwd-1-2: inside=True nearest=25.92 by=district-2-landmarks pos=(37.1, 10.1, -204.5)
- fwd-1-2: inside=True nearest=26.05 by=district-2-landmarks pos=(37.8, 10.0, -204.8)
- fwd-1-2: inside=True nearest=26.17 by=district-2-landmarks pos=(38.4, 9.8, -205.0)
- fwd-1-2: inside=True nearest=26.34 by=district-2-landmarks pos=(38.9, 9.7, -205.2)
- fwd-1-2: inside=True nearest=26.50 by=district-2-landmarks pos=(40.2, 9.5, -205.5)
- fwd-1-2: inside=True nearest=27.20 by=district-2-landmarks pos=(43.2, 8.8, -205.9)
- fwd-1-2: inside=True nearest=27.38 by=district-2-landmarks pos=(43.7, 8.6, -206.0)
- fwd-1-2: inside=True nearest=27.48 by=district-2-landmarks pos=(44.2, 8.5, -206.0)
- fwd-1-2: inside=True nearest=27.56 by=district-2-landmarks pos=(44.8, 8.4, -206.0)
- fwd-1-2: inside=True nearest=27.73 by=district-2-landmarks pos=(45.4, 8.3, -206.0)
- fwd-1-2: inside=True nearest=27.80 by=district-2-landmarks pos=(45.7, 8.2, -206.0)
- fwd-1-2: inside=True nearest=58.60 by=district-2-landmarks pos=(46.3, 8.1, -205.9)
- fwd-1-2: inside=True nearest=58.77 by=district-2-landmarks pos=(46.8, 8.0, -205.9)
- fwd-1-2: inside=True nearest=58.91 by=district-2-landmarks pos=(47.2, 7.9, -205.8)

## Flags

- reduced-0-1: 1 frame step(s) over 30 units (largest 88.4 at c=1.00, dt 19 ms)
- reduced-1-2: 1 frame step(s) over 30 units (largest 151.1 at c=2.00, dt 10 ms)
- reduced-2-3: 1 frame step(s) over 30 units (largest 61.8 at c=3.00, dt 10 ms)
- reduced-3-4: 1 frame step(s) over 30 units (largest 113.2 at c=4.00, dt 10 ms)

Page errors: [] / reduced: []
Reduced-motion end state: {'stage': '3d', 'shown': '4', 'probe': {'t': 8358.299999999814, 'time': 0, 'cCur': 4, 'vel': 0, 'fov': 58, 'shown': '4', 'flight': '', 'scrollY': 3263, 'pos': [-6.125187060692808, 1.7, -340.94596647707664], 'quat': [0.05983294288748621, 0.8050534520839377, -0.08242522924910804, 0.5843928813875043], 'cards': '1'}}
