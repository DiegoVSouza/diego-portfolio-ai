# World spatial map

Coordinates are world-space Three.js units: +Y is up; the avenue progresses approximately toward -Z. Boxes are axis-aligned bounds, not collision meshes. Each JSON snapshot records every scene mesh and each instance at that stop; static district geometry is merged, so its bounds encompass many pieces.

Rail length: 1123.10; start (0.00, 0.00, 26.00); end (-25.96, 0.00, -1079.00); camera near/far 0.5/420.

## Stops and cards

| Stop | Camera X,Y,Z | Look X,Y,Z | Card corners X,Y,Z (top-left, top-right, bottom-right, bottom-left) |
|---:|---|---|---|
| 0 | 8.77, 12.00, 28.02 | 22.29, 13.28, 5.79 | (12.47, 25.26, -0.25) / (37.54, 25.26, 16.23) / (37.54, 3.70, 16.23) / (12.47, 3.70, -0.25) |
| 1 | 10.64, 12.00, -60.35 | -13.79, 13.78, -83.65 | (-23.46, 24.56, -77.39) / (1.21, 24.56, -94.45) / (1.21, 3.00, -94.45) / (-23.46, 3.00, -77.39) |
| 2 | 59.78, 5.00, -203.07 | 89.33, 16.48, -241.57 | (76.76, 29.95, -250.24) / (107.13, 29.95, -228.25) / (107.13, 3.00, -228.25) / (76.76, 3.00, -250.24) |
| 3 | 11.70, 30.00, -232.85 | -27.28, 37.86, -242.34 | (-32.98, 51.04, -230.63) / (-19.34, 51.04, -260.68) / (-19.34, 27.32, -260.68) / (-32.98, 27.32, -230.63) |
| 4 | -6.13, 1.70, -340.95 | -42.88, 9.70, -328.97 | (-38.88, 27.56, -318.16) / (-48.44, 27.56, -346.60) / (-48.44, 6.00, -346.60) / (-38.88, 6.00, -318.16) |
| 5 | -32.22, 12.00, -398.08 | -48.08, 13.28, -419.17 | (-58.78, 25.26, -414.88) / (-31.29, 25.26, -426.89) / (-31.29, 3.70, -426.89) / (-58.78, 3.70, -414.88) |
| 6 | 1.66, 6.00, -497.61 | 18.99, 6.39, -498.67 | (18.80, 12.38, -502.70) / (18.18, 12.38, -487.71) / (18.18, 1.60, -487.71) / (18.80, 1.60, -502.70) |
| 7 | -33.54, 5.00, -632.01 | -66.92, 16.48, -663.64 | (-79.40, 29.95, -654.85) / (-49.24, 29.95, -677.13) / (-49.24, 3.00, -677.13) / (-79.40, 3.00, -654.85) |
| 8 | 15.66, 30.00, -657.86 | 51.91, 37.86, -676.18 | (45.57, 51.04, -687.55) / (60.86, 51.04, -658.31) / (60.86, 27.32, -658.31) / (45.57, 27.32, -687.55) |
| 9 | 19.27, 1.70, -764.37 | 57.69, 9.70, -768.66 | (58.95, 27.56, -780.12) / (56.57, 27.56, -750.21) / (56.57, 6.00, -750.21) / (58.95, 6.00, -780.12) |

## Scene meshes and instance bounds

The following inventory is from stop 0; named repeated objects list aggregate bounds here. Individual bounds and the other nine samples are in `world-0.json` through `world-9.json`.

| Name | Geometry | Instances | Aggregate min X,Y,Z | Aggregate max X,Y,Z |
|---|---|---:|---|---|
| ground-grid #0 | PlaneGeometry | 1 | -500.00, -0.06, -1091.00 | 500.00, -0.06, 160.00 |
| unnamed #1 | BufferGeometry | 1 | -33.93, 0.03, -1079.73 | 33.93, 0.03, 27.79 |
| unnamed #2 | BufferGeometry | 1 | -17.99, 0.10, -1080.09 | 37.93, 0.10, 28.69 |
| unnamed #3 | BufferGeometry | 1 | -37.91, 0.10, -1078.27 | 17.93, 0.10, 24.21 |
| unnamed #4 | BufferGeometry | 1 | -175.73, 0.12, -918.61 | 175.38, 0.12, 13.67 |
| unnamed #5 | BufferGeometry | 1 | -175.77, 0.13, -921.52 | 175.55, 0.13, 16.59 |
| unnamed #6 | BoxGeometry | 330 | -171.16, 0.13, -911.87 | 170.56, 0.18, 6.97 |
| unnamed #7 | BoxGeometry | 187 | -26.00, 0.04, -1077.26 | 26.13, 0.10, 24.26 |
| avenue-lamps #8 | BufferGeometry | 29 | -36.92, -0.00, -1069.49 | 37.79, 7.01, 13.53 |
| harbour-water #9 | PlaneGeometry | 1 | -500.00, -0.40, -1571.00 | 500.00, -0.40, -1091.00 |
| harbour-quay #10 | BoxGeometry | 1 | -46.16, -0.45, -1241.00 | -0.16, 0.25, -1071.00 |
| unnamed #11 | BoxGeometry | 46 | -193.94, -0.37, -1321.47 | 152.29, -0.32, -1129.91 |
| harbour-containers #12 | BoxGeometry | 48 | -68.03, 0.00, -1032.24 | 12.99, 8.40, -941.41 |
| board-face-0 #13 | PlaneGeometry | 1 | 11.08, 2.50, -1.16 | 38.94, 26.46, 17.14 |
| board-0 #14 | BoxGeometry | 1 | 10.69, 0.00, -2.42 | 11.65, 26.46, -1.45 |
| board-0 #15 | BoxGeometry | 1 | 39.13, 0.00, 16.26 | 40.10, 26.46, 17.23 |
| board-0 #16 | BoxGeometry | 1 | 10.66, 1.90, -2.30 | 40.02, 2.50, 17.28 |
| board-0 #17 | BoxGeometry | 1 | 10.66, 26.46, -2.30 | 40.02, 27.06, 17.28 |
| board-0 #18 | BufferGeometry | 1 | 8.92, -0.02, -5.18 | 42.05, 27.27, 19.70 |
| board-0 #19 | BufferGeometry | 1 | 10.13, 2.03, -0.92 | 38.43, 27.26, 19.12 |
| board-0-light-cones #20 | BufferGeometry | 1 | 8.81, 15.39, -4.16 | 41.15, 26.86, 20.23 |
| board-face-1 #21 | PlaneGeometry | 1 | -23.46, 3.00, -94.45 | 1.21, 24.56, -77.39 |
| board-1 #22 | BoxGeometry | 1 | -24.63, 0.00, -78.25 | -23.66, 24.56, -77.27 |
| board-1 #23 | BoxGeometry | 1 | 0.61, 0.00, -95.71 | 1.59, 24.56, -94.74 |
| board-1 #24 | BoxGeometry | 1 | -24.55, 2.40, -95.59 | 1.62, 3.00, -77.23 |
| board-1 #25 | BoxGeometry | 1 | -24.55, 24.56, -95.59 | 1.62, 25.16, -77.23 |
| board-face-2 #26 | PlaneGeometry | 1 | 76.76, 3.00, -250.24 | 107.13, 29.95, -228.25 |
| board-2 #27 | BoxGeometry | 1 | 76.40, 0.00, -251.50 | 77.38, 29.95, -250.53 |
| board-2 #28 | BoxGeometry | 1 | 107.34, 0.00, -229.10 | 108.32, 29.95, -228.12 |
| board-2 #29 | BoxGeometry | 1 | 76.37, 2.40, -251.38 | 108.23, 3.00, -228.08 |
| board-2 #30 | BoxGeometry | 1 | 76.37, 29.95, -251.38 | 108.23, 30.55, -228.08 |
| board-face-3 #31 | PlaneGeometry | 1 | -33.74, 26.00, -262.35 | -18.58, 52.35, -228.96 |
| board-3 #32 | BoxGeometry | 1 | -34.98, 26.00, -229.40 | -34.05, 52.35, -228.47 |
| board-3 #33 | BoxGeometry | 1 | -19.53, 26.00, -263.42 | -18.61, 52.35, -262.49 |
| board-3 #34 | BoxGeometry | 1 | -34.85, 25.40, -263.36 | -18.56, 26.00, -228.45 |
| board-3 #35 | BoxGeometry | 1 | -34.85, 52.35, -263.36 | -18.56, 52.95, -228.45 |
| board-3 #36 | BufferGeometry | 1 | -37.93, 25.33, -264.97 | -15.98, 53.16, -227.06 |
| board-3 #37 | BufferGeometry | 1 | -33.60, 25.53, -261.73 | -16.30, 53.15, -228.49 |
| board-3-light-cones #38 | BufferGeometry | 1 | -36.82, 41.28, -263.94 | -15.40, 52.75, -227.33 |
| board-face-4 #39 | PlaneGeometry | 1 | -48.44, 6.00, -346.60 | -38.88, 27.56, -318.16 |
| board-4 #40 | BoxGeometry | 1 | -39.88, 0.00, -318.05 | -38.99, 27.56, -317.17 |
| board-4 #41 | BoxGeometry | 1 | -49.66, 0.00, -347.15 | -48.77, 27.56, -346.26 |
| board-4 #42 | BoxGeometry | 1 | -49.52, 5.40, -347.17 | -38.94, 6.00, -317.21 |
| board-4 #43 | BoxGeometry | 1 | -49.52, 27.56, -347.17 | -38.94, 28.16, -317.21 |
| board-face-5 #44 | PlaneGeometry | 1 | -60.31, 2.50, -427.56 | -29.76, 26.46, -414.22 |
| board-5 #45 | BoxGeometry | 1 | -61.37, 0.00, -415.18 | -60.45, 26.46, -414.26 |
| board-5 #46 | BoxGeometry | 1 | -30.18, 0.00, -428.80 | -29.26, 26.46, -427.88 |
| board-5 #47 | BoxGeometry | 1 | -61.31, 1.90, -428.66 | -29.24, 2.50, -414.21 |
| board-5 #48 | BoxGeometry | 1 | -61.31, 26.46, -428.66 | -29.24, 27.06, -414.21 |
| board-5 #49 | BufferGeometry | 1 | -62.88, -0.02, -431.76 | -27.88, 27.27, -411.62 |
| board-5 #50 | BufferGeometry | 1 | -59.71, 2.03, -427.44 | -29.30, 27.26, -411.90 |
| board-5-light-cones #51 | BufferGeometry | 1 | -62.08, 15.39, -430.74 | -27.94, 26.86, -410.93 |
| board-face-6 #52 | PlaneGeometry | 1 | 18.14, 1.00, -503.53 | 18.84, 12.98, -486.88 |
| board-6 #53 | BoxGeometry | 1 | 19.19, 0.00, -504.21 | 19.92, 12.98, -503.49 |
| board-6 #54 | BoxGeometry | 1 | 18.46, 0.00, -486.86 | 19.19, 12.98, -486.13 |
| board-6 #55 | BoxGeometry | 1 | 18.41, 0.40, -504.22 | 19.77, 1.00, -486.14 |
| board-6 #56 | BoxGeometry | 1 | 18.41, 12.98, -504.22 | 19.77, 13.58, -486.14 |
| board-6 #57 | BufferGeometry | 1 | 18.07, 0.53, -502.77 | 19.01, 13.45, -487.63 |
| board-face-7 #58 | PlaneGeometry | 1 | -79.40, 3.00, -677.13 | -49.24, 29.95, -654.85 |
| board-7 #59 | BoxGeometry | 1 | -80.59, 0.00, -655.69 | -79.61, 29.95, -654.71 |
| board-7 #60 | BoxGeometry | 1 | -49.86, 0.00, -678.39 | -48.88, 29.95, -677.41 |
| board-7 #61 | BoxGeometry | 1 | -80.50, 2.40, -678.27 | -48.85, 3.00, -654.67 |
| board-7 #62 | BoxGeometry | 1 | -80.50, 29.95, -678.27 | -48.85, 30.55, -654.67 |
| board-face-8 #63 | PlaneGeometry | 1 | 44.72, 26.00, -689.18 | 61.71, 52.35, -656.68 |
| board-8 #64 | BoxGeometry | 1 | 44.71, 26.00, -690.28 | 45.65, 52.35, -689.34 |
| board-8 #65 | BoxGeometry | 1 | 62.02, 26.00, -657.17 | 62.96, 52.35, -656.22 |
| board-8 #66 | BoxGeometry | 1 | 44.66, 25.40, -690.22 | 62.83, 26.00, -656.20 |
| board-8 #67 | BoxGeometry | 1 | 44.66, 52.35, -690.22 | 62.83, 52.95, -656.20 |
| board-8 #68 | BufferGeometry | 1 | 42.13, 25.33, -691.99 | 65.85, 53.16, -654.68 |
| board-8 #69 | BufferGeometry | 1 | 42.55, 25.53, -688.59 | 61.53, 53.15, -656.05 |
| board-8-light-cones #70 | BufferGeometry | 1 | 41.61, 41.28, -690.92 | 64.72, 52.75, -654.89 |
| board-face-9 #71 | PlaneGeometry | 1 | 56.57, 6.00, -780.12 | 58.95, 27.56, -750.21 |
| board-9 #72 | BoxGeometry | 1 | 59.30, 0.00, -780.79 | 60.05, 27.56, -780.03 |
| board-9 #73 | BoxGeometry | 1 | 56.87, 0.00, -750.18 | 57.62, 27.56, -749.43 |
| board-9 #74 | BoxGeometry | 1 | 56.82, 5.40, -780.79 | 59.90, 6.00, -749.44 |
| board-9 #75 | BoxGeometry | 1 | 56.82, 27.56, -780.79 | 59.90, 28.16, -749.44 |
| district-0-generated #76 | BufferGeometry | 1 | -63.54, -0.00, -25.77 | 74.92, 64.52, 39.41 |
| district-0-landmarks #77 | BufferGeometry | 1 | -48.40, 0.00, -19.26 | 73.35, 15.67, 43.19 |
| district-1-generated #78 | BufferGeometry | 1 | -52.91, -0.00, -126.65 | 72.77, 40.56, -31.58 |
| district-1-landmarks #79 | BufferGeometry | 1 | -40.13, 0.00, -71.14 | 71.16, 17.67, -51.35 |
| district-2-generated #80 | BufferGeometry | 1 | -88.21, -0.00, -368.34 | 132.52, 101.16, -115.31 |
| district-2-landmarks #81 | BufferGeometry | 1 | -72.99, 0.00, -292.62 | -26.67, 21.61, -158.34 |
| district-3-generated #82 | BufferGeometry | 1 | -110.79, -0.00, -598.08 | 61.61, 50.35, -284.82 |
| district-4-generated #83 | BufferGeometry | 1 | -105.02, -0.00, -710.43 | 96.00, 46.41, -535.54 |
| district-5-generated #84 | BufferGeometry | 1 | -78.60, -1.50, -1225.50 | 110.68, 68.82, -719.93 |
| unnamed #85 | BufferGeometry | 1 | -105.94, 7.08, -1222.00 | 118.84, 98.21, 38.36 |
| unnamed #86 | PlaneGeometry | 1 | 69.05, 13.96, 14.49 | 69.60, 22.76, 16.62 |
| unnamed #87 | PlaneGeometry | 1 | -55.10, 35.58, 7.71 | -54.60, 44.38, 9.85 |
| unnamed #88 | PlaneGeometry | 1 | 39.83, 15.31, 4.28 | 40.38, 24.11, 6.41 |
| unnamed #89 | PlaneGeometry | 1 | 36.77, 18.59, 29.86 | 37.27, 27.39, 32.01 |
| unnamed #90 | PlaneGeometry | 1 | 55.77, 16.58, -56.61 | 56.09, 25.38, -54.44 |
| unnamed #91 | PlaneGeometry | 1 | 93.17, 32.77, -170.41 | 93.36, 41.57, -168.22 |
| unnamed #92 | PlaneGeometry | 1 | -53.37, 36.45, -149.03 | -53.25, 45.25, -146.84 |
| unnamed #93 | PlaneGeometry | 1 | 43.75, 32.66, -269.14 | 44.30, 41.46, -267.01 |
| unnamed #94 | PlaneGeometry | 1 | 78.85, 19.88, -139.79 | 78.87, 28.68, -137.59 |
| unnamed #95 | PlaneGeometry | 1 | -21.94, 33.17, -157.07 | -21.77, 41.97, -154.88 |
| unnamed #96 | PlaneGeometry | 1 | -103.16, 21.52, -406.72 | -102.99, 30.32, -404.52 |
| unnamed #97 | PlaneGeometry | 1 | -97.71, 11.32, -420.46 | -97.60, 20.12, -418.27 |
| unnamed #98 | PlaneGeometry | 1 | 52.96, 31.41, -860.44 | 53.43, 40.21, -858.29 |
| unnamed #99 | PlaneGeometry | 1 | -35.61, 29.32, -751.32 | -35.57, 38.12, -749.12 |
| unnamed #100 | PlaneGeometry | 1 | 90.66, 35.86, -873.68 | 91.14, 44.66, -871.53 |
| unnamed #101 | PlaneGeometry | 1 | -57.63, 7.88, -12.24 | -55.43, 10.13, -3.51 |
| unnamed #102 | PlaneGeometry | 1 | -55.89, 7.31, 5.26 | -53.81, 9.56, 14.01 |
| unnamed #103 | PlaneGeometry | 1 | 44.81, 7.02, 15.36 | 47.00, 9.27, 24.09 |
| unnamed #104 | PlaneGeometry | 1 | 38.99, 10.20, 1.64 | 41.22, 12.45, 10.36 |
| unnamed #105 | PlaneGeometry | 1 | -49.94, 12.71, -23.95 | -47.71, 14.96, -15.23 |
| unnamed #106 | PlaneGeometry | 1 | 64.58, 7.32, -39.25 | 66.34, 9.57, -30.42 |
| unnamed #107 | PlaneGeometry | 1 | -21.43, 4.10, -65.30 | -19.93, 6.35, -56.43 |
| unnamed #108 | PlaneGeometry | 1 | -45.17, 9.89, -66.51 | -43.58, 12.14, -57.66 |
| unnamed #109 | PlaneGeometry | 1 | 55.27, 3.95, -60.62 | 56.59, 6.20, -51.72 |
| unnamed #110 | PlaneGeometry | 1 | 92.86, 4.08, -172.98 | 93.67, 6.33, -164.02 |
| unnamed #111 | PlaneGeometry | 1 | -53.57, 13.54, -151.74 | -53.05, 15.79, -142.75 |
| unnamed #112 | PlaneGeometry | 1 | 42.89, 8.24, -273.11 | 45.15, 10.49, -264.40 |
| unnamed #113 | PlaneGeometry | 1 | 78.80, 13.26, -143.82 | 78.91, 15.51, -134.82 |
| unnamed #114 | PlaneGeometry | 1 | -22.21, 10.73, -160.23 | -21.50, 12.98, -151.26 |
| unnamed #115 | PlaneGeometry | 1 | 41.98, 4.22, -351.56 | 43.99, 6.47, -342.79 |
| unnamed #116 | PlaneGeometry | 1 | 85.72, 12.54, -187.37 | 86.81, 14.79, -178.43 |
| unnamed #117 | PlaneGeometry | 1 | -43.31, 11.28, -140.65 | -43.22, 13.53, -131.65 |
| unnamed #118 | PlaneGeometry | 1 | 73.54, 9.45, -173.67 | 74.39, 11.70, -164.71 |
| unnamed #119 | PlaneGeometry | 1 | 39.89, 4.48, -330.35 | 41.85, 6.73, -321.57 |
| unnamed #120 | PlaneGeometry | 1 | -103.41, 12.96, -410.27 | -102.73, 15.21, -401.30 |
| unnamed #121 | PlaneGeometry | 1 | -97.88, 8.25, -422.90 | -97.42, 10.50, -413.91 |
| unnamed #122 | PlaneGeometry | 1 | -87.61, 6.03, -394.69 | -86.62, 8.28, -385.75 |
| unnamed #123 | PlaneGeometry | 1 | -78.39, 5.42, -532.58 | -76.78, 7.67, -523.72 |
| unnamed #124 | PlaneGeometry | 1 | -100.09, 6.15, -485.23 | -99.47, 8.40, -476.25 |
| unnamed #125 | PlaneGeometry | 1 | -101.85, 3.90, -399.58 | -100.99, 6.15, -390.62 |
| unnamed #126 | PlaneGeometry | 1 | -64.73, 9.99, -570.73 | -62.78, 12.24, -561.94 |
| unnamed #127 | PlaneGeometry | 1 | -77.08, 7.79, -601.33 | -74.94, 10.04, -592.58 |
| unnamed #128 | PlaneGeometry | 1 | 50.23, 4.04, -545.94 | 52.18, 6.29, -537.15 |
| unnamed #129 | PlaneGeometry | 1 | -51.74, 12.81, -590.49 | -49.69, 15.06, -581.72 |
| unnamed #130 | PlaneGeometry | 1 | 50.60, 4.87, -632.98 | 52.69, 7.12, -624.23 |
| unnamed #131 | PlaneGeometry | 1 | -29.49, 4.20, -675.00 | -27.74, 6.45, -666.17 |
| unnamed #132 | PlaneGeometry | 1 | 69.15, 9.75, -577.15 | 71.44, 12.00, -568.45 |
| unnamed #133 | PlaneGeometry | 1 | -47.36, 4.50, -620.14 | -45.00, 6.75, -611.46 |
| unnamed #134 | PlaneGeometry | 1 | -65.40, 6.57, -890.81 | -63.32, 8.82, -882.05 |
| unnamed #135 | PlaneGeometry | 1 | 52.24, 6.50, -863.14 | 54.15, 8.75, -854.34 |
| unnamed #136 | PlaneGeometry | 1 | -35.67, 6.66, -755.44 | -35.50, 8.91, -746.45 |
| unnamed #137 | PlaneGeometry | 1 | 89.92, 10.92, -876.91 | 91.89, 13.17, -868.13 |
| unnamed #138 | PlaneGeometry | 1 | -18.61, 10.54, -839.87 | -16.87, 12.79, -831.04 |
| unnamed #139 | PlaneGeometry | 1 | 47.11, 12.90, -953.27 | 49.38, 15.15, -944.56 |
| unnamed #140 | PlaneGeometry | 1 | -45.79, 4.81, -736.19 | -44.95, 7.06, -727.23 |
| unnamed #141 | PlaneGeometry | 1 | 56.61, 7.73, -847.40 | 58.19, 9.98, -838.54 |
| unnamed #142 | PlaneGeometry | 1 | -1.51, 28.80, -17.56 | 21.78, 34.80, -11.75 |
| unnamed #143 | PlaneGeometry | 1 | -44.64, 40.00, -7.58 | -42.46, 45.40, 3.20 |
| unnamed #144 | PlaneGeometry | 1 | 67.19, 53.85, 32.66 | 69.38, 59.25, 43.45 |
| unnamed #145 | PlaneGeometry | 1 | -59.59, 58.51, 0.71 | -57.41, 63.91, 11.49 |
| unnamed #146 | PlaneGeometry | 1 | -35.69, 21.08, -62.40 | -33.50, 26.48, -51.62 |
| unnamed #147 | PlaneGeometry | 1 | 65.47, 34.13, -72.39 | 67.65, 39.53, -61.61 |
| unnamed #148 | PlaneGeometry | 1 | -48.91, 20.57, -70.22 | -46.72, 25.97, -59.44 |
| unnamed #149 | PlaneGeometry | 1 | -66.29, 95.07, -293.36 | -64.10, 100.47, -282.58 |
| unnamed #150 | PlaneGeometry | 1 | 95.49, 86.10, -176.50 | 97.67, 91.50, -165.72 |
| unnamed #151 | PlaneGeometry | 1 | -57.81, 95.18, -153.98 | -55.63, 100.58, -143.20 |
| unnamed #152 | PlaneGeometry | 1 | 48.06, 80.73, -273.76 | 50.25, 86.13, -262.98 |
| unnamed #153 | PlaneGeometry | 1 | -70.85, 19.54, -571.89 | -68.67, 24.94, -561.11 |
| unnamed #154 | PlaneGeometry | 1 | -81.99, 17.59, -604.75 | -79.81, 22.99, -593.97 |
| unnamed #155 | PlaneGeometry | 1 | 54.92, 18.67, -547.50 | 57.10, 24.07, -536.72 |
| unnamed #156 | PlaneGeometry | 1 | -55.63, 21.16, -594.00 | -53.44, 26.56, -583.22 |
| unnamed #157 | PlaneGeometry | 1 | 53.66, 14.49, -633.81 | 55.85, 19.89, -623.03 |
| unnamed #158 | PlaneGeometry | 1 | 75.13, 22.18, -577.86 | 77.32, 27.58, -567.08 |
| unnamed #159 | PlaneGeometry | 1 | 55.69, 55.98, -865.07 | 57.88, 61.38, -854.29 |
| unnamed #160 | PlaneGeometry | 1 | -41.39, 62.84, -753.59 | -39.20, 68.24, -742.81 |
| unnamed #161 | PlaneGeometry | 1 | 94.96, 61.47, -880.41 | 97.14, 66.87, -869.63 |
| unnamed #162 | PlaneGeometry | 1 | -22.98, 26.54, -840.67 | -20.79, 31.94, -829.89 |
| unnamed #163 | PlaneGeometry | 1 | -31.07, 44.69, -768.72 | -28.89, 50.09, -757.94 |
| fleet-0 #164 | BufferGeometry | 3 | -32.36, 0.01, -1079.12 | 32.36, 4.19, 27.63 |
| fleet-3 #165 | BufferGeometry | 3 | -17.76, 0.05, -340.00 | 22.65, 2.75, -151.02 |
| fleet-6 #166 | BufferGeometry | 4 | -24.74, 0.57, -710.89 | 20.47, 2.43, -448.03 |
| fleet-10 #167 | BufferGeometry | 3 | -0.54, 0.41, -930.32 | 31.31, 2.59, -763.89 |
| s64-wheels #168 | BufferGeometry | 3 | -0.40, 0.25, -929.69 | 31.31, 1.31, -764.59 |
| metro-station #169 | BufferGeometry | 1 | -72.63, 12.95, -455.54 | -63.38, 17.78, -426.70 |
| metro-head #170 | BufferGeometry | 4 | -67.23, 14.35, -567.48 | 27.04, 22.52, -347.04 |
| metro-middle #171 | BufferGeometry | 12 | -63.69, 14.35, -550.32 | 35.56, 22.52, -296.42 |
| metro-tail #172 | BufferGeometry | 4 | -66.24, 14.35, -495.41 | 39.97, 22.52, -278.30 |

## Building reservations

Circles are conservative placement reservations, not mesh outlines. Board buildings are pre-reserved before towers. Height is the intended building height.

| Kind | District | X | Z | Radius | Height |
|---|---:|---:|---:|---:|---:|
| board-building | 1 | -21.36 | -100.72 | 30.02 | 40.56 |
| board-building | 2 | 102.51 | -253.82 | 33.03 | 45.95 |
| board-building | 2 | -37.08 | -250.62 | 36.59 | 26.00 |
| board-building | 2 | -60.72 | -326.65 | 30.02 | 43.56 |
| board-building | 4 | -75.02 | -680.47 | 33.03 | 45.95 |
| board-building | 4 | 63.85 | -678.49 | 36.59 | 26.00 |
| board-building | 5 | 75.70 | -763.74 | 30.02 | 43.56 |
| landmark-0 | 0 | -43.55 | -2.19 | 6.09 | 13.16 |
| generated-building | 0 | 71.68 | 17.92 | 5.04 | 31.86 |
| generated-building | 0 | -59.33 | -9.60 | 5.61 | 16.36 |
| landmark-1 | 0 | 68.28 | 38.06 | 6.24 | 15.67 |
| generated-building | 0 | -58.50 | 6.10 | 6.45 | 57.81 |
| generated-building | 0 | 49.81 | 22.34 | 6.65 | 19.00 |
| landmark-2 | 0 | -40.14 | -14.70 | 5.48 | 10.01 |
| generated-building | 0 | 42.93 | 4.22 | 5.72 | 43.03 |
| generated-building | 0 | -52.85 | -22.32 | 5.92 | 19.72 |
| landmark-3 | 0 | 56.14 | 9.10 | 6.51 | 13.37 |
| generated-building | 0 | -41.94 | 15.02 | 5.76 | 22.71 |
| generated-building | 0 | 39.40 | 33.60 | 5.36 | 44.65 |
| landmark-0 | 0 | -28.19 | -14.30 | 5.36 | 11.60 |
| generated-building | 0 | 55.59 | 33.16 | 5.29 | 24.31 |
| landmark-1 | 1 | -34.59 | -57.01 | 7.03 | 17.67 |
| generated-building | 1 | 68.70 | -35.87 | 6.03 | 16.69 |
| generated-building | 1 | -23.67 | -63.10 | 5.31 | 17.10 |
| landmark-2 | 1 | 66.56 | -67.00 | 5.58 | 10.20 |
| generated-building | 1 | -47.82 | -64.83 | 6.80 | 19.87 |
| generated-building | 1 | 59.93 | -56.21 | 6.02 | 34.80 |
| landmark-3 | 2 | -65.19 | -287.97 | 8.06 | 16.54 |
| generated-building | 2 | 96.58 | -171.11 | 7.48 | 85.40 |
| generated-building | 2 | -56.72 | -148.59 | 6.02 | 94.48 |
| generated-building | 2 | 49.15 | -268.37 | 7.30 | 80.03 |
| landmark-0 | 2 | -30.85 | -207.10 | 5.52 | 11.94 |
| generated-building | 2 | 81.92 | -137.21 | 7.24 | 59.67 |
| generated-building | 2 | -27.06 | -153.47 | 8.31 | 90.48 |
| generated-building | 2 | 46.24 | -349.78 | 6.97 | 52.55 |
| landmark-1 | 2 | -55.96 | -208.53 | 8.60 | 21.61 |
| generated-building | 2 | 90.94 | -186.17 | 7.48 | 82.83 |
| generated-building | 2 | -48.09 | -135.23 | 6.99 | 74.99 |
| generated-building | 2 | 78.37 | -172.04 | 6.75 | 90.92 |
| landmark-2 | 2 | -44.66 | -162.78 | 5.97 | 10.91 |
| generated-building | 2 | 44.25 | -325.00 | 6.98 | 89.86 |
| generated-building | 2 | -22.64 | -170.17 | 7.27 | 68.77 |
| generated-building | 2 | 64.82 | -344.20 | 6.20 | 59.63 |
| generated-building | 2 | -60.74 | -169.36 | 6.59 | 91.97 |
| generated-building | 2 | 27.90 | -343.81 | 7.76 | 58.72 |
| generated-building | 2 | -83.48 | -281.70 | 6.38 | 49.65 |
| generated-building | 2 | 61.79 | -258.13 | 7.50 | 94.52 |
| generated-building | 2 | -23.75 | -136.23 | 5.55 | 95.42 |
| generated-building | 2 | 56.28 | -361.94 | 8.12 | 97.61 |
| generated-building | 2 | -13.90 | -146.50 | 5.85 | 97.52 |
| generated-building | 2 | 69.08 | -277.01 | 6.70 | 63.79 |
| generated-building | 3 | -106.14 | -407.40 | 5.39 | 39.66 |
| generated-building | 3 | -102.46 | -420.35 | 7.24 | 27.72 |
| generated-building | 3 | -91.26 | -389.91 | 6.32 | 33.61 |
| generated-building | 3 | -82.40 | -529.33 | 7.45 | 39.84 |
| generated-building | 3 | -102.46 | -480.78 | 5.64 | 26.25 |
| generated-building | 3 | -105.92 | -392.23 | 6.37 | 22.67 |
| generated-building | 3 | -97.40 | -513.38 | 6.94 | 32.67 |
| generated-building | 3 | -88.97 | -478.01 | 7.06 | 49.62 |
| generated-building | 3 | -103.00 | -496.24 | 7.16 | 20.07 |
| generated-building | 3 | -95.28 | -534.92 | 5.68 | 43.86 |
| generated-building | 3 | -84.49 | -416.80 | 6.18 | 40.67 |
| generated-building | 3 | -83.98 | -514.45 | 5.14 | 41.85 |
| generated-building | 3 | -82.61 | -377.07 | 5.15 | 38.40 |
| generated-building | 3 | -96.47 | -435.41 | 5.94 | 50.35 |
| generated-building | 3 | 51.82 | -471.97 | 7.09 | 18.54 |
| generated-building | 3 | 57.85 | -414.34 | 5.50 | 26.55 |
| generated-building | 3 | 47.45 | -496.13 | 6.86 | 14.00 |
| generated-building | 3 | 56.26 | -487.26 | 5.23 | 20.70 |
| generated-building | 3 | 50.11 | -433.96 | 5.34 | 29.46 |
| generated-building | 3 | 39.54 | -413.06 | 6.33 | 14.80 |
| generated-building | 3 | 35.71 | -427.11 | 5.67 | 27.43 |
| generated-building | 4 | -69.76 | -566.50 | 10.16 | 18.84 |
| generated-building | 4 | 87.54 | -625.43 | 9.15 | 7.08 |
| generated-building | 4 | -80.90 | -599.36 | 7.38 | 16.89 |
| generated-building | 4 | 56.01 | -542.11 | 8.54 | 17.97 |
| generated-building | 4 | -54.53 | -588.61 | 8.61 | 20.46 |
| generated-building | 4 | 54.76 | -628.42 | 5.63 | 13.79 |
| generated-building | 4 | -49.69 | -563.54 | 9.46 | 8.58 |
| generated-building | 4 | 42.16 | -587.85 | 10.48 | 7.00 |
| generated-building | 4 | -33.98 | -669.33 | 8.02 | 10.03 |
| generated-building | 4 | 76.23 | -572.47 | 8.42 | 21.48 |
| generated-building | 4 | -51.47 | -616.29 | 7.66 | 16.46 |
| generated-building | 4 | 73.35 | -635.32 | 6.60 | 12.28 |
| generated-building | 4 | -21.67 | -685.39 | 10.16 | 21.80 |
| generated-building | 4 | 51.66 | -565.06 | 8.98 | 9.07 |
| generated-building | 4 | -87.72 | -584.12 | 8.75 | 19.44 |
| generated-building | 4 | 28.87 | -546.94 | 8.25 | 10.72 |
| generated-building | 4 | -39.99 | -600.74 | 6.11 | 18.86 |
| generated-building | 4 | 68.19 | -554.03 | 8.07 | 12.13 |
| generated-building | 4 | -75.43 | -622.96 | 9.57 | 9.48 |
| generated-building | 5 | -68.57 | -883.98 | 7.52 | 14.69 |
| generated-building | 5 | 56.79 | -859.68 | 5.72 | 55.28 |
| generated-building | 5 | -40.30 | -748.20 | 8.30 | 62.14 |
| generated-building | 5 | 96.05 | -875.02 | 7.08 | 60.77 |
| generated-building | 5 | -21.88 | -835.28 | 6.62 | 25.84 |
| generated-building | 5 | 52.24 | -947.28 | 6.66 | 20.16 |
| generated-building | 5 | -48.40 | -732.01 | 6.83 | 52.19 |
| generated-building | 5 | 62.63 | -845.32 | 7.47 | 15.11 |
| generated-building | 5 | -29.98 | -763.33 | 6.62 | 43.99 |
| generated-building | 5 | 42.68 | -920.60 | 6.72 | 46.48 |
| generated-building | 5 | -40.93 | -804.51 | 7.42 | 26.51 |
| generated-building | 5 | 80.63 | -828.33 | 7.66 | 17.22 |
| generated-building | 5 | -57.04 | -801.28 | 7.75 | 57.15 |
| generated-building | 5 | 75.89 | -854.35 | 7.24 | 38.14 |
| generated-building | 5 | -23.23 | -808.38 | 6.00 | 22.14 |
| generated-building | 5 | 76.80 | -725.44 | 7.38 | 60.78 |
| generated-building | 5 | -72.21 | -905.82 | 8.64 | 18.56 |
| generated-building | 5 | 106.54 | -742.32 | 7.37 | 19.62 |
| generated-building | 5 | -51.21 | -911.82 | 7.27 | 28.00 |
| generated-building | 5 | 60.93 | -918.30 | 7.95 | 19.11 |
| generated-building | 5 | -18.53 | -741.16 | 7.21 | 62.68 |
| generated-building | 5 | 102.37 | -725.16 | 7.07 | 38.26 |
| generated-building | 5 | -53.31 | -770.57 | 6.92 | 36.60 |
| generated-building | 5 | 77.84 | -922.89 | 5.63 | 27.30 |
| generated-building | 5 | -13.60 | -754.84 | 5.72 | 61.72 |
| generated-building | 5 | 40.18 | -938.72 | 7.69 | 50.82 |
| generated-building | 5 | -38.77 | -893.14 | 7.24 | 63.68 |
| generated-building | 5 | 95.55 | -859.38 | 6.72 | 58.13 |
| generated-building | 5 | -35.25 | -818.85 | 5.68 | 37.05 |
| generated-building | 5 | 92.25 | -842.94 | 6.72 | 29.41 |
| generated-building | 5 | -57.40 | -835.39 | 7.16 | 48.96 |
| generated-building | 5 | 67.71 | -932.07 | 6.87 | 57.36 |
| generated-building | 5 | -47.83 | -821.50 | 5.36 | 28.67 |
| generated-building | 5 | 70.23 | -954.49 | 7.86 | 25.87 |
| generated-building | 5 | -40.05 | -844.30 | 6.48 | 61.00 |
| generated-building | 5 | 79.19 | -870.70 | 6.56 | 20.19 |

## Reservation overlaps

Conservative circles: 0 overlaps. Counts by pair: {}. Board-to-board reservations may overlap because cards and their buildings are anchored before procedural buildings; inspect exact boxes before treating a circle overlap as a physical intersection.

## Road, backdrop and motion

- Avenue surface spans local lateral -8 to +8, sidewalks 8 to 12 on each side. Cross streets span 150 units from the avenue, with a 12-unit carriageway and 3-unit sidewalks.
- The ground grid is a 1,000-unit-wide plane, from world Z=160 to shoreZ. Harbour water is a 1,000 by 480 plane beyond shoreZ; quay, containers and the district 5 merged geometry contain the lighthouse, cranes and ship. Named objects and their measured bounds are in the inventory above.
- Two 14-unit-wide viaducts are centred 42 units from the rail, height 14, and extend about 1.2 stops beyond district 3. Each carries two tracks. Procedural and downloaded train parts are listed by name in each snapshot.
- First-frame camera clipping is near 0.5, far 420. Fog starts at 70 and ends at 300. The visible city can end before its geometry due to fog and clipping.
- Traffic uses two lanes at lateral ±4, a shared per-lane speed and evenly spaced cyclic positions. Dynamic boxes in each JSON are samples, not a continuous collision proof. S64 wheels intentionally overlap their body.
- Camera follows a two-spline rail. Automated navigation eases scrolling once; free scrolling uses damping. A small lateral swing and pan remain. Far menu jumps cut directly.

## Capture conditions and limits

Captured ten stops at 1280×800 with a client-only Vite development mount; snapshots sampled moving objects once per stop. Development capture reported 0 page error(s). Production hydration and browser gate must be checked separately.
No mesh-level or continuous collision audit is implied by intersecting axis-aligned bounding boxes; animated trains and vehicles move between samples. Human review of the motion and composition is pending.

## Sampled camera path

181 rail positions sampled at 0.05 stop intervals. 0 position/reservation-circle intersections, which are conservative candidates, not proven mesh collisions. Swing, pointer and shake offsets are not represented. Samples and reservations are in each JSON.
