import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

interface UpdateResponse {
  updates: string[];
  error?: string;
}

const SCRIPT_DB_URL = 'https://raw.githubusercontent.com/nmap/nmap/master/scripts/script.db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse>
) {
  try {
    const resp = await fetch(SCRIPT_DB_URL);
    if (!resp.ok) {
      throw new Error('Failed to fetch script database');
    }
    const text = await resp.text();
    const remoteScripts = new Set<string>();
    const regex = /filename\s*=\s*"([^"]+)"/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const name = match[1].replace(/\.nse$/, '');
      remoteScripts.add(name);
    }

    const localPath = path.join(
      process.cwd(),
      'public',
      'demo-data',
      'nmap',
      'scripts.json'
    );
    const localText = await fs.readFile(localPath, 'utf-8');
    const localJson = JSON.parse(localText) as Record<string, { name: string }[]>;
    const localScripts = new Set<string>();
    Object.values(localJson).forEach((arr) => {
      arr.forEach((s) => localScripts.add(s.name));
    });

    const updates = Array.from(remoteScripts).filter(
      (name) => !localScripts.has(name)
    );

    res.status(200).json({ updates });
  } catch (e: any) {
    res.status(500).json({ updates: [], error: e.message });
  }
}
