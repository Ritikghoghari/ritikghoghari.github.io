import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cityTime } from './facade.js';
import { signalPhase } from './traffic.js';

// Pedestrians: one instanced figure (torso, head, hair, arms, legs) whose limbs swing in the vertex
// shader, so hundreds of walkers cost one draw call. Walkers stroll along both avenue sidewalks;
// small groups wait at the zebra crossings and cross when the avenue has red.
const PART = { BODY: 0, LEG_L: 1, LEG_R: 2, ARM_L: 3, ARM_R: 4 };

function figureGeometry() {
  const parts = [];
  const add = (geo, part, rgb, x, y, z) => {
    geo = (geo.index ? geo.toNonIndexed() : geo).translate(x, y, z);
    geo.deleteAttribute('uv');
    const n = geo.attributes.position.count;
    geo.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n).fill(part), 1));
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set(rgb, i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    parts.push(geo);
  };
  const TOP = [1, 1, 1]; // tinted per person (jacket)
  const SKIN = [0.72, 0.53, 0.42];
  const LEGS = [-1, -1, -1]; // marker: tinted by per-person trousers colour
  add(new THREE.CapsuleGeometry(0.19, 0.36, 3, 8).scale(1, 1, 0.62), PART.BODY, TOP, 0, 1.19, 0);
  add(new THREE.SphereGeometry(0.105, 10, 8), PART.BODY, SKIN, 0, 1.6, 0);
  add(new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), PART.BODY, [0.08, 0.06, 0.05], 0, 1.615, 0.008);
  add(new THREE.CapsuleGeometry(0.07, 0.72, 2, 6), PART.LEG_L, LEGS, -0.095, 0.47, 0);
  add(new THREE.CapsuleGeometry(0.07, 0.72, 2, 6), PART.LEG_R, LEGS, 0.095, 0.47, 0);
  add(new THREE.BoxGeometry(0.13, 0.06, 0.24), PART.LEG_L, [0.05, 0.05, 0.05], -0.095, 0.03, -0.04);
  add(new THREE.BoxGeometry(0.13, 0.06, 0.24), PART.LEG_R, [0.05, 0.05, 0.05], 0.095, 0.03, -0.04);
  add(new THREE.CapsuleGeometry(0.052, 0.5, 2, 6), PART.ARM_L, TOP, -0.25, 1.15, 0);
  add(new THREE.CapsuleGeometry(0.052, 0.5, 2, 6), PART.ARM_R, TOP, 0.25, 1.15, 0);
  return mergeGeometries(parts);
}

function walkerMaterial() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = cityTime;
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        attribute float aPart; attribute float aPhase; attribute float aWalk; attribute vec3 aPants;
        vec3 swing(vec3 p, float pivot, float a) {
          p.y -= pivot;
          float c = cos(a), s = sin(a);
          p = vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
          p.y += pivot;
          return p;
        }`,
      )
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3(position);
        float ph = uTime * 5.6 + aPhase;
        float sw = sin(ph) * 0.5 * aWalk;
        if (aPart > 0.5 && aPart < 1.5) transformed = swing(transformed, 0.9, sw);
        else if (aPart > 1.5 && aPart < 2.5) transformed = swing(transformed, 0.9, -sw);
        else if (aPart > 2.5 && aPart < 3.5) transformed = swing(transformed, 1.42, -sw * 0.8);
        else if (aPart > 3.5) transformed = swing(transformed, 1.42, sw * 0.8);
        transformed.y += abs(cos(ph)) * 0.035 * aWalk;`,
      )
      .replace(
        '#include <color_vertex>',
        `vColor = color;
        if (color.r < 0.0) vColor.rgb = aPants;
        else if (color.r > 0.99) vColor.rgb *= instanceColor.rgb;`,
      );
  };
  return mat;
}

const JACKETS = [0x2b2f3a, 0x1d1f24, 0x6b2b2b, 0x2e4a6b, 0x8a7a5a, 0x3f5a46, 0xb8b2a6, 0x7a3b6b, 0xc46a2a, 0x4a4f5a, 0x9a2f3a, 0x23395b];
const PANTS = [0x15171c, 0x1e2a44, 0x2b2b2b, 0x4a3f33, 0x30363f];

export function buildPeople(scene, { rand, BLOCK_Z, AVENUE_HALF, KERB, quality, stops, zebraBusy }) {
  const high = quality === 'high';
  const CROSS = BLOCK_Z.map((bz) => bz - 12);
  const zEnd = 168;
  const zStart = -226;
  const people = [];

  // sidewalk walkers: both sides, both directions
  const nWalk = high ? 90 : 36;
  for (let i = 0; i < nWalk; i++) {
    const side = i % 2 ? 1 : -1;
    const dir = rand() < 0.5 ? 1 : -1;
    const lineX = side * (AVENUE_HALF + 1.65 + (dir > 0 ? 0.35 : -0.35) * side + (rand() - 0.5) * 0.3);
    people.push({ kind: 'walk', x: lineX, z: zStart + rand() * (zEnd - zStart), dir, speed: 1.1 + rand() * 0.5 });
  }
  // groups at zebra crossings near the tour stops
  const crossings = new Set();
  for (const s of stops) {
    let best = 0;
    CROSS.forEach((z, c) => {
      if (Math.abs(z - s.cam[2] + 20) < Math.abs(CROSS[best] - s.cam[2] + 20)) best = c;
    });
    crossings.add(best);
  }
  const perCrossing = high ? 4 : 2;
  for (const c of crossings) {
    for (const zs of [4.4, -4.4]) {
      for (let k = 0; k < perCrossing; k++) {
        const from = rand() < 0.5 ? -1 : 1;
        people.push({
          kind: 'cross', c, z: CROSS[c] + zs + (rand() - 0.5) * 1.6,
          x: from * (AVENUE_HALF + 0.6 + rand() * 0.5), from, speed: 1.55 + rand() * 0.35, walking: false, delay: rand() * 0.5,
        });
      }
    }
  }

  const geo = figureGeometry();
  const n = people.length;
  const phase = new Float32Array(n);
  const walk = new Float32Array(n);
  const pants = new Float32Array(n * 3);
  const col = new THREE.Color();
  const mesh = new THREE.InstancedMesh(geo, walkerMaterial(), n);
  people.forEach((p, i) => {
    phase[i] = rand() * 6.28;
    walk[i] = p.kind === 'walk' ? 1 : 0;
    col.set(PANTS[Math.floor(rand() * PANTS.length)]).toArray(pants, i * 3);
    mesh.setColorAt(i, col.set(JACKETS[Math.floor(rand() * JACKETS.length)]).multiplyScalar(0.8 + rand() * 0.4));
    p.scale = 0.92 + rand() * 0.14;
  });
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
  const walkAttr = new THREE.InstancedBufferAttribute(walk, 1);
  walkAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aWalk', walkAttr);
  geo.setAttribute('aPants', new THREE.InstancedBufferAttribute(pants, 3));
  mesh.frustumCulled = false;
  scene.add(mesh);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const UP = THREE.Object3D.DEFAULT_UP;
  // sidewalks are raised; the gaps where cross streets meet the avenue are at road level
  const groundY = (z) => (CROSS.some((zc) => Math.abs(z - zc) < 2) ? 0 : KERB);

  function update(dt, t) {
    zebraBusy?.fill(0);
    people.forEach((p, i) => {
      let rot;
      if (p.kind === 'walk') {
        p.z += p.dir * p.speed * dt;
        if (p.z > zEnd) p.z = zStart;
        if (p.z < zStart) p.z = zEnd;
        rot = p.dir < 0 ? 0 : Math.PI;
      } else {
        // walk across while the avenue is red, then wait on the far side for the next cycle
        const k = signalPhase(p.c, t);
        const target = -p.from * Math.abs(p.x);
        if (!p.walking && k > 10.2 + p.delay && k < 10.9 + p.delay && Math.sign(p.x) === p.from) p.walking = true;
        if (p.walking) {
          p.x += -p.from * p.speed * dt;
          if (Math.sign(p.x) === -p.from && Math.abs(p.x) >= Math.abs(target) - 0.01) {
            p.x = target;
            p.from = -p.from;
            p.walking = false;
          }
        }
        walk[i] = p.walking ? 1 : 0;
        if (p.walking && zebraBusy) zebraBusy[p.c] = 1;
        rot = p.walking ? (p.from > 0 ? Math.PI / 2 : -Math.PI / 2) : p.from > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      const y = p.kind === 'walk' ? groundY(p.z) : Math.abs(p.x) > AVENUE_HALF ? KERB : 0;
      q.setFromAxisAngle(UP, rot);
      mesh.setMatrixAt(i, m4.compose(v.set(p.x, y, p.z), q, s.setScalar(p.scale)));
    });
    mesh.instanceMatrix.needsUpdate = true;
    walkAttr.needsUpdate = true;
  }
  update(0, 4);
  return { update };
}
