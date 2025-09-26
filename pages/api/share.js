import {
  createRateLimiter,
  getRequestIp,
  setRateLimitHeaders,
} from '../../utils/rateLimiter';

const limiter = createRateLimiter();

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const rate = limiter.check(getRequestIp(req));
  setRateLimitHeaders(res, rate);
  if (!rate.ok) {
    res.status(429).json({ error: 'rate_limit_exceeded' });
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
