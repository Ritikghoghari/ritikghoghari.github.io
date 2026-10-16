import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTexture } from './facade.js';

const KERB = 0.25; // sidewalk height

// Streets and street life. Everything repeated is instanced, so the whole layer is ~15 draw calls.
export function buildStreets(scene, { rand, BLOCK_X, BLOCK_Z, AVENUE_HALF }) {
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const place = (mesh, i, x, y, z, sx = 1, sy = 1, sz = 1, rotY = 0) => {
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rotY);
    mesh.setMatrixAt(i, m4.compose(v.set(x, y, z), q, s.set(sx, sy, sz)));
  };
  const zEnd = 172;
  const zStart = -232;
  const LEN = zEnd - zStart;
  const zMid = (zEnd + zStart) / 2;

  // ---------- asphalt ----------
  const asphalt = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#16181f';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < w * h * 0.04; i++) {
      const k = 18 + Math.floor(Math.random() * 22);
      g.fillStyle = `rgb(${k},${k + 1},${k + 5})`;
      g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    draw?.(g);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  // main avenue: 4 lanes, dashed lane lines, double yellow centre, solid edge lines
  const aveTex = asphalt(256, 256, (g) => {
    g.fillStyle = '#f2c14e';
    g.fillRect(124, 0, 3, 256);
    g.fillRect(130, 0, 3, 256);
    g.fillStyle = 'rgba(235,235,235,0.75)';
    g.fillRect(62, 0, 3, 120); // lane dashes
    g.fillRect(191, 0, 3, 120);
    g.fillRect(6, 0, 3, 256); // edge lines
    g.fillRect(247, 0, 3, 256);
  });
  aveTex.repeat.set(1, LEN / 12);
  const roadMat = new THREE.MeshStandardMaterial({ map: aveTex, roughness: 0.42, metalness: 0.15 });
  const avenue = new THREE.Mesh(new THREE.PlaneGeometry(AVENUE_HALF * 2, LEN), roadMat);
  avenue.rotation.x = -Math.PI / 2;
  avenue.position.set(0, 0.02, zMid);
  scene.add(avenue);

  const crossTex = asphalt(256, 64, (g) => {
    g.fillStyle = 'rgba(235,235,235,0.6)';
    for (let x = 0; x < 256; x += 32) g.fillRect(x, 31, 16, 2);
  });
  crossTex.repeat.set(220 / 24, 1);
  const crossMat = new THREE.MeshStandardMaterial({ map: crossTex, roughness: 0.5, metalness: 0.1 });
  for (const z of BLOCK_Z) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(220, 6), crossMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(0, 0.015, z - 12);
    scene.add(r);
  }
  // side streets between block columns
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x14161d, roughness: 0.6 });
  for (const x of [-54, -30, 30, 54, 78, -78]) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(4, LEN), sideMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(x, 0.012, zMid);
    scene.add(r);
  }

  // ---------- sidewalks: one raised slab per block + strips along the avenue ----------
  const paveTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#3a3d45';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 2;
    for (let i = 0; i <= 128; i += 32) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 128);
      g.moveTo(0, i);
      g.lineTo(128, i);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 6);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const paveMat = new THREE.MeshStandardMaterial({ map: paveTex, roughness: 0.8, color: 0x8a8f9c });
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(20, KERB, 20), paveMat, BLOCK_X.length * BLOCK_Z.length);
  let bi = 0;
  for (const bx of BLOCK_X) for (const bz of BLOCK_Z) place(blocks, bi++, bx, KERB / 2, bz);
  scene.add(blocks);
  for (const sx of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(2.4, KERB, LEN), paveMat);
    strip.position.set(sx * (AVENUE_HALF + 1.2), KERB / 2, zMid);
    scene.add(strip);
  }

  // ---------- zebra crossings on the avenue at every cross street ----------
  {
    const stripes = [];
    for (const z of BLOCK_Z) for (const side of [-1, 1]) for (let x = -5.2; x <= 5.2; x += 1.3) stripes.push([x, z - 12 + side * 4.4]);
    const zebra = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.65, 2.6), new THREE.MeshStandardMaterial({ color: 0xd9dbe0, roughness: 0.6 }), stripes.length);
    stripes.forEach(([x, z], i) => {
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
      zebra.setMatrixAt(i, m4.compose(v.set(x, 0.03, z), q, s.set(1, 1, 1)));
    });
    scene.add(zebra);
  }

  // ---------- street lamps: pole + arm + head, glowing bulb, light pool on the road ----------
  const lampSpots = [];
  for (let z = zEnd - 4; z > zStart; z -= 16) {
    lampSpots.push([-AVENUE_HALF - 0.9, z, 1]);
    lampSpots.push([AVENUE_HALF + 0.9, z - 8, -1]);
  }
  {
    const n = lampSpots.length;
    const metal = new THREE.MeshStandardMaterial({ color: 0x2a2e38, metalness: 0.6, roughness: 0.4 });
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.13, 7, 6), metal, n);
    const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(2.0, 0.12, 0.12), metal, n);
    const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.18, 0.4), new THREE.MeshBasicMaterial({ color: 0xffe2b0 }), n);
    const poolMat = new THREE.MeshBasicMaterial({ map: glowTexture('rgba(255,200,130,0.55)', 'rgba(255,200,130,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(9, 9), poolMat, n);
    const bulbs = new Float32Array(n * 3);
    lampSpots.forEach(([x, z, dir], i) => {
      place(poles, i, x, KERB + 3.5, z);
      place(arms, i, x + dir * 0.9, KERB + 6.9, z);
      place(heads, i, x + dir * 1.7, KERB + 6.8, z);
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
      pools.setMatrixAt(i, m4.compose(v.set(x + dir * 2.2, 0.06, z), q, s.set(1, 1, 1)));
      bulbs.set([x + dir * 1.7, KERB + 6.6, z], i * 3);
    });
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(bulbs, 3));
    scene.add(poles, arms, heads, pools, new THREE.Points(bg, new THREE.PointsMaterial({ color: 0xffd9a0, size: 1.3, transparent: true, depthWrite: false })));
  }

  // ---------- street trees between the lamps ----------
  {
    const spots = lampSpots.map(([x, z, dir]) => [x, z - 8 * dir]).filter(([, z]) => z > zStart + 4);
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.18, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x2b1d14 }), spots.length);
    const canopyGeo = new THREE.IcosahedronGeometry(1.25, 1);
    const canopies = new THREE.InstancedMesh(canopyGeo, new THREE.MeshStandardMaterial({ color: 0x14361f, roughness: 0.9, flatShading: true }), spots.length);
    const green = new THREE.Color();
    spots.forEach(([x, z], i) => {
      const k = 0.85 + rand() * 0.4;
      place(trunks, i, x, KERB + 1.2, z);
      place(canopies, i, x, KERB + 3.2 * k, z, k, k * 1.2, k, rand() * 6);
      canopies.setColorAt(i, green.setHSL(0.36 + rand() * 0.06, 0.45, 0.13 + rand() * 0.06));
    });
    scene.add(trunks, canopies);
  }

  // ---------- traffic lights at every avenue crossing ----------
  const signalHeads = [];
  {
    const spots = [];
    for (const z of BLOCK_Z) {
      spots.push([AVENUE_HALF + 0.6, z - 12 + 5.6, Math.PI]);
      spots.push([-AVENUE_HALF - 0.6, z - 12 - 5.6, 0]);
    }
    const dark = new THREE.MeshStandardMaterial({ color: 0x15171d, metalness: 0.4, roughness: 0.5 });
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 6), dark, spots.length);
    const boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 1.3, 0.35), dark, spots.length);
    const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial(), spots.length);
    spots.forEach(([x, z, r], i) => {
      place(poles, i, x, KERB + 2.1, z);
      place(boxes, i, x, KERB + 4.6, z, 1, 1, 1, r);
      signalHeads.push({ x, z, r, phase: rand() * 10 });
    });
    scene.add(poles, boxes, lamps);
    signalHeads.mesh = lamps;
  }
  const red = new THREE.Color(0xff3030);
  const green = new THREE.Color(0x33ff88);
  const amber = new THREE.Color(0xffb020);
  function updateSignals(t) {
    signalHeads.forEach((sg, i) => {
      const cycle = (t + sg.phase) % 12;
      const state = cycle < 5 ? 0 : cycle < 6.2 ? 1 : 2; // green, amber, red
      const y = KERB + 4.6 + (state === 0 ? -0.4 : state === 1 ? 0 : 0.4);
      const fz = sg.r === 0 ? 0.19 : -0.19;
      place(signalHeads.mesh, i, sg.x, y, sg.z + fz);
      signalHeads.mesh.setColorAt(i, state === 0 ? green : state === 1 ? amber : red);
    });
    signalHeads.mesh.instanceMatrix.needsUpdate = true;
    if (signalHeads.mesh.instanceColor) signalHeads.mesh.instanceColor.needsUpdate = true;
  }

  // ---------- cars: painted body + dark glass cabin + head/tail lights + light on the road ----------
  const LANES = [
    { x: 1.45, dir: -1, speed: 13 },
    { x: 4.35, dir: -1, speed: 9 },
    { x: -1.45, dir: 1, speed: 14 },
    { x: -4.35, dir: 1, speed: 10 },
  ];
  const PER_LANE = 9;
  const N = LANES.length * PER_LANE;
  const bodyGeo = mergeGeometries([
    new THREE.BoxGeometry(1.9, 0.62, 4.3).translate(0, 0.52, 0),
    new THREE.BoxGeometry(1.86, 0.18, 4.1).translate(0, 0.25, 0),
  ]);
  const bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ metalness: 0.55, roughness: 0.32 }), N);
  const cabins = new THREE.InstancedMesh(new THREE.BoxGeometry(1.62, 0.55, 2.1).translate(0, 1.1, 0.25), new THREE.MeshStandardMaterial({ color: 0x0a1220, metalness: 0.8, roughness: 0.15 }), N);
  // lights live at the car's front (-z in car space) and back (+z)
  const headGeo = mergeGeometries([new THREE.BoxGeometry(0.42, 0.16, 0.05).translate(-0.62, 0.58, -2.16), new THREE.BoxGeometry(0.42, 0.16, 0.05).translate(0.62, 0.58, -2.16)]);
  const tailGeo = mergeGeometries([new THREE.BoxGeometry(0.45, 0.14, 0.05).translate(-0.65, 0.62, 2.16), new THREE.BoxGeometry(0.45, 0.14, 0.05).translate(0.65, 0.62, 2.16)]);
  const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshBasicMaterial({ color: 0xfff6dc }), N);
  const tails = new THREE.InstancedMesh(tailGeo, new THREE.MeshBasicMaterial({ color: 0xff2a3a }), N);
  const beamGeo = new THREE.PlaneGeometry(2.6, 9).rotateX(-Math.PI / 2).translate(0, 0.05, -6.8);
  const beams = new THREE.InstancedMesh(beamGeo, new THREE.MeshBasicMaterial({ map: glowTexture('rgba(255,240,210,0.42)', 'rgba(255,240,210,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), N);
  const paints = [0xd8dbe2, 0x1b1d22, 0x8a9099, 0x9b1c1c, 0x1f3f8f, 0x2f4f3a, 0xe0c35a, 0xffffff, 0x3a3d44, 0x6b1d5c];
  const paint = new THREE.Color();
  const cars = [];
  LANES.forEach((lane, li) => {
    for (let k = 0; k < PER_LANE; k++) {
      cars.push({ lane, z: zStart + (k + rand() * 0.6) * (LEN / PER_LANE), v: lane.speed * (0.85 + rand() * 0.3) });
      bodies.setColorAt(li * PER_LANE + k, paint.set(paints[Math.floor(rand() * paints.length)]));
    }
  });
  scene.add(bodies, cabins, heads, tails, beams);
  function updateCars(dt) {
    cars.forEach((c, i) => {
      c.z += c.lane.dir * c.v * dt;
      if (c.z < zStart) c.z = zEnd;
      if (c.z > zEnd) c.z = zStart;
      const rot = c.lane.dir < 0 ? 0 : Math.PI; // car model faces -z
      for (const m of [bodies, cabins, heads, tails, beams]) place(m, i, c.lane.x, 0, c.z, 1, 1, 1, rot);
    });
    for (const m of [bodies, cabins, heads, tails, beams]) m.instanceMatrix.needsUpdate = true;
  }

  updateCars(0);
  updateSignals(0);
  return {
    kerb: KERB,
    update(dt, t) {
      updateCars(dt);
      updateSignals(t);
    },
  };
}
