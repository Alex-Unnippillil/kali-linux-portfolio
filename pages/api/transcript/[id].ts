import type { NextApiRequest, NextApiResponse } from 'next';
import { XMLParser } from 'fast-xml-parser';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!id || Array.isArray(id)) {
    res.status(400).json({ error: 'Invalid video id' });
    return;
  }
  try {
    const response = await fetch(`https://video.google.com/timedtext?lang=en&v=${id}`);
    if (!response.ok) {
      res.status(404).json({ error: 'Transcript not available' });
      return;
    }
    const xml = await response.text();
    if (!xml) {
      res.status(404).json({ error: 'Transcript not available' });
      return;
    }
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(xml);
    const items = parsed?.transcript?.text;
    if (!items) {
      res.status(404).json({ error: 'Transcript not available' });
      return;
    }
    const arr = Array.isArray(items) ? items : [items];
    const transcript = arr.map((item: any) => ({
      start: parseFloat(item['@_start'] || '0'),
      dur: parseFloat(item['@_dur'] || '0'),
      text: (item['#text'] || '').replace(/\s+/g, ' ').trim(),
    }));
    res.status(200).json({ transcript });
  } catch {
    res.status(500).json({ error: 'Transcript fetch failed' });
  }
}
