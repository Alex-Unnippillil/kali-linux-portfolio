import type { NextApiRequest, NextApiResponse } from 'next';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const tagRegex = /^[a-zA-Z0-9._-]+$/;
const flagRegex = /^-{1,2}[a-zA-Z0-9][a-zA-Z0-9-]*(=.*)?$/;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (process.env.FEATURE_TOOL_APIS !== 'enabled') {
    res.status(501).json({ error: 'Not implemented' });
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { tag = 'latest', flags = '' } = req.body || {};
  if (typeof tag !== 'string' || !tagRegex.test(tag)) {
    res.status(400).json({ error: 'Invalid tag' });
    return;
  }

  const parsedFlags =
    typeof flags === 'string'
      ? flags
          .trim()
          .split(/\s+/)
          .filter(Boolean)
      : [];
  for (const f of parsedFlags) {
    if (!flagRegex.test(f)) {
      res.status(400).json({ error: 'Invalid flag' });
      return;
    }
  }

  const args = ['run', ...parsedFlags, `kalilinux/kali-rolling:${tag}`];
  try {
    const { stdout } = await execFileAsync('docker', args);
    res.status(200).json({ id: stdout.toString().trim() });
  } catch (error: any) {
    const msg = error.stderr?.toString() || error.message;
    res.status(500).json({ error: msg });
  }
}
