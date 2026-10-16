// Lightweight CSS-3D effects: a rotating skills globe and pointer tilt on cards.

// Words placed on a sphere and rotated with transforms. Runs only while the globe is on screen.
export function initSkillGlobe(container, words, { reducedMotion }) {
  const n = words.length;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pts = words.map((w, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const span = document.createElement('span');
    span.textContent = w;
    container.append(span);
    return { x: Math.cos(golden * i) * r, y, z: Math.sin(golden * i) * r, el: span };
  });

  let radius = 0;
  const measure = () => (radius = container.clientWidth * 0.45);
  new ResizeObserver(measure).observe(container);
  measure();

  let ax = 0.0016; // rotation speed around X / Y (radians per frame at 60 fps)
  let ay = 0.0032;
  let rotX = 0.3;
  let rotY = 0;

  function draw() {
    const cx = Math.cos(rotX), sx = Math.sin(rotX), cy = Math.cos(rotY), sy = Math.sin(rotY);
    for (const p of pts) {
      // rotate around Y, then X
      const x1 = p.x * cy + p.z * sy;
      const z1 = -p.x * sy + p.z * cy;
      const y2 = p.y * cx - z1 * sx;
      const z2 = p.y * sx + z1 * cx;
      const depth = (z2 + 1) / 2; // 0 = back, 1 = front
      p.el.style.transform = `translate(-50%, -50%) translate3d(${x1 * radius}px, ${y2 * radius}px, ${z2 * radius}px) scale(${0.62 + depth * 0.48})`;
      p.el.style.opacity = (0.25 + depth * 0.75).toFixed(2);
      p.el.style.zIndex = String(Math.round(depth * 100));
    }
  }

  // steer with the pointer while hovering (desktop); otherwise drift
  container.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = container.getBoundingClientRect();
    ay = ((e.clientX - r.left) / r.width - 0.5) * 0.02;
    ax = -((e.clientY - r.top) / r.height - 0.5) * 0.02;
  });
  container.addEventListener('pointerleave', () => { ax = 0.0016; ay = 0.0032; });

  draw();
  if (reducedMotion) return;
  let raf = 0;
  let last = 0;
  const frame = (now) => {
    const k = last ? Math.min(3, (now - last) / 16.7) : 1;
    last = now;
    rotX += ax * k;
    rotY += ay * k;
    draw();
    raf = requestAnimationFrame(frame);
  };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !raf) { last = 0; raf = requestAnimationFrame(frame); }
    else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
  }).observe(container);
}

// Tilt + moving glare on hover. Mouse only; touch devices keep cards flat.
export function initTilt(selector, { reducedMotion, max = 7 } = {}) {
  if (reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest?.(selector);
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    card.style.setProperty('--ry', `${(px - 0.5) * max * 2}deg`);
    card.style.setProperty('--rx', `${-(py - 0.5) * max * 2}deg`);
    card.style.setProperty('--gx', `${px * 100}%`);
    card.style.setProperty('--gy', `${py * 100}%`);
    card.classList.add('tilting');
  }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    const card = e.target.closest?.(selector);
    if (card && !card.contains(e.relatedTarget)) {
      card.classList.remove('tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    }
  }, { passive: true });
}
