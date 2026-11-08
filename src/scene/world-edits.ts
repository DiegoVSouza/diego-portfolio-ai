/**
 * Hand edits of the city (phase 017): one JSON file, `world-edits.json`, written by the atelier's World tab and read by the world builder.
 * Pure data and maths, no WebGL, so the rules can be tested. See docs/atelier/GUIA-MUNDO.pt-BR.md.
 *
 * Towers and lamps are generated; an edit never changes what the generator draws or reserves, it only moves, turns, stretches or hides
 * the result after the fact. That keeps the random stream (and every other tower) exactly where it was.
 */
import * as THREE from "three";
import type { ShotPatch } from "./layout";
import raw from "./world-edits.json";

/** A change to one generated item. `at` is where the generator put it (x, z): an edit whose item is no longer there is skipped. */
export interface ItemEdit {
  at: [number, number];
  hide?: boolean;
  /** Shift on the ground, in world units. */
  dx?: number;
  dz?: number;
  /** Extra turn about the item's own centre, in radians. */
  dry?: number;
  /** Height multiplier (towers only). */
  hs?: number;
}

/** A loose model placed by hand: `model` is a file name under assets/game/models, `y` its base height. */
export interface PropEdit {
  id: string;
  model: string;
  x: number;
  y: number;
  z: number;
  ry: number;
  scale: number;
}

export interface WorldEdits {
  version: 1;
  props: PropEdit[];
  towers: Record<string, ItemEdit>;
  lamps: Record<string, ItemEdit>;
  /** Board and camera numbers per stop (the same patch the atelier camera tab writes, see layout.ts), keyed by stop index. */
  shots: Record<string, ShotPatch>;
}

export const EMPTY_EDITS: WorldEdits = { version: 1, props: [], towers: {}, lamps: {}, shots: {} };

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function cleanItem(value: unknown): ItemEdit | null {
  const v = value as Partial<ItemEdit> | null;
  if (!v || !Array.isArray(v.at) || v.at.length !== 2 || !v.at.every(finite)) return null;
  const out: ItemEdit = { at: [v.at[0]!, v.at[1]!] };
  if (v.hide === true) out.hide = true;
  for (const key of ["dx", "dz", "dry", "hs"] as const) if (finite(v[key])) out[key] = v[key];
  if (out.hs !== undefined && out.hs <= 0) delete out.hs;
  return out;
}

/** Accepts anything; returns the valid part. Never throws: a bad file must not take the city down. */
export function parseEdits(value: unknown): WorldEdits {
  const v = value as Partial<WorldEdits> | null;
  if (!v || v.version !== 1) return { ...EMPTY_EDITS, props: [], towers: {}, lamps: {}, shots: {} };
  const items = (map: unknown): Record<string, ItemEdit> => {
    const out: Record<string, ItemEdit> = {};
    if (map && typeof map === "object") for (const [id, edit] of Object.entries(map)) {
      const clean = cleanItem(edit);
      if (clean) out[id] = clean;
    }
    return out;
  };
  const props = (Array.isArray(v.props) ? v.props : []).filter(
    (p): p is PropEdit => !!p && typeof p.id === "string" && /^[\w.-]+\.glb$/.test(String(p.model)) && [p.x, p.y, p.z, p.ry, p.scale].every(finite) && p.scale > 0,
  );
  const shots: Record<string, ShotPatch> = {};
  if (v.shots && typeof v.shots === "object") {
    for (const [k, patch] of Object.entries(v.shots)) {
      if (!/^\d+$/.test(k) || !patch || typeof patch !== "object") continue;
      const clean: ShotPatch = {};
      for (const group of ["cam", "board"] as const) {
        const source = (patch as Record<string, unknown>)[group];
        if (!source || typeof source !== "object") continue;
        const out: Record<string, number> = {};
        for (const [key, value] of Object.entries(source)) if (finite(value)) out[key] = value;
        if (Object.keys(out).length) clean[group] = out;
      }
      if (finite(patch.scale) && patch.scale > 0) clean.scale = patch.scale;
      if (finite(patch.aim) || patch.aim === null) clean.aim = patch.aim;
      if (Object.keys(clean).length) shots[k] = clean;
    }
  }
  return { version: 1, props, towers: items(v.towers), lamps: items(v.lamps), shots };
}

/** Does the item the generator placed at (x, z) match the one the edit was made for? */
export const editMatches = (edit: ItemEdit, x: number, z: number): boolean => Math.hypot(edit.at[0] - x, edit.at[1] - z) < 1;

/** The matrix that carries a generated item from where it was to where the edit puts it: turn and stretch about (ox, oz), then shift. */
export function editMatrix(edit: ItemEdit, ox: number, oz: number): THREE.Matrix4 {
  const m = new THREE.Matrix4().makeTranslation(ox + (edit.dx ?? 0), 0, oz + (edit.dz ?? 0));
  m.multiply(new THREE.Matrix4().makeRotationY(edit.dry ?? 0));
  m.multiply(new THREE.Matrix4().makeScale(1, edit.hs ?? 1, 1));
  return m.multiply(new THREE.Matrix4().makeTranslation(-ox, 0, -oz));
}

/** A point carried the same way (signs and beacons that belong to a tower). */
export function editPoint(edit: ItemEdit, ox: number, oz: number, x: number, y: number, z: number): [number, number, number] {
  const v = new THREE.Vector3(x, y, z).applyMatrix4(editMatrix(edit, ox, oz));
  return [v.x, v.y, v.z];
}

/** The edits the build uses: the file, validated. */
export const worldEdits: WorldEdits = parseEdits(raw);
