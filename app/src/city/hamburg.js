import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { facadeMaterial, STYLE } from './facade.js';

// Hamburg: the Elbe with the harbour beyond the end of the avenue (container cranes and stacks on the far
// bank), a bridge carrying the avenue over the river, the Elbphilharmonie on its pier and the Michel
// church tower in the skyline. Units are metres, like the rest of the city.
export const RIVER_NORTH = -246; // the city's ground ends here; water starts

export function buildHamburg(scene, { rand, fog, density, KERB, AVENUE_HALF, michel }) {
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const UP = THREE.Object3D.DEFAULT_UP;
  const place = (mesh, i, x, y, z, sx = 1, sy = 1, sz = 1, rot = 0) => {
    q.setFromAxisAngle(UP, rot);
    mesh.setMatrixAt(i, m4.compose(v.set(x, y, z), q, s.set(sx, sy, sz)));
  };
  const flash = []; // blinking red lights on crane tops

  // ---------- the Elbe ----------
  const FAR_BANK = -430;
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, RIVER_NORTH - FAR_BANK),
    new THREE.MeshStandardMaterial({ color: 0x0a1424, metalness: 0.85, roughness: 0.18, envMapIntensity: 1.2 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -1.2, (RIVER_NORTH + FAR_BANK) / 2);
  scene.add(water);

  // quay walls (brick) on both banks, and the far bank's ground
  const brick = new THREE.MeshStandardMaterial({ color: 0x4a2219, roughness: 0.9 });
  const quayN = new THREE.Mesh(new THREE.BoxGeometry(1400, 2.4, 2), brick);
  quayN.position.set(0, -0.6, RIVER_NORTH - 1);
  const quayS = quayN.clone();
  quayS.position.z = FAR_BANK + 1;
  const farGround = new THREE.Mesh(new THREE.PlaneGeometry(1400, 600), new THREE.MeshStandardMaterial({ color: 0x0d0e13, roughness: 1 }));
  farGround.rotation.x = -Math.PI / 2;
  farGround.position.set(0, 0, FAR_BANK - 300);
  scene.add(quayN, quayS, farGround);

  // ---------- bridge carrying the avenue over the river ----------
  {
    const deckLen = RIVER_NORTH - FAR_BANK + 4;
    const deckZ = (RIVER_NORTH + FAR_BANK) / 2;
    const steel = new THREE.MeshStandardMaterial({ color: 0x3b4352, metalness: 0.6, roughness: 0.45 });
    const asphalt = new THREE.MeshStandardMaterial({ color: 0x111319, roughness: 0.35, metalness: 0.2 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(AVENUE_HALF * 2 + 6, 1.2, deckLen), asphalt);
    deck.position.set(0, -0.58, deckZ);
    const parts = [];
    for (const sx of [-1, 1]) {
      parts.push(new THREE.BoxGeometry(0.3, 1.1, deckLen).translate(sx * (AVENUE_HALF + 2.8), 0.55, deckZ)); // railing
      // steel arch truss along each side
      const n = 14;
      for (let i = 0; i <= n; i++) {
        const z = RIVER_NORTH - (i / n) * (RIVER_NORTH - FAR_BANK);
        const h = 4 + 14 * Math.sin((i / n) * Math.PI);
        parts.push(new THREE.BoxGeometry(0.35, h, 0.35).translate(sx * (AVENUE_HALF + 3.2), h / 2, z));
      }
      for (let i = 0; i < n; i++) {
        const z0 = RIVER_NORTH - (i / n) * (RIVER_NORTH - FAR_BANK);
        const z1 = RIVER_NORTH - ((i + 1) / n) * (RIVER_NORTH - FAR_BANK);
        const h0 = 4 + 14 * Math.sin((i / n) * Math.PI);
        const h1 = 4 + 14 * Math.sin(((i + 1) / n) * Math.PI);
        const len = Math.hypot(z1 - z0, h1 - h0);
        const g = new THREE.BoxGeometry(0.5, 0.5, len);
        g.rotateX(-Math.atan2(h1 - h0, z1 - z0)); // align the beam with the chord segment
        g.translate(sx * (AVENUE_HALF + 3.2), (h0 + h1) / 2, (z0 + z1) / 2);
        parts.push(g);
      }
    }
    const truss = new THREE.Mesh(mergeGeometries(parts), steel);
    // lights along the bridge
    const lp = [];
    for (let z = RIVER_NORTH - 6; z > FAR_BANK; z -= 18) for (const sx of [-1, 1]) lp.push(sx * (AVENUE_HALF + 2.8), 1.6, z);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lp), 3));
    scene.add(deck, truss, new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xffe2b0, size: 1.4, transparent: true, depthWrite: false })));
  }

  // ---------- harbour on the far bank: container cranes + container stacks ----------
  {
    const craneParts = [
      ...[[-5, -4], [5, -4], [-5, 4], [5, 4]].map(([x, z]) => new THREE.BoxGeometry(0.9, 30, 0.9).translate(x, 15, z)), // legs
      new THREE.BoxGeometry(11, 1.4, 9.8).translate(0, 30, 0), // portal
      new THREE.BoxGeometry(2.2, 2, 62).translate(0, 33, 8), // boom out over the water (+z = north)
      new THREE.BoxGeometry(5, 4, 6).translate(0, 32.5, -4), // machine house
      new THREE.BoxGeometry(0.4, 10, 0.4).translate(0, 39, -10).rotateX(0), // A-frame
    ];
    const craneGeo = mergeGeometries(craneParts.map((g) => g.toNonIndexed()));
    const cranes = [];
    for (let x = -260; x <= 260; x += 52) if (Math.abs(x) > 30) cranes.push(x + (rand() - 0.5) * 10);
    const craneMesh = new THREE.InstancedMesh(craneGeo, new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.3 }), cranes.length);
    const col = new THREE.Color();
    cranes.forEach((x, i) => {
      place(craneMesh, i, x, 0, FAR_BANK - 10);
      craneMesh.setColorAt(i, col.set(i % 3 === 0 ? 0x2b5aa8 : 0xb8322a));
      flash.push(x, 43, FAR_BANK - 14);
    });
    scene.add(craneMesh);

    const stacks = [];
    const CONT = [0xb8322a, 0x2b5aa8, 0x2f7a55, 0xc98a2b, 0x7d7f86, 0xe0e0e0, 0x5a2f7a, 0x1e5f74];
    for (let row = 0; row < 7; row++) {
      for (let x = -280; x <= 280; x += 6.6) {
        if (Math.abs(x) < 20 || rand() < 0.15) continue;
        const h = 1 + Math.floor(rand() * 4);
        for (let k = 0; k < h; k++) stacks.push([x, k * 2.6 + 1.3, FAR_BANK - 30 - row * 14, CONT[Math.floor(rand() * CONT.length)]]);
      }
    }
    const contMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(6.1, 2.55, 2.45), new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.2 }), stacks.length);
    stacks.forEach(([x, y, z, c], i) => {
      place(contMesh, i, x, y, z, 1, 1, 1, Math.PI / 2 + (rand() < 0.5 ? 0 : 0));
      contMesh.setColorAt(i, col.set(c).multiplyScalar(0.75 + rand() * 0.35));
    });
    contMesh.frustumCulled = false;
    scene.add(contMesh);
    // yard floodlights
    const fl = [];
    for (let x = -270; x <= 270; x += 30) fl.push(x, 22, FAR_BANK - 60 - rand() * 50);
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(fl), 3));
    scene.add(new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xfff1d0, size: 3, transparent: true, depthWrite: false })));
  }

  // ---------- Elbphilharmonie: brick warehouse base, wavy glass crown ----------
  {
    const ex = -95;
    const ez = RIVER_NORTH - 46;
    const pier = new THREE.Mesh(new THREE.BoxGeometry(90, 2.4, 44), brick);
    pier.position.set(ex, -0.4, ez);
    const base = new THREE.Mesh(new THREE.BoxGeometry(80, 26, 34).translate(0, 13, 0), facadeMaterial({ fog, density, style: STYLE.BRICK, seed: 0.31, litRatio: 0.12 }));
    base.position.set(ex, 0.8, ez);
    const crownGeo = new THREE.BoxGeometry(80, 30, 34, 40, 6, 18).translate(0, 15, 0);
    const pos = crownGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (y > 29.9) {
        // the famous wave: peaks towards the west end, troughs in between
        const t = (x + 40) / 80;
        const wave = 12 * Math.pow(1 - t, 1.4) + 6 * Math.sin(t * Math.PI * 3.2) * (0.6 + 0.4 * Math.cos((z / 17) * Math.PI));
        pos.setY(i, y + wave);
      }
    }
    crownGeo.computeVertexNormals();
    const crown = new THREE.Mesh(crownGeo, facadeMaterial({ fog, density, style: STYLE.GLASS, tint: 0xdfe8ff, seed: 0.77, litRatio: 0.42 }));
    crown.position.set(ex, 26.8, ez);
    scene.add(pier, base, crown);
  }

  // ---------- St. Michaelis ("Michel"): brick tower with a green copper spire ----------
  if (michel) {
    const [mx, mz] = michel;
    const nave = new THREE.Mesh(new THREE.BoxGeometry(16, 20, 18).translate(0, 10, 0), facadeMaterial({ fog, density, style: STYLE.BRICK, seed: 0.55, litRatio: 0.2 }));
    nave.position.set(mx, KERB, mz + 2);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 12.5, 7, 4, 1).rotateY(Math.PI / 4).scale(0.9, 1, 1), new THREE.MeshStandardMaterial({ color: 0x3f7f6a, roughness: 0.6, metalness: 0.3 }));
    roof.position.set(mx, KERB + 23.5, mz + 2);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(9, 46, 9).translate(0, 23, 0), facadeMaterial({ fog, density, style: STYLE.BRICK, seed: 0.12, litRatio: 0.1 }));
    tower.position.set(mx, KERB, mz - 8);
    const copper = new THREE.MeshStandardMaterial({ color: 0x4d9a82, roughness: 0.55, metalness: 0.35, emissive: 0x0c2a22, emissiveIntensity: 0.6 });
    const spire = new THREE.Group();
    const stage = (rTop, rBot, h, y) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 8), copper);
      m.position.y = y + h / 2;
      spire.add(m);
    };
    stage(3.6, 4.6, 8, 0);
    stage(2.4, 3.4, 7, 8);
    stage(1.8, 2.3, 6, 15);
    stage(0.05, 1.7, 14, 21);
    spire.position.set(mx, KERB + 46, mz - 8);
    // lit clock faces
    const clockMat = new THREE.MeshBasicMaterial({ color: 0xffe9b8 });
    for (let k = 0; k < 4; k++) {
      const c = new THREE.Mesh(new THREE.CircleGeometry(2, 24), clockMat);
      const a = (k * Math.PI) / 2;
      c.position.set(mx + Math.sin(a) * 4.56, KERB + 40, mz - 8 + Math.cos(a) * 4.56);
      c.rotation.y = a;
      scene.add(c);
    }
    scene.add(nave, roof, tower, spire);
  }

  // blinking aviation lights on the cranes
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(flash), 3));
  const flashPts = new THREE.Points(fgeo, new THREE.PointsMaterial({ color: 0xff3b3b, size: 2.4, transparent: true, depthWrite: false }));
  scene.add(flashPts);
  return {
    update(t) {
      flashPts.material.opacity = Math.sin(t * 2.1 + 1) > 0.3 ? 1 : 0.1;
    },
  };
}
