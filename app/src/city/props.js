import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Street furniture and greenery: full-crowned trees, benches, bus shelters with lit ads, bins,
// hydrants, bollards and street-name signs. All repeated items are instanced.
const STREET_NAMES = ['Python St', 'SQL St', 'Pandas St', 'NumPy St', 'Tensor St', 'Kaggle St', 'Spark St', 'Keras St', 'Docker St', 'Git St', 'Linux St', 'Torch St', 'Excel St', 'Tableau St', 'Power BI St', 'Jupyter St'];

function colored(geo, rgb) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  geo.deleteAttribute('uv');
  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set(rgb, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

// A leafy crown: overlapping lumpy blobs, lighter on top, darker underneath.
function crownGeometry(rand, size = 1) {
  const blobs = [];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand();
    const r = i === 0 ? 0 : 0.55 + rand() * 0.45;
    const g = new THREE.IcosahedronGeometry((0.75 + rand() * 0.45) * size, 2);
    g.translate(Math.cos(a) * r * size, (i === 0 ? 0.35 : (rand() - 0.3) * 0.8) * size, Math.sin(a) * r * size);
    blobs.push(g); // IcosahedronGeometry is non-indexed
  }
  const geo = mergeGeometries(blobs.map((g) => (g.deleteAttribute('uv'), g)));
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // lumpy leaf clusters: displace along a pseudo-random direction derived from position
    const h = Math.sin(v.x * 7.1 + v.y * 3.3) * Math.cos(v.z * 6.7 - v.y * 2.1);
    v.multiplyScalar(1 + h * 0.09);
    pos.setXYZ(i, v.x, v.y, v.z);
    const k = THREE.MathUtils.clamp(0.55 + v.y * 0.35 / size, 0.35, 1.1) * (0.85 + 0.3 * Math.abs(h));
    col.set([0.11 * k, 0.24 * k, 0.12 * k], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.deleteAttribute('normal');
  const smooth = mergeVertices(geo, 1e-3); // shared vertices -> smooth, leafy shading instead of facets
  smooth.computeVertexNormals();
  return smooth;
}

function trunkGeometry() {
  const bark = [0.17, 0.12, 0.09];
  const parts = [colored(new THREE.CylinderGeometry(0.1, 0.17, 2.6, 7).translate(0, 1.3, 0), bark)];
  for (const [rz, ry] of [[0.6, 0], [-0.55, 2.1], [0.5, 4.0]]) {
    const b = new THREE.CylinderGeometry(0.035, 0.07, 1.2, 5).translate(0, 0.6, 0);
    b.rotateZ(rz).rotateY(ry).translate(0, 2.0, 0);
    parts.push(colored(b, bark));
  }
  return mergeGeometries(parts);
}

function benchGeometry() {
  const wood = [0.36, 0.22, 0.12];
  const metal = [0.12, 0.13, 0.15];
  const p = [];
  for (let i = 0; i < 3; i++) p.push(colored(new THREE.BoxGeometry(1.7, 0.04, 0.12).translate(0, 0.45, -0.17 + i * 0.15), wood));
  for (let i = 0; i < 2; i++) p.push(colored(new THREE.BoxGeometry(1.7, 0.1, 0.035).translate(0, 0.62 + i * 0.16, 0.2).rotateX(0), wood));
  for (const x of [-0.72, 0.72]) {
    p.push(colored(new THREE.BoxGeometry(0.05, 0.45, 0.4).translate(x, 0.225, 0), metal));
    p.push(colored(new THREE.BoxGeometry(0.05, 0.42, 0.05).translate(x, 0.66, 0.21), metal));
  }
  return mergeGeometries(p);
}

function adTexture(lines, hue) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, `hsl(${hue},70%,55%)`);
  grad.addColorStop(1, `hsl(${hue + 40},70%,22%)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 512);
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.textAlign = 'center';
  g.font = '700 34px "Space Grotesk", sans-serif';
  lines.forEach((l, i) => g.fillText(l, 128, 190 + i * 46));
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.beginPath();
  g.arc(128, 90, 46, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function bladeTexture(text) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#0f5c3a';
  g.fillRect(0, 0, 512, 96);
  g.strokeStyle = '#e8f5ee';
  g.lineWidth = 5;
  g.strokeRect(6, 6, 500, 84);
  g.fillStyle = '#ffffff';
  g.font = '700 52px "Inter", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function buildProps(scene, { rand, BLOCK_Z, AVENUE_HALF, KERB, parks, quality }) {
  const high = quality === 'high';
  const CROSS = BLOCK_Z.map((bz) => bz - 12);
  const nearCrossing = (z, d) => CROSS.some((zc) => Math.abs(z - zc) < d);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const UP = THREE.Object3D.DEFAULT_UP;
  const mat = (x, y, z, rot = 0, sc = 1, sy = sc) => (q.setFromAxisAngle(UP, rot), m4.compose(v.set(x, y, z), q, s.set(sc, sy, sc)));
  const vc = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const zEnd = 172;
  const zStart = -232;
  const curbX = AVENUE_HALF + 0.9; // furniture zone next to the kerb (lamps live here too)

  // ---------- trees: avenue (between lamps) + parks ----------
  const treeSpots = [];
  const shelterSpots = [];
  let idx = 0;
  for (let z = zEnd - 4; z > zStart; z -= 16) {
    for (const [x, tz] of [[-curbX, z - 8], [curbX, z]]) {
      if (tz < zStart + 4 || nearCrossing(tz, 3)) continue;
      if (idx++ % 7 === 3 && shelterSpots.length < 6) shelterSpots.push([x, tz]);
      else treeSpots.push([x, KERB, tz, 0.9 + rand() * 0.35]);
    }
  }
  for (const [px, pz] of parks) {
    for (let i = 0; i < 9; i++) treeSpots.push([px + (rand() - 0.5) * 14, KERB, pz + (rand() - 0.5) * 14, 1.05 + rand() * 0.45]);
  }
  {
    const crowns = [crownGeometry(rand), crownGeometry(rand), crownGeometry(rand)];
    const trunkGeo = trunkGeometry();
    const per = crowns.map(() => []);
    treeSpots.forEach((t, i) => per[i % crowns.length].push(t));
    const trunks = new THREE.InstancedMesh(trunkGeo, vc, treeSpots.length);
    const tint = new THREE.Color();
    treeSpots.forEach(([x, y, z, k], i) => trunks.setMatrixAt(i, mat(x, y, z, rand() * 6, k)));
    scene.add(trunks);
    crowns.forEach((g, ci) => {
      const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), per[ci].length);
      per[ci].forEach(([x, y, z, k], i) => {
        m.setMatrixAt(i, mat(x, y + 3.1 * k, z, rand() * 6, k, k * (0.9 + rand() * 0.25)));
        m.setColorAt(i, tint.setHSL(0.27 + rand() * 0.08, 0.5, 0.45 + rand() * 0.2));
      });
      scene.add(m);
    });
  }

  // ---------- benches, bins, hydrants along the avenue ----------
  {
    const benches = [];
    const bins = [];
    const hydrants = [];
    for (let z = zEnd - 8; z > zStart + 6; z -= 16) {
      for (const side of [-1, 1]) {
        const bz = z - (side < 0 ? 4 : 12);
        if (!nearCrossing(bz, 4) && rand() < 0.7) benches.push([side * (curbX + 0.15), bz, side < 0 ? -Math.PI / 2 : Math.PI / 2]);
        const binZ = bz + 2.2;
        if (!nearCrossing(binZ, 3) && rand() < 0.5) bins.push([side * (curbX + 0.05), binZ]);
      }
    }
    for (const zc of CROSS) for (const side of [-1, 1]) if (rand() < 0.6) hydrants.push([side * (curbX - 0.2), zc + side * 3.3]);
    const benchMesh = new THREE.InstancedMesh(benchGeometry(), vc, benches.length);
    benches.forEach(([x, z, r], i) => benchMesh.setMatrixAt(i, mat(x, KERB, z, r)));
    const binGeo = mergeGeometries([
      colored(new THREE.CylinderGeometry(0.24, 0.2, 0.85, 10).translate(0, 0.43, 0), [0.1, 0.2, 0.15]),
      colored(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 10).translate(0, 0.88, 0), [0.15, 0.16, 0.18]),
    ]);
    const binMesh = new THREE.InstancedMesh(binGeo, vc, bins.length);
    bins.forEach(([x, z], i) => binMesh.setMatrixAt(i, mat(x, KERB, z)));
    const hydGeo = mergeGeometries([
      colored(new THREE.CylinderGeometry(0.12, 0.15, 0.6, 8).translate(0, 0.3, 0), [0.55, 0.06, 0.05]),
      colored(new THREE.SphereGeometry(0.12, 8, 6).translate(0, 0.62, 0), [0.55, 0.06, 0.05]),
      colored(new THREE.CylinderGeometry(0.05, 0.05, 0.36, 6).rotateZ(Math.PI / 2).translate(0, 0.42, 0), [0.6, 0.55, 0.5]),
    ]);
    const hydMesh = new THREE.InstancedMesh(hydGeo, vc, hydrants.length);
    hydrants.forEach(([x, z], i) => hydMesh.setMatrixAt(i, mat(x, KERB, z)));
    // bollards at both ends of every zebra crossing
    const boll = [];
    for (const zc of CROSS) for (const zs of [4.4, -4.4]) for (const sx of [-1, 1]) for (const dz of [-1.1, 1.1]) boll.push([sx * (AVENUE_HALF + 0.35), zc + zs + dz]);
    const bollMesh = new THREE.InstancedMesh(
      mergeGeometries([colored(new THREE.CylinderGeometry(0.09, 0.1, 0.9, 8).translate(0, 0.45, 0), [0.14, 0.15, 0.17]), colored(new THREE.CylinderGeometry(0.095, 0.095, 0.08, 8).translate(0, 0.78, 0), [0.8, 0.8, 0.75])]),
      vc,
      boll.length,
    );
    boll.forEach(([x, z], i) => bollMesh.setMatrixAt(i, mat(x, KERB, z)));
    for (const m of [benchMesh, binMesh, hydMesh, bollMesh]) m.frustumCulled = false;
    scene.add(benchMesh, binMesh, hydMesh, bollMesh);
  }

  // ---------- bus shelters: frame, glass, bench, a lit advert panel ----------
  {
    const frame = new THREE.MeshStandardMaterial({ color: 0x2a2e36, metalness: 0.7, roughness: 0.35 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x9fb8c8, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false });
    const ads = [
      adTexture(['Hire Ritik', 'Data Scientist', 'AI · ML · BI'], 175),
      adTexture(['Insights', 'from data', 'in minutes'], 265),
      adTexture(['Berlin', 'Data Week', '2026'], 330),
      adTexture(['GenAI', 'that ships'], 30),
    ];
    const frameGeo = mergeGeometries([
      ...[[-1.9, -0.6], [1.9, -0.6], [-1.9, 0.6], [1.9, 0.6]].map(([z, x]) => new THREE.BoxGeometry(0.07, 2.4, 0.07).translate(x, 1.2, z)),
      new THREE.BoxGeometry(1.5, 0.1, 4.1).translate(0, 2.45, 0),
      new THREE.BoxGeometry(0.4, 0.05, 3.2).translate(0.2, 0.45, 0),
    ]);
    shelterSpots.forEach(([x, z], i) => {
      const g = new THREE.Group();
      const side = Math.sign(x);
      const f = new THREE.Mesh(frameGeo, frame);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.1), glass);
      back.rotation.y = Math.PI / 2;
      back.position.set(-0.6, 1.25, 0);
      const endPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.1), glass);
      endPanel.position.set(0, 1.25, 1.9);
      const ad = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.9), new THREE.MeshBasicMaterial({ map: ads[i % ads.length], toneMapped: false, side: THREE.DoubleSide }));
      ad.position.set(0, 1.25, -1.9);
      g.add(f, back, endPanel, ad);
      // back faces the road; the open side faces the walkers
      g.rotation.y = side > 0 ? 0 : Math.PI;
      g.position.set(x + side * 0.1, KERB, z);
      scene.add(g);
    });
  }

  // ---------- street-name signs at every crossing ----------
  {
    const pole = new THREE.MeshStandardMaterial({ color: 0x3a3f48, metalness: 0.6, roughness: 0.4 });
    const avenueTex = bladeTexture('Insight Ave');
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.06, 3.4, 6);
    CROSS.forEach((zc, c) => {
      if (!high && c % 2) return; // fewer draw calls on phones
      const crossTex = bladeTexture(STREET_NAMES[c % STREET_NAMES.length]);
      for (const side of [-1, 1]) {
        const x = side * (AVENUE_HALF + 1.0);
        const z = zc + side * 2.6;
        const p = new THREE.Mesh(poleGeo, pole);
        p.position.set(x, KERB + 1.7, z);
        scene.add(p);
        const blade = (tex, rotY, dy) => {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.3), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.12, side: THREE.DoubleSide }));
          m.position.set(x, KERB + 3.25 + dy, z);
          m.rotation.y = rotY;
          scene.add(m);
        };
        blade(crossTex, 0, 0); // faces along the avenue: readable while driving/walking down it
        blade(avenueTex, Math.PI / 2, 0.36);
      }
    });
  }
}
