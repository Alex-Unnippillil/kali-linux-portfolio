import fs from 'fs';
import path from 'path';
import {
  createRateLimiter,
  getRequestIp,
  setRateLimitHeaders,
} from '../../utils/rateLimiter';

const limiter = createRateLimiter();

export default function handler(req, res) {
  const rate = limiter.check(getRequestIp(req));
  setRateLimitHeaders(res, rate);
  if (!rate.ok) {
    res.status(429).json({ error: 'rate_limit_exceeded' });
    return;
  }

  const dir = path.join(process.cwd(), 'public', 'images', 'wallpapers');
  try {
    const files = fs
      .readdirSync(dir)
      .filter((file) => /\.(?:png|jpe?g|webp|gif)$/i.test(file));
    res.status(200).json(files);
  } catch {
    res.status(200).json([]);
  }
}
