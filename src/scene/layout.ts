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
  /** Height the camera looks at, when it is not the board's middle (the kerb shot tilts down so the street shows under the card). */
  aim?: number;
}
/** The shot of each of the ten stops, in order (the ninth and tenth are the last two). */
const KINDS: readonly ShotKind[] = ["post", "facade", "side", "roof", "curb", "post", "under", "side", "roof", "curb"];
export const shotKind = (k: number): ShotKind => KINDS[k % KINDS.length]!;
/** Where a side street crosses the avenue, in stops past the stop (see crossUs in world.ts). */
export const SIDE_JUNCTION = 0.62;
/** Centre-to-centre distance between metro cars, including clearance on curved tracks. */
export const TRAIN_CAR_SPACING = 17;

/** Evenly spaced vehicles share a lane speed, so they cannot catch one another. */
export function trafficAt(index: number, count: number, time: number, reduced: boolean): { u: number; lateral: number; direction: 1 | -1 } {
  const direction = index % 2 === 0 ? 1 : -1;
  const laneCount = direction === 1 ? Math.ceil(count / 2) : Math.floor(count / 2);
  const slot = Math.floor(index / 2);
  const phase = slot / Math.max(1, laneCount) + (reduced ? 0 : time * 0.012 * direction);
  return { u: ((phase % 1) + 1) % 1, lateral: direction * 4, direction };
}
function baseShot(k: number): Shot {
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
      return { kind: "curb", cam: { ahead: 0.3, lat: 6.5 * s, h: 1.7 }, board: { ahead: 0.3, lat: -32 * s, bottom: 6 }, scale: 1, aim: 9.7 };
    case "under":
      // A board under the viaduct deck (its underside is 12.6 high; the board tops out at 11.8) between the camera and the trains.
      return { kind: "under", cam: { ahead: 0.2, lat: 24 * s, h: 6 }, board: { ahead: 0.2, lat: 41 * s, bottom: 1 }, scale: 0.5 };
    default:
      return { kind: "post", cam: { ahead: 0, lat: 9 * s, h: 12 }, board: { ahead: 0.27, lat: 20 * s, bottom: 2.5 }, scale: 1 };
  }
}
/**
 * A change to one stop's numbers, written for a stop on the right of the avenue (side +1): `lat` values are multiplied by the stop's side.
 * `aim: null` removes the aim. This is what the atelier's camera tuner edits; see docs/atelier/PLAYBOOK.md.
 */
export interface ShotPatch {
  cam?: Partial<Shot["cam"]>;
  board?: Partial<Shot["board"]>;
  scale?: number;
  aim?: number | null;
}
let patches: Record<string, ShotPatch> = {};
export const setShotPatches = (next: Record<string, ShotPatch>): void => {
  patches = next;
};
/** Apply a patch to a shot, as the shot of a stop on `side`. Pure. */
export function patchShot(shot: Shot, patch: ShotPatch | undefined, side: 1 | -1): Shot {
  if (!patch) return shot;
  const lat = (own: number, change: number | undefined) => (change === undefined ? own : change * side);
  const out: Shot = {
    ...shot,
    cam: { ...shot.cam, ...patch.cam, lat: lat(shot.cam.lat, patch.cam?.lat) },
    board: { ...shot.board, ...patch.board, lat: lat(shot.board.lat, patch.board?.lat) },
    scale: patch.scale ?? shot.scale,
  };
  if (patch.aim === null) delete out.aim;
  else if (patch.aim !== undefined) out.aim = patch.aim;
  return out;
}
// Dev only: the atelier page saves patches in localStorage and the scene picks them up when it starts. Production builds drop this.
if (import.meta.env.DEV && typeof localStorage !== "undefined") {
  try {
    setShotPatches(JSON.parse(localStorage.getItem("atelier-shots") ?? "{}") as Record<string, ShotPatch>);
  } catch {
    // no storage or a bad value: the shipped shots stay
  }
}
/** The shot as shipped, before any dev patch (the atelier shows patches against it). */
export { baseShot as shippedShot };
export const shotOf = (k: number): Shot => patchShot(baseShot(k), patches[String(k)], sideOf(k));
export const boardMid = (k: number): number => {
  const shot = shotOf(k);
  return shot.board.bottom + (BOARD_HEIGHT * shot.scale) / 2;
};

/**
 * How long the flight over a leg of `length` world units lasts, in milliseconds. A fixed time made the short legs crawl and the long ones
 * race (peak speeds from 90 to 255 units per second); this holds the peak of the cubic ease-out (three times the mean) near 110 units per
 * second, within limits that keep a short hop from being abrupt and a long leg from dragging.
 */
export const FLIGHT_MIN_MS = 1800;
export const FLIGHT_MAX_MS = 3400;
export const flightMs = (length: number): number => Math.round(Math.min(FLIGHT_MAX_MS, Math.max(FLIGHT_MIN_MS, ((3 * length) / 110) * 1000)));
