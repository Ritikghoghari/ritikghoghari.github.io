// Small portfolio assistant. Answers from the site's own data with keyword matching:
// no AI service, no API key, nothing leaves the browser.
import { PROFILE, PROJECTS, EXPERIENCE, EDUCATION, SKILL_GROUPS } from './data.js';

const SUGGESTIONS = ['Skills', 'Top projects', 'Experience', 'Education', 'How to contact?', 'Is he available?'];

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}
const link = (href, text) =>
  el('a', href.startsWith('http') ? { href, target: '_blank', rel: 'noopener' } : { href }, text);

// Pages other than the main portfolio (e.g. /city/) point in-page links back to it.
let linkBase = '';

// ---------- knowledge ----------
const allSkills = SKILL_GROUPS.flatMap((g) => g.items);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ').replace(/\s+/g, ' ').trim();
const esc = (w) => w.replace(/[.+#]/g, '\\$&');
// prefix match ("skill" matches "skills") vs. whole-word match ("hi" must not match "hire")
const has = (q, words) => words.some((w) => new RegExp(`(^|\\s)${esc(w)}`).test(q));
const hasWord = (q, words) => words.some((w) => new RegExp(`(^|\\s)${esc(w)}(\\s|$)`).test(q));

// Terms a visitor might ask about ("does he know langchain?"), mapped to projects that use them.
function techMatches(q) {
  const terms = new Set();
  for (const s of allSkills) {
    for (const part of s.split(/[(),/]/).map((x) => norm(x)).filter((x) => x.length > 1)) {
      if (new RegExp(`(^|\\s)${part.replace(/[.+]/g, '\\$&')}(\\s|$)`).test(q)) terms.add(part);
    }
  }
  for (const p of PROJECTS) {
    for (const t of [...p.tags, ...p.techStack.split(',')].map((x) => norm(x))) {
      if (t.length > 1 && new RegExp(`(^|\\s)${t.replace(/[.+]/g, '\\$&')}(\\s|$)`).test(q)) terms.add(t);
    }
  }
  return [...terms];
}
const projectsUsing = (term) =>
  PROJECTS.filter((p) => hasWord(norm([p.title, p.techStack, ...p.tags, p.description].join(' ')), [term]));
const projectNamed = (q) =>
  PROJECTS.find((p) => {
    const words = norm(p.title).split(' ').filter((w) => w.length > 3);
    return words.filter((w) => q.includes(w)).length >= Math.min(2, words.length);
  });

function projectLine(p) {
  return el('li', {}, link(p.link, p.title), ` (${p.tags.slice(0, 3).join(', ')})`);
}

// Each answer returns DOM nodes (never HTML strings, so user input is never rendered as markup).
function answer(raw) {
  const q = norm(raw);
  if (!q) return [el('p', {}, 'Ask me anything about Ritik: skills, projects, experience or how to reach him.')];

  if (hasWord(q, ['hi', 'hello', 'hey', 'hallo', 'namaste', 'good morning', 'good evening']) && q.split(' ').length <= 3)
    return [el('p', {}, "Hi! 👋 I'm Ritik's portfolio assistant. What would you like to know?")];
  if (hasWord(q, ['thank you', 'thanks', 'thx', 'danke', 'great', 'cool', 'nice']))
    return [el('p', {}, "You're welcome! Anything else I can tell you about Ritik?")];

  const named = projectNamed(q);
  if (named)
    return [
      el('p', {}, el('strong', {}, named.title), ` · ${named.category}`),
      el('p', {}, named.description),
      el('p', {}, 'Tech: ', named.techStack, '. ', link(named.link, 'View the code ↗')),
    ];

  if (has(q, ['contact', 'email', 'mail', 'reach', 'hire', 'hiring', 'message', 'connect', 'phone', 'call']))
    return [
      el('p', {}, 'You can reach Ritik here:'),
      el('ul', {}, el('li', {}, '✉️ ', link(`mailto:${PROFILE.email}`, PROFILE.email)), el('li', {}, link(PROFILE.linkedin, 'LinkedIn ↗')), el('li', {}, link(`${linkBase}#contact`, 'Contact form'))),
    ];
  if (has(q, ['available', 'availability', 'open to', 'looking', 'internship', 'working student', 'werkstudent', 'job', 'role', 'start']))
    return [el('p', {}, `Yes. Ritik is open to internships and working-student roles near Peine, Germany, or remote. The fastest way to reach him is `, link(`mailto:${PROFILE.email}`, 'email'), ' or the ', link(`${linkBase}#contact`, 'contact form'), '.')];
  if (has(q, ['where', 'location', 'based', 'live', 'city', 'germany', 'relocat', 'remote']))
    return [el('p', {}, `Ritik is based in ${PROFILE.location} and is happy to work remotely.`)];
  if (has(q, ['cv', 'resume', 'lebenslauf']))
    return [el('p', {}, 'Here is his resume: ', link(PROFILE.resume, 'Open the CV (PDF) ↗'))];
  if (has(q, ['speak', 'english', 'german', 'deutsch', 'languages spoken', 'language skill']))
    return [el('p', {}, 'English: C1 (fluent). German: A2 (basic), and improving.')];

  if (has(q, ['experience', 'intern', 'accenture', 'worked', 'work history', 'career']))
    return EXPERIENCE.flatMap((x) => [
      el('p', {}, el('strong', {}, x.title), ` · ${x.org} (${x.when})`),
      el('ul', {}, x.points.map((pt) => el('li', {}, pt))),
    ]);
  if (has(q, ['education', 'study', 'studies', 'degree', 'university', 'master', 'msc', 'bachelor', 'bca', 'gisma', 'college']))
    return [el('ul', {}, EDUCATION.map((x) => el('li', {}, el('strong', {}, x.title), ` · ${x.org}, ${x.when}`)))];

  const CATEGORY_WORDS = {
    'AI & NLP': ['ai', 'nlp', 'genai', 'llm', 'gen ai', 'agent'],
    'Machine Learning': ['machine learning', 'ml', 'prediction', 'predictive'],
    'Computer Vision': ['computer vision', 'vision', 'image'],
    'Data Analytics': ['analytics', 'analysis', 'dashboard', 'eda'],
  };
  const asksProjects = has(q, ['project', 'projects', 'portfolio', 'built', 'build', 'made', 'work', 'github', 'top', 'best']);
  const category = asksProjects && Object.keys(CATEGORY_WORDS).find((c) => hasWord(q, CATEGORY_WORDS[c]));
  if (category) {
    const list = PROJECTS.filter((p) => p.category === category);
    return [el('p', {}, `${list.length} ${category} projects:`), el('ul', {}, list.map(projectLine))];
  }
  // specific technology question: "does he know langchain?", "power bi projects"
  const terms = techMatches(q);
  if (terms.length) {
    const used = [...new Set(terms.flatMap(projectsUsing))];
    const nice = terms.map((t) => allSkills.find((s) => norm(s).includes(t)) || t).join(', ');
    return [
      el('p', {}, `Yes, Ritik works with ${nice}.`),
      used.length ? el('p', {}, 'You can see it in:') : null,
      used.length ? el('ul', {}, used.slice(0, 5).map(projectLine)) : null,
    ];
  }

  if (asksProjects)
    return [
      el('p', {}, `Ritik has ${PROJECTS.length} projects on GitHub. Highlights:`),
      el('ul', {}, PROJECTS.filter((p) => p.featured).map(projectLine)),
      el('p', {}, 'Ask about any of them by name, or ', link(`${linkBase}#projects`, 'browse all projects'), '.'),
    ];
  if (has(q, ['skill', 'skills', 'stack', 'tech', 'tools', 'know', 'good at', 'expert', 'programming']))
    return [el('ul', {}, SKILL_GROUPS.map((g) => el('li', {}, el('strong', {}, `${g.name}: `), g.items.join(', '))))];
  if (has(q, ['who', 'about', 'yourself', 'introduce', 'ritik']))
    return [el('p', {}, "Ritik is an M.Sc. Data Science, AI & Digital Business student at Gisma University in Germany. He builds machine-learning, GenAI and analytics solutions, and previously interned in data analytics at Accenture.")];

  return [
    el('p', {}, "I'm not sure about that one. I can answer questions about Ritik's skills, projects, experience, education and how to contact him."),
    el('p', {}, 'For anything else, email him at ', link(`mailto:${PROFILE.email}`, PROFILE.email), '.'),
  ];
}

// ---------- UI ----------
export function initChatbot({ reducedMotion, base = '' }) {
  linkBase = base;
  const toggle = el('button', { type: 'button', class: 'cb-toggle', 'aria-expanded': 'false', 'aria-controls': 'cb-panel', 'aria-label': 'Open chat assistant' });
  toggle.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 21l2-5.6A8.4 8.4 0 1 1 21 11.5z"/></svg>';
  const log = el('div', { class: 'cb-log', role: 'log', 'aria-live': 'polite' });
  const chips = el('div', { class: 'cb-chips' });
  const input = el('input', { type: 'text', placeholder: 'Ask about skills, projects…', 'aria-label': 'Your question', maxlength: '200', autocomplete: 'off' });
  const send = el('button', { type: 'submit', 'aria-label': 'Send' }, '➤');
  const form = el('form', { class: 'cb-form' }, input, send);
  const close = el('button', { type: 'button', class: 'cb-close', 'aria-label': 'Close chat' }, '×');
  const panel = el(
    'div',
    { class: 'cb-panel', id: 'cb-panel', role: 'dialog', 'aria-label': 'Chat with Ritik’s assistant', hidden: '' },
    el('div', { class: 'cb-head' }, el('span', { class: 'cb-avatar', 'aria-hidden': 'true' }, 'R'), el('div', {}, el('strong', {}, 'Ritik’s assistant'), el('small', {}, 'Answers instantly from this portfolio')), close),
    log,
    chips,
    form,
  );
  document.body.append(el('div', { class: 'cb' }, panel, toggle));

  const bubble = (who, nodes) => {
    const b = el('div', { class: `cb-msg cb-${who}` }, nodes);
    log.append(b);
    log.scrollTop = log.scrollHeight;
    return b;
  };
  const ask = (text) => {
    const t = text.trim().slice(0, 200);
    if (!t) return;
    bubble('user', [document.createTextNode(t)]);
    const typing = bubble('bot', [el('span', { class: 'cb-typing', 'aria-label': 'typing' }, el('i'), el('i'), el('i'))]);
    setTimeout(() => {
      typing.replaceChildren(...answer(t).filter(Boolean));
      log.scrollTop = log.scrollHeight;
    }, reducedMotion ? 0 : 450);
  };
  SUGGESTIONS.forEach((s) => {
    const c = el('button', { type: 'button' }, s);
    c.addEventListener('click', () => ask(s));
    chips.append(c);
  });
  bubble('bot', [el('p', {}, "Hi! 👋 I'm Ritik's assistant. Ask me about his skills, projects, experience, or how to get in touch.")]);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ask(input.value);
    input.value = '';
  });
  // in-page links (e.g. #contact) should close the chat so the section is visible
  log.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a) setOpen(false);
  });

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close chat assistant' : 'Open chat assistant');
    toggle.classList.toggle('open', open);
    if (open) input.focus({ preventScroll: true });
  }
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  close.addEventListener('click', () => {
    setOpen(false);
    toggle.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
}

export { answer as _answerForTests };
