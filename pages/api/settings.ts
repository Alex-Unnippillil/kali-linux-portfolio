import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { setupUrlGuard } from '../../lib/urlGuard';
import { readJson, writeJson } from '../../lib/store';

setupUrlGuard();

const filePath = path.join(process.cwd(), 'data', 'settings.json');

async function readSettings() {
  return readJson(filePath, {
    theme: 'light',
    language: 'en-US',
    units: 'metric',
    dataSaving: false,
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method === 'GET') {
    res.status(200).json(await readSettings());
    return;
  }

  if (req.method === 'POST') {
    const settings = req.body;
    await writeJson(filePath, settings);
    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end('Method Not Allowed');
}
