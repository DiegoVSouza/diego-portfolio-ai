import * as THREE from "three";

/** Where the glow reaches: the dome is a band, wide enough to be seen from the roof stops and from the street. */
export const SKY = { radius: 395, bottom: -30, top: 150, rings: 12 } as const;

/**
 * The sky: an open cylinder around the camera whose colour goes from a red glow at the horizon to the background colour overhead, so the
 * far silhouettes stand against something instead of a black void. It ignores fog, does not write depth and follows the camera, so the
 * camera never gets closer to it. Colours are the palette's (`ink` overhead, `glow` at the horizon).
 */
export function createSky(ink: THREE.Color, glow: THREE.Color): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(SKY.radius, SKY.radius, SKY.top - SKY.bottom, 32, SKY.rings, true);
  geometry.translate(0, (SKY.top + SKY.bottom) / 2, 0);
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < position.count; i += 1) {
    // Full glow at the horizon (y = 0), none from 110 up; below the ground the glow stays (hidden by the ground itself).
    const t = THREE.MathUtils.clamp(position.getY(i) / 110, 0, 1);
    color.copy(glow).lerp(ink, Math.sqrt(t));
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  const sky = new THREE.Mesh(geometry, material);
  sky.name = "sky";
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  sky.onBeforeRender = (_renderer, _scene, camera) => sky.position.set(camera.position.x, 0, camera.position.z);
  return sky;
}
