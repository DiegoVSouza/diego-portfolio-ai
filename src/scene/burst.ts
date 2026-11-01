import * as THREE from "three";
import type { Palette } from "./tokens";

export interface BurstUniforms {
  uExp: { value: number };
  uAct: { value: number };
}

/** Per-triangle centre and a random number, so each triangle can fly out on its own. */
export function burstGeo(base: THREE.BufferGeometry, rnd: () => number): THREE.BufferGeometry {
  const g = base.index ? base.toNonIndexed() : base.clone();
  const pos = g.attributes.position!;
  const faces = pos.count / 3;
  const centre = new Float32Array(pos.count * 3);
  const random = new Float32Array(pos.count);
  for (let f = 0; f < faces; f += 1) {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let v = 0; v < 3; v += 1) {
      cx += pos.getX(f * 3 + v);
      cy += pos.getY(f * 3 + v);
      cz += pos.getZ(f * 3 + v);
    }
    cx /= 3;
    cy /= 3;
    cz /= 3;
    const r = rnd();
    for (let v = 0; v < 3; v += 1) {
      const k = f * 3 + v;
      centre[k * 3] = cx;
      centre[k * 3 + 1] = cy;
      centre[k * 3 + 2] = cz;
      random[k] = r;
    }
  }
  g.setAttribute("aCenter", new THREE.BufferAttribute(centre, 3));
  g.setAttribute("aRand", new THREE.BufferAttribute(random, 1));
  return g;
}

/**
 * Toon-shaded solid that breaks into its triangles when `uExp` rises and goes from grey to colour with `uAct`.
 * The three tones come from the tokens as uniforms.
 */
export function burstMaterial(p: Palette): THREE.MeshStandardMaterial & { userData: { u: BurstUniforms } } {
  const material = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.2, flatShading: true, side: THREE.DoubleSide });
  const u: BurstUniforms = { uExp: { value: 0 }, uAct: { value: 0 } };
  const red = p.srgb("red");
  const ink = p.srgb("ink");
  const paper = p.srgb("paper");
  const dim = p.mix(p.ink, p.paper, 0.17);
  material.userData.u = u;
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uExp = u.uExp;
    sh.uniforms.uAct = u.uAct;
    sh.uniforms.uRed = { value: red };
    sh.uniforms.uInk = { value: ink };
    sh.uniforms.uPaper = { value: paper };
    sh.uniforms.uDim = { value: new THREE.Vector3(dim.r, dim.g, dim.b) };
    sh.vertexShader = sh.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec3 aCenter;attribute float aRand;uniform float uExp;
        mat3 rotAxis(vec3 a,float ang){a=normalize(a);float s=sin(ang),c=cos(ang),oc=1.-c;
          return mat3(oc*a.x*a.x+c,oc*a.x*a.y+a.z*s,oc*a.z*a.x-a.y*s,
                      oc*a.x*a.y-a.z*s,oc*a.y*a.y+c,oc*a.y*a.z+a.x*s,
                      oc*a.z*a.x+a.y*s,oc*a.y*a.z-a.x*s,oc*a.z*a.z+c);}`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vTone=aRand;
        float ee=uExp*uExp*1.2;
        vec3 dir=normalize(aCenter+vec3(.001));
        vec3 rel=position-aCenter;
        rel=rotAxis(vec3(aRand-.5,.6,1.-aRand),ee*(1.+aRand*2.)*2.5)*rel;
        transformed=aCenter+dir*ee*(1.2+aRand*2.8)+rel*(1.-.2*ee);`,
      )
      .replace("void main()", "varying float vTone;\nvoid main()");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\n        uniform float uAct;uniform float uExp;uniform vec3 uRed,uInk,uPaper,uDim;varying float vTone;`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec3 tone=vTone<.55?uRed:(vTone<.8?uInk:uPaper);
        vec3 fn=normalize(cross(dFdx(vViewPosition),dFdy(vViewPosition)));
        float nl=dot(fn,normalize(vec3(-.45,.65,.6)));
        vec3 toon=nl>.5?uPaper:(nl>-.05?uRed:uInk);
        tone=mix(toon,tone,smoothstep(.05,.45,uExp));
        diffuseColor.rgb=mix(uDim,tone,uAct);`,
      );
  };
  return material as THREE.MeshStandardMaterial & { userData: { u: BurstUniforms } };
}
