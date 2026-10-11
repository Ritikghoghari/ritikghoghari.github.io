import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import fontJson from './fonts/helvetiker_bold.typeface.json';
import { CAROUSEL, sampleCamera } from './timeline.js';

const CYAN = 0x00f3ff;
const BLUE = 0x0066ff;
const BG = 0x05060d;
const TAU = Math.PI * 2;

// ---------- helpers ----------

const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

function loadImage(url, manager) {
  return new Promise((resolve) => {
    manager.itemStart(url);
    const img = new Image();
    img.onload = () => {
      manager.itemEnd(url);
      resolve(img);
    };
    img.onerror = () => {
      manager.itemEnd(url);
      resolve(null); // a missing image must never block the scene
    };
    img.src = url;
  });
}

function fitText(ctx, text, maxWidth, startPx, weight, family) {
  let px = startPx;
  do {
    ctx.font = `${weight} ${px}px ${family}`;
    px -= 2;
  } while (ctx.measureText(text).width > maxWidth && px > 12);
  return px + 2;
}

function labelSprite(text, { px = 56, color = '#dffcff' } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = `700 ${px}px Rajdhani, "Segoe UI", sans-serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 40;
  c.width = w;
  c.height = px + 36;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#00f3ff';
  ctx.shadowBlur = 14;
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }),
  );
  const h = 0.9;
  sprite.scale.set((h * c.width) / c.height, h, 1);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- world ----------

export async function createWorld({ canvas, projects, skills, socials, manager, reducedMotion, handlers }) {
  manager.itemStart('init'); // keeps the loader open until every texture request below has been registered
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, powerPreference: 'high-performance' });
  let dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(BG, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, 0.011);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);

  scene.add(new THREE.AmbientLight(0x6688aa, 0.9));
  const key = new THREE.PointLight(CYAN, 900, 80, 1.6);
  const fill = new THREE.PointLight(0x7c3aed, 700, 80, 1.6);
  scene.add(key, fill);

  // Fonts used on canvas textures: give webfonts a moment to arrive, never block.
  try {
    await Promise.race([
      Promise.all([document.fonts.load('700 40px Orbitron'), document.fonts.load('700 40px Rajdhani')]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch {
    /* fall back to system fonts */
  }

  // ----- environment: stars, drifting wire-shards, floor grid -----
  const starCount = 1800;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = THREE.MathUtils.randFloatSpread(140);
    starPos[i * 3 + 1] = THREE.MathUtils.randFloatSpread(70);
    starPos[i * 3 + 2] = THREE.MathUtils.randFloat(30, -230);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0x9be8ff, size: 0.14, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  scene.add(stars);

  const shardCount = 110;
  const shards = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.5),
    new THREE.MeshBasicMaterial({ color: BLUE, wireframe: true, transparent: true, opacity: 0.5 }),
    shardCount,
  );
  const shardData = Array.from({ length: shardCount }, () => ({
    x: THREE.MathUtils.randFloatSpread(60),
    y: THREE.MathUtils.randFloatSpread(26),
    z: THREE.MathUtils.randFloat(20, -200),
    s: THREE.MathUtils.randFloat(0.4, 1.6),
    r: Math.random() * TAU,
    v: THREE.MathUtils.randFloat(0.1, 0.5) * (Math.random() < 0.5 ? -1 : 1),
    p: Math.random() * TAU,
  }));
  scene.add(shards);

  const floor = new THREE.GridHelper(420, 84, 0x0a4a8a, 0x0a2a55);
  floor.position.set(0, -10, -90);
  floor.material.transparent = true;
  floor.material.opacity = 0.4;
  scene.add(floor);

  // ----- layout (responsive anchor for each station) -----
  const stage = {
    hero: new THREE.Group(),
    about: new THREE.Group(),
    skills: new THREE.Group(),
    projects: new THREE.Group(),
    contact: new THREE.Group(),
  };
  // [fade-in start, fully in, start fading out, gone] in scroll space: far-away stations stay hidden until needed
  const WINDOW = {
    hero: [-1, -0.5, 0.14, 0.24],
    about: [0.04, 0.12, 0.31, 0.38],
    skills: [0.3, 0.38, 0.52, 0.58],
    projects: [0.5, 0.57, 0.93, 0.97],
    contact: [0.86, 0.93, 2, 3],
  };
  const baseScale = { hero: 1, about: 1, skills: 1, projects: 1, contact: 1 };
  const trapezoid = (v, [a, b, c, d]) => (v < a || v > d ? 0 : v < b ? (v - a) / (b - a) : v > c ? (d - v) / (d - c) : 1);
  const BASE_Z = { hero: 0, about: -40, skills: -80, projects: -120, contact: -180 };
  Object.entries(stage).forEach(([k, g]) => {
    g.position.z = BASE_Z[k];
    scene.add(g);
  });

  // ----- HERO: 3D name, wire core, rings -----
  const font = new FontLoader().parse(fontJson);
  const textGeo = (str, size) => {
    const g = new TextGeometry(str, {
      font,
      size,
      depth: size * 0.28,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: size * 0.025,
      bevelSize: size * 0.018,
      bevelSegments: 3,
    });
    g.center();
    return g;
  };
  const nameGroup = new THREE.Group();
  const line1 = new THREE.Mesh(
    textGeo('RITIK', 1.7),
    new THREE.MeshStandardMaterial({ color: 0x0a2a3a, emissive: CYAN, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.3 }),
  );
  line1.position.y = 1.35;
  const line2 = new THREE.Mesh(
    textGeo('GHOGHARI', 1.45),
    new THREE.MeshStandardMaterial({ color: 0xeaf9ff, emissive: 0x1d6fa8, emissiveIntensity: 0.45, metalness: 0.7, roughness: 0.25 }),
  );
  line2.position.y = -0.45;
  nameGroup.add(line1, line2);
  nameGroup.position.y = 1.4;
  stage.hero.add(nameGroup);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(6.5, 1),
    new THREE.MeshBasicMaterial({ color: BLUE, wireframe: true, transparent: true, opacity: 0.22 }),
  );
  core.position.z = -10;
  stage.hero.add(core);
  const heroRings = [0, 1, 2].map((i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(9 + i * 2.2, 0.025, 8, 160),
      new THREE.MeshBasicMaterial({ color: i === 1 ? 0x8b5cf6 : CYAN, transparent: true, opacity: 0.55 }),
    );
    ring.position.z = -10;
    ring.rotation.set(Math.PI / 2.4 + i * 0.5, i * 0.7, 0);
    stage.hero.add(ring);
    return ring;
  });

  // ----- ABOUT: data globe with orbiting rings -----
  const avatarGroup = new THREE.Group();
  const globeDots = new THREE.Points(
    new THREE.IcosahedronGeometry(3, 12),
    new THREE.PointsMaterial({ color: CYAN, size: 0.07, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  const globeWire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.6, 2),
    new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.35 }),
  );
  const globeCore = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0x07203a, emissive: CYAN, emissiveIntensity: 0.6, roughness: 0.3 }),
  );
  avatarGroup.add(globeDots, globeWire, globeCore);
  const aboutRings = [4.3, 5.4, 6.5].map((r, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.03, 8, 160),
      new THREE.MeshBasicMaterial({ color: [CYAN, 0x8b5cf6, BLUE][i], transparent: true, opacity: 0.7 }),
    );
    ring.rotation.set(1.1 + i * 0.35, i * 0.9, 0);
    const sat = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshBasicMaterial({ color: [CYAN, 0xc084fc, 0x60a5fa][i] }),
    );
    sat.position.x = r;
    ring.add(sat);
    avatarGroup.add(ring);
    return ring;
  });
  stage.about.add(avatarGroup);

  // ----- SKILLS: orbiting solids -----
  const skillRing = new THREE.Group();
  const skillMeshes = [];
  const geoFor = {
    icosa: () => new THREE.IcosahedronGeometry(1.15, 0),
    box: () => new THREE.BoxGeometry(1.7, 1.7, 1.7),
    knot: () => new THREE.TorusKnotGeometry(0.8, 0.28, 90, 12),
    octa: () => new THREE.OctahedronGeometry(1.3),
    dodeca: () => new THREE.DodecahedronGeometry(1.15),
    cone: () => new THREE.ConeGeometry(1.1, 2, 6),
    torus: () => new THREE.TorusGeometry(0.95, 0.38, 14, 40),
    tetra: () => new THREE.TetrahedronGeometry(1.4),
  };
  skills.forEach((skill, i) => {
    const holder = new THREE.Group();
    const a = (i / skills.length) * TAU;
    holder.position.set(Math.cos(a) * 7.5, 0, Math.sin(a) * 7.5);
    const geo = geoFor[skill.shape]();
    const mat = new THREE.MeshStandardMaterial({
      color: skill.color,
      emissive: skill.color,
      emissiveIntensity: 0.35,
      metalness: 0.4,
      roughness: 0.35,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }),
    );
    mesh.add(wire);
    mesh.userData = { kind: 'skill', skill, baseScale: 1, hover: 0, phase: i * 0.9 };
    holder.add(mesh);
    const label = labelSprite(skill.name);
    label.position.y = -2.1;
    holder.add(label);
    holder.userData.label = label;
    skillRing.add(holder);
    skillMeshes.push(mesh);
  });
  skillRing.rotation.x = 0.32;
  stage.skills.add(skillRing);
  const orbit = new THREE.Mesh(
    new THREE.TorusGeometry(7.5, 0.02, 6, 200),
    new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.3 }),
  );
  orbit.rotation.x = Math.PI / 2;
  skillRing.add(orbit);
  const skillCore = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.6, 2),
    new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.45 }),
  );
  skillRing.add(skillCore);

  // ----- PROJECTS: carousel of cards around the camera -----
  const N = projects.length;
  const STEP = TAU / N;
  const RADIUS = 16;
  const CARD_W = 5;
  const CARD_H = 6.25;
  const ring = new THREE.Group();
  stage.projects.add(ring);
  const cards = [];

  const drawCard = (ctx, p, img) => {
    const W = 512;
    const H = 640;
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0d1530');
    bg.addColorStop(1, '#070a18');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    if (img) {
      ctx.drawImage(img, 0, 0, 512, 512, 0, 0, W, 480 + 32); // slightly taller than frame; caption covers the rest
    } else {
      const g = ctx.createLinearGradient(0, 0, W, 480);
      g.addColorStop(0, '#043d2c');
      g.addColorStop(1, '#0a2a6a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, 480);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '700 150px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🌍', W / 2, 240);
    }
    const cap = ctx.createLinearGradient(0, 440, 0, H);
    cap.addColorStop(0, 'rgba(7,10,24,0)');
    cap.addColorStop(0.22, 'rgba(7,10,24,0.95)');
    cap.addColorStop(1, '#070a18');
    ctx.fillStyle = cap;
    ctx.fillRect(0, 440, W, H - 440);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f2fdff';
    const px = fitText(ctx, p.title, W - 56, 34, 700, 'Orbitron, "Segoe UI", sans-serif');
    ctx.font = `700 ${px}px Orbitron, "Segoe UI", sans-serif`;
    ctx.fillText(p.title, 28, 540);
    ctx.fillStyle = '#9fb4c9';
    ctx.font = '500 25px Rajdhani, "Segoe UI", sans-serif';
    ctx.fillText(p.brief, 28, 580);
    ctx.fillStyle = '#00f3ff';
    ctx.font = '600 21px Rajdhani, "Segoe UI", sans-serif';
    ctx.fillText(p.tags.join('  ·  ').toUpperCase(), 28, 616);
    ctx.strokeStyle = 'rgba(0,243,255,0.5)';
    ctx.lineWidth = 3;
    roundRect(ctx, 2, 2, W - 4, H - 4, 18);
    ctx.stroke();
  };

  projects.forEach((p, i) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 640;
    const ctx = c.getContext('2d');
    let loaded = null;
    drawCard(ctx, p, null);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), mat);
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(CARD_W + 0.12, CARD_H + 0.12)),
      new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.2, fog: false }),
    );
    mesh.add(edge);
    const holder = new THREE.Group();
    const a = i * STEP;
    holder.position.set(Math.sin(a) * RADIUS, 0, -Math.cos(a) * RADIUS);
    holder.rotation.y = -a;
    holder.add(mesh);
    mesh.userData = { kind: 'card', index: i, emph: 0, hover: 0, edge };
    ring.add(holder);
    cards.push({ mesh, holder, angle: a });
    document.fonts?.ready.then(() => {
      drawCard(ctx, p, loaded);
      tex.needsUpdate = true;
    });

    if (p.image) {
      loadImage(`/img/${p.image}-512.webp`, manager).then((img) => {
        if (!img) return;
        loaded = img;
        drawCard(ctx, p, img);
        tex.needsUpdate = true;
      });
    }
  });

  // ----- CONTACT: link tiles -----
  const tiles = [];
  const tileGroup = new THREE.Group();
  socials.forEach((s, i) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 192;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 512, 192);
    g.addColorStop(0, '#0b1d3d');
    g.addColorStop(1, '#10284f');
    ctx.fillStyle = g;
    roundRect(ctx, 4, 4, 504, 184, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,243,255,0.8)';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#eafcff';
    ctx.font = '900 62px Orbitron, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.name.toUpperCase(), 256, 100);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 2.1),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false }),
    );
    mesh.position.set(0, 2.6 - i * 2.8, 0);
    mesh.userData = { kind: 'tile', social: s, hover: 0, baseY: mesh.position.y };
    tileGroup.add(mesh);
    tiles.push(mesh);
  });
  stage.contact.add(tileGroup);
  const contactKnot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(3.4, 0.5, 220, 20, 2, 3),
    new THREE.MeshBasicMaterial({ color: BLUE, wireframe: true, transparent: true, opacity: 0.25 }),
  );
  contactKnot.position.z = -7;
  stage.contact.add(contactKnot);

  // ----- responsive layout -----
  let aspect = 1;
  function layout() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    aspect = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    const wide = aspect > 1.15;
    const visH = (d) => 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitScale = (d, units) => Math.min(1, (visH(d) * aspect * 0.92) / units);

    // hero: centred; shrink name on narrow screens
    baseScale.hero = fitScale(16, 13.5);
    stage.hero.position.y = wide ? 0 : 1.2;

    // about / skills / contact: 3D on the right (desktop) or top (portrait)
    const off = wide ? { x: visH(16) * aspect * 0.23, y: 0, s: 1 } : { x: 0, y: visH(16) * 0.2, s: Math.min(1, aspect * 1.35) };
    stage.about.position.set(off.x, off.y, BASE_Z.about);
    baseScale.about = off.s * (wide ? 0.95 : 0.72);

    const offSkill = wide
      ? { x: visH(18) * aspect * 0.2, y: -0.4, s: 0.7 }
      : { x: 0, y: visH(18) * 0.2, s: Math.min(0.62, aspect * 0.95) };
    stage.skills.position.set(offSkill.x, offSkill.y, BASE_Z.skills);
    baseScale.skills = offSkill.s;

    stage.contact.position.set(wide ? visH(18) * aspect * 0.2 : 0, wide ? 0 : visH(18) * 0.2, BASE_Z.contact);
    baseScale.contact = wide ? 0.9 : Math.min(0.62, aspect * 0.9);

    // carousel: on portrait screens the cards are lifted above the caption
    stage.projects.position.y = wide ? 0 : 1.5;
  }
  layout();
  manager.itemEnd('init');
  let lastW = canvas.clientWidth;
  const ro = new ResizeObserver(() => {
    const w = canvas.clientWidth;
    if (coarse && w === lastW) return; // phone address bar showing/hiding: keep the current buffer
    lastW = w;
    layout();
  });
  ro.observe(canvas);

  // ----- interaction -----
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(9, 9);
  let pointerActive = false;
  let hovered = null;
  const interactive = [...skillMeshes, ...cards.map((c) => c.mesh), ...tiles];

  function updatePointer(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }
  function pick() {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(interactive, false)[0];
    return hit ? hit.object : null;
  }
  const mouse = { x: 0, y: 0 };
  function onMove(e) {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    if (e.target === canvas && e.pointerType === 'mouse') {
      updatePointer(e);
      pointerActive = true;
    } else {
      pointerActive = false;
    }
  }
  let downAt = null;
  function onDown(e) {
    if (e.target === canvas) downAt = { x: e.clientX, y: e.clientY };
  }
  function onUp(e) {
    if (!downAt || e.target !== canvas) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 8) return;
    updatePointer(e);
    activate(pick(), e);
  }
  function activate(obj, e) {
    if (!obj) {
      handlers.onSkillFocus(null);
      return;
    }
    const d = obj.userData;
    if (d.kind === 'card') {
      if (d.index === state.front) handlers.onProjectOpen(d.index);
      else handlers.onProjectFocus(d.index);
    } else if (d.kind === 'tile') {
      handlers.onLink(d.social.url);
    } else if (d.kind === 'skill') {
      handlers.onSkillFocus(d.skill, e.clientX, e.clientY, true);
    }
  }
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });

  // ----- frame update -----
  const state = { front: 0, phi: 0 };
  const camPos = [0, 0, 0];
  const camLook = [0, 0, 0];
  const lookV = new THREE.Vector3();
  const tmpM = new THREE.Object3D();
  const motion = reducedMotion ? 0.15 : 1;
  const maxPhi = (N - 1) * STEP;

  function update(s, dt, time) {
    // camera rail + subtle pointer parallax
    sampleCamera(s, camPos, camLook);
    const px = reducedMotion ? 0 : mouse.x;
    const py = reducedMotion ? 0 : mouse.y;
    const inCarousel = s > CAROUSEL.from - 0.03 && s < CAROUSEL.to + 0.03;
    const par = inCarousel ? 0.25 : 1.2;
    camera.position.set(camPos[0] + px * par, camPos[1] - py * par * 0.6, camPos[2]);
    lookV.set(camLook[0] + px * par * 1.5, camLook[1] - py * par * 0.8, camLook[2]);
    camera.lookAt(lookV);
    key.position.copy(camera.position).add(new THREE.Vector3(4, 5, 2));
    fill.position.copy(camera.position).add(new THREE.Vector3(-6, -3, -12));

    for (const k of Object.keys(stage)) {
      const m = trapezoid(s, WINDOW[k]);
      stage[k].visible = m > 0.001;
      stage[k].scale.setScalar(baseScale[k] * (0.55 + 0.45 * m));
    }

    // hero
    core.rotation.y += dt * 0.12 * motion;
    core.rotation.x += dt * 0.05 * motion;
    heroRings.forEach((r, i) => (r.rotation.z += dt * (0.15 + i * 0.07) * motion));
    nameGroup.rotation.y = Math.sin(time * 0.5 * motion) * 0.12 + px * 0.08;
    nameGroup.position.y = 1.4 + Math.sin(time * 0.9 * motion) * 0.08;

    // about
    aboutRings.forEach((r, i) => (r.rotation.z += dt * (0.4 + i * 0.25) * motion));
    avatarGroup.rotation.y = Math.sin(time * 0.6 * motion) * 0.25 + px * 0.1;
    globeDots.rotation.y += dt * 0.15 * motion;
    globeWire.rotation.y -= dt * 0.25 * motion;
    globeWire.rotation.x += dt * 0.1 * motion;

    // skills
    skillRing.rotation.y += dt * 0.12 * motion;
    skillCore.rotation.y -= dt * 0.3 * motion;
    skillMeshes.forEach((m) => {
      const d = m.userData;
      m.rotation.x += dt * 0.5 * motion;
      m.rotation.y += dt * 0.7 * motion;
      m.parent.position.y = Math.sin(time * 0.8 * motion + d.phase) * 0.4;
      d.hover = damp(d.hover, hovered === m ? 1 : 0, 10, dt);
      m.scale.setScalar(1 + d.hover * 0.4);
      m.material.emissiveIntensity = 0.35 + d.hover * 0.9;
      // keep labels upright: counter the ring's tilt/rotation is overkill; sprites already face camera.
    });

    // carousel
    const prog = Math.min(1, Math.max(0, (s - CAROUSEL.from) / (CAROUSEL.to - CAROUSEL.from)));
    state.phi = prog * maxPhi;
    ring.rotation.y = state.phi;
    const front = Math.round(state.phi / STEP);
    if (front !== state.front) {
      state.front = front;
      handlers.onFrontChange(front);
    }
    cards.forEach((c) => {
      const d = c.mesh.userData;
      const diff = Math.abs(wrapPi(c.angle - state.phi)) / STEP;
      d.emph = Math.max(0, 1 - diff);
      d.hover = damp(d.hover, hovered === c.mesh ? 1 : 0, 12, dt);
      const sc = 1 + d.emph * 0.16 + d.hover * 0.04;
      c.mesh.scale.setScalar(sc);
      const b = 0.4 + d.emph * 0.6 + d.hover * 0.15;
      c.mesh.material.color.setScalar(Math.min(1, b));
      d.edge.material.opacity = 0.18 + d.emph * 0.75;
    });

    // contact
    contactKnot.rotation.x += dt * 0.15 * motion;
    contactKnot.rotation.y += dt * 0.2 * motion;
    tiles.forEach((t) => {
      const d = t.userData;
      d.hover = damp(d.hover, hovered === t ? 1 : 0, 10, dt);
      t.position.y = d.baseY + Math.sin(time * 0.9 * motion + d.baseY) * 0.12;
      t.scale.setScalar(1 + d.hover * 0.1);
      t.position.z = d.hover * 0.8;
    });

    // ambient
    stars.rotation.z += dt * 0.004 * motion;
    for (let i = 0; i < shardCount; i++) {
      const d = shardData[i];
      tmpM.position.set(d.x, d.y + Math.sin(time * 0.3 * motion + d.p) * 0.8, d.z);
      tmpM.rotation.set(d.r + time * d.v * motion, d.r * 0.5 + time * d.v * 0.7 * motion, 0);
      tmpM.scale.setScalar(d.s);
      tmpM.updateMatrix();
      shards.setMatrixAt(i, tmpM.matrix);
    }
    shards.instanceMatrix.needsUpdate = true;

    // hover pick (desktop pointers only; touch uses tap)
    if (pointerActive) {
      const next = pick();
      if (next !== hovered) {
        hovered = next;
        canvas.style.cursor = hovered ? 'pointer' : '';
        if (hovered?.userData.kind === 'skill') {
          handlers.onSkillFocus(hovered.userData.skill, lastPointer.x, lastPointer.y, false);
        } else if (!hovered) {
          handlers.onSkillFocus(null);
        }
      }
    } else if (hovered) {
      hovered = null;
      canvas.style.cursor = '';
    }

    renderer.render(scene, camera);
  }

  const lastPointer = { x: 0, y: 0 };
  window.addEventListener(
    'pointermove',
    (e) => {
      lastPointer.x = e.clientX;
      lastPointer.y = e.clientY;
    },
    { passive: true },
  );

  // Lower the render resolution step by step while the device can't hold ~40 fps.
  let slowFrames = 0;
  function adapt(dt) {
    if (dt > 1 / 40) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 45 && dpr > 1) {
      dpr = Math.max(1, dpr - 0.25);
      renderer.setPixelRatio(dpr);
      layout();
      slowFrames = 0;
    }
  }

  return {
    update(s, dt, time) {
      adapt(dt);
      update(s, dt, time);
    },
    get frontIndex() {
      return state.front;
    },
    dispose() {
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      renderer.dispose();
    },
  };
}
