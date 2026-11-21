// English / German. Static page text is marked with data-i18n (text) or data-i18n-html (contains markup)
// in index.html; dynamic text in main.js uses t(). Data entries carry an optional `de` object with
// translated fields, read through L(). The choice is remembered in localStorage.
const KEY = 'lang';
const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
// ?lang=de / ?lang=en in the URL wins (shareable German link), then the remembered choice
const fromUrl = new URLSearchParams(location.search).get('lang');
export const lang = (fromUrl || read()) === 'de' ? 'de' : 'en';
if (fromUrl) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* ignore */
  }
}

const STR = {
  en: {
    'nav.about': 'About', 'nav.experience': 'Experience', 'nav.skills': 'Skills', 'nav.projects': 'Projects', 'nav.contact': 'Contact', 'nav.city': '3D City', 'nav.resume': 'Resume',
    'hero.eyebrow': 'Open to internships & working-student roles',
    'hero.role': 'Data Scientist & AI Developer',
    'hero.lead': 'M.Sc. Data Science & AI student in Germany. I turn messy business data into models, GenAI assistants and dashboards that people actually use.',
    'hero.projects': 'View projects', 'hero.cv': 'Download CV', 'hero.loc': '📍 Peine, Germany · Remote-ready',
    'stats.thesis.num': '890,168 ha', 'stats.projects': 'projects on GitHub', 'stats.degree': 'Data Science, AI & Digital Business', 'stats.thesis': 'forest loss uncovered in my thesis', 'stats.accenture': 'less manual reporting with my Power BI dashboards (Accenture internship)',
    'about.title': 'About me',
    'about.p1': "I'm a Master's student in <strong>Data Science, AI &amp; Digital Business</strong> at Gisma University of Applied Sciences, with a background in computer applications. I enjoy taking messy business problems, finding the signal in the data, and shipping something people can actually use: a dashboard, a model or an AI assistant.",
    'about.p2': "My Master's thesis checks palm-oil companies' zero-deforestation claims against satellite data. I'm looking for an internship or working-student role near Peine or remote.",
    'what.ml.h': 'Machine learning', 'what.ml.p': 'Forecasting, classification and recommendation models with Python and scikit-learn.',
    'what.rag.h': 'GenAI & RAG', 'what.rag.p': 'LLM agents and retrieval-augmented apps with LangChain, CrewAI, GPT-4o and Gemini.',
    'what.bi.h': 'Analytics & BI', 'what.bi.p': 'Clean data, clear KPIs and Power BI dashboards that save teams time.',
    'exp.title': 'Experience & Education', 'exp.col': 'Experience', 'edu.col': 'Education',
    'skills.title': 'Skills',
    'projects.title': 'Projects', 'projects.featured': 'Featured projects', 'projects.all': 'All projects',
    'contact.title': "Let's work together",
    'contact.p': "Have a role, a project or just a question? Send a message and I'll get back to you, or reach me directly.",
    'form.name': 'Name', 'form.email': 'Email', 'form.message': 'Message', 'form.send': 'Send message',
    'form.err.name': 'Please enter your name.', 'form.err.email': 'Please enter a valid email.', 'form.err.message': 'Please write a short message.',
    'form.sending': 'Sending…', 'form.ok': "Thanks! I'll get back to you soon.", 'form.fail': 'Could not send. Please email me directly instead.',
    'footer.privacy': 'Privacy / Datenschutz',
    'thesis.badge': "🎓 Master's thesis · main project", 'thesis.kicker': "🎓 Master's thesis", 'thesis.supervisor': 'Supervisor',
    'thesis.how': 'How the mismatch score works', 'thesis.same': 'Same forest loss, very different score', 'thesis.rank': 'Rank',
    'thesis.note': 'Similar forest loss, but KLK scores almost four times higher because of how confidently it claims zero deforestation.',
    'thesis.repo': 'View thesis repository ↗', 'thesis.city': 'See it in the 3D city',
    'card.details': 'Details ↻', 'card.back': '↩ Back', 'card.code': 'View code ↗',
    'cat.All': 'All', 'cat.AI & ML': 'AI & ML', 'cat.RAG & GenAI': 'RAG & GenAI', 'cat.Data Analysis': 'Data Analysis',
    'lang.switch': 'DE', 'lang.label': 'Auf Deutsch anzeigen',
  },
  de: {
    'nav.about': 'Über mich', 'nav.experience': 'Erfahrung', 'nav.skills': 'Kenntnisse', 'nav.projects': 'Projekte', 'nav.contact': 'Kontakt', 'nav.city': '3D-Stadt', 'nav.resume': 'Lebenslauf',
    'hero.eyebrow': 'Offen für Praktika & Werkstudentenstellen',
    'hero.role': 'Data Scientist & KI-Entwickler',
    'hero.lead': 'M.Sc.-Student in Data Science & KI in Deutschland. Ich mache aus unübersichtlichen Geschäftsdaten Modelle, GenAI-Assistenten und Dashboards, die wirklich genutzt werden.',
    'hero.projects': 'Projekte ansehen', 'hero.cv': 'Lebenslauf herunterladen', 'hero.loc': '📍 Peine, Deutschland · auch remote',
    'stats.thesis.num': '890.168 ha', 'stats.projects': 'Projekte auf GitHub', 'stats.degree': 'Data Science, AI & Digital Business', 'stats.thesis': 'Waldverlust, aufgedeckt in meiner Masterarbeit', 'stats.accenture': 'weniger manuelles Reporting dank meiner Power-BI-Dashboards (Praktikum bei Accenture)',
    'about.title': 'Über mich',
    'about.p1': 'Ich studiere im Master <strong>Data Science, AI &amp; Digital Business</strong> an der Gisma University of Applied Sciences und habe einen Hintergrund in Informatik (Computer Applications). Ich nehme unübersichtliche Geschäftsprobleme, finde das Signal in den Daten und liefere etwas, das Menschen wirklich nutzen: ein Dashboard, ein Modell oder einen KI-Assistenten.',
    'about.p2': 'Meine Masterarbeit prüft die Null-Entwaldungs-Versprechen von Palmöl-Unternehmen mit Satellitendaten. Ich suche ein Praktikum oder eine Werkstudentenstelle in der Nähe von Peine oder remote.',
    'what.ml.h': 'Machine Learning', 'what.ml.p': 'Prognose-, Klassifikations- und Empfehlungsmodelle mit Python und scikit-learn.',
    'what.rag.h': 'GenAI & RAG', 'what.rag.p': 'LLM-Agenten und Retrieval-Augmented-Anwendungen mit LangChain, CrewAI, GPT-4o und Gemini.',
    'what.bi.h': 'Analytics & BI', 'what.bi.p': 'Saubere Daten, klare KPIs und Power-BI-Dashboards, die Teams Zeit sparen.',
    'exp.title': 'Erfahrung & Ausbildung', 'exp.col': 'Erfahrung', 'edu.col': 'Ausbildung',
    'skills.title': 'Kenntnisse',
    'projects.title': 'Projekte', 'projects.featured': 'Ausgewählte Projekte', 'projects.all': 'Alle Projekte',
    'contact.title': 'Lassen Sie uns zusammenarbeiten',
    'contact.p': 'Sie haben eine Stelle, ein Projekt oder eine Frage? Schreiben Sie mir eine Nachricht, ich melde mich zurück, oder kontaktieren Sie mich direkt.',
    'form.name': 'Name', 'form.email': 'E-Mail', 'form.message': 'Nachricht', 'form.send': 'Nachricht senden',
    'form.err.name': 'Bitte geben Sie Ihren Namen ein.', 'form.err.email': 'Bitte geben Sie eine gültige E-Mail-Adresse ein.', 'form.err.message': 'Bitte schreiben Sie eine kurze Nachricht.',
    'form.sending': 'Wird gesendet…', 'form.ok': 'Danke! Ich melde mich bald bei Ihnen.', 'form.fail': 'Senden fehlgeschlagen. Bitte schreiben Sie mir direkt eine E-Mail.',
    'footer.privacy': 'Datenschutz / Privacy',
    'thesis.badge': '🎓 Masterarbeit · Hauptprojekt', 'thesis.kicker': '🎓 Masterarbeit', 'thesis.supervisor': 'Betreuer',
    'thesis.how': 'So funktioniert der Mismatch-Score', 'thesis.same': 'Gleicher Waldverlust, ganz anderer Score', 'thesis.rank': 'Rang',
    'thesis.note': 'Ähnlicher Waldverlust, aber KLK erreicht einen fast viermal so hohen Score, weil das Unternehmen Null-Entwaldung besonders selbstbewusst verspricht.',
    'thesis.repo': 'Repository der Masterarbeit ↗', 'thesis.city': 'In der 3D-Stadt ansehen',
    'card.details': 'Details ↻', 'card.back': '↩ Zurück', 'card.code': 'Code ansehen ↗',
    'cat.All': 'Alle', 'cat.AI & ML': 'KI & ML', 'cat.RAG & GenAI': 'RAG & GenAI', 'cat.Data Analysis': 'Datenanalyse',
    'lang.switch': 'EN', 'lang.label': 'Show in English',
  },
};

export const t = (key) => STR[lang][key] ?? STR.en[key] ?? key;

// a data entry's field in the current language (falls back to English)
export const L = (obj, field) => (lang === 'de' && obj.de && obj.de[field] != null ? obj.de[field] : obj[field]);

export function applyStatic(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach((n) => (n.textContent = t(n.dataset.i18n)));
  root.querySelectorAll('[data-i18n-html]').forEach((n) => (n.innerHTML = t(n.dataset.i18nHtml)));
}

export function initLangToggle(button) {
  if (!button) return;
  button.textContent = t('lang.switch');
  button.setAttribute('aria-label', t('lang.label'));
  button.addEventListener('click', () => {
    try {
      localStorage.setItem(KEY, lang === 'de' ? 'en' : 'de');
    } catch {
      /* storage blocked: the switch still works for this page view via the URL */
    }
    const url = new URL(location.href);
    url.searchParams.set('lang', lang === 'de' ? 'en' : 'de');
    location.replace(url.toString());
  });
}
