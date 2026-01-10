import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { promisify } from 'util';

import rateLimitEdge from '@/lib/rateLimitEdge';

const execAsync = promisify(exec);

async function handler(req, res) {
  if (process.env.FEATURE_TOOL_APIS !== 'enabled') {
    res.status(501).json({ error: 'Not implemented' });
    return;
  }
  // John the Ripper is optional; environments without the binary can stub
  // this handler to return canned responses for demonstration.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { hash } = req.body || {};
  if (!hash) {
    res.status(400).json({ error: 'No hash provided' });
    return;
  }
  try {
    await execAsync('which john');
  } catch {
    return res.status(500).json({ error: 'John the Ripper not installed' });
  }

  const file = path.join(tmpdir(), `john-${Date.now()}.txt`);
  try {
    await fs.writeFile(file, `${hash}\n`);
    const { stdout, stderr } = await execAsync(`john ${file}`, {
      timeout: 1000 * 60,
    });
    await fs.unlink(file).catch(() => {});
    res.status(200).json({ output: stdout || stderr });
  } catch (e) {
    await fs.unlink(file).catch(() => {});
    res.status(500).json({ error: e.stderr || e.message });
  }
}

export default rateLimitEdge(handler, { limit: 5 });
