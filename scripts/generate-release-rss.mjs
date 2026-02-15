import fs from 'fs';
import path from 'path';
import { parseReleases } from '../lib/releases.js';

const releases = parseReleases();
const items = releases
  .map(
    (r) => `\n  <item>\n    <title>${r.version}</title>\n    <link>https://unnippillil.com/releases#v${r.version}</link>\n    <pubDate>${new Date(r.date).toUTCString()}</pubDate>\n    <description>${r.tags.join(', ')}</description>\n  </item>`,
  )
  .join('');
const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n<title>Kali Linux Portfolio Releases</title>\n<link>https://unnippillil.com/releases</link>\n<description>Release timeline for Kali Linux Portfolio</description>${items}\n</channel>\n</rss>`;
fs.writeFileSync(path.join(process.cwd(), 'public', 'releases.xml'), rss);
