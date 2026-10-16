import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTexture } from './facade.js';

// Traffic: real-proportioned cars (sedan, hatchback, SUV, van, taxi, bus) built from side profiles with
// wheel arches, tinted glass cabins and clear-coat paint; signals per crossing; cars keep their distance,
// stop for red lights, show brake lights, sometimes turn right into cross streets, and cross traffic
// moves while the avenue has red.

// ---------- car models ----------
// Profile drawn in (x = length, front at +x; y = up); extruded across the width, then turned so the front faces -z.
const TYPES = {
  sedan: { L: 4.6, W: 1.84, r: 0.33, wb: 1.38, belt: 0.98, hood: 0.88, roof: 1.44, cab: [-1.55, -0.95, 0.25, 1.05], trunk: true },
  hatch: { L: 4.05, W: 1.78, r: 0.32, wb: 1.28, belt: 0.96, hood: 0.86, roof: 1.48, cab: [-1.85, -1.72, 0.1, 0.9] },
  suv: { L: 4.75, W: 1.94, r: 0.38, wb: 1.42, belt: 1.12, hood: 1.04, roof: 1.74, cab: [-2.22, -2.08, 0.35, 1.15] },
  van: { L: 5.2, W: 2.0, r: 0.36, wb: 1.65, belt: 1.12, hood: 1.06, roof: 2.15, cab: [-2.5, -2.5, 1.3, 2.05] },
  taxi: { L: 4.6, W: 1.84, r: 0.33, wb: 1.38, belt: 0.98, hood: 0.88, roof: 1.44, cab: [-1.55, -0.95, 0.25, 1.05], trunk: true, sign: true, paint: 0xf2b705 },
  bus: { L: 11.5, W: 2.5, r: 0.5, wb: 3.6, belt: 1.3, hood: 1.3, roof: 2.65, cab: [-5.55, -5.55, 5.6, 5.65], bus: true, paint: 0xf4f4f0 },
};
const PAINTS = [0xe8e8ea, 0xe8e8ea, 0x15161a, 0x15161a, 0x9aa0a8, 0x9aa0a8, 0x5a5f68, 0x1d2f5a, 0x7a1018, 0x3b4a3a, 0xc9bfa6, 0x2a4c7a];

function profileShape(points) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}

function extrude(shape, width, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 2,
    curveSegments: 6,
  });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.rotateY(Math.PI / 2); // +x (front) -> -z
  return g; // ExtrudeGeometry is already non-indexed
}

function colorize(geo, rgb) {
  geo = geo.toNonIndexed();
  geo.deleteAttribute('uv');
  const c = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < c.length; i += 3) c.set(rgb, i);
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

function buildType(t) {
  const parts2 = [];
  const { L, W, r, wb, belt, hood } = t;
  const front = L / 2;
  const rear = -L / 2;
  const bottom = r * 0.72;
  const arch = r + 0.07;
  const archPts = (cx) => {
    const p = [];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI - (i / 8) * Math.PI;
      p.push([cx + Math.cos(a) * arch, r * 0.95 + Math.sin(a) * arch]);
    }
    return p;
  };
  const [rb, rr, fr, fb] = t.cab;
  const body = [[rear + 0.1, bottom], ...archPts(-wb), ...archPts(wb), [front - 0.12, bottom], [front, bottom + 0.16], [front + 0.02, hood - 0.2]];
  if (t.bus) body.push([front, t.roof], [rear, t.roof]);
  else {
    body.push([front - 0.18, hood], [fb + 0.1, belt]);
    if (t.trunk) body.push([rb, belt], [rear + 0.28, belt - 0.03], [rear + 0.03, belt - 0.16]);
    else body.push([rear + 0.05, belt]);
  }
  body.push([rear, bottom + 0.16]);
  const parts = [extrude(profileShape(body), W, t.bus ? 0.04 : 0.07)];

  let glass;
  if (t.bus) {
    // window band along both sides plus windscreen, slightly proud of the body
    glass = extrude(profileShape([[rear + 0.3, 1.45], [front + 0.03, 1.45], [front + 0.03, 2.45], [rear + 0.3, 2.45]]), W + 0.04);
  } else {
    glass = extrude(profileShape([[rb, belt - 0.03], [fb, belt - 0.03], [fr, t.roof], [rr, t.roof]]), W * 0.84);
    // painted roof panel and B-pillars
    parts.push(extrude(profileShape([[rr - 0.03, t.roof - 0.04], [fr + 0.03, t.roof - 0.04], [fr - 0.01, t.roof + 0.03], [rr + 0.01, t.roof + 0.03]]), W * 0.86));
    const mid = (rr + fr) / 2 - 0.1;
    parts.push(new THREE.BoxGeometry(W * 0.85, t.roof - belt, 0.09).translate(0, (t.roof + belt) / 2, -mid).toNonIndexed());
    // side mirrors
    for (const sx of [-1, 1]) parts.push(new THREE.BoxGeometry(0.22, 0.12, 0.14).translate(sx * (W / 2 + 0.06), belt + 0.08, -(fb - 0.15)).toNonIndexed());
  }
  const bodyGeo = mergeGeometries(parts.map((g) => (g.deleteAttribute('uv'), g)));

  const hx = W / 2 - 0.32;
  const hy = hood - 0.14;
  const lamp = (x, y, z, w, h) => new THREE.BoxGeometry(w, h, 0.06).translate(x, y, z);
  const headParts = [lamp(-hx, hy, -front - 0.03, 0.4, 0.13), lamp(hx, hy, -front - 0.03, 0.4, 0.13)];
  if (t.sign) headParts.push(new THREE.BoxGeometry(0.5, 0.16, 0.2).translate(0, t.roof + 0.1, 0.1));
  if (t.bus) headParts.push(new THREE.BoxGeometry(1.6, 0.24, 0.05).translate(0, 2.55, -front - 0.04)); // destination display
  const ty = t.bus ? 0.9 : belt - 0.1;
  const tailGeo = mergeGeometries([lamp(-(W / 2 - 0.25), ty, front + 0.03, 0.42, 0.14), lamp(W / 2 - 0.25, ty, front + 0.03, 0.42, 0.14)]);
  // wheels: tyre + silver rim, rim facing outward
  const tw = t.bus ? 0.32 : 0.22;
  for (const sx of [-1, 1]) {
    for (const wz of [-wb, wb]) {
      const tyre = colorize(new THREE.CylinderGeometry(r, r, tw, 16).rotateZ(Math.PI / 2), [0.035, 0.035, 0.04]);
      const rim = colorize(new THREE.CylinderGeometry(r * 0.6, r * 0.6, 0.02, 12).rotateZ(Math.PI / 2).translate(sx * (tw / 2 + 0.005), 0, 0), [0.55, 0.57, 0.6]);
      for (const g of [tyre, rim]) parts2.push(g.translate(sx * (W / 2 - tw / 2 - 0.02), r, -wz));
    }
  }
  const wheelGeo = mergeGeometries(parts2);
  return { ...t, bodyGeo, wheelGeo, glassGeo: glass, headGeo: mergeGeometries(headParts.map((g) => g.toNonIndexed())), tailGeo };
}

// ---------- signals ----------
// One 20 s cycle per crossing, offset down the avenue (green wave). The avenue has green, then the cross
// street; pedestrians cross the avenue at the start of the avenue's red.
export const CYCLE = 20;
export function signal(c, t, cross) {
  const k = (((t + c * 2.3) % CYCLE) + CYCLE) % CYCLE;
  if (!cross) return k < 8 ? 0 : k < 10 ? 1 : 2; // 0 green, 1 amber, 2 red
  return k >= 12 && k < 17 ? 0 : k >= 17 && k < 18.5 ? 1 : 2;
}
export const signalPhase = (c, t) => (((t + c * 2.3) % CYCLE) + CYCLE) % CYCLE;

// ---------- traffic ----------
export function buildTraffic(scene, { rand, BLOCK_Z, AVENUE_HALF, KERB, quality, zebraBusy = null }) {
  const high = quality === 'high';
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  const compose = (x, y, z, rotY, sc = 1) => {
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rotY);
    return m4.compose(v.set(x, y, z), q, s.set(sc, sc, sc));
  };

  const CROSS = BLOCK_Z.map((bz) => bz - 12); // cross-street centre lines
  const zEnd = 172;
  const zStart = -232;
  const X_END = 112;

  // ---------- signals: avenue and cross street alternate, a green wave down the avenue ----------
  const heads = [];
  {
    for (let c = 0; c < CROSS.length; c++) {
      const z = CROSS[c];
      heads.push({ c, cross: false, x: AVENUE_HALF + 0.6, z: z + 5.6, fx: 0, fz: 0.19, rot: 0 });
      heads.push({ c, cross: false, x: -AVENUE_HALF - 0.6, z: z - 5.6, fx: 0, fz: -0.19, rot: Math.PI });
      heads.push({ c, cross: true, x: -AVENUE_HALF - 0.9, z: z + 2.4, fx: -0.19, fz: 0, rot: Math.PI / 2 });
      heads.push({ c, cross: true, x: AVENUE_HALF + 0.9, z: z - 2.4, fx: 0.19, fz: 0, rot: -Math.PI / 2 });
    }
    const dark = new THREE.MeshStandardMaterial({ color: 0x15171d, metalness: 0.4, roughness: 0.5 });
    const n = heads.length;
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 6), dark, n);
    const boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 1.3, 0.35), dark, n);
    const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial(), n);
    heads.forEach((h, i) => {
      poles.setMatrixAt(i, compose(h.x, KERB + 2.1, h.z, 0));
      boxes.setMatrixAt(i, compose(h.x, KERB + 4.6, h.z, h.rot));
    });
    scene.add(poles, boxes, lamps);
    heads.mesh = lamps;
  }
  const SIG = [new THREE.Color(0x33ff88).multiplyScalar(1.6), new THREE.Color(0xffb020).multiplyScalar(1.6), new THREE.Color(0xff3030).multiplyScalar(1.6)];
  function updateSignals(t) {
    heads.forEach((h, i) => {
      const st = signal(h.c, t, h.cross);
      const y = KERB + 4.6 + (st === 0 ? -0.4 : st === 1 ? 0 : 0.4);
      heads.mesh.setMatrixAt(i, compose(h.x + h.fx, y, h.z + h.fz, 0));
      heads.mesh.setColorAt(i, SIG[st]);
    });
    heads.mesh.instanceMatrix.needsUpdate = true;
    heads.mesh.instanceColor.needsUpdate = true;
  }

  // ---------- routes ----------
  // avenue lanes (right-hand traffic): dir -1 drives toward -z on +x lanes
  const AVE = [
    { x: 1.6, dir: -1, vmax: 13 },
    { x: 4.4, dir: -1, vmax: 10, outer: true },
    { x: -1.6, dir: 1, vmax: 13 },
    { x: -4.4, dir: 1, vmax: 10, outer: true },
  ];
  // cross lanes, one per direction per crossing; heading +x uses z_c + 1
  const CROSS_LANES = [];
  CROSS.forEach((z, c) => {
    CROSS_LANES.push({ c, z: z + 1, dir: 1, vmax: 9 });
    CROSS_LANES.push({ c, z: z - 1, dir: -1, vmax: 9 });
  });

  // ---------- cars ----------
  const perLane = high ? 9 : 6;
  const crossCars = high ? CROSS_LANES.length : Math.round(CROSS_LANES.length / 2);
  const typeList = [];
  const pickType = (allowBus) => {
    const r = rand();
    if (allowBus && r < 0.05) return 'bus';
    if (r < 0.12) return 'taxi';
    if (r < 0.2) return 'van';
    if (r < 0.42) return 'suv';
    if (r < 0.62) return 'hatch';
    return 'sedan';
  };
  const cars = [];
  AVE.forEach((lane) => {
    for (let k = 0; k < perLane; k++) {
      const z = lane.dir < 0 ? zEnd - (k + 0.2 + rand() * 0.5) * ((zEnd - zStart) / perLane) : zStart + (k + 0.2 + rand() * 0.5) * ((zEnd - zStart) / perLane);
      cars.push({ type: pickType(true), mode: 'ave', lane, p: lane.dir * z, v: lane.vmax * 0.8 });
    }
  });
  for (let k = 0; k < crossCars; k++) {
    const lane = CROSS_LANES[(k * (high ? 1 : 2)) % CROSS_LANES.length];
    cars.push({ type: pickType(false), mode: 'cross', lane, p: -X_END + 10 + rand() * 80, v: lane.vmax * 0.7 });
  }

  // instanced meshes per type
  const envPaint = high
    ? new THREE.MeshPhysicalMaterial({ metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 })
    : new THREE.MeshStandardMaterial({ metalness: 0.6, roughness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, metalness: 0.9, roughness: 0.06 });
  const busGlass = new THREE.MeshBasicMaterial({ color: 0x9a8a62 }); // lit bus interior
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const wheelMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.5, roughness: 0.45 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const beamMat = new THREE.MeshBasicMaterial({ map: glowTexture('rgba(255,240,210,0.42)', 'rgba(255,240,210,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const beamGeo = new THREE.PlaneGeometry(2.6, 9).rotateX(-Math.PI / 2).translate(0, 0.06, -6.8);
  const meshes = {};
  const counts = {};
  for (const c of cars) counts[c.type] = (counts[c.type] || 0) + 1;
  const paint = new THREE.Color();
  for (const [name, n] of Object.entries(counts)) {
    const t = buildType(TYPES[name]);
    const m = {
      t,
      body: new THREE.InstancedMesh(t.bodyGeo, envPaint, n),
      glass: new THREE.InstancedMesh(t.glassGeo, t.bus ? busGlass : glassMat, n),
      head: new THREE.InstancedMesh(t.headGeo, headMat, n),
      tail: new THREE.InstancedMesh(t.tailGeo, tailMat, n),
      wheel: new THREE.InstancedMesh(t.wheelGeo, wheelMat, n),
      beam: new THREE.InstancedMesh(beamGeo.clone().translate(0, 0, -(t.L - 4.3) / 2), beamMat, n),
      used: 0,
    };
    m.list = [m.body, m.glass, m.wheel, m.head, m.tail, m.beam];
    for (const im of m.list) {
      im.frustumCulled = false;
      scene.add(im);
    }
    meshes[name] = m;
  }
  const HEAD = new THREE.Color(1.5, 1.42, 1.2);
  const TAXI = new THREE.Color(1.6, 1.3, 0.5);
  cars.forEach((c) => {
    const m = meshes[c.type];
    c.slot = m.used++;
    c.mesh = m;
    c.L = m.t.L;
    m.body.setColorAt(c.slot, paint.set(m.t.paint ?? PAINTS[Math.floor(rand() * PAINTS.length)]));
    m.head.setColorAt(c.slot, m.t.sign ? TAXI : HEAD);
    m.tail.setColorAt(c.slot, paint.setRGB(0.6, 0.04, 0.06));
  });
  for (const m of Object.values(meshes)) {
    m.head.instanceColor.needsUpdate = true;
    m.body.instanceColor.needsUpdate = true;
  }

  // ---------- simulation ----------
  const B = 6; // comfortable braking (m/s²)
  const ACC = 2.6;
  const stopLineAve = (c, dir) => dir * (CROSS[c] - dir * 6.0); // progress of the stop line
  const stopLineCross = (dir) => dir * (-dir * (AVENUE_HALF + 3.0));
  const TAIL_N = new THREE.Color(0.55, 0.03, 0.05);
  const TAIL_B = new THREE.Color(2.4, 0.12, 0.12);
  const R_TURN = 3;

  function nextCrossing(car) {
    // first crossing whose stop line is ahead of the car's front
    const front = car.p + car.L / 2;
    let best = -1;
    let bestP = Infinity;
    for (let c = 0; c < CROSS.length; c++) {
      const sp = stopLineAve(c, car.lane.dir);
      if (sp > front - 0.5 && sp < bestP) {
        bestP = sp;
        best = c;
      }
    }
    return best;
  }

  function respawn(car) {
    // re-enter at the start of an avenue lane (or a cross street) when the entrance is clear
    const tryLane = (lane, mode) => {
      const startP = mode === 'ave' ? lane.dir * (lane.dir < 0 ? zEnd + 30 : zStart - 45) : -X_END;
      const clear = cars.every((o) => o === car || o.mode !== mode || o.lane !== lane || Math.abs(o.p - startP) > 14);
      if (!clear) return false;
      Object.assign(car, { mode, lane, p: startP, v: lane.vmax * 0.8, turnAt: -1, theta: 0 });
      return true;
    };
    if (car.type !== 'bus' && rand() < 0.3) {
      if (tryLane(CROSS_LANES[Math.floor(rand() * CROSS_LANES.length)], 'cross')) return;
    }
    tryLane(AVE[Math.floor(rand() * AVE.length)], 'ave');
  }

  function step(dt, t) {
    // group by lane for leader lookup
    const byLane = new Map();
    for (const c of cars) {
      if (c.mode === 'wait' || (c.mode === 'turn' && c.theta > 1.1)) continue;
      if (!byLane.has(c.lane)) byLane.set(c.lane, []);
      byLane.get(c.lane).push(c);
    }
    for (const list of byLane.values()) list.sort((a, b) => a.p - b.p);
    // who is inside each junction right now (so nobody drives into a car still crossing)
    const occAve = new Uint8Array(CROSS.length);
    const occCross = new Uint8Array(CROSS.length);
    for (const c of cars) {
      if (c.mode === 'ave' || c.mode === 'turn') {
        const z = c.mode === 'ave' ? c.lane.dir * c.p : c.cz;
        CROSS.forEach((zc, k) => {
          if (Math.abs(z - zc) < 3.2 + c.L / 2) occAve[k] = 1;
        });
      } else if (c.mode === 'cross' && Math.abs(c.lane.dir * c.p) < AVENUE_HALF + 0.5 + c.L / 2) occCross[c.lane.c] = 1;
    }

    for (const car of cars) {
      if (car.mode === 'wait') {
        respawn(car);
        continue;
      }
      if (car.mode === 'turn') {
        const vt = Math.min(car.v + ACC * dt, 5.5);
        car.v = vt;
        car.theta += (vt * dt) / R_TURN;
        if (car.theta >= Math.PI / 2) {
          // join the cross street lane heading away from the avenue
          const d = car.lane.dir;
          const c = car.turnC;
          const lane = CROSS_LANES.find((l) => l.c === c && l.dir === -d);
          Object.assign(car, { mode: 'cross', lane, p: AVENUE_HALF + 1.4, turnAt: -1 });
        }
        continue;
      }

      const list = byLane.get(car.lane);
      const idx = list.indexOf(car);
      const leader = list[idx + 1];
      const front = car.p + car.L / 2;
      let vt = car.lane.vmax;
      if (leader) {
        const gap = leader.p - leader.L / 2 - front - 2.0;
        vt = Math.min(vt, Math.sqrt(Math.max(0, 2 * B * gap)));
      }

      if (car.mode === 'ave') {
        const c = nextCrossing(car);
        if (c >= 0) {
          const dist = stopLineAve(c, car.lane.dir) - front;
          const st = signal(c, t, false);
          const canStop = dist > (car.v * car.v) / (2 * B) - 0.5;
          // don't enter the junction unless there is room on the far side
          const exitP = stopLineAve(c, car.lane.dir) + 12 + car.L + 1;
          const blocked = (dist > 0.5 && leader && leader.p - leader.L / 2 < exitP && leader.v < 6) || (dist > -0.5 && dist < 15 && (occCross[c] || zebraBusy?.[c]));
          if (dist < 70 && (st === 2 || (st === 1 && canStop) || blocked)) vt = Math.min(vt, Math.sqrt(Math.max(0, 2 * B * (dist - 0.3))));
          // decide on a right turn at this crossing (outer lane only, not buses)
          if (car.turnAt !== c && car.lane.outer && car.type !== 'bus' && dist < 40 && dist > 30) car.turnAt = rand() < 0.22 ? c : -2 - c;
          if (car.turnAt === c) {
            const turnStart = car.lane.dir * (CROSS[c] - car.lane.dir * (1 + R_TURN));
            const td = turnStart - car.p;
            vt = Math.min(vt, Math.sqrt(5.5 * 5.5 + 2 * 3 * Math.max(0, td)));
            if (td <= 0 && st === 0) {
              car.mode = 'turn';
              car.turnC = c;
              car.theta = 0;
              car.cx = car.lane.x - car.lane.dir * R_TURN;
              car.cz = CROSS[c] - car.lane.dir * (1 + R_TURN);
              continue;
            }
            if (td <= 0) car.turnAt = -1; // missed the green: carry on straight
          }
        }
      } else {
        // cross street: stop for the cross signal before the avenue
        const dist = stopLineCross(car.lane.dir) - front;
        const st = signal(car.lane.c, t, true);
        const canStop = dist > (car.v * car.v) / (2 * B) - 0.5;
        const busy = dist > -0.5 && dist < 15 && occAve[car.lane.c];
        if (dist > -0.5 && dist < 50 && (st === 2 || (st === 1 && canStop) || busy)) vt = Math.min(vt, Math.sqrt(Math.max(0, 2 * B * (dist - 0.3))));
      }

      car.braking = vt < car.v - 0.3 || car.v < 0.3;
      car.v = Math.max(0, car.v + THREE.MathUtils.clamp(vt - car.v, -9 * dt, ACC * dt));
      car.p += car.v * dt;

      const end = car.mode === 'ave' ? car.lane.dir * (car.lane.dir < 0 ? zStart - 45 : zEnd + 30) : X_END;
      if (car.p > end) {
        car.mode = 'wait';
        respawn(car);
      }
    }
  }

  function draw() {
    for (const car of cars) {
      const m = car.mesh;
      let x;
      let z;
      let rot;
      if (car.mode === 'wait') {
        for (const im of m.list) im.setMatrixAt(car.slot, hide);
        continue;
      }
      if (car.mode === 'ave') {
        x = car.lane.x;
        z = car.lane.dir * car.p;
        rot = car.lane.dir < 0 ? 0 : Math.PI;
      } else if (car.mode === 'cross') {
        x = car.lane.dir * car.p;
        z = car.lane.z;
        rot = car.lane.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      } else {
        const d = car.lane.dir;
        const th = car.theta;
        x = car.cx + d * R_TURN * Math.cos(th);
        z = car.cz + d * R_TURN * Math.sin(th);
        const hx = -d * Math.sin(th);
        const hz = d * Math.cos(th);
        rot = Math.atan2(-hx, -hz);
      }
      // cross-street cars drive on the road surface; avenue cars too (the kerb is beside them)
      compose(x, 0, z, rot);
      for (const im of m.list) im.setMatrixAt(car.slot, m4);
      m.tail.setColorAt(car.slot, car.braking ? TAIL_B : TAIL_N);
    }
    for (const m of Object.values(meshes)) {
      for (const im of m.list) im.instanceMatrix.needsUpdate = true;
      m.tail.instanceColor.needsUpdate = true;
    }
  }

  // let the queues settle so the first frame already looks like live traffic
  for (let i = 0; i < 120; i++) step(1 / 30, i / 30);
  draw();
  updateSignals(4);
  return {
    update(dt, t) {
      step(dt, t + 4);
      draw();
      updateSignals(t + 4);
    },
    carCount: cars.length,
  };
}
