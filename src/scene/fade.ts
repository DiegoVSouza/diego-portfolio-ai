import * as THREE from "three";

/**
 * A vertex-coloured material that ignores the scene's fog and fades to `ink` by view distance instead, from `start` to `end`.
 * The far silhouette ring stands near the camera's far plane, past where the fog has turned everything to the background.
 */
export function fadeMaterial(ink: THREE.Color, start: number, end: number): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uInk = { value: ink };
    shader.uniforms.uFade = { value: new THREE.Vector2(start, end) };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", ["#include <common>", "varying float vDepth;"].join("\n"))
      .replace("#include <project_vertex>", ["#include <project_vertex>", "vDepth = -mvPosition.z;"].join("\n"));
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", ["#include <common>", "uniform vec3 uInk;", "uniform vec2 uFade;", "varying float vDepth;"].join("\n"))
      .replace("#include <fog_fragment>", ["#include <fog_fragment>", "gl_FragColor.rgb = mix(gl_FragColor.rgb, uInk, smoothstep(uFade.x, uFade.y, vDepth));"].join("\n"));
  };
  return material;
}
