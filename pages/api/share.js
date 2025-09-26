import createErrorResponse from '@/utils/apiErrorResponse';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json(createErrorResponse('Method not allowed'));
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
