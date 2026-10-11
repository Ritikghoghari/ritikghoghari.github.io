// Floating contact form, delivered through Web3Forms.
// The access key is a public client key by design; restrict it to this site's domain in the Web3Forms dashboard.
const WEB3FORMS_ACCESS_KEY = 'fc739b37-dd65-43a9-8ce3-c762edb249a5';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initChat() {
  const toggle = document.getElementById('chat-toggle-btn');
  const panel = document.getElementById('chat-panel');
  const form = document.getElementById('chat-form');
  const submit = document.getElementById('chat-submit-btn');
  const status = document.getElementById('chat-status');
  const fields = {
    name: [document.getElementById('cf-name'), document.getElementById('cf-name-error')],
    email: [document.getElementById('cf-email'), document.getElementById('cf-email-error')],
    message: [document.getElementById('cf-message'), document.getElementById('cf-message-error')],
  };

  function setOpen(open) {
    panel.classList.toggle('hidden', !open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) fields.name[0].focus();
  }
  toggle.addEventListener('click', () => setOpen(panel.classList.contains('hidden')));
  document.getElementById('open-chat')?.addEventListener('click', () => setOpen(true));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.classList.contains('hidden')) {
      setOpen(false);
      toggle.focus();
    }
  });

  function check(key, ok, msg) {
    const [input, err] = fields[key];
    err.textContent = ok ? '' : msg;
    input.classList.toggle('invalid', !ok);
    return ok;
  }
  function validate() {
    const a = check('name', fields.name[0].value.trim() !== '', 'Please enter your name.');
    const b = check('email', EMAIL_RE.test(fields.email[0].value.trim()), 'Please enter a valid email address.');
    const c = check('message', fields.message[0].value.trim() !== '', 'Please write a short message.');
    return a && b && c;
  }
  const say = (text, cls = '') => {
    status.textContent = text;
    status.className = `chat-status ${cls}`.trim();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (document.getElementById('cf-hp').value) return; // honeypot
    if (!validate()) return;

    submit.disabled = true;
    say('Sending...');
    const body = new FormData();
    body.append('access_key', WEB3FORMS_ACCESS_KEY);
    body.append('name', fields.name[0].value.trim());
    body.append('email', fields.email[0].value.trim());
    body.append('message', fields.message[0].value.trim());
    try {
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body });
      const data = await res.json();
      if (data.success) {
        say("Thanks! I'll get back to you soon 🚀", 'success');
        form.reset();
      } else {
        say('Something went wrong. Please reach out via LinkedIn.', 'error');
      }
    } catch {
      say('Network error. Please reach out via LinkedIn.', 'error');
    } finally {
      submit.disabled = false;
    }
  });
}
