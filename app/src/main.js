import * as THREE from 'three';
import './style.css';
import { PROJECTS, SKILLS, SOCIALS } from './data.js';
import { SECTIONS, projectScroll } from './timeline.js';
import { initChat } from './chat.js';

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// ---------- static DOM (also the no-WebGL fallback) ----------

function buildSkillList() {
  const ul = $('skill-list');
  SKILLS.forEach((s) => {
    const li = document.createElement('li');
    const b = document.createElement('b');
    b.textContent = s.name;
    const span = document.createElement('span');
    span.textContent = s.desc;
    li.append(b, span);
    ul.append(li);
  });
}

function buildProjectGrid() {
  const ul = $('project-grid');
  PROJECTS.forEach((p, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    if (p.image) {
      const img = document.createElement('img');
      img.src = `/img/${p.image}-512.webp`;
      img.alt = '';
      img.loading = 'lazy';
      btn.append(img);
    }
    const t = document.createElement('strong');
    t.textContent = p.title;
    const d = document.createElement('span');
    d.textContent = p.brief;
    btn.append(t, d);
    btn.addEventListener('click', () => openModal(i));
    li.append(btn);
    ul.append(li);
  });
}

// ---------- modal ----------

let lastFocus = null;
function openModal(i) {
  const p = PROJECTS[i];
  lastFocus = document.activeElement;
  const img = $('modal-img');
  img.hidden = !p.image;
  if (p.image) img.src = `/img/${p.image}-1024.webp`;
  $('modal-title').textContent = p.title;
  $('modal-brief').textContent = p.brief;
  $('modal-desc').textContent = p.description;
  $('modal-tech').textContent = p.techStack;
  $('modal-link').href = p.link;
  $('modal').hidden = false;
  document.body.classList.add('modal-open');
  $('modal-close').focus();
}
function closeModal() {
  if ($('modal').hidden) return;
  $('modal').hidden = true;
  document.body.classList.remove('modal-open');
  lastFocus?.focus?.();
}
$('modal-close').addEventListener('click', closeModal);
$('modal').addEventListener('click', (e) => {
  if (e.target === $('modal')) closeModal();
});
document.addEventListener('keydown', (e) => {
  if ($('modal').hidden) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Tab') {
    const f = [...$('modal').querySelectorAll('a[href], button')].filter((el) => !el.hidden);
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
    else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
  }
});

// ---------- skill tooltip ----------

const tip = $('skill-tip');
let tipTimer = 0;
function showSkill(skill, x, y, pinned) {
  clearTimeout(tipTimer);
  if (!skill) {
    tip.hidden = true;
    return;
  }
  tip.replaceChildren();
  const b = document.createElement('b');
  b.textContent = skill.name;
  const s = document.createElement('span');
  s.textContent = skill.desc;
  tip.append(b, s);
  tip.hidden = false;
  const r = tip.getBoundingClientRect();
  tip.style.left = `${Math.min(window.innerWidth - r.width - 12, Math.max(12, x + 16))}px`;
  tip.style.top = `${Math.min(window.innerHeight - r.height - 12, Math.max(12, y + 16))}px`;
  if (pinned) tipTimer = setTimeout(() => (tip.hidden = true), 3500);
}

// ---------- scroll + sections ----------

const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
let targetS = 0;
let shownS = 0;
function readScroll() {
  targetS = clamp01(window.scrollY / maxScroll());
}
function scrollToS(s) {
  window.scrollTo({ top: s * maxScroll(), behavior: reducedMotion ? 'auto' : 'smooth' });
}

const navLinks = [...document.querySelectorAll('[data-nav]')];
const panels = Object.fromEntries(SECTIONS.map((sec) => [sec.id, $(sec.id)]));
let activeId = null;
function setActive(id) {
  if (id === activeId) return;
  activeId = id;
  for (const [pid, el] of Object.entries(panels)) {
    const on = pid === id;
    el.classList.toggle('active', on);
    el.inert = !on;
  }
  navLinks.forEach((a) => a.classList.toggle('active', a.dataset.nav === id && a.closest('#nav-links')));
}
function sectionAt(s) {
  return (SECTIONS.find((sec) => s >= sec.from && s <= sec.to) ?? SECTIONS.reduce((best, sec) =>
    Math.abs(s - sec.anchor) < Math.abs(s - best.anchor) ? sec : best)).id;
}

navLinks.forEach((a) =>
  a.addEventListener('click', (e) => {
    const sec = SECTIONS.find((x) => x.id === a.dataset.nav);
    if (!sec || document.body.classList.contains('no-3d')) return; // native anchor scrolling in fallback mode
    e.preventDefault();
    scrollToS(sec.anchor);
    closeNav();
  }),
);

// mobile nav drawer
const navToggle = $('nav-toggle');
const navList = $('nav-links');
function closeNav() {
  navList.classList.remove('open');
  navToggle.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
}
navToggle.addEventListener('click', () => {
  const open = navList.classList.toggle('open');
  navToggle.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', String(open));
});

// ---------- project caption / navigation ----------

let front = 0;
function updateCaption(i) {
  front = i;
  const p = PROJECTS[i];
  $('pc-count').textContent = `${String(i + 1).padStart(2, '0')} / ${String(PROJECTS.length).padStart(2, '0')}`;
  $('pc-title').textContent = p.title;
  $('pc-brief').textContent = p.brief;
}
const goProject = (i) => scrollToS(projectScroll(Math.max(0, Math.min(PROJECTS.length - 1, i)), PROJECTS.length));
$('pc-prev').addEventListener('click', () => goProject(front - 1));
$('pc-next').addEventListener('click', () => goProject(front + 1));
$('pc-open').addEventListener('click', () => openModal(front));
document.addEventListener('keydown', (e) => {
  if (activeId !== 'projects' || !$('modal').hidden || e.target.closest?.('input, textarea')) return;
  if (e.key === 'ArrowRight') goProject(front + 1);
  if (e.key === 'ArrowLeft') goProject(front - 1);
});

// ---------- typewriter ----------

function typewriter(el, words) {
  if (reducedMotion) {
    el.textContent = words[0];
    return;
  }
  let w = 0;
  let txt = '';
  let del = false;
  const tick = () => {
    const full = words[w % words.length];
    txt = del ? full.slice(0, txt.length - 1) : full.slice(0, txt.length + 1);
    el.textContent = txt;
    let delay = del ? 50 : 100;
    if (!del && txt === full) {
      delay = 2400;
      del = true;
    } else if (del && txt === '') {
      del = false;
      w++;
      delay = 400;
    }
    setTimeout(tick, delay);
  };
  tick();
}

// ---------- boot ----------

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

function hideLoader() {
  const l = $('loader');
  l.classList.add('done');
  setTimeout(() => l.remove(), 700);
}

async function boot() {
  buildSkillList();
  buildProjectGrid();
  updateCaption(0);
  initChat();
  typewriter($('typewriter'), ['Data Scientist', 'Python Developer', 'AI Engineer', 'Web Developer']);

  if (!webglAvailable()) {
    document.body.classList.add('no-3d');
    hideLoader();
    return;
  }

  const manager = new THREE.LoadingManager();
  manager.onProgress = (_u, loaded, total) => {
    $('loader-pct').textContent = `${Math.round((loaded / Math.max(1, total)) * 100)}%`;
  };
  const failsafe = setTimeout(hideLoader, 9000);
  manager.onLoad = () => {
    clearTimeout(failsafe);
    hideLoader();
  };

  let world;
  try {
    const { createWorld } = await import('./world.js');
    world = await createWorld({
      canvas: $('bg'),
      projects: PROJECTS,
      skills: SKILLS,
      socials: SOCIALS,
      manager,
      reducedMotion,
      handlers: {
        onProjectOpen: openModal,
        onProjectFocus: goProject,
        onFrontChange: updateCaption,
        onSkillFocus: showSkill,
        onLink: (url) => window.open(url, '_blank', 'noopener'),
      },
    });
  } catch (err) {
    console.error('3D scene failed, falling back to 2D layout', err);
    document.body.classList.add('no-3d');
    hideLoader();
    return;
  }

  document.body.classList.add('is-3d');
  readScroll();
  shownS = targetS;
  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('resize', readScroll);
  window.addEventListener('hashchange', () => {
    const sec = SECTIONS.find((x) => `#${x.id}` === location.hash);
    if (sec) scrollToS(sec.anchor);
  });

  const bar = document.querySelector('#progress span');
  const clock = new THREE.Clock();
  const frame = () => {
    const dt = Math.min(0.05, clock.getDelta());
    shownS = reducedMotion ? targetS : shownS + (targetS - shownS) * (1 - Math.exp(-7 * dt));
    if (Math.abs(targetS - shownS) < 0.00005) shownS = targetS;
    setActive(sectionAt(shownS));
    bar.style.transform = `scaleX(${shownS})`;
    world.update(shownS, dt, clock.elapsedTime);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // deep link (e.g. /#projects)
  const initial = SECTIONS.find((x) => `#${x.id}` === location.hash);
  if (initial) setTimeout(() => scrollToS(initial.anchor), 100);

  window.__portfolio = { world, get s() { return shownS; } }; // debugging / test hook
}

boot();
