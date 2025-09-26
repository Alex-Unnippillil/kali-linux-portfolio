import fs from 'fs';
import path from 'path';
import {
  createRateLimiter,
  getRequestIp,
  setRateLimitHeaders,
} from '../../../utils/rateLimiter';

const limiter = createRateLimiter();

export default function handler(req, res) {
  const rate = limiter.check(getRequestIp(req));
  setRateLimitHeaders(res, rate);
  if (!rate.ok) {
    res.status(429).json({ error: 'rate_limit_exceeded' });
    return;
  }

  const catalogDir = path.join(process.cwd(), 'plugins', 'catalog');
  try {
    const files = fs.readdirSync(catalogDir);
    const plugins = files
      .filter((f) => !f.startsWith('.') && f.endsWith('.json'))
      .map((f) => ({ id: path.parse(f).name, file: f }));
    res.status(200).json(plugins);
  } catch {
    res.status(200).json([]);
  }
}
