import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Feed } from 'feed';

const root = process.cwd();
const siteUrl = 'https://unnippillil.com/';

const dataPath = path.join(root, 'data', 'milestones.json');
const milestones = JSON.parse(await readFile(dataPath, 'utf8'));

const feed = new Feed({
  title: 'Kali Linux Portfolio',
  description: 'Recent milestones and updates',
  id: siteUrl,
  link: siteUrl,
  language: 'en',
  favicon: `${siteUrl}favicon.ico`,
  feedLinks: {
    rss2: `${siteUrl}feed.xml`,
    json: `${siteUrl}feed.json`,
  },
  updated: milestones.length ? new Date(`${milestones[0].date}-01`) : new Date(),
});

for (const m of milestones) {
  feed.addItem({
    title: m.title,
    id: m.link || `${siteUrl}#${m.date}`,
    link: m.link || siteUrl,
    date: new Date(`${m.date}-01`),
    description: Array.isArray(m.tags) ? m.tags.join(', ') : undefined,
  });
}

const outDir = path.join(root, 'public');
await writeFile(path.join(outDir, 'feed.xml'), feed.rss2(), 'utf8');
await writeFile(path.join(outDir, 'feed.json'), feed.json1(), 'utf8');
console.log('Generated feed.xml and feed.json');

try {
  const res = await fetch('https://validator.w3.org/feed/check.cgi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ rawdata: feed.rss2(), output: 'json' }),
  });
  const result = await res.json();
  if (result.validity === 1) {
    console.log('Feed validated by W3C');
  } else {
    console.warn('Feed validation warnings:', result.messages?.length ?? 0);
  }
} catch (err) {
  console.warn('W3C validation failed:', err.message);
}

if (process.env.VERCEL) {
  const body = new URLSearchParams({
    'hub.mode': 'publish',
    'hub.url': `${siteUrl}feed.xml`,
  });
  try {
    await fetch('https://pubsubhubbub.appspot.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    console.log('WebSub hub ping sent');
  } catch (err) {
    console.warn('WebSub ping failed:', err.message);
  }
}
