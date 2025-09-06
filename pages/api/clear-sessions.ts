import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { validateCsrfToken } from '../../lib/csrf';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  if (!validateCsrfToken(req)) {
    return res.status(403).json({ error: 'invalid_csrf' });
  }

  const sessionDir = path.join(os.homedir(), '.cache', 'xfce4-session');
  try {
    await fs.rm(sessionDir, { recursive: true, force: true });
    await fs.mkdir(sessionDir, { recursive: true });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear sessions' });
  }
}
