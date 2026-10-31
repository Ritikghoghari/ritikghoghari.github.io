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
  // reduced motion: same globe, drifting at a calmer speed
  const calm = reducedMotion ? 0.4 : 1;
  let raf = 0;
  let last = 0;
  const frame = (now) => {
    const k = (last ? Math.min(3, (now - last) / 16.7) : 1) * calm;
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

// 3D coverflow: the active slide faces the viewer, neighbours angle away into depth.
// Works with swipe (touch keeps vertical scrolling), arrows, dots, keyboard and clicking a side slide.
export function initCoverflow(root, slides, { reducedMotion }) {
  const track = document.createElement('div');
  track.className = 'cf-track';
  const items = slides.map((content, i) => {
    const s = document.createElement('div');
    s.className = 'cf-slide';
    s.setAttribute('role', 'group');
    s.setAttribute('aria-roledescription', 'slide');
    s.setAttribute('aria-label', `${i + 1} of ${slides.length}`);
    s.append(content);
    track.append(s);
    return s;
  });

  const prev = Object.assign(document.createElement('button'), { type: 'button', className: 'cf-btn', innerHTML: '&larr;' });
  const next = Object.assign(document.createElement('button'), { type: 'button', className: 'cf-btn', innerHTML: '&rarr;' });
  prev.setAttribute('aria-label', 'Previous project');
  next.setAttribute('aria-label', 'Next project');
  const dots = document.createElement('div');
  dots.className = 'cf-dots';
  const dotBtns = items.map((_, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.setAttribute('aria-label', `Show project ${i + 1}`);
    d.addEventListener('click', () => go(i));
    dots.append(d);
    return d;
  });
  const controls = document.createElement('div');
  controls.className = 'cf-controls';
  controls.append(prev, dots, next);

  root.setAttribute('role', 'region');
  root.setAttribute('aria-roledescription', 'carousel');
  root.setAttribute('aria-label', 'Featured projects');
  root.tabIndex = 0;
  root.append(track, controls);

  let active = 0;
  function layout() {
    const narrow = root.clientWidth < 700;
    const step = narrow ? 74 : 58; // % of slide width each neighbour shifts sideways
    items.forEach((s, i) => {
      const d = i - active;
      const a = Math.abs(d);
      const hidden = a > 2;
      s.style.transform =
        `translateX(-50%) translateX(${d * step}%) translateZ(${-a * (narrow ? 220 : 260)}px) rotateY(${-Math.sign(d) * Math.min(a, 1) * (narrow ? 40 : 42)}deg)`;
      s.style.opacity = hidden ? '0' : a === 0 ? '1' : a === 1 ? '0.6' : '0.25';
      s.style.zIndex = String(10 - a);
      s.style.pointerEvents = hidden ? 'none' : '';
      s.classList.toggle('is-active', a === 0);
      s.setAttribute('aria-hidden', String(a !== 0));
      s.inert = a !== 0; // only the front slide's links are focusable
    });
    dotBtns.forEach((d, i) => d.setAttribute('aria-current', String(i === active)));
    prev.disabled = active === 0;
    next.disabled = active === items.length - 1;
  }
  function go(i) {
    active = Math.max(0, Math.min(items.length - 1, i));
    layout();
  }
  prev.addEventListener('click', () => go(active - 1));
  next.addEventListener('click', () => go(active + 1));
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(active - 1);
    if (e.key === 'ArrowRight') go(active + 1);
  });

  // side slides: click brings them to the front (inert blocks their own links)
  track.addEventListener('click', (e) => {
    if (moved) return;
    const s = e.target.closest('.cf-slide');
    const i = items.indexOf(s);
    if (i >= 0 && i !== active) go(i);
  });

  // swipe
  let startX = null;
  let moved = false;
  track.addEventListener('pointerdown', (e) => { startX = e.clientX; moved = false; });
  track.addEventListener('pointerup', (e) => {
    if (startX == null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 45) {
      moved = true;
      go(active + (dx < 0 ? 1 : -1));
      setTimeout(() => (moved = false), 0);
    }
  });
  track.addEventListener('pointercancel', () => (startX = null));

  // the track needs an explicit height because slides are absolutely positioned
  const fit = () => {
    // measure natural heights, then give the track and every slide the tallest one (equal-height cards)
    track.style.removeProperty('--cf-h');
    const h = Math.max(...items.map((s) => s.offsetHeight));
    track.style.height = `${h}px`;
    track.style.setProperty('--cf-h', `${h}px`);
  };
  new ResizeObserver(() => { fit(); layout(); }).observe(root);
  items.forEach((s) => s.querySelectorAll('img').forEach((img) => img.addEventListener('load', fit)));
  if (reducedMotion) root.classList.add('cf-static');
  layout();
  fit();
}
