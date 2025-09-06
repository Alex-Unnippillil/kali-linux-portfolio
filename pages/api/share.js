import { validateCsrfToken } from '../../lib/csrf';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  if (!validateCsrfToken(req)) {
    res.status(403).json({ ok: false, code: 'invalid_csrf' });
    return;
  }

  const { text, url, title } = req.body || {};
  const content = text || url || title || '';
  const params = new URLSearchParams();
  if (content) {
    params.set('text', content);
  }
  res.redirect(307, `/apps/sticky_notes/?${params.toString()}`);
}
