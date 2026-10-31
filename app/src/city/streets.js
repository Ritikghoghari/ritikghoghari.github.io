import * as THREE from 'three';
import { glowTexture } from './facade.js';
import { wetRoad, wetRoadMaterialOptions } from './road.js';

const KERB = 0.25; // sidewalk height

// Roads, sidewalks, crossings and street lamps. Everything repeated is instanced.
export function buildStreets(scene, { BLOCK_X, BLOCK_Z, AVENUE_HALF, fog, density, mirror, mirrorScale }) {
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
  const LAMPS = [zEnd - 4, 16, AVENUE_HALF - 0.8, 8]; // street-lamp layout for analytic reflections
  const aveGeo = new THREE.PlaneGeometry(AVENUE_HALF * 2, LEN);
  const roadOpts = { map: aveTex, repeat: new THREE.Vector2(1, LEN / 12), fog, density, lamps: LAMPS };
  // real mirror reflections (lower resolution on phones); falls back to the cheap version if the device is slow
  const plain = wetRoad(aveGeo, { ...roadOpts, mirror: false });
  const avenues = [plain];
  if (mirror) avenues.push(wetRoad(aveGeo, { ...roadOpts, mirror: true, mirrorScale }));
  for (const a of avenues) {
    a.rotation.x = -Math.PI / 2;
    a.position.set(0, 0.02, zMid);
    scene.add(a);
  }
  plain.visible = !mirror;

  const crossTex = asphalt(256, 64, (g) => {
    g.fillStyle = 'rgba(235,235,235,0.6)';
    for (let x = 0; x < 256; x += 32) g.fillRect(x, 31, 16, 2);
  });
  const crossMat = new THREE.ShaderMaterial(wetRoadMaterialOptions({ map: crossTex, repeat: new THREE.Vector2(220 / 24, 1), fog, density, lamps: LAMPS, mirror: false }));
  for (const z of BLOCK_Z) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(220, 6), crossMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(0, 0.015, z - 12);
    scene.add(r);
  }
  // side streets between block columns
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x0e1016, roughness: 0.25, metalness: 0.2 });
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
  // strips along the avenue, broken where the cross streets meet it
  const strips = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, KERB, 20), paveMat, BLOCK_Z.length * 2);
  let si = 0;
  for (const sx of [-1, 1]) for (const bz of BLOCK_Z) place(strips, si++, sx * (AVENUE_HALF + 1.2), KERB / 2, bz);
  scene.add(strips);

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
    const poolMat = new THREE.MeshBasicMaterial({ map: glowTexture('rgba(255,200,130,0.36)', 'rgba(255,200,130,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
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
    const halo = new THREE.PointsMaterial({ map: glowTexture('rgba(255,215,160,0.3)', 'rgba(255,215,160,0)'), size: 3.2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    scene.add(poles, arms, heads, pools, new THREE.Points(bg, new THREE.PointsMaterial({ color: 0xffd9a0, size: 1.3, transparent: true, depthWrite: false })), new THREE.Points(bg, halo));
  }

  return {
    kerb: KERB,
    // swap the mirror avenue for the cheap one (slow devices)
    setRain(on) {
      for (const m of [crossMat, ...avenues.map((a) => a.material)]) m.uniforms.uRain.value = on ? 1 : 0;
    },
    dropMirror() {
      if (avenues.length < 2) return;
      avenues[1].visible = false;
      plain.visible = true;
    },
  };
}
