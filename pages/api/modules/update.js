import versionData from '../../../data/module-version.json';
import rateLimitEdge from '@/lib/rateLimitEdge';

const REMOTE_VERSION_URL =
  'https://raw.githubusercontent.com/unnipillil/kali-linux-portfolio/main/data/module-version.json';

function compareSemver(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function handler(
  req,
  res,
) {
  const currentParam = req.query.version;
  const current = Array.isArray(currentParam)
    ? currentParam[0]
    : currentParam || '0.0.0';

  let latest = versionData.version;
  try {
    const response = await fetch(REMOTE_VERSION_URL, {
      headers: { 'User-Agent': 'kali-linux-portfolio' },
    });
    if (response.ok) {
      const json = await response.json();
      if (json.version) {
        latest = json.version;
      }
    }
  } catch {
    // ignore network errors and fall back to bundled version
  }

  const needsUpdate = compareSemver(current, latest) < 0;
  res.status(200).json({ current, latest, needsUpdate });
}

export default rateLimitEdge(handler);
