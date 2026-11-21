import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cityTime } from './facade.js';
import { signalPhase } from './traffic.js';

// Pedestrians: two instanced figure variants (short hair + jacket, long hair + coat) with hands, varied skin
// and hair colours, whose limbs swing in the vertex shader; about half carry umbrellas while it rains. Walkers stroll along both avenue sidewalks;
// small groups wait at the zebra crossings and cross when the avenue has red.
const PART = { BODY: 0, LEG_L: 1, LEG_R: 2, ARM_L: 3, ARM_R: 4 };

// Colour codes in the vertex colours: 1 = jacket (per person), -1 = trousers, -2 = skin, -3 = hair (per person).
const JACKET = [1, 1, 1];
const PANTS_C = [-1, -1, -1];
const SKIN_C = [-2, -2, -2];
const HAIR_C = [-3, -3, -3];
const SHOE = [0.05, 0.05, 0.055];

// variant 0: short hair, jacket; variant 1: long hair, knee-length coat
function figureGeometry(variant) {
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
  // torso with shoulders, hips, neck and head
  add(new THREE.CapsuleGeometry(0.2, 0.34, 4, 10).scale(1.08, 1, 0.6), PART.BODY, JACKET, 0, 1.2, 0);
  add(new THREE.CapsuleGeometry(0.15, 0.08, 3, 8).scale(1.1, 1, 0.7), PART.BODY, variant ? JACKET : PANTS_C, 0, 0.93, 0);
  if (variant) add(new THREE.CylinderGeometry(0.21, 0.27, 0.42, 10, 1, true), PART.BODY, JACKET, 0, 0.78, 0); // coat skirt
  add(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 8), PART.BODY, SKIN_C, 0, 1.5, 0);
  add(new THREE.SphereGeometry(0.1, 12, 10).scale(0.92, 1.12, 1), PART.BODY, SKIN_C, 0, 1.63, 0);
  add(new THREE.SphereGeometry(0.105, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52).scale(0.95, 1.05, 1.02), PART.BODY, HAIR_C, 0, 1.65, 0.008);
  if (variant) add(new THREE.CapsuleGeometry(0.075, 0.18, 2, 8).scale(1.2, 1, 0.6), PART.BODY, HAIR_C, 0, 1.52, 0.07); // long hair at the back
  // legs and shoes
  add(new THREE.CapsuleGeometry(0.066, 0.7, 3, 8), PART.LEG_L, PANTS_C, -0.09, 0.48, 0);
  add(new THREE.CapsuleGeometry(0.066, 0.7, 3, 8), PART.LEG_R, PANTS_C, 0.09, 0.48, 0);
  add(new THREE.BoxGeometry(0.1, 0.07, 0.25).translate(0, 0, -0.03), PART.LEG_L, SHOE, -0.09, 0.035, 0);
  add(new THREE.BoxGeometry(0.1, 0.07, 0.25).translate(0, 0, -0.03), PART.LEG_R, SHOE, 0.09, 0.035, 0);
  // arms with hands
  add(new THREE.CapsuleGeometry(0.05, 0.48, 3, 8), PART.ARM_L, JACKET, -0.255, 1.13, 0);
  add(new THREE.CapsuleGeometry(0.05, 0.48, 3, 8), PART.ARM_R, JACKET, 0.255, 1.13, 0);
  add(new THREE.SphereGeometry(0.045, 8, 6), PART.ARM_L, SKIN_C, -0.255, 0.83, 0);
  add(new THREE.SphereGeometry(0.045, 8, 6), PART.ARM_R, SKIN_C, 0.255, 0.83, 0);
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
        attribute float aPart; attribute float aPhase; attribute float aWalk; attribute vec3 aPants; attribute vec3 aSkin; attribute vec3 aHair;
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
        if (color.r < -2.5) vColor.rgb = aHair;
        else if (color.r < -1.5) vColor.rgb = aSkin;
        else if (color.r < 0.0) vColor.rgb = aPants;
        else if (color.r > 0.99) vColor.rgb *= instanceColor.rgb;`,
      );
  };
  return mat;
}

const JACKETS = [0x2b2f3a, 0x1d1f24, 0x6b2b2b, 0x2e4a6b, 0x8a7a5a, 0x3f5a46, 0xb8b2a6, 0x7a3b6b, 0xc46a2a, 0x4a4f5a, 0x9a2f3a, 0x23395b];
const PANTS = [0x15171c, 0x1e2a44, 0x2b2b2b, 0x4a3f33, 0x30363f, 0x5a5048];
const SKINS = [0xf1c8a8, 0xe0ac86, 0xc68a62, 0x9c6844, 0x6e4630, 0xf5d3bd];
const HAIRS = [0x15110e, 0x2b1d14, 0x4a3020, 0x7a5a3a, 0xb8925a, 0x8a8a8a, 0x1a1a1a];
const UMBRELLAS = [0x111317, 0x1b2a4a, 0x7a1424, 0x2a4a33, 0x3a3a3a, 0xd8c07a];

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

  // two body variants, each one instanced mesh
  const col = new THREE.Color();
  const variants = [0, 1].map((variant) => {
    const list = people.filter((_, i) => i % 2 === variant);
    const geo = figureGeometry(variant);
    const n = list.length;
    const phase = new Float32Array(n);
    const walk = new Float32Array(n);
    const pants = new Float32Array(n * 3);
    const skin = new Float32Array(n * 3);
    const hair = new Float32Array(n * 3);
    const mesh = new THREE.InstancedMesh(geo, walkerMaterial(), n);
    list.forEach((p, k) => {
      p.mesh = variant;
      p.slot = k;
      phase[k] = rand() * 6.28;
      walk[k] = p.kind === 'walk' ? 1 : 0;
      col.set(PANTS[Math.floor(rand() * PANTS.length)]).toArray(pants, k * 3);
      col.set(SKINS[Math.floor(rand() * SKINS.length)]).toArray(skin, k * 3);
      col.set(HAIRS[Math.floor(rand() * HAIRS.length)]).toArray(hair, k * 3);
      mesh.setColorAt(k, col.set(JACKETS[Math.floor(rand() * JACKETS.length)]).multiplyScalar(0.8 + rand() * 0.4));
      p.scale = (variant ? 0.9 : 0.95) + rand() * 0.14;
      p.umbrella = rand() < 0.55;
    });
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
    const walkAttr = new THREE.InstancedBufferAttribute(walk, 1);
    walkAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aWalk', walkAttr);
    geo.setAttribute('aPants', new THREE.InstancedBufferAttribute(pants, 3));
    geo.setAttribute('aSkin', new THREE.InstancedBufferAttribute(skin, 3));
    geo.setAttribute('aHair', new THREE.InstancedBufferAttribute(hair, 3));
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { mesh, walk, walkAttr };
  });

  // umbrellas for about half the people while it rains
  const umbrellaGeo = mergeGeometries([
    new THREE.ConeGeometry(0.56, 0.24, 10, 1, true).translate(0, 0.12, 0).toNonIndexed(),
    new THREE.CylinderGeometry(0.012, 0.012, 0.75, 5).translate(0, -0.3, 0).toNonIndexed(),
  ]);
  const withUmbrella = people.filter((p) => p.umbrella);
  const umbrellas = new THREE.InstancedMesh(umbrellaGeo, new THREE.MeshStandardMaterial({ roughness: 0.55, side: THREE.DoubleSide }), withUmbrella.length);
  withUmbrella.forEach((p, k) => {
    p.uSlot = k;
    umbrellas.setColorAt(k, col.set(UMBRELLAS[Math.floor(rand() * UMBRELLAS.length)]));
  });
  umbrellas.frustumCulled = false;
  scene.add(umbrellas);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const UP = THREE.Object3D.DEFAULT_UP;
  // sidewalks are raised; the gaps where cross streets meet the avenue are at road level
  const groundY = (z) => (CROSS.some((zc) => Math.abs(z - zc) < 2) ? 0 : KERB);

  function update(dt, t) {
    zebraBusy?.fill(0);
    people.forEach((p) => {
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
        variants[p.mesh].walk[p.slot] = p.walking ? 1 : 0;
        if (p.walking && zebraBusy) zebraBusy[p.c] = 1;
        rot = p.walking ? (p.from > 0 ? Math.PI / 2 : -Math.PI / 2) : p.from > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      const y = p.kind === 'walk' ? groundY(p.z) : Math.abs(p.x) > AVENUE_HALF ? KERB : 0;
      q.setFromAxisAngle(UP, rot);
      variants[p.mesh].mesh.setMatrixAt(p.slot, m4.compose(v.set(p.x, y, p.z), q, s.setScalar(p.scale)));
      if (p.umbrella) umbrellas.setMatrixAt(p.uSlot, m4.compose(v.set(p.x + Math.sin(rot) * -0.05, y + 2.02 * p.scale, p.z + Math.cos(rot) * -0.05), q, s.setScalar(1)));
    });
    for (const vr of variants) {
      vr.mesh.instanceMatrix.needsUpdate = true;
      vr.walkAttr.needsUpdate = true;
    }
    umbrellas.instanceMatrix.needsUpdate = true;
  }
  update(0, 4);
  return {
    update,
    setRain(on) {
      umbrellas.visible = on;
    },
  };
}
