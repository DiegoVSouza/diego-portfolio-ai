import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import type { Palette } from "./tokens";

const VERTEX = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

/** Grid at 45 degrees, three tones (ink, accent, paper), dot radius grows with luminance, paper outline on edges. */
const HALFTONE = `
  uniform sampler2D tDiffuse; uniform vec2 res; uniform float cell; uniform vec3 cInk; uniform vec3 cRed; uniform vec3 cPaper; varying vec2 vUv;
  float lum(vec3 c){ return sqrt(dot(c, vec3(.2126,.7152,.0722))); }
  void main(){
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float l = lum(c);
    vec2 px = 1.5/res;
    float e = abs(lum(texture2D(tDiffuse, vUv+vec2(px.x,0.)).rgb) - lum(texture2D(tDiffuse, vUv-vec2(px.x,0.)).rgb))
            + abs(lum(texture2D(tDiffuse, vUv+vec2(0.,px.y)).rgb) - lum(texture2D(tDiffuse, vUv-vec2(0.,px.y)).rgb));
    vec2 p = vUv*res; float a = .7853;
    mat2 r = mat2(cos(a), -sin(a), sin(a), cos(a));
    float d = length(fract(r*p/cell) - .5);
    vec3 col = mix(cInk, cRed, step(d, smoothstep(0.,.5,l)*.75));
    col = mix(col, cPaper, step(d, clamp((l-.5)*2.,0.,1.)*.75));
    col = mix(col, cPaper, step(.34, e));
    gl_FragColor = vec4(col, 1.);
  }`;

/**
 * Final pass: RGB split, grain and a vignette on the left, where the text sits, and a dim so the content in front stays
 * the focus. The split is driven only by `uVel`, which the scene raises when a selection settles, never by scroll speed.
 */
const FINISH = `
  uniform sampler2D tDiffuse; uniform float uVel, uTime, uDim; uniform vec3 cInk; varying vec2 vUv;
  void main(){
    float o = uVel * .0035;
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float gh = max(texture2D(tDiffuse, vUv - vec2(o, 0.)).r, texture2D(tDiffuse, vUv + vec2(o, 0.)).r);
    c = max(c, vec3(gh * .9, gh * .07, gh * .12) * step(.001, abs(o) * 1000.));
    c = mix(c, cInk, smoothstep(.6, 0., vUv.x) * .45);
    float n = fract(sin(dot(gl_FragCoord.xy + uTime * 60., vec2(12.9898, 78.233))) * 43758.5453);
    c += (n - .5) * .05 * step(.0001, uTime);
    c = mix(c, cInk, uDim);
    gl_FragColor = vec4(c, 1.);
  }`;

export interface Post {
  composer: EffectComposer;
  halftone: ShaderPass;
  finish: ShaderPass;
}

export function createPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, p: Palette, dim: number): Post {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const halftone = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      res: { value: new THREE.Vector2(1, 1) },
      cell: { value: 5 },
      cInk: { value: p.srgb("ink") },
      cRed: { value: p.srgb("red") },
      cPaper: { value: p.srgb("paper") },
    },
    vertexShader: VERTEX,
    fragmentShader: HALFTONE,
  });
  const finish = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uVel: { value: 0 }, uTime: { value: 0 }, uDim: { value: dim }, cInk: { value: p.srgb("ink") } },
    vertexShader: VERTEX,
    fragmentShader: FINISH,
  });
  composer.addPass(halftone);
  composer.addPass(finish);
  return { composer, halftone, finish };
}
