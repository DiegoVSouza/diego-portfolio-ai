import * as THREE from "three";

/**
 * Every colour in the scene comes from the design tokens, read once at start. There is no colour literal in the scene
 * code: greys are mixes of ink and paper, so a preset that changes the tokens changes the city.
 */
export interface Palette {
  ink: THREE.Color;
  card: THREE.Color;
  ink2: THREE.Color;
  paper: THREE.Color;
  mut: THREE.Color;
  red: THREE.Color;
  dred: THREE.Color;
  /** Linear mix of two palette colours. Returns a new colour. */
  mix(a: THREE.Color, b: THREE.Color, t: number): THREE.Color;
  /** The token as plain sRGB 0..1, for shaders that write final screen values (the half-tone, the burst tones). */
  srgb(name: "ink" | "paper" | "red"): THREE.Vector3;
  /** A CSS colour string with alpha, for 2D canvas textures. */
  css(color: THREE.Color, alpha?: number): string;
}

const NAMES = { ink: "--ink", card: "--card", ink2: "--ink-2", paper: "--paper", mut: "--mut", red: "--red", dred: "--dred" } as const;

function raw(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!/^#[0-9a-f]{3,6}$/i.test(value)) throw new Error(`token ${name} is not a plain hex colour`);
  return value;
}

export function readPalette(): Palette {
  const color = (key: keyof typeof NAMES) => new THREE.Color(raw(NAMES[key]));
  const p = { ink: color("ink"), card: color("card"), ink2: color("ink2"), paper: color("paper"), mut: color("mut"), red: color("red"), dred: color("dred") };
  const sRGB = (key: "ink" | "paper" | "red") => {
    const hex = raw(NAMES[key]).slice(1);
    const n = parseInt(hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex, 16);
    return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  };
  return {
    ...p,
    mix: (a, b, t) => a.clone().lerp(b, t),
    srgb: sRGB,
    css: (c, alpha = 1) => {
      // Eight-digit hex, built from the token, so there is no colour literal in this file.
      const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255).toString(16).padStart(2, "0");
      return `#${c.getHexString(THREE.SRGBColorSpace)}${alpha >= 1 ? "" : a}`;
    },
  };
}
