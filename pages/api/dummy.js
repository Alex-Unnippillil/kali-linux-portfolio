import {
  createRateLimiter,
  getRequestIp,
  setRateLimitHeaders,
} from '../../utils/rateLimiter';

const limiter = createRateLimiter();

export default function handler(req, res) {
  if (req.method === 'POST') {
    const rate = limiter.check(getRequestIp(req));
    setRateLimitHeaders(res, rate);
    if (!rate.ok) {
      res.status(429).json({ error: 'rate_limit_exceeded' });
      return;
    }
    res.status(200).json({ message: 'Received' });
    return;
  }

  res.status(405).json({ message: 'Method not allowed' });
}
