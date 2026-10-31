import {
  WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, Points, ShaderMaterial, AdditiveBlending, Group,
} from 'three';

// One draw call: a breathing particle sphere animated on the GPU. Renders only while the hero is on screen.
export function startHero(canvas, { reducedMotion }) {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5));

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 6;

  // Evenly spread points on a sphere (Fibonacci lattice)
  const count = coarse ? 2200 : 4200;
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    pos[i * 3] = Math.cos(t) * r;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = Math.sin(t) * r;
    seed[i] = Math.random();
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('seed', new BufferAttribute(seed, 1));

  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSize: { value: (coarse ? 2.6 : 3.0) * renderer.getPixelRatio() } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uSize;
      attribute float seed;
      varying float vMix; varying float vFade;
      void main() {
        vec3 p = position;
        float wave = sin(p.y * 4.0 + uTime * 0.9) * 0.06 + sin(p.x * 3.0 - uTime * 0.7) * 0.05;
        p *= 1.85 + wave + seed * 0.04;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.6 + seed * 0.8) * (6.0 / -mv.z);
        vMix = position.y * 0.5 + 0.5;
        vFade = smoothstep(-8.5, -4.2, mv.z);
      }`,
    fragmentShader: /* glsl */ `
      varying float vMix; varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        vec3 a = vec3(0.37, 0.92, 0.83); // teal
        vec3 b = vec3(0.49, 0.61, 1.0);  // indigo
        gl_FragColor = vec4(mix(b, a, vMix), (1.0 - d * 2.0) * (0.25 + 0.75 * vFade));
      }`,
  });
  const sphere = new Points(geo, mat);

  // Two tilted particle rings orbiting the sphere (same shader, so they "breathe" with it)
  const ring = (n, radius) => {
    const rp = new Float32Array(n * 3);
    const rs = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const jitter = 1 + (Math.random() - 0.5) * 0.06;
      rp[i * 3] = Math.cos(a) * radius * jitter;
      rp[i * 3 + 1] = (Math.random() - 0.5) * 0.03;
      rp[i * 3 + 2] = Math.sin(a) * radius * jitter;
      rs[i] = Math.random();
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(rp, 3));
    g.setAttribute('seed', new BufferAttribute(rs, 1));
    return new Points(g, mat);
  };
  const ringA = ring(coarse ? 260 : 520, 1.3);
  const ringB = ring(coarse ? 200 : 400, 1.45);
  ringA.rotation.set(1.15, 0, 0.35);
  ringB.rotation.set(-0.9, 0.4, -0.5);
  const orb = new Group();
  orb.add(sphere, ringA, ringB);
  scene.add(orb);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Desktop: sphere sits to the right of the text. Narrow screens: centred, further back.
    const wide = w / h > 1.1;
    const aspect = w / h;
    orb.scale.setScalar(wide ? 0.78 : 0.95);
    orb.position.set(wide ? 1.45 * Math.min(1.7, aspect) : 0, wide ? 0 : 0.6, wide ? 0 : -1.5);
  }
  let lastW = 0;
  const ro = new ResizeObserver(() => {
    if (coarse && canvas.clientWidth === lastW) return; // ignore mobile address-bar height changes
    lastW = canvas.clientWidth;
    resize();
  });
  ro.observe(canvas);
  resize();

  const target = { x: 0, y: 0 };
  if (!coarse && !reducedMotion) {
    window.addEventListener('pointermove', (e) => {
      target.x = (e.clientY / window.innerHeight - 0.5) * 0.4;
      target.y = (e.clientX / window.innerWidth - 0.5) * 0.6;
    }, { passive: true });
  }

  let visible = true;
  let raf = 0;
  let last = performance.now();
  let time = 0;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // reduced-motion visitors get a calm version: slow rotation, no breathing, no mouse parallax
    const k = reducedMotion ? 0.3 : 1;
    if (!reducedMotion) time += dt;
    mat.uniforms.uTime.value = time;
    sphere.rotation.y += dt * 0.12 * k;
    ringA.rotation.y += dt * 0.35 * k;
    ringB.rotation.y -= dt * 0.25 * k;
    orb.rotation.x += (target.x - orb.rotation.x) * 0.05;
    orb.rotation.y += (target.y - orb.rotation.y) * 0.05;
    renderer.render(scene, camera);
    raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
  };
  const play = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) play();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => !document.hidden && visible && play());
  play();
  canvas.classList.add('ready');
}
