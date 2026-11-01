import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { V3, bar, box, fit, flat, mergeFlat, mergeGeometries, tick, tint } from "./geometry";
import { truckFallback } from "./symbols";
import type { Palette } from "./tokens";

export interface CityContext {
  scene: THREE.Scene;
  p: Palette;
  rnd: () => number;
  count: number;
  anchors: THREE.Vector3[];
  /** Point on the flight curve at t (t = project index). */
  at(t: number, out: THREE.Vector3): THREE.Vector3;
  frameAt(t: number): { p: THREE.Vector3; T: THREE.Vector3; R: THREE.Vector3 };
  lane(dx: number, dy: number, dz: number): THREE.CatmullRomCurve3;
  /** Short words for the vertical neon signs, one per project. */
  signs: string[];
  /** URLs of the real models (Kenney, CC0). If one fails to load, a generated model takes its place. */
  models: { truck: string; moto: string };
  onVehicles(): void;
}

export interface City {
  /** Put every moving instance where it belongs at `time` seconds. Called every frame in motion mode, once in static modes. */
  place(time: number, reduce: boolean): void;
  ghosts: { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; index: number }[];
  /** Ghost numbers are painted again once the display font is ready. */
  repaintGhosts(): void;
}

export async function buildCity(c: CityContext): Promise<City> {
  const { scene, p, rnd, count: NC } = c;
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const tA = V3(0, 0, 0);
  const tB = V3(0, 0, 0);
  const grey = (t: number) => p.mix(p.ink, p.paper, t);

  /* ---------- FUNDO: a huge hollow number behind each project ---------- */
  const ghosts = Array.from({ length: NC }, (_, index) => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 512;
    const map = new THREE.CanvasTexture(cv);
    const material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.scale.setScalar(20);
    mesh.rotation.z = -0.18;
    scene.add(mesh);
    return { mesh, material, index, cv, map };
  });
  const paintGhosts = () => {
    for (const g of ghosts) {
      const ctx = g.cv.getContext("2d")!;
      const text = String(g.index + 1).padStart(2, "0");
      ctx.clearRect(0, 0, 512, 512);
      ctx.font = '400 430px Anton, Impact, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.fillStyle = p.css(p.red, 0.3);
      ctx.fillText(text, 256, 272);
      ctx.lineWidth = 12;
      ctx.strokeStyle = p.css(p.paper);
      ctx.strokeText(text, 256, 272);
      g.map.needsUpdate = true;
    }
  };
  paintGhosts();

  await tick();
  /* ---------- FRENTE: speed streaks and torn paper ---------- */
  const STREAKS = 60;
  const streaks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1, flatShading: true }), STREAKS);
  streaks.frustumCulled = false;
  const streakTones = [p.red, p.red, grey(0.15), grey(0.15), p.paper];
  const tmp = V3(0, 0, 0);
  for (let i = 0; i < STREAKS; i += 1) {
    let pos = V3(0, 0, 0);
    for (let tries = 0; tries < 12; tries += 1) {
      const t = rnd() * (NC + 2) - 1;
      const b = c.at(t, tmp.clone());
      pos = V3(b.x + (rnd() - 0.5) * 30, b.y + (rnd() - 0.5) * 20, b.z + (rnd() - 0.5) * 18);
      if (Math.hypot(pos.x - b.x, pos.y - b.y) > 6.5) break;
    }
    dummy.position.copy(pos);
    dummy.rotation.set((rnd() - 0.5) * 0.6, (rnd() - 0.5) * 1.2, -0.55 + (rnd() - 0.5) * 0.3);
    dummy.scale.set(0.1 + rnd() * 0.3, 3 + rnd() * 9, 0.1 + rnd() * 0.3);
    dummy.updateMatrix();
    streaks.setMatrixAt(i, dummy.matrix);
    streaks.setColorAt(i, streakTones[Math.floor(rnd() * streakTones.length)]!);
  }
  streaks.instanceMatrix.needsUpdate = true;
  scene.add(streaks);

  const SCRAPS = 36;
  const scrapShape = new THREE.Shape([[-0.5, -0.6], [0.1, -0.72], [0.55, -0.3], [0.46, 0.5], [-0.1, 0.66], [-0.56, 0.2]].map(([x, y]) => new THREE.Vector2(x, y)));
  const scraps = new THREE.InstancedMesh(new THREE.ShapeGeometry(scrapShape), new THREE.MeshStandardMaterial({ flatShading: true, side: THREE.DoubleSide, roughness: 0.9 }), SCRAPS);
  scraps.frustumCulled = false;
  const scrapTones = [p.paper, p.paper, p.paper, p.red, p.red, grey(0.17)];
  const scrapData = Array.from({ length: SCRAPS }, (_, i) => {
    const b = c.at(rnd() * (NC + 1) - 0.8, V3(0, 0, 0));
    const a = rnd() * Math.PI * 2;
    const r = 5 + rnd() * 9;
    scraps.setColorAt(i, scrapTones[Math.floor(rnd() * scrapTones.length)]!);
    return { p: V3(b.x + Math.cos(a) * r * 1.3, b.y + Math.sin(a) * r * 0.9, b.z + (rnd() - 0.5) * 10), s: 0.9 + rnd() * 1.8, rx: (rnd() - 0.5) * 1.2, ry: (rnd() - 0.5) * 1.2, rz: (rnd() - 0.5) * 1.6, ph: rnd() * 6.28 };
  });
  scene.add(scraps);

  await tick();
  /* ---------- FUNDO: skyline with lit windows ---------- */
  const winTex = (() => {
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 128;
    const x = cv.getContext("2d")!;
    x.fillStyle = p.css(p.ink);
    x.fillRect(0, 0, 64, 128);
    for (let r = 0; r < 16; r += 1) {
      for (let q = 0; q < 4; q += 1) {
        const v = rnd();
        x.fillStyle = v < 0.3 ? p.css(p.red) : v < 0.38 ? p.css(p.paper) : p.css(p.mix(p.ink, p.dred, 0.25));
        x.fillRect(q * 16 + 3, r * 8 + 2, 10, 4);
      }
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const towerParts: THREE.BufferGeometry[] = [];
  const beacons: THREE.BufferGeometry[] = [];
  const signSpots: { x: number; y: number; z: number }[] = [];
  for (let n = 0; n < 56; n += 1) {
    const t = -0.8 + rnd() * (NC + 1.6);
    const { p: at, R } = c.frameAt(t);
    const s = n % 2 ? 1 : -1;
    const lat = 11 + rnd() * 17;
    const w = 3 + rnd() * 4.5;
    const d = 3 + rnd() * 4.5;
    const h = 18 + rnd() * 48;
    const x = at.x + R.x * s * lat;
    const z = at.z + R.z * s * lat + (rnd() - 0.5) * 5;
    const y = at.y - 26 + h / 2;
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv!;
    for (let i = 0; i < uv.count; i += 1) {
      const f = Math.floor(i / 4);
      if (f === 2 || f === 3) uv.setXY(i, 0.02, 0.02);
      else uv.setXY(i, (uv.getX(i) * (f < 2 ? d : w)) / 3.2, (uv.getY(i) * h) / 4);
    }
    g.translate(x, y, z);
    tint(g, rnd() < 0.18 ? p.dred : rnd() < 0.5 ? grey(0.28) : grey(0.19));
    towerParts.push(g);
    if (rnd() < 0.55) beacons.push(new THREE.BoxGeometry(0.5, 0.5, 0.5).translate(x + (rnd() - 0.5) * w * 0.6, y + h / 2 + 0.3, z));
    if (rnd() < 0.3) beacons.push(bar(V3(x, y + h / 2, z), V3(x, y + h / 2 + 4 + rnd() * 6, z), 0.14));
    if (signSpots.length < 14 && h > 26) signSpots.push({ x, y: y + h / 2 - 4 - rnd() * h * 0.4, z: z + d / 2 + 0.06 });
  }
  const towers = new THREE.Mesh(
    mergeGeometries(towerParts)!,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8, metalness: 0.1, emissive: new THREE.Color().setScalar(1), emissiveMap: winTex, emissiveIntensity: 1 }),
  );
  towers.frustumCulled = false;
  scene.add(towers);
  const beaconMesh = new THREE.Mesh(mergeFlat(beacons), new THREE.MeshBasicMaterial({ color: p.red }));
  beaconMesh.frustumCulled = false;
  scene.add(beaconMesh);

  await tick();
  /* vertical neon signs carrying the project names */
  const signPairs: [THREE.Color, THREE.Color][] = [[p.red, p.paper], [p.paper, p.ink2], [p.ink2, p.red], [p.red, p.ink2], [p.paper, p.red], [p.ink2, p.paper]];
  const words = [...c.signs, "LIVE", "AI", "EVIDENCE"];
  const signMats = words.map((text, i) => {
    const [bg, fg] = signPairs[i % signPairs.length]!;
    const cv = document.createElement("canvas");
    cv.width = 128;
    cv.height = 512;
    const map = new THREE.CanvasTexture(cv);
    map.colorSpace = THREE.SRGBColorSpace;
    const paint = () => {
      const x = cv.getContext("2d")!;
      x.fillStyle = p.css(bg);
      x.fillRect(0, 0, 128, 512);
      x.strokeStyle = p.css(fg);
      x.lineWidth = 8;
      x.strokeRect(8, 8, 112, 496);
      x.fillStyle = p.css(fg);
      x.textAlign = "center";
      x.textBaseline = "middle";
      const chars = [...text.toUpperCase().replace(/-/g, " ")];
      const fs = Math.min(84, Math.floor(430 / chars.length));
      x.font = `400 ${fs}px Anton, Impact, sans-serif`;
      chars.forEach((ch, k) => x.fillText(ch, 64, 256 + (k - (chars.length - 1) / 2) * fs * 1.02));
      map.needsUpdate = true;
    };
    paint();
    (map.userData as { paint: () => void }).paint = paint;
    return new THREE.MeshBasicMaterial({ map });
  });
  const signGeo = new THREE.PlaneGeometry(2.2, 8.8);
  signSpots.forEach((s, i) => {
    const m = new THREE.Mesh(signGeo, signMats[i % signMats.length]!);
    m.position.set(s.x, s.y, s.z);
    scene.add(m);
  });

  await tick();
  /* ---------- MEIO: viaduct, elevated trains ---------- */
  const rail = c.lane(22, 9, -8);
  const railLength = rail.getLength();
  const beam = new THREE.Mesh(new THREE.TubeGeometry(rail, 160, 0.4, 4, false), new THREE.MeshBasicMaterial({ color: p.mix(p.ink, p.dred, 0.4) }));
  beam.frustumCulled = false;
  scene.add(beam);
  for (const o of [-0.55, 0.55]) {
    const m = new THREE.Mesh(new THREE.TubeGeometry(c.lane(22 + o, 9.6, -8), 160, 0.05, 3, false), new THREE.MeshBasicMaterial({ color: p.paper }));
    m.frustumCulled = false;
    scene.add(m);
  }
  const PILLARS = 18;
  const pillars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: grey(0.14), flatShading: true, roughness: 0.8 }), PILLARS);
  pillars.frustumCulled = false;
  for (let i = 0; i < PILLARS; i += 1) {
    const q = rail.getPoint((i + 0.5) / PILLARS);
    dummy.position.set(q.x, (q.y - 0.8 + q.y - 40) / 2, q.z);
    dummy.scale.set(0.8, 39.2, 0.8);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    pillars.setMatrixAt(i, dummy.matrix);
  }
  scene.add(pillars);
  const car = (() => {
    const parts: [THREE.BufferGeometry, THREE.Color][] = [
      [box(1.05, 1.1, 3, 0, 0, 0), p.red],
      [box(1.1, 0.34, 2.5, 0, 0.2, 0), p.paper],
      [box(0.5, 0.12, 1, 0, 0.62, 0), grey(0.15)],
      [box(0.8, 0.3, 3.1, 0, -0.55, 0), grey(0.09)],
    ];
    return mergeGeometries(parts.map(([g, color]) => tint(flat(g), color)))!;
  })();
  const TRAINS = [{ sp: 15, off: 0.1, dir: 1 }, { sp: -10, off: 0.7, dir: -1 }];
  const CARS = 6;
  const GAP = 3.35;
  const cars = new THREE.InstancedMesh(car, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.5, metalness: 0.2, emissive: p.mix(p.ink, p.dred, 0.5), emissiveIntensity: 0.6 }), TRAINS.length * CARS);
  cars.frustumCulled = false;
  scene.add(cars);

  await tick();
  /* ---------- MEIO: avenue with light trails and vehicles ---------- */
  const road = c.lane(-5, -11, 2);
  const TRAILS = 46;
  const trails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.14, 1), new THREE.MeshBasicMaterial(), TRAILS);
  trails.frustumCulled = false;
  const trailData = Array.from({ length: TRAILS }, (_, i) => {
    const dir = i % 2 ? 1 : -1;
    trails.setColorAt(i, dir > 0 ? p.red : p.paper);
    return { u: rnd(), sp: (0.04 + rnd() * 0.07) * dir, off: (rnd() < 0.5 ? -1 : 1) * (0.7 + rnd() * 1.6), len: 3 + rnd() * 7 };
  });
  scene.add(trails);

  type Fleet = { mesh: THREE.InstancedMesh; n: number; base: number };
  let fleet: Fleet[] | null = null;
  const VEHICLES = 9;
  const vehicleData = Array.from({ length: VEHICLES }, (_, i) => ({ u: rnd(), sp: (0.025 + rnd() * 0.03) * (i % 2 ? 1 : -1), off: (i % 2 ? 1 : -1) * 1.6 }));

  const loader = new GLTFLoader();
  const loadModel = (url: string): Promise<THREE.BufferGeometry | null> =>
    fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(
        (buffer) =>
          new Promise<THREE.BufferGeometry | null>((resolve) => {
            loader.parse(
              buffer,
              "",
              (gltf) => {
                const list: THREE.BufferGeometry[] = [];
                gltf.scene.updateMatrixWorld(true);
                gltf.scene.traverse((o) => {
                  const mesh = o as THREE.Mesh;
                  if (mesh.isMesh) {
                    const g = mesh.geometry.clone();
                    g.applyMatrix4(mesh.matrixWorld);
                    list.push(flat(g));
                  }
                });
                resolve(list.length ? mergeGeometries(list) : null);
              },
              () => resolve(null),
            );
          }),
      )
      .catch((error: unknown) => {
        console.warn(`scene: model ${url} did not load, a generated model is used`, error);
        return null;
      });
  void Promise.all([loadModel(c.models.truck), loadModel(c.models.moto)]).then(([truck, moto]) => {
    const sources = [truck ?? truckFallback(), moto ?? truckFallback()];
    fleet = sources.map((g, k) => {
      const n = k ? 4 : VEHICLES - 4;
      const mesh = new THREE.InstancedMesh(fit(g.clone(), k ? 2.6 : 3.8), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.6, metalness: 0.2 }), n);
      mesh.frustumCulled = false;
      const tones = [p.red, p.paper, grey(0.17), p.red];
      for (let i = 0; i < n; i += 1) mesh.setColorAt(i, col.copy(tones[i % 4]!));
      scene.add(mesh);
      return { mesh, n, base: k ? VEHICLES - 4 : 0 };
    });
    c.onVehicles();
  });

  await tick();
  /* ---------- FRENTE: overhead cables ---------- */
  {
    const pts: number[] = [];
    const seg = (a: THREE.Vector3, b: THREE.Vector3, sag: number) => {
      for (let k = 0; k < 12; k += 1) {
        const u0 = k / 12;
        const u1 = (k + 1) / 12;
        const f = (u: number) => V3(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u - sag * 4 * u * (1 - u), a.z + (b.z - a.z) * u);
        const p0 = f(u0);
        const p1 = f(u1);
        pts.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      }
    };
    for (let n = 0; n < 26; n += 1) {
      const t = -0.6 + rnd() * (NC + 1.2);
      const { p: at, R } = c.frameAt(t);
      const s = rnd() < 0.5 ? 1 : -1;
      const lat = 9 + rnd() * 10;
      const len = 14 + rnd() * 22;
      const a = V3(at.x + R.x * s * lat, at.y + 6 + rnd() * 14, at.z + R.z * s * lat);
      seg(a, V3(a.x + (rnd() - 0.3) * len * 0.5, a.y + (rnd() - 0.5) * 5, a.z - len), 1 + rnd() * 2);
    }
    for (let n = 0; n < 10; n += 1) {
      const t = -0.4 + rnd() * (NC + 0.8);
      const { p: at, R } = c.frameAt(t);
      const y0 = at.y + 7 + rnd() * 9;
      seg(V3(at.x - R.x * (12 + rnd() * 8), y0, at.z - R.z * (12 + rnd() * 8)), V3(at.x + R.x * (12 + rnd() * 8), y0 + (rnd() - 0.5) * 4, at.z + R.z * (12 + rnd() * 8)), 1.5 + rnd() * 2.5);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const cables = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: p.paper, transparent: true, opacity: 0.6 }));
    cables.frustumCulled = false;
    scene.add(cables);
  }

  const place = (time: number, reduce: boolean) => {
    dummy.scale.setScalar(1);
    dummy.rotation.set(0, 0, 0);
    // Trains
    TRAINS.forEach((tr, ti) => {
      for (let k = 0; k < CARS; k += 1) {
        let u = (time * tr.sp) / railLength + tr.off - (k * GAP * tr.dir) / railLength;
        u = ((u % 1) + 1) % 1;
        rail.getPointAt(u, tA);
        rail.getTangentAt(u, tB);
        dummy.position.set(tA.x, tA.y + 0.95, tA.z);
        dummy.lookAt(tA.x + tB.x * tr.dir, tA.y + 0.95 + tB.y * tr.dir, tA.z + tB.z * tr.dir);
        dummy.updateMatrix();
        cars.setMatrixAt(ti * CARS + k, dummy.matrix);
      }
    });
    cars.instanceMatrix.needsUpdate = true;
    // Light trails
    for (let i = 0; i < TRAILS; i += 1) {
      const td = trailData[i]!;
      let u = td.u + time * td.sp;
      u = ((u % 1) + 1) % 1;
      road.getPointAt(u, tA);
      road.getTangentAt(u, tB);
      dummy.position.set(tA.x - tB.z * td.off, tA.y + 0.2, tA.z + tB.x * td.off);
      dummy.lookAt(dummy.position.x + tB.x, dummy.position.y + tB.y, dummy.position.z + tB.z);
      dummy.scale.set(1, 1, td.len);
      dummy.updateMatrix();
      trails.setMatrixAt(i, dummy.matrix);
    }
    trails.instanceMatrix.needsUpdate = true;
    // Vehicles
    if (fleet) {
      dummy.scale.setScalar(1);
      for (const f of fleet) {
        for (let i = 0; i < f.n; i += 1) {
          const vd = vehicleData[f.base + i]!;
          const dr = vd.sp > 0 ? 1 : -1;
          let u = vd.u + time * vd.sp;
          u = ((u % 1) + 1) % 1;
          road.getPointAt(u, tA);
          road.getTangentAt(u, tB);
          dummy.position.set(tA.x - tB.z * vd.off, tA.y + 0.5, tA.z + tB.x * vd.off);
          dummy.lookAt(dummy.position.x + tB.x * dr, dummy.position.y + tB.y * dr, dummy.position.z + tB.z * dr);
          dummy.updateMatrix();
          f.mesh.setMatrixAt(i, dummy.matrix);
        }
        f.mesh.instanceMatrix.needsUpdate = true;
      }
    }
    // Torn paper
    for (let i = 0; i < SCRAPS; i += 1) {
      const s = scrapData[i]!;
      dummy.position.copy(s.p);
      if (!reduce) {
        dummy.position.x += Math.sin(time * 0.5 + s.ph) * 0.6;
        dummy.position.y += Math.cos(time * 0.4 + s.ph) * 0.5;
      }
      dummy.rotation.set(time * s.rx + s.ph, time * s.ry, time * s.rz);
      dummy.scale.setScalar(s.s);
      dummy.updateMatrix();
      scraps.setMatrixAt(i, dummy.matrix);
    }
    scraps.instanceMatrix.needsUpdate = true;
  };

  return {
    place,
    ghosts,
    repaintGhosts: () => {
      paintGhosts();
      for (const m of signMats) (m.map!.userData as { paint?: () => void }).paint?.();
    },
  };
}

