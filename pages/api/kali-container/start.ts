import type { NextApiRequest, NextApiResponse } from 'next';
import { execFile } from 'child_process';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (
    process.env.FEATURE_TOOL_APIS !== 'enabled' ||
    process.env.FEATURE_KALI_CONTAINER !== 'enabled'
  ) {
    res.status(501).json({ error: 'Not implemented' });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { tag = 'latest', flags = [] } = req.body || {};
  const tagPattern = /^[\w.-]+$/;
  const flagPattern = /^[-\w=/:]+$/;

  const flagArray: string[] = Array.isArray(flags)
    ? flags
    : typeof flags === 'string'
    ? flags.split(/\s+/).filter(Boolean)
    : [];

  if (!tagPattern.test(tag) || flagArray.some((f) => !flagPattern.test(f))) {
    res.status(400).json({ error: 'Invalid tag or flags' });
    return;
  }

  const args = ['run', ...flagArray, `kalilinux/kali-rolling:${tag}`];

  execFile('docker', args, { timeout: 1000 * 60 }, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: stderr?.toString() || error.message });
      return;
    }
    res.status(200).json({ stdout: stdout.toString() });
  });
}

