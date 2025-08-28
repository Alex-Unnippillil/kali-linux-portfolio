export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
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
