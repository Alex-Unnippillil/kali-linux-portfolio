import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data', 'settings.json');

function readSettings() {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    return {
      theme: 'light',
      language: 'en-US',
      units: 'metric',
      dataSaving: false,
      ...parsed,
    };
  } catch {
    return { theme: 'light', language: 'en-US', units: 'metric', dataSaving: false };
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json(readSettings());
  }

  if (req.method === 'POST') {
    const settings = req.body;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}
