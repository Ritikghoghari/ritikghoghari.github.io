import './city.css';
import { PROFILE, PROJECTS, EXPERIENCE, EDUCATION, SKILL_GROUPS } from '../data.js';
import { initChatbot } from '../chatbot.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);

function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) n.setAttribute(k, v === true ? '' : v);
  for (const c of children.flat()) if (c != null) n.append(c);
  return n;
}
const ext = (href, text, cls = 'c-link') => el('a', { href, class: cls, target: '_blank', rel: 'noopener' }, text);
const chips = (items) => el('ul', { class: 'c-chips' }, items.map((i) => el('li', {}, i)));
const featured = PROJECTS.filter((p) => p.featured).slice(0, 4);

// ---------- content for each stop (same order as STOPS in scene.js) ----------
let city = null;
let current = 0;
let projectIndex = 0;

const CONTENT = [
  () => [
    el('p', { class: 'c-kicker' }, 'City Gate'),
    el('h2', {}, "Hi, I'm Ritik Ghoghari."),
    el('p', {}, 'Data Scientist & AI Developer, M.Sc. student in Germany. I turn data into decisions with machine learning, GenAI and analytics.'),
    el('p', { class: 'c-muted' }, `📍 ${PROFILE.location} · open to internships & working-student roles`),
    el('div', { class: 'c-actions' }, button('Start the tour →', () => go(1), 'c-btn'), el('a', { class: 'c-btn c-ghost', href: PROFILE.resume, download: true }, 'Download CV')),
  ],
  () => [
    el('p', { class: 'c-kicker' }, 'Ritik HQ · About'),
    el('h2', {}, 'About me'),
    el('p', {}, "I'm a Master's student in Data Science, AI & Digital Business at Gisma University of Applied Sciences. I like taking messy business problems, finding the signal in the data, and shipping something people can use: a dashboard, a model or an AI assistant."),
    el(
      'dl',
      { class: 'c-facts' },
      [
        ['17', 'Projects on GitHub'],
        ['M.Sc.', 'Data Science & AI'],
        ['C1', 'English · German A2'],
        ['30%', 'Less manual reporting'],
      ].map(([a, b]) => el('div', {}, el('dt', {}, a), el('dd', {}, b))),
    ),
  ],
  () => [
    el('p', { class: 'c-kicker' }, 'Experience'),
    ...EXPERIENCE.flatMap((x) => [
      el('h2', {}, x.title),
      el('p', { class: 'c-muted' }, `${x.org} · ${x.when} · ${x.where}`),
      el('ul', { class: 'c-list' }, x.points.map((p) => el('li', {}, p))),
    ]),
  ],
  () => [
    el('p', { class: 'c-kicker' }, 'Education'),
    ...EDUCATION.flatMap((x) => [
      el('h3', {}, x.title),
      el('p', { class: 'c-muted' }, `${x.org} · ${x.when}`),
      el('p', {}, x.points[0]),
    ]),
  ],
  () => [
    el('p', { class: 'c-kicker' }, 'Skills Plaza'),
    el('h2', {}, 'What I work with'),
    ...SKILL_GROUPS.map((g) => el('div', { class: 'c-skill' }, el('h3', {}, g.name), chips(g.items))),
  ],
  () => {
    const p = featured[projectIndex];
    return [
      el('p', { class: 'c-kicker' }, `Projects Avenue · ${projectIndex + 1} / ${featured.length}`),
      p.image ? el('img', { class: 'c-thumb', src: `/img/${p.image}-512.webp`, alt: '' }) : null,
      el('h2', {}, p.title),
      el('p', {}, p.description),
      chips(p.tags),
      el(
        'div',
        { class: 'c-actions' },
        button('← Prev', () => showProject(projectIndex - 1), 'c-btn c-ghost', projectIndex === 0),
        button('Next →', () => showProject(projectIndex + 1), 'c-btn c-ghost', projectIndex === featured.length - 1),
        ext(p.link, 'View code ↗'),
      ),
      el('a', { class: 'c-link', href: '/#projects' }, `See all ${PROJECTS.length} projects →`),
    ];
  },
  () => [
    el('p', { class: 'c-kicker' }, 'Contact Tower'),
    el('h2', {}, "Let's work together"),
    el('p', {}, 'Have a role, a project or a question? Reach me directly, or ask the chat assistant in the corner.'),
    el(
      'ul',
      { class: 'c-list c-contact' },
      el('li', {}, el('a', { class: 'c-link', href: `mailto:${PROFILE.email}` }, `✉️ ${PROFILE.email}`)),
      el('li', {}, ext(PROFILE.linkedin, 'LinkedIn ↗')),
      el('li', {}, ext(PROFILE.github, 'GitHub ↗')),
      el('li', {}, el('a', { class: 'c-link', href: '/#contact' }, 'Contact form →')),
    ),
    el('div', { class: 'c-actions' }, button('Back to the gate ↺', () => go(0), 'c-btn c-ghost')),
  ],
];

function button(text, onClick, cls, disabled = false) {
  const b = el('button', { type: 'button', class: cls, disabled }, text);
  b.addEventListener('click', onClick);
  return b;
}

// ---------- navigation ----------
let STOPS = [];
const panel = $('c-panel');
function renderPanel() {
  const place = STOPS[current]?.place;
  panel.replaceChildren(el('div', { class: 'c-panel-inner' }, place ? el('p', { class: 'c-place' }, `📍 ${place}, Berlin`) : null, CONTENT[current]()));
  panel.dataset.side = STOPS[current]?.side > 0 ? 'left' : 'right'; // keep the card opposite the landmark
  panel.hidden = false;
  panel.classList.remove('show');
  void panel.offsetWidth; // restart the entrance animation
  panel.classList.add('show');
  panel.scrollTop = 0;
}
function updateNav() {
  $('c-stops')
    .querySelectorAll('button')
    .forEach((b, i) => b.setAttribute('aria-current', String(i === current)));
  $('c-prev').disabled = current === 0;
  $('c-next').disabled = current === STOPS.length - 1;
  $('c-stops').children[current]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
}
function go(i) {
  if (!city || i < 0 || i >= STOPS.length) return;
  current = i;
  if (i === 5) projectIndex = 0;
  panel.classList.remove('show');
  updateNav();
  history.replaceState(null, '', `#${STOPS[i].id}`);
  city.goTo(i, renderPanel);
}
function showProject(i) {
  projectIndex = Math.max(0, Math.min(featured.length - 1, i));
  city.focusProject(projectIndex);
  renderPanel();
}

// ---------- boot ----------
function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function boot() {
  initChatbot({ reducedMotion, base: '/' });
  if (!webglOk()) {
    $('c-loading').textContent = "Your browser can't show 3D here.";
    const enter = $('c-enter');
    enter.textContent = 'Open the classic portfolio →';
    enter.addEventListener('click', () => (location.href = '/'));
    return;
  }

  // Real Berlin (Google Photorealistic 3D Tiles) when a key was provided at build time;
  // otherwise, or if Google fails to load, the generated city.
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  const useGoogle = !!apiKey && !new URLSearchParams(location.search).has('generated');
  if (useGoogle) {
    document.body.classList.add('real-city');
    $('c-loading').textContent = 'Loading real Berlin in 3D…';
  }
  const { createCity, STOPS: stops } = useGoogle ? await import('./google.js') : await import('./scene.js');
  STOPS = stops;
  $('c-stops').append(
    ...STOPS.map((s, i) => {
      const b = button(s.label, () => go(i), 'c-stop');
      return el('li', {}, b);
    }),
  );
  $('c-prev').addEventListener('click', () => go(current - 1));
  $('c-next').addEventListener('click', () => go(current + 1));
  document.addEventListener('keydown', (e) => {
    if (!city || $('c-intro') || e.target.closest?.('input, textarea')) return;
    if (e.key === 'ArrowRight') go(current + 1);
    if (e.key === 'ArrowLeft') go(current - 1);
  });

  city = createCity($('city-canvas'), {
    reducedMotion,
    apiKey,
    onFail: () => location.replace(`${location.pathname}?generated${location.hash}`),
    projects: PROJECTS,
    onPick: (stop, mesh) => {
      // a billboard on Projects Avenue opens that project
      if (stop === 5 && current === 5 && mesh.userData.project != null) return showProject(mesh.userData.project);
      if (stop !== current) go(stop);
    },
  });
  if (city.ready) await city.ready;
  $('c-loading').hidden = true;
  $('c-enter').disabled = false;

  const start = $('c-enter');
  start.addEventListener('click', () => {
    $('c-intro').classList.add('leaving');
    setTimeout(() => $('c-intro').remove(), reducedMotion ? 0 : 700);
    $('c-nav').hidden = false;
    $('c-hint').hidden = false;
    setTimeout(() => ($('c-hint').hidden = true), 7000);
    // deep link: /city/#projects lands on that stop after the dive
    const deep = STOPS.findIndex((s) => `#${s.id}` === location.hash);
    city.enter(() => {
      updateNav();
      if (deep > 0) go(deep);
      else renderPanel();
    });
    updateNav();
  });
  start.focus();
}

$('c-enter').disabled = true;
boot();
