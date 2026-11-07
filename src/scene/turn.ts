import * as THREE from "three";

/**
 * Highest rate, in radians per second, at which the camera may turn while it flies. The rail's look-at curve can sweep across the avenue
 * in a tenth of a second when a stop alternates sides (measured above 11 rad/s leaving the rooftop stops); the camera follows it no
 * faster than this, then settles on it. A cut or a static scene does not use the limit.
 */
export const MAX_TURN_RATE = 5;

/**
 * Turn `current` toward `target` by at most `maxAngle` radians. Returns the angle still left after the move. It always arrives and
 * never overshoots, so a camera that stops being asked to turn ends exactly on its target.
 */
export function turnToward(current: THREE.Quaternion, target: THREE.Quaternion, maxAngle: number): number {
  const angle = current.angleTo(target);
  if (angle <= maxAngle) {
    current.copy(target);
    return 0;
  }
  current.rotateTowards(target, maxAngle);
  return angle - maxAngle;
}
