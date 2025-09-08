import type { NextApiRequest, NextApiResponse } from 'next';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { url } = req.query;
  if (typeof url !== 'string') {
    res.status(400).json({ error: 'Invalid url' });
    return;
  }
  try {
    const response = await fetch(url);
    const html = await response.text();
    const dom = new JSDOM(html);
    const reader = new Readability(dom.window.document);
    const parsed = reader.parse();
    if (!parsed) {
      res.status(500).json({ error: 'Unable to parse article.' });
      return;
    }
    const purify = createDOMPurify(dom.window as unknown as Window);
    const sanitized = purify.sanitize(parsed.content ?? '');
    const td = new TurndownService();
    const markdown = `# ${parsed.title ?? ''}\n\n${td.turndown(sanitized)}`;
    res.status(200).json({
      title: parsed.title ?? '',
      content: sanitized,
      excerpt: parsed.excerpt ?? '',
      markdown,
    });
  } catch {
    res.status(500).json({ error: 'Unable to load page.' });
  }
}
