import { readFile } from 'fs/promises';
import path from 'path';
import {
  createRateLimiter,
  getRequestIp,
  setRateLimitHeaders,
} from '../../../utils/rateLimiter';

const limiter = createRateLimiter({ windowMs: 300_000 });

export default async function handler(req, res) {
  const rate = limiter.check(getRequestIp(req));
  setRateLimitHeaders(res, rate);
  if (!rate.ok) {
    res.status(429).json({ error: 'rate_limit_exceeded' });
    return;
  }

  try {
    const versionPath = path.join(process.cwd(), 'public', 'demo-data', 'nmap', 'script-db-version.json');
    const raw = await readFile(versionPath, 'utf8');
    const { sha: current } = JSON.parse(raw);

    const apiUrl = 'https://api.github.com/repos/nmap/nmap/commits?path=scripts/script.db&per_page=1';
    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'kali-linux-portfolio' },
    });
    if (!response.ok) {
      res.status(502).json({ error: 'Failed to query script repository' });
      return;
    }
    const json = await response.json();
    const latest = json[0]?.sha || '';

    res.status(200).json({ updateAvailable: current !== latest, current, latest });
  } catch (e) {
    res.status(500).json({ error: 'Unable to check script versions' });
  }
}
