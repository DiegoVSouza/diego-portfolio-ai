# City fixes (owner complaints, 2026-11-06)

Source: the owner's review of the deployed 3D home, in their own words (pt-BR, paraphrased in English below). Each item has an acceptance check.

| # | Complaint | Root cause found in code | Acceptance |
| --- | --- | --- | --- |
| C1 | The side menu is not connected to what the screen shows. | `DistrictMenu` follows an IntersectionObserver on the page sections, not the camera, which lags the scroll (dwell + easing). | In 3D the highlighted entry is the stop the camera is at (`round(cCur)`), published by the scene as a `scene-shown` event. |
| C2 | Skipping through the menu flies the camera through every section in between, which glitches the scene. | `goTo` animates the scroll over the whole distance; the camera follows it stop by stop. | A jump of more than one stop is a cut: instant scroll, `scene-cut` event, camera snaps to the target with the existing glitch. One-stop moves (keys, wheel, prev/next) still fly. |
| C3 | Board posts are behind the section but in front of the sign. | Top and bottom beams stick 0.1 units in front of the panel plane (beam z = -0.2, depth 0.6). | Posts and beams lie entirely behind the panel (max z < 0) and the panel is nudged forward with a polygon offset. Unit test on the layout numbers. |
| C4 | Trains vanish out of nowhere. | At the turnaround (q = 0.5) the whole train mirrors about its lead car: the lead car jumps one train length. | The train body occupies the same interval at the end of the forward leg and at the start of the backward leg. Unit test on `trainLead`. |
| C5 | Put signs on neighbouring buildings and in other places, not only the road signs. | Signs exist only as a few vertical neon strips and craft-district roof frames. | Horizontal wall signs on avenue-facing walls and roof signs in every built district; textures are cached so the draw-call and texture budget stays bounded. |
| C6 | More auxiliary streets. | One avenue, no cross streets. | Cross streets every stop gap on both sides (asphalt, sidewalks, lane marks); towers keep clear of them. |
| C7 | The square at the end is lifeless; maybe just continue the street. | The harbour sits 0.55 stops past the last stop. | The avenue continues three more stops past the last stop with towers, cross streets and traffic; the harbour moves to the far end of the road. |

Out of scope: copy changes, new assets, deploy (needs owner go).

## Addendum (owner follow-up)

| # | Complaint | Change | Acceptance |
| --- | --- | --- | --- |
| C3b | The lamp posts (not the board posts) stand behind the card but in front of the sign. | Lamps are left out between the camera and a board. | No lamp in the line to a board (e2e screenshots). |
| C8 | Every section is still a billboard on the street. | Boards use four mounts: facade (street level) and wall (high) on the end wall of a building, on a roof, on posts (`mountOf`). Camera look-at follows each board's height. | `mountOf` yields four kinds, at most 2 of 10 on posts; stop screenshots `stop-1..9.png` show wall and roof mounts. |

## Addendum 2 (owner follow-up)

| # | Complaint | Change | Acceptance |
| --- | --- | --- | --- |
| C9 | Every stop is the same shot; want side streets, climbing to rooftop billboards, a parked car's window. | Each stop is a `shotOf(k)`: post, facade, side street, roof (camera at height 30) or car (camera at 1.7 inside a drawn cabin). The rail's camera and look points come from the shots. | Unit tests on `shotOf`/rail; e2e `stop-*.png`, `flight-*.png`. |
| C10 | The buildings that hold boards are too thin. | `blocks`: a whole building (board width + 12, depth 34 to 36, setback and beacon). | Screenshots. |
| C11 | Some city blocks glitch. | Probable cause: overlapping boxes (z-fighting where faces meet). Towers and landmarks now avoid every existing footprint and the board buildings. | No overlap by construction (`collides`); not every block was inspected by eye. |

## Addendum 3 (owner review of the ten stops)

| Stop | Complaint | Change |
| --- | --- | --- |
| 5, 10 | The car-window frame is ugly. | Cabin removed; the shot is a low kerb view (`curb`). |
| all outdoors | Make them real billboards, on top of the building, with lights. | `dress()`: floodlights with light cones, bulbs on the beams, catwalk and rail, braces. No CC0 billboard model exists in the owned packs and polyhaven has none; procedural. |
| 2 | A building inside the building behind the card. | The setback box is gone; only a beacon on the roof corner. |
| 3, 8 | The building closes the street; the camera cuts across blocks. | The board is on the building beside the side street (street stays open); the camera follows the avenue to the junction and turns in (two extra rail knots). |
| 7 | The train crosses the building. | No building: a small billboard under the viaduct deck, pillars left out where it stands. |
| 4, 9 | A proper billboard on a tower. | Roof billboards get `dress()`. |
| 10 | Scroll up does not work at the last stop. | A card that scrolls keeps the wheel only while it can still scroll that way (`DistrictMenu.tsx`). Red test first. |
