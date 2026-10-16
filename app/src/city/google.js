import * as THREE from 'three';
import { TilesRenderer } from '3d-tiles-renderer';
import { GoogleCloudAuthPlugin, GLTFExtensionsPlugin, TileCompressionPlugin, TilesFadePlugin, ReorientationPlugin } from '3d-tiles-renderer/plugins';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Real Berlin from Google Photorealistic 3D Tiles. Each stop is a real landmark used as a
// metaphor for a part of the portfolio; the info cards carry the actual content.
const D = THREE.MathUtils.DEG2RAD;
const CENTER = { lat: 52.5163, lon: 13.3777 };
const GROUND = 74; // approx. ellipsoid height of street level in central Berlin (m)

// az = compass direction from the landmark to the camera (0 = north, 90 = east)
export const STOPS = [
  { id: 'gate', label: 'Gate', place: 'Brandenburg Gate', lat: 52.516275, lon: 13.377704, lookH: 18, dist: 230, alt: 110, az: 95 },
  { id: 'about', label: 'About', place: 'Reichstag', lat: 52.518623, lon: 13.376198, lookH: 30, dist: 280, alt: 150, az: 120 },
  { id: 'experience', label: 'Experience', place: 'Potsdamer Platz', lat: 52.509648, lon: 13.376041, lookH: 70, dist: 380, alt: 210, az: 35, side: 1 },
  { id: 'education', label: 'Education', place: 'Museum Island', lat: 52.519066, lon: 13.398, lookH: 30, dist: 380, alt: 200, az: 215 },
  { id: 'skills', label: 'Skills', place: 'Alexanderplatz', lat: 52.521918, lon: 13.413215, lookH: 25, dist: 330, alt: 180, az: 300, side: 1 },
  { id: 'projects', label: 'Projects', place: 'East Side Gallery', lat: 52.505021, lon: 13.439687, lookH: 6, dist: 300, alt: 140, az: 200 },
  { id: 'contact', label: 'Contact', place: 'TV Tower', lat: 52.520815, lon: 13.409419, lookH: 210, dist: 700, alt: 280, az: 250 },
];

export function createCity(canvas, { reducedMotion, onPick, onFail, apiKey }) {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const skyTop = new THREE.Color(0x7fb0e6);
  scene.background = skyTop;
  scene.fog = new THREE.FogExp2(0xb9cde3, 0.00012);
  const camera = new THREE.PerspectiveCamera(50, 1, 1, 80000);
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  // ---------- tiles ----------
  const tiles = new TilesRenderer();
  tiles.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: apiKey, autoRefreshToken: true }));
  const draco = new DRACOLoader().setDecoderPath('/draco/');
  tiles.registerPlugin(new GLTFExtensionsPlugin({ dracoLoader: draco }));
  tiles.registerPlugin(new TileCompressionPlugin());
  if (!reducedMotion) tiles.registerPlugin(new TilesFadePlugin());
  tiles.registerPlugin(new ReorientationPlugin({ lat: CENTER.lat * D, lon: CENTER.lon * D, height: GROUND, recenter: true }));
  tiles.errorTarget = coarse ? 28 : 18; // phones load coarser detail
  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);
  scene.add(tiles.group);

  // the ReorientationPlugin re-centres Berlin at the origin when the root tileset loads;
  // positions computed before that are in raw Earth coordinates, so everything waits for it
  let rootReady = false;
  const ready = new Promise((resolve) =>
    tiles.addEventListener('load-root-tileset', () => {
      rootReady = true;
      resolve();
    }),
  );
  let failed = false;
  let loadedAny = false;
  tiles.addEventListener('load-model', () => (loadedAny = true));
  tiles.addEventListener('load-error', (e) => {
    // a root/tileset failure (bad key, quota, network) means the whole map is unavailable
    if (!failed && (!e.tile || e.tile === tiles.root || !loadedAny)) {
      failed = true;
      onFail?.(e.error);
    }
  });
  setTimeout(() => !loadedAny && !failed && ((failed = true), onFail?.(new Error('timeout'))), 25000);

  // ---------- geo helpers (lat/lon in degrees → local scene position) ----------
  const tmp = new THREE.Vector3();
  function local(lat, lon, h, target = new THREE.Vector3()) {
    tiles.group.updateMatrixWorld(true);
    tiles.ellipsoid.getCartographicToPosition(lat * D, lon * D, h, tmp);
    return target.copy(tmp).applyMatrix4(tiles.group.matrixWorld);
  }
  function stopView(i, scale = 1) {
    const s = STOPS[i];
    const look = local(s.lat, s.lon, GROUND + s.lookH);
    const north = (s.dist * scale * Math.cos(s.az * D)) / 111320;
    const east = (s.dist * scale * Math.sin(s.az * D)) / (111320 * Math.cos(s.lat * D));
    const pos = local(s.lat + north, s.lon + east, GROUND + s.alt * scale);
    if (portrait) look.y -= s.alt * 0.25; // narrow screens: landmark sits above the info card
    return { pos, look, center: look.clone() };
  }

  // ---------- HTML markers on the landmarks (tap to travel) ----------
  const markerLayer = document.createElement('div');
  markerLayer.className = 'g-markers';
  document.body.append(markerLayer);
  const markers = STOPS.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'g-marker';
    b.innerHTML = `<span class="g-dot"></span><span class="g-name"></span>`;
    b.querySelector('.g-name').textContent = s.label;
    b.setAttribute('aria-label', `Go to ${s.label}: ${s.place}`);
    b.addEventListener('click', () => onPick(i));
    markerLayer.append(b);
    return { el: b, pos: null };
  });
  const proj = new THREE.Vector3();
  function placeMarkers() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    markers.forEach((m, i) => {
      if (!rootReady) return;
      if (!m.pos) m.pos = local(STOPS[i].lat, STOPS[i].lon, GROUND + STOPS[i].lookH);
      proj.copy(m.pos).project(camera);
      const visible = !aerial && proj.z < 1 && Math.abs(proj.x) < 1.05 && Math.abs(proj.y) < 1.05 && i !== current;
      m.el.style.display = visible ? '' : 'none';
      if (visible) m.el.style.transform = `translate(${((proj.x + 1) / 2) * w}px, ${((1 - proj.y) / 2) * h}px)`;
    });
  }

  // ---------- attribution (required by Google's terms) ----------
  const attribution = document.createElement('div');
  attribution.className = 'g-attrib';
  document.body.append(attribution);
  let lastAttr = '';
  function updateAttribution() {
    const list = tiles.getAttributions([]).filter((a) => a.type === 'string').map((a) => a.value);
    const text = `Google · ${list.join(' · ') || 'Map data ©Google'}`;
    if (text !== lastAttr) attribution.textContent = lastAttr = text;
  }

  // ---------- camera ----------
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const from = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const to = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  let travel = null;
  let aerial = true;
  let portrait = false;
  let current = -1;
  let orbitCenter = null;
  let orbitAngle = 0;
  const yawPitch = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0 };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function flyTo(target, { dur, onDone } = {}) {
    from.pos.copy(camPos);
    from.look.copy(camLook);
    to.pos.copy(target.pos);
    to.look.copy(target.look);
    const dist = from.pos.distanceTo(to.pos);
    travel = { t: 0, dur: reducedMotion ? 0.001 : dur ?? Math.min(5, 2 + dist / 1200), arc: Math.min(600, dist * 0.18), onDone };
    orbitCenter = null;
    yawPitch.tYaw = yawPitch.tPitch = 0;
  }

  // drag to look around
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => (drag = { x: e.clientX, y: e.clientY, yaw: yawPitch.tYaw, pitch: yawPitch.tPitch }));
  window.addEventListener('pointermove', (e) => {
    if (!drag || aerial) return;
    yawPitch.tYaw = THREE.MathUtils.clamp(drag.yaw - (e.clientX - drag.x) * 0.004, -1.2, 1.2);
    yawPitch.tPitch = THREE.MathUtils.clamp(drag.pitch + (e.clientY - drag.y) * 0.003, -0.4, 0.5);
  });
  window.addEventListener('pointerup', () => (drag = null));

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    portrait = w / h < 0.9;
    camera.fov = portrait ? 62 : 50;
    camera.updateProjectionMatrix();
    tiles.setResolutionFromRenderer(camera, renderer);
  }
  let lastW = 0;
  new ResizeObserver(() => {
    if (coarse && canvas.clientWidth === lastW) return;
    lastW = canvas.clientWidth;
    resize();
  }).observe(canvas);
  resize();

  // ---------- loop ----------
  const clock = new THREE.Clock();
  const lookDir = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  let aerialAngle = 0;
  let attrTimer = 0;
  local(CENTER.lat, CENTER.lon, GROUND, camLook);
  camPos.copy(camLook).add(new THREE.Vector3(0, 2600, 2600));

  function frame() {
    const dt = Math.min(0.05, clock.getDelta());
    if (aerial) {
      aerialAngle += dt * (reducedMotion ? 0 : 0.03);
      local(CENTER.lat, CENTER.lon, GROUND, camLook);
      camPos.set(camLook.x + Math.sin(aerialAngle) * 2800, camLook.y + 2200, camLook.z + Math.cos(aerialAngle) * 2800);
    } else if (travel) {
      travel.t = Math.min(1, travel.t + dt / travel.dur);
      const k = ease(travel.t);
      camPos.lerpVectors(from.pos, to.pos, k);
      camPos.y += Math.sin(Math.PI * k) * travel.arc;
      camLook.lerpVectors(from.look, to.look, ease(Math.min(1, travel.t * 1.1)));
      if (travel.t >= 1) {
        const done = travel.onDone;
        orbitCenter = to.look.clone();
        orbitAngle = 0;
        travel = null;
        done?.();
      }
    } else if (orbitCenter && !reducedMotion) {
      // slow cinematic orbit around the current landmark
      orbitAngle = dt * 0.03;
      camPos.sub(orbitCenter).applyAxisAngle(THREE.Object3D.DEFAULT_UP, orbitAngle).add(orbitCenter);
    }

    yawPitch.yaw += (yawPitch.tYaw - yawPitch.yaw) * (1 - Math.exp(-8 * dt));
    yawPitch.pitch += (yawPitch.tPitch - yawPitch.pitch) * (1 - Math.exp(-8 * dt));
    lookDir.subVectors(camLook, camPos);
    lookDir.applyAxisAngle(THREE.Object3D.DEFAULT_UP, yawPitch.yaw);
    lookDir.y += yawPitch.pitch * lookDir.length();
    lookAt.copy(camPos).add(lookDir);
    camera.position.copy(camPos);
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();

    tiles.update();
    renderer.render(scene, camera);
    placeMarkers();
    if ((attrTimer -= dt) <= 0) {
      updateAttribution();
      attrTimer = 1;
    }
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
    ready,
    enter(onDone) {
      aerial = false;
      current = 0;
      flyTo(stopView(0), { dur: reducedMotion ? 0.001 : 6, onDone });
    },
    goTo(i, onDone) {
      current = i;
      flyTo(stopView(i), { onDone });
    },
    focusProject() {
      // no billboards in the real city: give the gallery a gentle push-in instead
      if (current === 5) flyTo(stopView(5, 0.75), { dur: 1.6 });
    },
  };
}
