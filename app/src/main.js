import './style.css';
import { PROJECTS, CATEGORIES, EXPERIENCE, EDUCATION, SKILL_GROUPS } from './data.js';
import { initSkillGlobe, initTilt, initCoverflow } from './effects3d.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);

// Small DOM helper: el('div', {class: 'x'}, child, 'text')
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}

// ---------- timeline ----------
function renderTimeline(list, target) {
  target.append(
    ...list.map((item) =>
      el(
        'li',
        { class: 'reveal' },
        el('p', { class: 'when' }, `${item.when} · ${item.where}`),
        el('h4', {}, item.title),
        el('p', { class: 'org' }, item.org),
        el('ul', {}, item.points.map((p) => el('li', {}, p))),
      ),
    ),
  );
}

// ---------- skills ----------
function renderSkills() {
  $('skills-list').append(
    ...SKILL_GROUPS.map((g) =>
      el('div', { class: 'card skill-group tilt reveal' }, el('h3', {}, g.name), el('ul', { class: 'chips' }, g.items.map((i) => el('li', {}, i)))),
    ),
  );
}

// ---------- projects ----------
const img = (p, size, cls) =>
  p.image
    ? el('img', { src: `/img/${p.image}-${size}.webp`, alt: '', loading: 'lazy', decoding: 'async', width: 512, height: 512, class: cls })
    : el('div', { class: `${cls} placeholder`, 'aria-hidden': 'true' }, '🌍');

const codeLink = (p) => el('a', { class: 'link', href: p.link, target: '_blank', rel: 'noopener' }, 'View code ↗');
const tags = (p) => el('ul', { class: 'tags' }, p.tags.map((t) => el('li', {}, t)));

function renderFeatured() {
  const slides = PROJECTS.filter((p) => p.featured).map((p) =>
    el(
      'article',
      { class: 'card feature' },
      el('div', { class: 'feature-media' }, img(p, 1024, 'feature-img')),
      el(
        'div',
        { class: 'feature-body' },
        el('p', { class: 'kicker' }, p.category),
        el('h3', {}, p.title),
        el('p', {}, p.description),
        tags(p),
        codeLink(p),
      ),
    ),
  );
  initCoverflow($('featured-list'), slides, { reducedMotion });
}

function renderGrid(filter) {
  const list = $('project-list');
  queueMicrotask(() => list.querySelectorAll('.reveal').forEach(observeReveal));
  list.replaceChildren(
    ...PROJECTS.filter((p) => filter === 'All' || p.category === filter).map((p, i) =>
      el(
        'li',
        { class: 'card project tilt reveal', style: `--d:${(i % 3) * 90}ms` },
        el('div', { class: 'project-media' }, img(p, 512, 'project-img')),
        el(
          'div',
          { class: 'project-body' },
          el('p', { class: 'kicker' }, p.category),
          el('h4', {}, p.title),
          el('p', {}, p.brief),
          tags(p),
          codeLink(p),
        ),
      ),
    ),
  );
}

function renderFilters() {
  const wrap = $('filters');
  CATEGORIES.forEach((c, i) => {
    const b = el('button', { type: 'button', class: 'chip-btn', 'aria-pressed': String(i === 0) }, c);
    b.addEventListener('click', () => {
      wrap.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderGrid(c);
    });
    wrap.append(b);
  });
  renderGrid('All');
}

// ---------- nav ----------
function initNav() {
  const nav = $('nav');
  const toggle = $('nav-toggle');
  const links = $('nav-links');
  const setOpen = (open) => {
    links.classList.toggle('open', open);
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
  links.addEventListener('click', (e) => e.target.closest('a') && setOpen(false));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));

  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // highlight the section currently in view
  const anchors = [...links.querySelectorAll('a[href^="#"]')];
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        anchors.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${en.target.id}`));
      }),
    { rootMargin: '-45% 0px -50% 0px' },
  );
  anchors.forEach((a) => {
    const sec = document.querySelector(a.getAttribute('href'));
    if (sec) io.observe(sec);
  });
}

// ---------- reveal on scroll (content stays visible without JS / with reduced motion) ----------
let revealIO = null;
function observeReveal(node) {
  if (!revealIO) node.classList.add('in');
  else revealIO.observe(node);
}
function initReveal() {
  if (!reducedMotion && 'IntersectionObserver' in window) {
    revealIO = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add('in');
          revealIO.unobserve(en.target);
          // drop the stagger delay once shown so hover/tilt responses stay instant
          setTimeout(() => en.target.style.removeProperty('--d'), 1200);
        }),
      { rootMargin: '0px 0px -8% 0px' },
    );
  }
  document.querySelectorAll('.reveal').forEach(observeReveal);
}

// ---------- contact form (Web3Forms) ----------
// Public client key by design; restrict it to this domain in the Web3Forms dashboard.
const WEB3FORMS_ACCESS_KEY = 'fc739b37-dd65-43a9-8ce3-c762edb249a5';
function initContact() {
  const form = $('contact-form');
  const status = form.querySelector('.form-status');
  const btn = form.querySelector('button');
  const rules = {
    name: (v) => (v ? '' : 'Please enter your name.'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Please enter a valid email.'),
    message: (v) => (v ? '' : 'Please write a short message.'),
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.company.value) return; // honeypot
    let ok = true;
    for (const [name, rule] of Object.entries(rules)) {
      const msg = rule(form[name].value.trim());
      form.querySelector(`[data-for="${name}"]`).textContent = msg;
      form[name].classList.toggle('invalid', !!msg);
      if (msg) ok = false;
    }
    if (!ok) return;
    btn.disabled = true;
    status.className = 'form-status';
    status.textContent = 'Sending…';
    const body = new FormData();
    body.append('access_key', WEB3FORMS_ACCESS_KEY);
    for (const k of Object.keys(rules)) body.append(k, form[k].value.trim());
    try {
      const data = await (await fetch('https://api.web3forms.com/submit', { method: 'POST', body })).json();
      if (!data.success) throw new Error(data.message);
      status.textContent = "Thanks! I'll get back to you soon.";
      status.classList.add('ok');
      form.reset();
    } catch {
      status.textContent = 'Could not send. Please email me directly instead.';
      status.classList.add('bad');
    } finally {
      btn.disabled = false;
    }
  });
}

// ---------- hero 3D (loaded after content; skipped without WebGL) ----------
function initHero() {
  const canvas = $('hero-canvas');
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!gl) return;
  } catch {
    return;
  }
  const start = () =>
    import('./hero3d.js')
      .then(({ startHero }) => startHero(canvas, { reducedMotion }))
      .catch((err) => console.warn('Hero 3D unavailable', err));
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1200 });
  else setTimeout(start, 200);
}

renderTimeline(EXPERIENCE, $('experience-list'));
renderTimeline(EDUCATION, $('education-list'));
renderSkills();
renderFeatured();
renderFilters();
initSkillGlobe($('skill-globe'), SKILL_GROUPS.filter((g) => g.name !== 'Languages').flatMap((g) => g.items), { reducedMotion });
initTilt('.tilt', { reducedMotion });
initNav();
initReveal();
initContact();
initHero();
