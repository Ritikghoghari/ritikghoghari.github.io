import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Layout: one main avenue runs along -z. Landmarks sit beside it; everything
// else is procedurally generated city blocks.
// ---------------------------------------------------------------------------
const AVENUE_HALF = 6;
const BLOCK_X = [-90, -66, -42, -18, 18, 42, 66, 90];
const BLOCK_Z = Array.from({ length: 16 }, (_, n) => 140 - 24 * n); // 140 … -220
const FOG = new THREE.Color(0x070a14);

// Camera stops. `cam`/`look` are where the camera sits and what it looks at.
export const STOPS = [
  { id: 'gate', label: 'City Gate', cam: [0, 6, 182], look: [0, 9, 140] },
  { id: 'about', label: 'Ritik HQ', side: -1, z: 116, cam: [6, 7, 143], look: [-18, 24, 116] },
  { id: 'experience', label: 'Experience', side: 1, z: 68, cam: [-6, 7, 106], look: [18, 16, 68] },
  { id: 'education', label: 'Education', side: -1, z: 20, cam: [6, 6, 54], look: [-18, 9, 20] },
  { id: 'skills', label: 'Skills Plaza', side: 1, z: -28, cam: [-5, 6, 4], look: [18, 8, -28] },
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

// Lit-window facade shader. Instanced city blocks get a per-building seed attribute;
// landmarks use a uniform seed and a tint so their windows glow in the landmark colour.
function windowMaterial({ instanced = false, tint = null, seed = 0.5, litRatio = 0.4 } = {}) {
  return new THREE.ShaderMaterial({
    defines: { INSTANCED_CITY: instanced ? 1 : 0, TINTED: tint ? 1 : 0 },
    uniforms: {
      uFog: { value: FOG },
      uDensity: { value: 0.0075 },
      uSeed: { value: seed },
      uTint: { value: new THREE.Color(tint ?? 0xffffff) },
      uLit: { value: litRatio },
    },
    vertexShader: /* glsl */ `
      #if INSTANCED_CITY
      attribute float aSeed;
      #endif
      uniform float uSeed;
      varying vec3 vPos; varying vec3 vN; varying float vSeed; varying float vDepth;
      void main() {
        #if INSTANCED_CITY
        mat4 m = modelMatrix * instanceMatrix;
        vSeed = aSeed;
        #else
        mat4 m = modelMatrix;
        vSeed = uSeed;
        #endif
        vec4 wp = m * vec4(position, 1.0);
        vPos = wp.xyz;
        vN = normalize(mat3(m) * normal);
        vec4 mv = viewMatrix * wp;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uFog; uniform float uDensity; uniform vec3 uTint; uniform float uLit;
      varying vec3 vPos; varying vec3 vN; varying float vSeed; varying float vDepth;
      // sin-free hash: stable on low-precision mobile GPUs (no speckle inside windows)
      float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main() {
        vec3 wall = vec3(0.045, 0.052, 0.085) + vSeed * 0.025;
        #if TINTED
        wall = mix(wall, uTint * 0.16, 0.6);
        #endif
        vec3 col = wall;
        if (abs(vN.y) < 0.5) {
          float u = abs(vN.x) > 0.5 ? vPos.z : vPos.x;
          vec2 g = vec2(u / 1.7, vPos.y / 2.2);
          vec2 cell = floor(g);
          vec2 f = fract(g);
          float win = step(0.22, f.x) * step(f.x, 0.78) * step(0.28, f.y) * step(f.y, 0.78);
          float lit = step(1.0 - uLit, hash(cell + vSeed * 97.3));
          #if TINTED
          vec3 wc = mix(uTint, vec3(1.0), 0.25 * hash(cell * 1.31 + 7.7));
          #else
          vec3 wc = mix(vec3(1.0, 0.78, 0.46), vec3(0.55, 0.82, 1.0), step(0.55, hash(cell * 1.31 + 7.7)));
          #endif
          col += win * (lit * wc * 0.85 + (1.0 - lit) * vec3(0.03, 0.04, 0.07)) * step(1.6, vPos.y);
          col *= 0.75 + 0.25 * smoothstep(0.0, 25.0, vPos.y);
        } else {
          col = wall * 0.8;
        }
        float fog = 1.0 - exp(-uDensity * uDensity * vDepth * vDepth);
        gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
      }`,
  });
}

// ---------------------------------------------------------------------------
export function createCity(canvas, { reducedMotion, projects, onPick }) {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = FOG;
  scene.fog = new THREE.FogExp2(FOG, 0.0075);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 900);

  scene.add(new THREE.HemisphereLight(0x6b7cff, 0x05060a, 0.45));
  const moon = new THREE.DirectionalLight(0xaab8ff, 0.6);
  moon.position.set(-80, 140, 60);
  scene.add(moon);

  const pickables = [];

  // ---------- ground, avenue, cross streets ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ color: 0x0a0d16, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -40;
  scene.add(ground);

  {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#12151f';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#f5c451';
    g.fillRect(61, 0, 6, 64); // dashed centre line
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(4, 0, 3, 128);
    g.fillRect(121, 0, 3, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 60);
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    const avenue = new THREE.Mesh(new THREE.PlaneGeometry(AVENUE_HALF * 2, 420), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
    avenue.rotation.x = -Math.PI / 2;
    avenue.position.set(0, 0.02, -40);
    scene.add(avenue);

    const crossMat = new THREE.MeshStandardMaterial({ color: 0x10131c, roughness: 0.9 });
    for (const z of BLOCK_Z) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(220, 6), crossMat);
      s.rotation.x = -Math.PI / 2;
      s.position.set(0, 0.01, z - 12);
      scene.add(s);
    }
    // glowing kerbs along the avenue
    const kerbMat = new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.55 });
    for (const x of [-AVENUE_HALF - 0.6, AVENUE_HALF + 0.6]) {
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 420), kerbMat);
      k.position.set(x, 0.1, -40);
      scene.add(k);
    }
  }

  // ---------- generic buildings: one instanced mesh, windows drawn in the shader ----------
  const lots = [];
  for (const bx of BLOCK_X) {
    for (const bz of BLOCK_Z) {
      if (LANDMARK_BLOCKS.has(`${bx},${bz}`)) continue;
      const nearAvenue = Math.abs(bx) < 30;
      for (const ox of [-4.6, 4.6]) {
        for (const oz of [-4.6, 4.6]) {
          if (rand() < 0.08) continue; // occasional gap / plaza
          const tall = rand() < 0.1;
          const h = tall ? 34 + rand() * 30 : (nearAvenue ? 8 : 6) + rand() * (nearAvenue ? 22 : 18);
          lots.push({ x: bx + ox, z: bz + oz, w: 6.5 + rand() * 1.8, d: 6.5 + rand() * 1.8, h });
        }
      }
    }
  }
  const bGeo = new THREE.BoxGeometry(1, 1, 1);
  bGeo.translate(0, 0.5, 0);
  const seeds = new Float32Array(lots.length);
  const bMat = windowMaterial({ instanced: true });
  const buildings = new THREE.InstancedMesh(bGeo, bMat, lots.length);
  const m4 = new THREE.Matrix4();
  lots.forEach((l, i) => {
    m4.makeScale(l.w, l.h, l.d).setPosition(l.x, 0, l.z);
    buildings.setMatrixAt(i, m4);
    seeds[i] = rand();
  });
  bGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  scene.add(buildings);

  // parks in front of landmarks
  {
    const lawnMat = new THREE.MeshStandardMaterial({ color: 0x0b2a22, roughness: 1 });
    const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(1.3, 4, 7), new THREE.MeshStandardMaterial({ color: 0x0f3d2e, emissive: 0x0b3b2b, emissiveIntensity: 0.4 }), PARK_BLOCKS.length * 7);
    const lampPos = [];
    let k = 0;
    for (const key of PARK_BLOCKS) {
      const [px, pz] = key.split(',').map(Number);
      const lawn = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), lawnMat);
      lawn.rotation.x = -Math.PI / 2;
      lawn.position.set(px, 0.03, pz);
      scene.add(lawn);
      for (let i = 0; i < 7; i++) {
        const tx = px + (rand() - 0.5) * 14;
        const tz = pz + (rand() - 0.5) * 14;
        m4.makeTranslation(tx, 2, tz);
        trees.setMatrixAt(k++, m4);
      }
      lampPos.push(px - 6, 3, pz - 6, px + 6, 3, pz + 6, px - 6, 3, pz + 6);
    }
    scene.add(trees);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lampPos), 3));
    scene.add(new THREE.Points(lg, new THREE.PointsMaterial({ color: 0x9fffe0, size: 1.2, transparent: true, depthWrite: false })));
  }

  // rooftop warning lights on the tall ones
  {
    const tops = lots.filter((l) => l.h > 34);
    const pos = new Float32Array(tops.length * 3);
    tops.forEach((l, i) => pos.set([l.x, l.h + 0.6, l.z], i * 3));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xff4d4d, size: 1.4, transparent: true, opacity: 0.9 })));
  }

  // ---------- landmarks ----------
  const landmarkMat = (color) =>
    new THREE.MeshStandardMaterial({ color: 0x0d1324, emissive: color, emissiveIntensity: 0.18, metalness: 0.3, roughness: 0.5 });
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
    const mat = landmarkMat(0x5eead4);
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
    const t = new THREE.Mesh(new THREE.BoxGeometry(14, 52, 14), windowMaterial({ tint: 0x7c9cff, seed: 0.21, litRatio: 0.55 }));
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
    const b = new THREE.Mesh(new THREE.BoxGeometry(16, 28, 16), windowMaterial({ tint: 0xa78bfa, seed: 0.63, litRatio: 0.55 }));
    b.position.set(18, 14, 68);
    const top = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 10), windowMaterial({ tint: 0xa78bfa, seed: 0.37, litRatio: 0.55 }));
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
    const b = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 16), windowMaterial({ tint: 0x34d399, seed: 0.84, litRatio: 0.6 }));
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
        screenMat.map = textTexture(['🌍', p.title], { w: 1024, h: 614, font: '700 160px "Space Grotesk", sans-serif', color: '#5eead4', bg: '#0b2b3a' });
        screenMat.color.set(0xffffff);
      }
      const cap = sign(p.title.toUpperCase(), 15, { h: 192, font: '700 64px "Space Grotesk", sans-serif' });
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

  // ---------- street life: lights, cars, stars ----------
  {
    const zs = [];
    for (let z = 170; z > -230; z -= 14) zs.push(z);
    const lamp = new Float32Array(zs.length * 2 * 3);
    zs.forEach((z, i) => {
      lamp.set([-AVENUE_HALF - 1.2, 6, z], i * 6);
      lamp.set([AVENUE_HALF + 1.2, 6, z - 7], i * 6 + 3);
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lamp, 3));
    scene.add(new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xffd9a0, size: 1.6, transparent: true, opacity: 0.95, depthWrite: false })));
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0x1d2235 }), zs.length * 2);
    for (let i = 0; i < zs.length * 2; i++) {
      m4.makeTranslation(lamp[i * 3], 3, lamp[i * 3 + 2]);
      poles.setMatrixAt(i, m4);
    }
    scene.add(poles);
  }

  const CARS = 34;
  const cars = new THREE.InstancedMesh(new THREE.BoxGeometry(1.9, 1.1, 4.2), new THREE.MeshBasicMaterial(), CARS);
  const carData = Array.from({ length: CARS }, (_, i) => {
    const away = i % 2 === 0; // driving away from the viewer shows red tail lights
    return { x: away ? 2.6 : -2.6, z: 170 - rand() * 400, v: (away ? -1 : 1) * (9 + rand() * 7), away };
  });
  const cRed = new THREE.Color(0xff3b4a);
  const cWhite = new THREE.Color(0xfff4d6);
  carData.forEach((c, i) => cars.setColorAt(i, c.away ? cRed : cWhite));
  scene.add(cars);
  const placeCars = (dt) => {
    carData.forEach((c, i) => {
      c.z += c.v * dt;
      if (c.z < -232) c.z = 172;
      if (c.z > 172) c.z = -232;
      m4.makeTranslation(c.x, 0.6, c.z);
      cars.setMatrixAt(i, m4);
    });
    cars.instanceMatrix.needsUpdate = true;
  };
  placeCars(0);

  {
    const n = 1400;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = rand() * Math.PI * 2;
      const ph = rand() * 0.45 * Math.PI;
      const r = 420;
      p.set([Math.cos(th) * Math.sin(ph) * r, Math.cos(ph) * r * 0.6 + 60, Math.sin(th) * Math.sin(ph) * r - 40], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.9, fog: false, transparent: true, opacity: 0.8 })));
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

  const stopTarget = (i) => {
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

  // ---------- resize ----------
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
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
      aerialAngle += dt * (reducedMotion ? 0 : 0.05);
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

    if (!reducedMotion) {
      placeCars(dt);
      holoSigns.forEach((s) => {
        const a = s.userData.a + t * 0.35;
        s.position.set(18 + Math.cos(a) * 5.2, s.userData.y + Math.sin(t + s.userData.a) * 0.3, -28 + Math.sin(a) * 5.2);
      });
      if (beacon) beacon.material.color.setScalar(0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 3)));
    } else if (!holoSigns[0].position.lengthSq()) {
      holoSigns.forEach((s) => s.position.set(18 + Math.cos(s.userData.a) * 5.2, s.userData.y, -28 + Math.sin(s.userData.a) * 5.2));
    }
    billboards.forEach((b, i) => {
      b.frame.material.emissiveIntensity = i === focusIndex ? 0.6 + 0.25 * Math.sin(t * 4) : 0.12;
    });

    renderer.render(scene, camera);
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
