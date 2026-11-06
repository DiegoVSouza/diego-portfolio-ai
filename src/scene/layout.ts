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

/** How a stop's board is mounted. The cards hang in different places, not all on posts beside the street. */
export type Mount = "facade" | "wall" | "roof" | "post";
const MOUNTS: readonly Mount[] = ["facade", "wall", "roof", "post"];
export const mountOf = (k: number): Mount => MOUNTS[k % MOUNTS.length]!;

/** A board's size in world units: 30 wide, as tall as the 640 by 460 card. */
export const BOARD_WIDTH = 30;
export const BOARD_HEIGHT = (BOARD_WIDTH * 460) / 640;

/**
 * Where the board's lower edge is above the street, and how far its middle is from the avenue's middle (unsigned; the sign is the side).
 * facade: on the end wall of a building, at street level. wall: on the same wall, higher up on a tall building.
 * roof: on top of a low building. post: on two posts beside the street.
 */
export const MOUNT_SPEC: Record<Mount, { bottom: number; lateral: number }> = {
  facade: { bottom: 3, lateral: 29 },
  wall: { bottom: 8, lateral: 29 },
  roof: { bottom: 15, lateral: 29 },
  post: { bottom: 2.5, lateral: 20 },
};
export const boardMid = (k: number): number => MOUNT_SPEC[mountOf(k)].bottom + BOARD_HEIGHT / 2;
