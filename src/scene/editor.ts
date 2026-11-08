/**
 * The world editor (phase 017). Development only: `scene.ts` loads it when the page is opened as `/?edit=1`, and Vite drops it from the
 * production build with the rest of `import.meta.env.DEV`. The atelier's World tab drives it through `window.__worldEditor`, which speaks
 * plain data (no three.js objects cross the iframe).
 *
 * What it does: takes the camera (orbit), draws a proxy box on every generated tower and lamp, lets you click one or a loose prop, move and
 * turn it with a gizmo or by number, hide it, add GLB props, and save everything to src/scene/world-edits.json through the dev endpoint.
 * Generated geometry is merged and baked, so a saved edit shows on the real towers after the page reloads (the save reloads it).
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { type Shot, type ShotPatch, patchShot, shippedShot, sideOf } from "./layout";
import { propNames } from "./props";
import type { World } from "./world";
import { type ItemEdit, type PropEdit, type WorldEdits, worldEdits } from "./world-edits";

export type Kind = "tower" | "lamp" | "prop" | "board";
export interface Row {
  id: string;
  x: number;
  z: number;
  h: number;
  edited: boolean;
  hidden: boolean;
}
export interface Selection {
  kind: Kind;
  id: string;
  /** Item edits for towers and lamps. */
  item?: ItemEdit;
  base?: { x: number; z: number; h: number; ry: number };
  /** The prop, for props. */
  prop?: PropEdit;
  /** Board numbers, for boards (lateral values as for a stop on the right of the avenue). */
  shot?: { ahead: number; lat: number; bottom: number; scale: number; edited: boolean };
}
export interface WorldEditor {
  list(): { towers: Row[]; lamps: Row[]; props: PropEdit[]; boards: { id: string; k: number; label: string; edited: boolean }[] };
  selected(): Selection | null;
  select(kind: Kind, id: string | null): void;
  focus(): void;
  mode(mode: "translate" | "rotate"): void;
  proxies(visible: boolean): void;
  patch(values: Record<string, number>): void;
  toggleHide(): void;
  reset(): void;
  addProp(model: string): Promise<void>;
  removeProp(): void;
  models(): string[];
  json(): string;
  save(): Promise<string>;
}

interface Context {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  world: World;
}

const heightOf = (b: object): number => ("h" in b ? (b as { h: number }).h : 7);
const round = (v: number, digits = 3): number => Math.round(v * 10 ** digits) / 10 ** digits;
const TONE = { plain: 0x35e0ff, edited: 0xffd23c, hidden: 0xff3b3b, selected: 0xffffff } as const;

export function startEditor({ scene, camera, canvas, world }: Context): WorldEditor {
  /* ---- take the page: only the canvas stays ---- */
  const root = document.getElementById("root");
  if (root) root.style.display = "none";
  document.body.append(canvas);
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", display: "block", opacity: "1", zIndex: "1", pointerEvents: "auto", touchAction: "none" });
  document.documentElement.dataset.worldEditor = "1";
  camera.far = 1600;
  if (scene.fog) (scene.fog as THREE.Fog).far = 1400;
  camera.updateProjectionMatrix();

  const edits: WorldEdits = structuredClone(worldEdits);
  const { towers, lamps, boards } = world.editables();
  const baseOf = (kind: Kind, id: string) => (kind === "tower" ? towers.find((t) => t.id === id) : lamps.find((l) => l.id === id));
  const map = (kind: Kind): Record<string, ItemEdit> => (kind === "tower" ? edits.towers : edits.lamps);
  const notify = (): void => void window.dispatchEvent(new CustomEvent("editor-change"));

  /* ---- camera: orbit around a target, written to the scene's free-camera hook every frame ---- */
  const ecam = new THREE.PerspectiveCamera(58, 1, 0.5, 1600);
  const ahead = camera.getWorldDirection(new THREE.Vector3());
  ecam.position.copy(camera.position).add(new THREE.Vector3(0, 40, 0));
  const orbit = new OrbitControls(ecam, canvas);
  orbit.target.copy(camera.position).addScaledVector(ahead, 90);
  orbit.target.y = 0;
  orbit.maxPolarAngle = Math.PI * 0.499;
  orbit.update();

  /* ---- proxies: one box per tower and lamp ---- */
  const unit = new THREE.BoxGeometry(1, 1, 1);
  // Outline only (the 12 edges of the box, no diagonals); the box itself is invisible and only catches clicks.
  const edgeGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
  const materials = Object.fromEntries(Object.entries(TONE).map(([name, color]) => [name, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 })])) as Record<keyof typeof TONE, THREE.LineBasicMaterial>;
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const group = new THREE.Group();
  group.name = "editor-proxies";
  scene.add(group);
  const proxyOf = new Map<string, THREE.Mesh>();
  const keyOf = (kind: Kind, id: string) => `${kind}:${id}`;
  let selection: { kind: Kind; id: string } | null = null;

  /** A board's box follows its four corners in the world as the scene was built (a change shows after save and reload). */
  const corners = [0, 1, 2, 3].map(() => new THREE.Vector3());
  const syncBoardProxy = (id: string): void => {
    const mesh = proxyOf.get(keyOf("board", id));
    const k = Number(id.slice(1));
    if (!mesh) return;
    world.boardCorners(k, corners);
    const centre = corners.reduce((sum, c) => sum.add(c), new THREE.Vector3()).multiplyScalar(0.25);
    const across = corners[1]!.clone().sub(corners[0]!);
    mesh.scale.set(across.length(), corners[0]!.distanceTo(corners[3]!), 3);
    mesh.position.copy(centre);
    mesh.rotation.set(0, Math.atan2(-across.z, across.x), 0);
    const selected = selection?.kind === "board" && selection.id === id;
    (mesh.children[0] as THREE.LineSegments).material = selected ? materials.selected : edits.shots[String(k)] ? materials.edited : materials.plain;
  };
  const syncProxy = (kind: Kind, id: string): void => {
    if (kind === "board") return syncBoardProxy(id);
    const mesh = proxyOf.get(keyOf(kind, id));
    const base = baseOf(kind, id);
    if (!mesh || !base) return;
    const edit = map(kind)[id];
    const hs = edit?.hs ?? 1;
    const height = kind === "tower" ? (base as (typeof towers)[number]).h * hs : 7;
    const w = kind === "tower" ? (base as (typeof towers)[number]).w : 1.6;
    const d = kind === "tower" ? (base as (typeof towers)[number]).d : 1.6;
    mesh.scale.set(w, height, d);
    mesh.position.set(base.x + (edit?.dx ?? 0), height / 2, base.z + (edit?.dz ?? 0));
    mesh.rotation.y = base.ry + (edit?.dry ?? 0);
    const selected = selection?.kind === kind && selection.id === id;
    (mesh.children[0] as THREE.LineSegments).material = selected ? materials.selected : edit?.hide ? materials.hidden : edit ? materials.edited : materials.plain;
  };
  for (const t of towers) addProxy("tower", t.id);
  for (const l of lamps) addProxy("lamp", l.id);
  for (const b of boards) addProxy("board", `b${b.k}`);
  function addProxy(kind: Kind, id: string): void {
    const mesh = new THREE.Mesh(unit, hitMaterial);
    mesh.add(new THREE.LineSegments(edgeGeometry, materials.plain));
    mesh.userData = { kind, id };
    group.add(mesh);
    proxyOf.set(keyOf(kind, id), mesh);
    syncProxy(kind, id);
  }

  /* ---- props already in the file ---- */
  const propMesh = (id: string) => world.props.get(id) as THREE.Mesh | undefined;
  const propSpec = (id: string) => edits.props.find((p) => p.id === id);
  const propHelper = new Map<string, THREE.Box3Helper>();
  const syncPropHelper = (id: string): void => {
    const mesh = propMesh(id);
    if (!mesh) return;
    let helper = propHelper.get(id);
    if (!helper) {
      helper = new THREE.Box3Helper(new THREE.Box3(), TONE.edited);
      propHelper.set(id, helper);
      scene.add(helper);
    }
    helper.box.setFromObject(mesh);
    (helper.material as THREE.LineBasicMaterial).color.setHex(selection?.kind === "prop" && selection.id === id ? TONE.selected : TONE.edited);
  };
  const retryProps = window.setInterval(() => {
    edits.props.forEach((p) => syncPropHelper(p.id));
    if (edits.props.every((p) => propMesh(p.id))) window.clearInterval(retryProps);
  }, 300);

  /* ---- gizmo ---- */
  const gizmo = new TransformControls(ecam, canvas);
  const pivot = new THREE.Object3D();
  scene.add(pivot, gizmo.getHelper());
  gizmo.setSpace("world");
  gizmo.setTranslationSnap(null);
  gizmo.addEventListener("dragging-changed", (e) => {
    orbit.enabled = !(e as unknown as { value: boolean }).value;
  });

  const configureGizmo = (): void => {
    const mode = gizmo.mode;
    const prop = selection?.kind === "prop";
    gizmo.showX = mode === "translate";
    gizmo.showZ = mode === "translate";
    gizmo.showY = mode === "rotate" || (mode === "translate" && prop);
  };

  /** Keep an item edit only while it changes something. */
  const tidy = (kind: Kind, id: string): void => {
    const edit = map(kind)[id];
    if (!edit) return;
    for (const key of ["dx", "dz", "dry"] as const) if (edit[key] !== undefined && Math.abs(edit[key]!) < 1e-4) delete edit[key];
    if (edit.hs !== undefined && Math.abs(edit.hs - 1) < 1e-4) delete edit.hs;
    if (!edit.hide && edit.dx === undefined && edit.dz === undefined && edit.dry === undefined && edit.hs === undefined) delete map(kind)[id];
  };
  const itemEdit = (kind: Kind, id: string): ItemEdit => {
    const base = baseOf(kind, id)!;
    return (map(kind)[id] ??= { at: [round(base.x, 2), round(base.z, 2)] });
  };

  const readGizmo = (): void => {
    if (!selection) return;
    const { kind, id } = selection;
    if (kind === "prop") {
      const spec = propSpec(id);
      const mesh = propMesh(id);
      if (!spec || !mesh) return;
      spec.x = round(mesh.position.x);
      spec.y = round(mesh.position.y);
      spec.z = round(mesh.position.z);
      spec.ry = round(mesh.rotation.y);
      syncPropHelper(id);
    } else {
      const base = baseOf(kind, id)!;
      const edit = itemEdit(kind, id);
      edit.dx = round(pivot.position.x - base.x);
      edit.dz = round(pivot.position.z - base.z);
      edit.dry = round(pivot.rotation.y);
      tidy(kind, id);
      syncProxy(kind, id);
    }
    notify();
  };
  gizmo.addEventListener("objectChange", readGizmo);

  const select = (kind: Kind | null, id: string | null): void => {
    const before = selection;
    selection = kind && id ? { kind, id } : null;
    if (before) {
      if (before.kind === "prop") syncPropHelper(before.id);
      else syncProxy(before.kind, before.id);
    }
    if (!selection || selection.kind === "board") {
      gizmo.detach();
      if (selection) syncBoardProxy(selection.id);
    } else if (selection.kind === "prop") {
      const mesh = propMesh(selection.id);
      if (mesh) gizmo.attach(mesh);
      syncPropHelper(selection.id);
    } else {
      const base = baseOf(selection.kind, selection.id)!;
      const edit = map(selection.kind)[selection.id];
      pivot.position.set(base.x + (edit?.dx ?? 0), 0, base.z + (edit?.dz ?? 0));
      pivot.rotation.set(0, edit?.dry ?? 0, 0);
      gizmo.attach(pivot);
      syncProxy(selection.kind, selection.id);
    }
    configureGizmo();
    notify();
  };

  /* ---- picking ---- */
  const raycaster = new THREE.Raycaster();
  let down: { x: number; y: number } | null = null;
  canvas.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener("pointerup", (e) => {
    const start = down;
    down = null;
    if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 4 || gizmo.dragging || (gizmo as unknown as { axis: string | null }).axis) return;
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1)), ecam);
    const targets: THREE.Object3D[] = [...proxyOf.values(), ...edits.props.flatMap((p) => propMesh(p.id) ?? [])];
    const hit = raycaster.intersectObjects(targets, false)[0]?.object;
    if (!hit) return select(null, null);
    if (hit.userData.kind) select(hit.userData.kind as Kind, hit.userData.id as string);
    else select("prop", String(hit.userData.propId));
  });
  window.addEventListener("keydown", (e) => {
    if ((e.target as HTMLElement | null)?.closest("input, textarea, select")) return;
    if (e.key === "w") api.mode("translate");
    if (e.key === "e") api.mode("rotate");
    if (e.key === "Delete" && selection?.kind === "prop") api.removeProp();
  });

  /* ---- the camera follows ---- */
  const resize = (): void => {
    ecam.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    ecam.updateProjectionMatrix();
  };
  window.addEventListener("resize", resize);
  resize();
  const tickEditor = (): void => {
    orbit.update();
    ecam.updateMatrixWorld();
    (window as unknown as { __freeCam?: unknown }).__freeCam = { pos: ecam.position.toArray(), look: orbit.target.toArray(), fov: ecam.fov };
    requestAnimationFrame(tickEditor);
  };
  tickEditor();

  /* ---- the API the atelier drives ---- */
  const row = (kind: Kind, id: string): Row => {
    const base = baseOf(kind, id)!;
    const edit = map(kind)[id];
    return { id, x: round(base.x + (edit?.dx ?? 0), 1), z: round(base.z + (edit?.dz ?? 0), 1), h: round(heightOf(base) * (edit?.hs ?? 1), 1), edited: !!edit, hidden: !!edit?.hide };
  };
  const api: WorldEditor = {
    list: () => ({
      towers: towers.map((t) => row("tower", t.id)),
      lamps: lamps.map((l) => row("lamp", l.id)),
      props: edits.props,
      boards: boards.map((b) => ({ id: `b${b.k}`, k: b.k, label: `${b.k + 1}. ${b.id}`, edited: !!edits.shots[String(b.k)] })),
    }),
    selected: () => {
      if (!selection) return null;
      const { kind, id } = selection;
      if (kind === "prop") return { kind, id, prop: propSpec(id) };
      if (kind === "board") {
        const k = Number(id.slice(1));
        const side = sideOf(k);
        const shot: Shot = patchShot(shippedShot(k), edits.shots[String(k)], side);
        return { kind, id, shot: { ahead: shot.board.ahead, lat: shot.board.lat * side, bottom: shot.board.bottom, scale: shot.scale, edited: !!edits.shots[String(k)] } };
      }
      const base = baseOf(kind, id)!;
      return { kind, id, item: map(kind)[id], base: { x: base.x, z: base.z, h: heightOf(base), ry: base.ry } };
    },
    select: (kind, id) => select(id ? kind : null, id),
    focus: () => {
      if (!selection) return;
      const at = selection.kind === "prop" ? propMesh(selection.id)?.position : proxyOf.get(keyOf(selection.kind, selection.id))?.position;
      if (!at) return;
      const offset = ecam.position.clone().sub(orbit.target).setLength(selection.kind === "tower" ? 70 : 25);
      orbit.target.set(at.x, selection.kind === "tower" ? at.y : 3, at.z);
      ecam.position.copy(orbit.target).add(offset);
    },
    mode: (mode) => {
      gizmo.setMode(mode);
      configureGizmo();
      notify();
    },
    proxies: (visible) => void (group.visible = visible),
    patch: (values) => {
      if (!selection) return;
      const { kind, id } = selection;
      if (kind === "board") {
        const k = String(Number(id.slice(1)));
        const patch: ShotPatch = (edits.shots[k] ??= {});
        for (const key of ["ahead", "lat", "bottom"] as const) if (key in values && Number.isFinite(values[key])) patch.board = { ...patch.board, [key]: values[key] };
        if ("scale" in values && Number.isFinite(values.scale) && values.scale! > 0) patch.scale = values.scale;
        syncBoardProxy(id);
      } else if (kind === "prop") {
        const spec = propSpec(id);
        const mesh = propMesh(id);
        if (!spec || !mesh) return;
        Object.assign(spec, Object.fromEntries(Object.entries(values).filter(([k, v]) => ["x", "y", "z", "ry", "scale"].includes(k) && Number.isFinite(v) && (k !== "scale" || v > 0))));
        mesh.position.set(spec.x, spec.y, spec.z);
        mesh.rotation.y = spec.ry;
        mesh.scale.setScalar(spec.scale);
        syncPropHelper(id);
      } else {
        const edit = itemEdit(kind, id);
        for (const key of ["dx", "dz", "dry", "hs"] as const) if (key in values && Number.isFinite(values[key]) && (key !== "hs" || values[key]! > 0)) edit[key] = values[key];
        tidy(kind, id);
        select(kind, id);
      }
      notify();
    },
    toggleHide: () => {
      if (!selection || selection.kind === "prop" || selection.kind === "board") return;
      const { kind, id } = selection;
      const edit = itemEdit(kind, id);
      if (edit.hide) delete edit.hide;
      else edit.hide = true;
      tidy(kind, id);
      syncProxy(kind, id);
      notify();
    },
    reset: () => {
      if (!selection || selection.kind === "prop") return;
      if (selection.kind === "board") {
        delete edits.shots[String(Number(selection.id.slice(1)))];
        syncBoardProxy(selection.id);
        return notify();
      }
      delete map(selection.kind)[selection.id];
      select(selection.kind, selection.id);
    },
    addProp: async (model) => {
      const spot = orbit.target;
      const spec: PropEdit = { id: `p${Date.now().toString(36)}`, model, x: round(spot.x), y: 0, z: round(spot.z), ry: 0, scale: 1 };
      edits.props.push(spec);
      const mesh = await world.props.add(spec);
      if (!mesh) {
        edits.props.pop();
        throw new Error(`${model} did not load`);
      }
      select("prop", spec.id);
    },
    removeProp: () => {
      if (!selection || selection.kind !== "prop") return;
      const id = selection.id;
      select(null, null);
      world.props.remove(id);
      const helper = propHelper.get(id);
      if (helper) scene.remove(helper);
      propHelper.delete(id);
      edits.props = edits.props.filter((p) => p.id !== id);
      notify();
    },
    models: propNames,
    json: () => JSON.stringify(edits, null, 2),
    save: async () => {
      const response = await fetch("/__world-edits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(edits) });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      return "saved";
    },
  };
  (window as unknown as { __worldEditor: WorldEditor }).__worldEditor = api;
  edits.props.forEach((p) => syncPropHelper(p.id));
  return api;
}
