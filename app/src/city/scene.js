import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { facadeMaterial, skyDome, glowTexture, STYLE, cityTime } from './facade.js';
import { buildStreets } from './streets.js';
import { buildTraffic } from './traffic.js';
import { buildPeople } from './people.js';
import { buildProps } from './props.js';
import { buildRain } from './weather.js';

// ---------------------------------------------------------------------------
// Layout: one main avenue runs along -z. Landmarks sit beside it; everything
// else is procedurally generated city blocks.
// ---------------------------------------------------------------------------
const AVENUE_HALF = 6;
const BLOCK_X = [-90, -66, -42, -18, 18, 42, 66, 90];
const BLOCK_Z = Array.from({ length: 16 }, (_, n) => 140 - 24 * n); // 140 … -220
const FOG = new THREE.Color(0x0c0d1c);
const FOG_DENSITY = 0.0068;

// Camera stops. `cam`/`look` are where the camera sits and what it looks at.
export const STOPS = [
  { id: 'gate', label: 'City Gate', cam: [0, 6, 182], look: [0, 9, 140] },
  { id: 'about', label: 'Ritik HQ', side: -1, z: 116, cam: [2.5, 9, 143], look: [-18, 24, 116] },
  { id: 'experience', label: 'Experience', side: 1, z: 68, cam: [-2.5, 9, 106], look: [18, 16, 68] },
  { id: 'education', label: 'Education', side: -1, z: 20, cam: [2.5, 8.5, 54], look: [-18, 9, 20] },
  { id: 'skills', label: 'Skills Plaza', side: 1, z: -28, cam: [-2.5, 8.5, 4], look: [18, 8, -28] },
  { id: 'projects', label: 'Projects Avenue', cam: [0, 5.5, -78], look: [0, 9, -120] },
  { id: 'contact', label: 'Contact Tower', cam: [0, 6, -150], look: [0, 22, -196] },
];
const PARK_BLOCKS = ['-18,140', '18,92', '-18,44', '18,-4']; // open space in front of landmarks so they can be seen
const LANDMARK_BLOCKS = new Set(['-18,116', '18,68', '-18,20', '18,-28', '-18,-76', '18,-76', '-18,-124', '18,-124', ...PARK_BLOCKS]);

// ---------- small helpers ----------
const rand = (() => {
  let s = 1337; // deterministic so the city looks the same on every visit
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
})();

function textTexture(lines, { w = 1024, h = 256, color = '#5eead4', bg = 'rgba(6,10,20,0.85)', font = '700 96px "Space Grotesk", sans-serif', glow = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
  }
  const arr = Array.isArray(lines) ? lines : [lines];
  arr.forEach((line, i) => {
    ctx.font = i === 0 ? font : font.replace(/\d+px/, (m) => `${Math.round(parseInt(m) * 0.5)}px`);
    ctx.fillText(line, w / 2, h / 2 + (i - (arr.length - 1) / 2) * (h / (arr.length + 0.6)));
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function sign(lines, width, opts) {
  const tex = textTexture(lines, opts);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width / 4),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }),
  );
  return m;
}

// ---------------------------------------------------------------------------
export function createCity(canvas, { reducedMotion, projects, onPick }) {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const params = new URLSearchParams(location.search);
  // phones (and ?lite) get the same city with cheaper reflections and fewer cars/people
  const quality = coarse || params.has('lite') ? 'low' : 'high';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG, FOG_DENSITY);
  scene.add(skyDome());
  const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 1400);

  scene.add(new THREE.HemisphereLight(0x8090ff, 0x0a0806, 0.5));
  const moonLight = new THREE.DirectionalLight(0xb8c6ff, 0.75);
  moonLight.position.set(-120, 160, 90);
  scene.add(moonLight);
  // warm bounce from the street lights
  const street = new THREE.DirectionalLight(0xffb070, 0.25);
  street.position.set(40, 10, -30);
  scene.add(street);

  // environment map for cars, glass and metal: the night sky plus a ring of lit windows and street lights
  {
    const env = new THREE.Scene();
    env.add(skyDome());
    const lit = new THREE.MeshBasicMaterial({ color: 0xffc98a });
    const cool = new THREE.MeshBasicMaterial({ color: 0x9ec4ff });
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(6 + rand() * 10, 2 + rand() * 8), rand() < 0.7 ? lit : cool);
      m.position.set(Math.cos(a) * 60, 2 + rand() * 18, Math.sin(a) * 60);
      m.lookAt(0, m.position.y, 0);
      env.add(m);
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.02, 0.1, 1000).texture;
    scene.environmentIntensity = 0.55;
    pmrem.dispose();
  }

  const win = (opts) => facadeMaterial({ fog: FOG, density: FOG_DENSITY, ...opts });
  const pickables = [];

  // ---------- ground and streets ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ color: 0x0b0c11, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -40;
  scene.add(ground);
  const streets = buildStreets(scene, { BLOCK_X, BLOCK_Z, AVENUE_HALF, fog: FOG, density: FOG_DENSITY, mirror: true, mirrorScale: quality === 'high' ? 0.5 : 0.32 });
  const KERB = streets.kerb;
  const zebraBusy = new Uint8Array(BLOCK_Z.length); // crossings where people are on the zebra (cars wait)
  const traffic = buildTraffic(scene, { rand, BLOCK_Z, AVENUE_HALF, KERB, quality, zebraBusy });
  const people = buildPeople(scene, { rand, BLOCK_Z, AVENUE_HALF, KERB, quality, stops: STOPS, zebraBusy });
  buildProps(scene, { rand, BLOCK_Z, AVENUE_HALF, KERB, quality, parks: PARK_BLOCKS.map((k) => k.split(',').map(Number)) });
  const rain = buildRain(scene, { quality });
  let raining = true;
  rain.setOn(raining);
  streets.setRain(raining);

  // ---------- buildings: 4 facade styles, setback tiers, rooftop equipment; all instanced ----------
  const parts = []; // { x, z, w, d, h, y, style, seed }
  const roofs = []; // tops that receive rooftop clutter
  const antennas = [];
  function addBuilding(x, z, w, d, h, style, out = null) {
    const seed = rand();
    const y0 = KERB;
    parts.push({ x, z, w, d, h, y: y0, style, seed, out });
    let top = { x, z, w, d, y: y0 + h };
    if (h > 30 && rand() < 0.75) {
      // skyscraper setbacks
      const h2 = h * (0.18 + rand() * 0.12);
      const w2 = w * 0.72;
      const d2 = d * 0.72;
      parts.push({ x, z, w: w2, d: d2, h: h2, y: y0 + h, style, seed });
      top = { x, z, w: w2, d: d2, y: y0 + h + h2 };
      if (rand() < 0.6) {
        const h3 = 3 + rand() * 4;
        parts.push({ x, z, w: w2 * 0.6, d: d2 * 0.6, h: h3, y: top.y, style: STYLE.OFFICE, seed });
        top = { x, z, w: w2 * 0.6, d: d2 * 0.6, y: top.y + h3 };
      }
      antennas.push({ x, z, y: top.y, h: 6 + rand() * 10 });
    } else if (h > 14 && rand() < 0.35) {
      const h2 = 3 + rand() * 5;
      parts.push({ x: x + (rand() - 0.5) * w * 0.2, z, w: w * 0.7, d: d * 0.7, h: h2, y: y0 + h, style, seed });
    }
    roofs.push({ ...top, style });
  }

  for (const bx of BLOCK_X) {
    for (const bz of BLOCK_Z) {
      if (LANDMARK_BLOCKS.has(`${bx},${bz}`)) continue;
      const nearAvenue = Math.abs(bx) < 30;
      const downtown = Math.abs(bz + 40) < 110 && Math.abs(bx) < 70;
      for (const ox of [-4.6, 4.6]) {
        for (const oz of [-4.6, 4.6]) {
          if (rand() < 0.06) continue;
          const r = rand();
          const tall = r < (downtown ? 0.16 : 0.07);
          const h = tall ? 34 + rand() * 38 : (nearAvenue ? 9 : 6) + rand() * (nearAvenue ? 22 : 16);
          const style = tall
            ? rand() < 0.7 ? STYLE.GLASS : STYLE.OFFICE
            : h > 18 ? rand() < 0.5 ? STYLE.OFFICE : STYLE.RESIDENTIAL
              : rand() < 0.55 ? STYLE.BRICK : STYLE.RESIDENTIAL;
          addBuilding(bx + ox, bz + oz, 6.6 + rand() * 1.7, 6.6 + rand() * 1.7, h, style, Math.abs(bx) <= 42 ? [Math.sign(ox), Math.sign(oz)] : null);
        }
      }
    }
  }
  // distant skyline ring: silhouettes against the glowing horizon
  for (let i = 0; i < 140; i++) {
    const a = (i / 140) * Math.PI * 2 + rand() * 0.03;
    const r = 260 + rand() * 120;
    const h = 20 + rand() * rand() * 110;
    parts.push({ x: Math.cos(a) * r, z: -40 + Math.sin(a) * r, w: 10 + rand() * 14, d: 10 + rand() * 14, h, y: 0, style: rand() < 0.5 ? STYLE.GLASS : STYLE.OFFICE, seed: rand() });
  }

  const bGeo = new THREE.BoxGeometry(1, 1, 1);
  bGeo.translate(0, 0.5, 0);
  const seeds = new Float32Array(parts.length);
  const styles = new Float32Array(parts.length);
  const buildings = new THREE.InstancedMesh(bGeo, win({ instanced: true }), parts.length);
  const m4 = new THREE.Matrix4();
  parts.forEach((p, i) => {
    m4.makeScale(p.w, p.h, p.d).setPosition(p.x, p.y, p.z);
    buildings.setMatrixAt(i, m4);
    seeds[i] = p.seed;
    styles[i] = p.style;
  });
  bGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  bGeo.setAttribute('aStyle', new THREE.InstancedBufferAttribute(styles, 1));
  buildings.frustumCulled = false; // instances span the whole map
  scene.add(buildings);

  // ---------- facade details on the street-facing sides: balconies, shop awnings, cornices ----------
  // Positions follow the facade shader's window grid and shop pattern, so balconies sit under real windows
  // and awnings over lit shops.
  {
    const fract = (v) => v - Math.floor(v);
    const hash = (px, py) => {
      // same sin-free hash as the shader
      let a = fract(px * 0.1031);
      let b = fract(py * 0.1031);
      let c = fract(px * 0.1031);
      const dd = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
      a += dd;
      b += dd;
      c += dd;
      return fract((a + b) * c);
    };
    const balconies = [];
    const awnings = [];
    const cornices = [];
    for (const p of parts) {
      if (!p.out) continue;
      const faces = [
        { nx: p.out[0], nz: 0, len: p.d },
        { nx: 0, nz: p.out[1], len: p.w },
      ];
      for (const f of faces) {
        if (!f.nx && !f.nz) continue;
        // face centre and the shader's u axis (u = dot(position, uAxis))
        const fx = p.x + f.nx * (p.w / 2);
        const fz = p.z + f.nz * (p.d / 2);
        const ux = f.nx ? 0 : f.nz;
        const uz = f.nx ? -f.nx : 0;
        const uC = fx * ux + fz * uz;
        const u0 = uC - f.len / 2;
        const u1 = uC + f.len / 2;
        const rot = Math.atan2(f.nx, f.nz); // local +z points out of the face
        const at = (u) => [fx + ux * (u - uC), fz + uz * (u - uC)];
        if (p.style === STYLE.RESIDENTIAL && p.h > 9) {
          const colW = 2.3;
          const rowH = 2.9;
          for (let c = Math.ceil(u0 / colW); c + 1 <= Math.floor(u1 / colW); c++) {
            if (hash(c * 3.1, p.seed * 17) < 0.45) continue; // not every flat has a balcony
            const [bxp, bzp] = at((c + 0.5) * colW);
            for (let row = 2; (row + 1) * rowH < p.y + p.h - 1; row++) balconies.push([bxp, row * rowH, bzp, rot]);
          }
        }
        if (p.style !== STYLE.GLASS) {
          for (let seg = Math.ceil(u0 / 4); seg + 1 <= Math.floor(u1 / 4); seg++) {
            if (hash(seg, p.seed * 11) < 0.3) continue; // no shop here in the shader either
            const [axp, azp] = at((seg + 0.5) * 4);
            awnings.push([axp, azp, rot, hash(seg * 1.7, p.seed * 5)]);
          }
        }
      }
      if (p.style === STYLE.BRICK || p.style === STYLE.RESIDENTIAL) cornices.push(p);
    }
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3(1, 1, 1);
    const place = (mesh, i, x, y, z, rot, sx = 1, sy = 1, sz = 1) => {
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rot);
      mesh.setMatrixAt(i, m4.compose(pos.set(x, y, z), q, scl.set(sx, sy, sz)));
    };
    // balcony: concrete slab + dark metal railing on three sides
    const slab = new THREE.BoxGeometry(1.7, 0.14, 0.85).translate(0, 0.07, 0.43);
    const rail = [
      new THREE.BoxGeometry(1.7, 0.9, 0.04).translate(0, 0.55, 0.84),
      new THREE.BoxGeometry(0.04, 0.9, 0.85).translate(-0.83, 0.55, 0.43),
      new THREE.BoxGeometry(0.04, 0.9, 0.85).translate(0.83, 0.55, 0.43),
    ];
    const balcSlabs = new THREE.InstancedMesh(slab, new THREE.MeshStandardMaterial({ color: 0x5b5752, roughness: 0.9 }), balconies.length);
    const balcRails = new THREE.InstancedMesh(mergeGeometries(rail), new THREE.MeshStandardMaterial({ color: 0x15171c, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0.85 }), balconies.length);
    balconies.forEach(([x, y, z, rot], i) => {
      place(balcSlabs, i, x, y + 0.05, z, rot);
      place(balcRails, i, x, y + 0.05, z, rot);
    });
    // awning: sloped fabric canopy over each shop window
    const awnGeo = new THREE.BoxGeometry(3.3, 0.06, 1.15).translate(0, 0, 0.55).rotateX(0.32);
    const awnMesh = new THREE.InstancedMesh(awnGeo, new THREE.MeshStandardMaterial({ roughness: 0.85 }), awnings.length);
    const AWN = [0x7a1c1c, 0x1f4a33, 0x1b2c55, 0xb59a6a, 0x3a3a3a, 0x8a4a12];
    const col = new THREE.Color();
    awnings.forEach(([x, z, rot, h], i) => {
      place(awnMesh, i, x, KERB + 3.25, z, rot);
      awnMesh.setColorAt(i, col.set(AWN[Math.floor(h * AWN.length) % AWN.length]));
    });
    // cornice: a ledge just below the roofline of older buildings
    const corMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 0.9 }), cornices.length * 2);
    cornices.forEach((p, i) => {
      corMesh.setMatrixAt(i * 2, m4.makeScale(p.w + 0.45, 0.32, p.d + 0.45).setPosition(p.x, p.y + p.h - 0.55, p.z));
      corMesh.setMatrixAt(i * 2 + 1, m4.makeScale(p.w + 0.2, 0.16, p.d + 0.2).setPosition(p.x, p.y + 3.42, p.z)); // band above the shops
    });
    for (const m of [balcSlabs, balcRails, awnMesh, corMesh]) m.frustumCulled = false;
    scene.add(balcSlabs, balcRails, awnMesh, corMesh);
  }

  // rooftop equipment: parapets, AC units, water tanks, antennas
  let aviation = null;
  {
    const metal = new THREE.MeshStandardMaterial({ color: 0x3a3f4a, metalness: 0.5, roughness: 0.6 });
    const ac = [];
    const tanks = [];
    const parapets = [];
    for (const r of roofs) {
      parapets.push(r);
      const n = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) ac.push([r.x + (rand() - 0.5) * r.w * 0.6, r.y, r.z + (rand() - 0.5) * r.d * 0.6, 0.8 + rand() * 0.9]);
      if ((r.style === STYLE.RESIDENTIAL || r.style === STYLE.BRICK) && rand() < 0.45) tanks.push([r.x + r.w * 0.2, r.y, r.z - r.d * 0.2]);
    }
    const acMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.7, 1).translate(0, 0.35, 0), metal, ac.length);
    ac.forEach(([x, y, z, k], i) => acMesh.setMatrixAt(i, m4.makeScale(k, k, k * 1.3).setPosition(x, y, z)));
    const tankGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.6, 10).translate(0, 2.2, 0);
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 4).translate(0, 0.7, 0);
    const tankMesh = new THREE.InstancedMesh(tankGeo, new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.9 }), tanks.length);
    const legMesh = new THREE.InstancedMesh(legGeo, metal, tanks.length);
    tanks.forEach(([x, y, z], i) => {
      m4.makeTranslation(x, y, z);
      tankMesh.setMatrixAt(i, m4);
      legMesh.setMatrixAt(i, m4);
    });
    // parapet: a thin slightly larger slab hugging the roof edge
    const parMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x1c1f27, roughness: 0.8 }), parapets.length);
    parapets.forEach((r, i) => parMesh.setMatrixAt(i, m4.makeScale(r.w + 0.2, 0.5, r.d + 0.2).setPosition(r.x, r.y - 0.05, r.z)));
    const antMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.14, 1, 5).translate(0, 0.5, 0), metal, antennas.length);
    antennas.forEach((a, i) => antMesh.setMatrixAt(i, m4.makeScale(1, a.h, 1).setPosition(a.x, a.y, a.z)));
    for (const m of [acMesh, tankMesh, legMesh, parMesh, antMesh]) m.frustumCulled = false;
    scene.add(acMesh, tankMesh, legMesh, parMesh, antMesh);

    // blinking aviation lights on antenna tips
    const pos = new Float32Array(antennas.length * 3);
    antennas.forEach((a, i) => pos.set([a.x, a.y + a.h + 0.3, a.z], i * 3));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    aviation = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xff3b3b, size: 1.6, transparent: true, depthWrite: false }));
    scene.add(aviation);
  }

  // parks in front of landmarks (their trees come from props.js)
  {
    const lawnMat = new THREE.MeshStandardMaterial({ color: 0x14301f, roughness: 1 });
    const lampPos = [];
    for (const key of PARK_BLOCKS) {
      const [px, pz] = key.split(',').map(Number);
      const lawn = new THREE.Mesh(new THREE.PlaneGeometry(17, 17), lawnMat);
      lawn.rotation.x = -Math.PI / 2;
      lawn.position.set(px, KERB + 0.02, pz);
      scene.add(lawn);
      lampPos.push(px - 6, KERB + 2.6, pz - 6, px + 6, KERB + 2.6, pz + 6, px - 6, KERB + 2.6, pz + 6);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lampPos), 3));
    scene.add(new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xffe4b5, size: 1.1, transparent: true, depthWrite: false })));
  }

  // ---------- landmarks ----------
  // landmarks: real materials (concrete/stone) with a neon accent glow, instead of flat glowing blocks
  const landmarkMat = (color, base = 0x2c313b) =>
    new THREE.MeshStandardMaterial({ color: base, emissive: color, emissiveIntensity: 0.07, metalness: 0.15, roughness: 0.75, envMapIntensity: 0.35 });
  const edges = (mesh, color) => {
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    l.position.copy(mesh.position);
    return l;
  };
  function landmark(stopIndex, build) {
    const g = new THREE.Group();
    build(g);
    g.traverse((o) => {
      if (o.isMesh) {
        o.userData.stop = stopIndex;
        pickables.push(o);
      }
    });
    scene.add(g);
    return g;
  }
  const faceAvenue = (side) => (side < 0 ? Math.PI / 2 : -Math.PI / 2); // plane normal points toward x=0

  // 0 · City gate arch
  landmark(0, (g) => {
    const mat = landmarkMat(0x5eead4, 0x8c877d);
    for (const x of [-9, 9]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(2, 16, 2), mat);
      p.position.set(x, 8, 150);
      g.add(p, edges(p, 0x5eead4));
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(20, 2.4, 2), mat);
    beam.position.set(0, 16.5, 150);
    g.add(beam, edges(beam, 0x5eead4));
    const s = sign(["RITIK'S CITY", 'Data · AI · Analytics'], 16, { h: 256 });
    s.position.set(0, 20.5, 150.2);
    g.add(s);
  });

  // 1 · Ritik HQ tower
  landmark(1, (g) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(14, 52, 14), win({ tint: 0x7c9cff, seed: 0.21, style: STYLE.GLASS, litRatio: 0.5 }));
    t.position.set(-18, 26, 116);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(9, 6, 9), landmarkMat(0x5eead4));
    crown.position.set(-18, 55, 116);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.2, 12, 8), new THREE.MeshBasicMaterial({ color: 0x5eead4 }));
    spire.position.set(-18, 64, 116);
    g.add(t, edges(t, 0x7c9cff), crown, edges(crown, 0x5eead4), spire);
    const s = sign(['RITIK HQ', 'About me'], 12);
    s.position.set(-10.9, 40, 116);
    s.rotation.y = faceAvenue(-1);
    g.add(s);
  });

  // 2 · Experience: Accenture office
  landmark(2, (g) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(16, 28, 16), win({ tint: 0xa78bfa, seed: 0.63, style: STYLE.OFFICE, litRatio: 0.6 }));
    b.position.set(18, 14, 68);
    const top = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 10), win({ tint: 0xa78bfa, seed: 0.37, style: STYLE.OFFICE, litRatio: 0.6 }));
    top.position.set(18, 32, 68);
    g.add(b, edges(b, 0xa78bfa), top, edges(top, 0xa78bfa));
    const s = sign(['EXPERIENCE', 'Accenture · Data Analytics'], 13, { color: '#c4b5fd' });
    s.position.set(9.9, 22, 68);
    s.rotation.y = faceAvenue(1);
    g.add(s);
  });

  // 3 · Education campus with a dome
  landmark(3, (g) => {
    const mat = landmarkMat(0x34d399);
    const b = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 16), win({ tint: 0x34d399, seed: 0.84, style: STYLE.BRICK, litRatio: 0.65 }));
    b.position.set(-18, 6, 20);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0d2a24, emissive: 0x34d399, emissiveIntensity: 0.35, wireframe: true }));
    dome.position.set(-18, 12, 20);
    for (const dx of [-5, -1.7, 1.7, 5]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 9, 10), mat);
      col.position.set(-9.4, 4.5, 20 + dx);
      g.add(col);
    }
    g.add(b, edges(b, 0x34d399), dome);
    const s = sign(['EDUCATION', 'M.Sc. Data Science & AI'], 12, { color: '#6ee7b7' });
    s.position.set(-9.9, 15.5, 20);
    s.rotation.y = faceAvenue(-1);
    g.add(s);
  });

  // 4 · Skills plaza: a pillar with holographic skill signs orbiting it
  const holoSigns = [];
  landmark(4, (g) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(7, 7.5, 0.6, 48), landmarkMat(0xf472b6));
    base.position.set(18, 0.3, -28);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 16, 16), landmarkMat(0xf472b6));
    pillar.position.set(18, 8, -28);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.08, 8, 96), new THREE.MeshBasicMaterial({ color: 0xf472b6 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(18, 0.7, -28);
    g.add(base, pillar, ring);
    const s = sign('SKILLS PLAZA', 11, { color: '#f9a8d4' });
    s.position.set(18, 18.5, -28);
    s.rotation.y = faceAvenue(1);
    g.add(s);
  });
  ['Python', 'SQL', 'Machine Learning', 'LangChain', 'Power BI', 'OpenCV', 'GenAI', 'Tableau'].forEach((name, i, arr) => {
    const tex = textTexture(name, { w: 512, h: 128, font: '700 64px "Space Grotesk", sans-serif', color: '#f9a8d4', bg: 'rgba(30,8,24,0.55)' });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    sp.scale.set(5.2, 1.3, 1);
    sp.userData = { a: (i / arr.length) * Math.PI * 2, y: 3 + (i % 3) * 3.4 };
    scene.add(sp);
    holoSigns.push(sp);
  });

  // 5 · Projects avenue: four billboards showing featured project thumbnails
  const billboards = [];
  const featured = projects.filter((p) => p.featured).slice(0, 4);
  const BILL = [
    [-1, -76],
    [1, -76],
    [-1, -124],
    [1, -124],
  ];
  const loader = new THREE.TextureLoader();
  featured.forEach((p, i) => {
    const [side, z] = BILL[i];
    landmark(5, (g) => {
      const x = side * 14;
      const pole = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 1), landmarkMat(0x5eead4));
      pole.position.set(x, 5, z);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9.6, 15.6), landmarkMat(0x5eead4));
      frame.position.set(x, 15, z);
      const screenMat = new THREE.MeshBasicMaterial({ color: 0x1b2440, toneMapped: false });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(15, 9), screenMat);
      screen.position.set(x - side * 0.35, 15, z);
      screen.rotation.y = faceAvenue(side);
      if (p.image) {
        loader.load(`/img/${p.image}-512.webp`, (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          screenMat.map = t;
          screenMat.color.set(0xffffff);
          screenMat.needsUpdate = true;
        });
      } else {
        screenMat.map = p.thesis
          ? textTexture(["MASTER'S THESIS", p.title, 'NLP × satellite data · 11 companies · 290 mills'], { w: 1024, h: 614, font: '700 92px "Space Grotesk", sans-serif', color: '#5eead4', bg: '#0b2b3a' })
          : textTexture(['🌍', p.title], { w: 1024, h: 614, font: '700 160px "Space Grotesk", sans-serif', color: '#5eead4', bg: '#0b2b3a' });
        screenMat.color.set(0xffffff);
      }
      const cap = sign(p.thesis ? `🎓 THESIS · ${p.title.toUpperCase()}` : p.title.toUpperCase(), 15, { h: 192, font: `700 ${p.thesis ? 52 : 64}px "Space Grotesk", sans-serif` });
      cap.scale.y = 0.75;
      cap.position.set(x - side * 0.4, 8.4, z);
      cap.rotation.y = faceAvenue(side);
      g.add(pole, frame, screen, cap);
      billboards.push({ x, z, side, frame });
    }).traverse((o) => (o.userData.project = i));
  });

  // 6 · Contact tower with a blinking beacon
  let beacon;
  landmark(6, (g) => {
    const mat = landmarkMat(0xfbbf24);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 4.5, 46, 6), mat);
    t.position.set(0, 23, -196);
    g.add(t, edges(t, 0xfbbf24));
    for (const y of [14, 26, 38]) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(4.5 - y * 0.06, 0.12, 8, 64), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
      r.rotation.x = Math.PI / 2;
      r.position.set(0, y, -196);
      g.add(r);
    }
    beacon = new THREE.Mesh(new THREE.SphereGeometry(1.3, 20, 20), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    beacon.position.set(0, 47.5, -196);
    const s = sign(['CONTACT', "Let's work together"], 13, { color: '#fcd34d' });
    s.position.set(0, 10, -190.5);
    g.add(beacon, s);
  });

  // ---------- sky: stars and moon ----------
  {
    const n = 1600;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = rand() * Math.PI * 2;
      const ph = rand() * 0.42 * Math.PI;
      const r = 600;
      p.set([Math.cos(th) * Math.sin(ph) * r, Math.cos(ph) * r + 40, Math.sin(th) * Math.sin(ph) * r - 40], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdde6ff, size: 1.1, fog: false, transparent: true, opacity: 0.75, depthWrite: false })));
    const moonDir = new THREE.Vector3(-0.45, 0.42, -0.78).normalize().multiplyScalar(560);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(200,215,255,0.5)', 'rgba(200,215,255,0)'), fog: false, depthWrite: false, transparent: true }));
    halo.scale.setScalar(140);
    halo.position.copy(moonDir);
    const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,250,235,1)', 'rgba(255,250,235,0)'), fog: false, depthWrite: false, transparent: true }));
    disc.scale.setScalar(26);
    disc.position.copy(moonDir);
    scene.add(halo, disc);
  }

  // ---------- camera travel ----------
  const camPos = new THREE.Vector3(0, 160, 330);
  const camLook = new THREE.Vector3(0, 0, -20);
  const from = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const to = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  let travel = null; // { t, dur, arc, done }
  let aerial = true;
  let portrait = false;
  const yawPitch = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0 };

  // ?cam=x,y,z,lookX,lookY,lookZ overrides the tour cameras (for close-up visual checks)
  const debugCam = params.get('cam')?.split(',').map(Number);
  const stopTarget = (i) => {
    if (debugCam?.length === 6) return { pos: new THREE.Vector3(...debugCam.slice(0, 3)), look: new THREE.Vector3(...debugCam.slice(3)) };
    const s = STOPS[i];
    const pos = new THREE.Vector3(...s.cam);
    const look = new THREE.Vector3(...s.look);
    if (portrait) {
      // narrow screens: step back and look a little lower so the landmark sits above the info card
      const dir = pos.clone().sub(look).setY(0).normalize();
      pos.addScaledVector(dir, 10).y += 3;
      look.y -= 6;
    }
    return { pos, look };
  };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function flyTo(target, { dur, arc = 6, onDone } = {}) {
    from.pos.copy(camPos);
    from.look.copy(camLook);
    to.pos.copy(target.pos);
    to.look.copy(target.look);
    const dist = from.pos.distanceTo(to.pos);
    travel = { t: 0, dur: reducedMotion ? 0.001 : dur ?? Math.min(3.4, 1.1 + dist / 55), arc: Math.min(arc, dist / 6), onDone };
    yawPitch.tYaw = yawPitch.tPitch = 0;
  }

  // ---------- interaction: drag to look around, tap a landmark to travel ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, yaw: yawPitch.tYaw, pitch: yawPitch.tPitch, moved: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag || aerial) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
    yawPitch.tYaw = THREE.MathUtils.clamp(drag.yaw - dx * 0.004, -0.9, 0.9);
    yawPitch.tPitch = THREE.MathUtils.clamp(drag.pitch + dy * 0.003, -0.35, 0.5);
  });
  window.addEventListener('pointerup', (e) => {
    const d = drag;
    drag = null;
    if (!d || d.moved || aerial || e.target !== canvas) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    if (hit) onPick(hit.object.userData.stop, hit.object);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (coarse || drag) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    canvas.style.cursor = !aerial && ray.intersectObjects(pickables, false).length ? 'pointer' : 'grab';
  });

  // ---------- glow (bloom) on capable desktops ----------
  let composer = null;
  let bloomOn = !coarse;
  if (bloomOn)
    Promise.all([
        import('three/addons/postprocessing/EffectComposer.js'),
        import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'),
        import('three/addons/postprocessing/OutputPass.js'),
      ]).then(([{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }]) => {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.45, 0.62));
        composer.addPass(new OutputPass());
        resize();
      }).catch(() => (bloomOn = false));
  let slowFrames = 0;
  let mirrorDropped = false;
  const keepBloom = params.has('forcebloom'); // for visual checks on slow machines

  // ---------- resize ----------
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    if (composer) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
      composer.passes[1]?.setSize?.(w / 2, h / 2); // bloom at half resolution
    }
    camera.aspect = w / h;
    portrait = w / h < 0.9;
    camera.fov = portrait ? 68 : 55;
    camera.updateProjectionMatrix();
  }
  let lastW = 0;
  new ResizeObserver(() => {
    if (coarse && canvas.clientWidth === lastW) return; // ignore mobile address-bar height jitter
    lastW = canvas.clientWidth;
    resize();
  }).observe(canvas);
  resize();

  // ---------- loop ----------
  const clock = new THREE.Clock();
  const lookDir = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  let aerialAngle = 0;
  let focusIndex = -1;
  function frame() {
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;

    if (aerial) {
      aerialAngle += dt * (reducedMotion ? 0.015 : 0.05);
      camPos.set(Math.sin(aerialAngle) * 260, 150, -30 + Math.cos(aerialAngle) * 260);
      camLook.set(0, 0, -30);
    } else if (travel) {
      travel.t = Math.min(1, travel.t + dt / travel.dur);
      const k = ease(travel.t);
      camPos.lerpVectors(from.pos, to.pos, k);
      camPos.y += Math.sin(Math.PI * k) * travel.arc;
      camLook.lerpVectors(from.look, to.look, ease(Math.min(1, travel.t * 1.15)));
      if (travel.t >= 1) {
        const done = travel.onDone;
        travel = null;
        done?.();
      }
    }

    // free-look offsets (drag) eased toward their targets
    yawPitch.yaw += (yawPitch.tYaw - yawPitch.yaw) * (1 - Math.exp(-8 * dt));
    yawPitch.pitch += (yawPitch.tPitch - yawPitch.pitch) * (1 - Math.exp(-8 * dt));
    lookDir.subVectors(camLook, camPos);
    lookDir.applyAxisAngle(THREE.Object3D.DEFAULT_UP, yawPitch.yaw);
    lookDir.y += yawPitch.pitch * lookDir.length();
    lookAt.copy(camPos).add(lookDir);
    camera.position.copy(camPos);
    if (!aerial && !travel && !reducedMotion) camera.position.y += Math.sin(t * 0.8) * 0.08; // gentle idle sway
    camera.lookAt(lookAt);

    {
      // ambient city life runs for everyone; reduced motion only removes camera flights and sway
      cityTime.value = t;
      traffic.update(dt, t);
      people.update(dt, t + 4);
      if (raining) rain.update(camera);
      if (aviation) aviation.material.opacity = Math.sin(t * 2.4) > 0.2 ? 1 : 0.15;
      holoSigns.forEach((s) => {
        const a = s.userData.a + t * 0.35;
        s.position.set(18 + Math.cos(a) * 5.2, s.userData.y + Math.sin(t + s.userData.a) * 0.3, -28 + Math.sin(a) * 5.2);
      });
      if (beacon) beacon.material.color.setScalar(0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 3)));
    }
    billboards.forEach((b, i) => {
      b.frame.material.emissiveIntensity = i === focusIndex ? 0.6 + 0.25 * Math.sin(t * 4) : 0.12;
    });

    // keep it smooth: if the device can't hold ~35 fps, drop the glow first, then the mirror reflections
    if (!keepBloom && !mirrorDropped && t > 2) {
      slowFrames = dt > 1 / 35 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames > 90) {
        slowFrames = 0;
        if (composer && bloomOn) bloomOn = false;
        else {
          streets.dropMirror();
          mirrorDropped = true;
        }
      }
    }
    if (composer && bloomOn) composer.render();
    else renderer.render(scene, camera);
    raf = document.hidden ? 0 : requestAnimationFrame(frame);
  }
  let raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !raf) {
      clock.getDelta();
      raf = requestAnimationFrame(frame);
    }
  });

  return {
    get raining() {
      return raining;
    },
    setRain(on) {
      raining = on;
      rain.setOn(on);
      streets.setRain(on);
    },
    enter(onDone) {
      aerial = false;
      // dive from the sky down to the city gate
      camPos.set(Math.sin(aerialAngle) * 260, 150, -30 + Math.cos(aerialAngle) * 260);
      flyTo(stopTarget(0), { dur: reducedMotion ? 0.001 : 4.2, arc: 0, onDone });
    },
    goTo(i, onDone) {
      focusIndex = -1;
      flyTo(stopTarget(i), { onDone });
    },
    focusProject(i) {
      // on Projects Avenue: turn toward billboard i
      const b = billboards[i];
      if (!b) return;
      focusIndex = i;
      const pos = new THREE.Vector3(-b.side * 2.5, 6, b.z + 20);
      const look = new THREE.Vector3(b.x, 14, b.z);
      if (portrait) {
        pos.z += 8;
        look.y -= 4;
      }
      flyTo({ pos, look }, { dur: 1.4, arc: 1.5 });
    },
  };
}
