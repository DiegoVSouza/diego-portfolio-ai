/**
 * Pure layout rules of the city that need a test without WebGL.
 */

/**
 * Where a shuttle train's leading car stands on the viaduct, as a fraction of its length, for the cycle position q in [0, 1).
 * `room` is the train's own length as a fraction of the viaduct. The first half is the forward leg (the body trails behind the lead, so
 * the lead runs from `room` to 1); the second half is the way back (the body trails ahead of the lead, so the lead runs from 1 - room to 0).
 * At the turnaround both legs put the body on the same interval, [1 - room, 1], so the train never jumps.
 */
export function trainLead(q: number, room: number): { lead: number; forward: boolean } {
  const forward = q < 0.5;
  const leg = forward ? q * 2 : (q - 0.5) * 2;
  const eased = leg * leg * (3 - 2 * leg);
  return { forward, lead: forward ? room + (1 - room) * eased : (1 - room) * (1 - eased) };
}

/** Depth of a board's panel and the frame parts behind it, in the board's own space (+z faces the camera). */
export const BOARD_PANEL_Z = 0;
export const BOARD_POST_Z = -0.7;
export const BOARD_POST_DEPTH = 0.7;
export const BOARD_BEAM_Z = -0.6;
export const BOARD_BEAM_DEPTH = 0.6;

/** The frame's nearest face to the camera (the largest z of any frame part). It must stay behind the panel. */
export const frameFront = (): number => Math.max(BOARD_POST_Z + BOARD_POST_DEPTH / 2, BOARD_BEAM_Z + BOARD_BEAM_DEPTH / 2);

/** Stops of plain avenue added after the last stop, so the street goes on instead of ending at a square. */
export const ROAD_EXTRA = 3;

/** Which side of the avenue stop k's shot belongs to: +1 right, -1 left. They alternate. */
export const sideOf = (k: number): 1 | -1 => (k % 2 === 0 ? 1 : -1);

/** A board's size in world units before a shot scales it: 30 wide, as tall as the 640 by 460 card. */
export const BOARD_WIDTH = 30;
export const BOARD_HEIGHT = (BOARD_WIDTH * 460) / 640;

/**
 * Each stop is a shot, not only a place on the street: how the camera sits and where the board hangs.
 * post: the street, a billboard on two posts. facade: the street, a board on the end wall of a building.
 * side: the camera has turned into a side street (following it from the avenue) and looks at a board on the building beside it.
 * roof: the camera has climbed above the avenue and looks across to a billboard on top of a tower.
 * curb: the camera sits low at the kerb and looks across the street at a facade.
 * under: a small billboard under the metro viaduct, with the trains passing over it.
 * `ahead` is in stops along the avenue from the stop; `lat` is from the avenue's middle, signed by the stop's side;
 * `h` is the camera's height; `bottom` is the board's lower edge above the street.
 */
export type ShotKind = "post" | "facade" | "side" | "roof" | "curb" | "under";
export interface Shot {
  kind: ShotKind;
  cam: { ahead: number; lat: number; h: number };
  board: { ahead: number; lat: number; bottom: number };
  /** Board size, as a multiple of BOARD_WIDTH: far shots get a bigger board so the card still fills the screen. */
  scale: number;
}
/** The shot of each of the ten stops, in order (the ninth and tenth are the last two). */
const KINDS: readonly ShotKind[] = ["post", "facade", "side", "roof", "curb", "post", "under", "side", "roof", "curb"];
export const shotKind = (k: number): ShotKind => KINDS[k % KINDS.length]!;
/** Where a side street crosses the avenue, in stops past the stop (see crossUs in world.ts). */
export const SIDE_JUNCTION = 0.62;
export function shotOf(k: number): Shot {
  const s = sideOf(k);
  switch (shotKind(k)) {
    case "facade":
      return { kind: "facade", cam: { ahead: 0, lat: 9 * s, h: 12 }, board: { ahead: 0.27, lat: 34 * s, bottom: 3 }, scale: 1 };
    case "side":
      // The camera stands in the side street; the board is on the building beside it, further out, so the street stays open.
      return { kind: "side", cam: { ahead: SIDE_JUNCTION, lat: 40 * s, h: 5 }, board: { ahead: SIDE_JUNCTION + 0.33, lat: 78 * s, bottom: 3 }, scale: 1.25 };
    case "roof":
      return { kind: "roof", cam: { ahead: 0.05, lat: 2 * s, h: 30 }, board: { ahead: 0.3, lat: 36 * s, bottom: 26 }, scale: 1.1 };
    case "curb":
      return { kind: "curb", cam: { ahead: 0.3, lat: 6.5 * s, h: 1.7 }, board: { ahead: 0.3, lat: -36 * s, bottom: 3 }, scale: 1.3 };
    case "under":
      // A board under the viaduct deck (its underside is 12.6 high; the board tops out at 11.8) between the camera and the trains.
      return { kind: "under", cam: { ahead: 0.2, lat: 24 * s, h: 6 }, board: { ahead: 0.2, lat: 41 * s, bottom: 1 }, scale: 0.5 };
    default:
      return { kind: "post", cam: { ahead: 0, lat: 9 * s, h: 12 }, board: { ahead: 0.27, lat: 20 * s, bottom: 2.5 }, scale: 1 };
  }
}
export const boardMid = (k: number): number => {
  const shot = shotOf(k);
  return shot.board.bottom + (BOARD_HEIGHT * shot.scale) / 2;
};
