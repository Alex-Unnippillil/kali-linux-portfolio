import { readFile } from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const versionPath = path.join(process.cwd(), 'public', 'demo-data', 'nmap', 'script-db-version.json');
    const raw = await readFile(versionPath, 'utf8');
    const { sha: current, updatedAt } = JSON.parse(raw);

    res.status(200).json({
      updateAvailable: false,
      current,
      latest: current,
      updatedAt,
      source: 'bundled-demo-data',
      note: 'Static demo response; no outbound repository check was performed.',
    });
  } catch (e) {
    res.status(500).json({ error: 'Unable to read bundled script version' });
  }
}
