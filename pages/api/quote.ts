import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tag } = req.query;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const url = tag ? `https://api.quotable.io/random?tags=${encodeURIComponent(String(tag))}` : 'https://api.quotable.io/random';
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) throw new Error('failed');
    const data = await r.json();
    res.status(200).json({ content: data.content, author: data.author, tags: data.tags });
  } catch {
    res.status(200).json({ content: 'Welcome.', author: 'Unknown' });
  }
}
