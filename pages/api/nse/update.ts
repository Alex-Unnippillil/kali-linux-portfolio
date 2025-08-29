import type { NextApiRequest, NextApiResponse } from 'next';
import { readFile } from 'fs/promises';
import path from 'path';

interface VersionInfo {
  sha: string;
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const versionPath = path.join(process.cwd(), 'public', 'demo-data', 'nmap', 'script-db-version.json');
    const raw = await readFile(versionPath, 'utf8');
    const { sha: current } = JSON.parse(raw) as VersionInfo;

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
