import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { hash, mode } = req.body || {};
  if (!hash) {
    res.status(400).json({ error: 'No hash provided' });
    return;
  }

  const selectedMode = ['wordlist', 'incremental'].includes(mode)
    ? mode
    : 'single';

  const file = path.join(tmpdir(), `john-${Date.now()}.txt`);
  try {
    await fs.writeFile(file, `${hash}\n`);

    let cmd = `john --single ${file}`;
    if (selectedMode === 'wordlist') {
      cmd = `john --wordlist=/usr/share/wordlists/rockyou.txt ${file}`;
    } else if (selectedMode === 'incremental') {
      cmd = `john --incremental ${file}`;
    }

    exec(cmd, async (error, stdout, stderr) => {
      await fs.unlink(file).catch(() => {});
      if (error) {
        res.status(500).json({ error: stderr || error.message });
      } else {
        res.status(200).json({ output: stdout || stderr });
      }
    });
  } catch (e) {
    await fs.unlink(file).catch(() => {});
    res.status(500).json({ error: e.message });
  }
}
