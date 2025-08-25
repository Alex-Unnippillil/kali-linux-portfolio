import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const run = (cmd) =>
  new Promise((resolve) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) resolve({ error: stderr || error.message });
      else resolve({ result: stdout });
    });
  });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, hex, file } = req.body || {};

  try {
    if (action === 'disasm' && hex) {
      const { result, error } = await run(`rasm2 -d '${hex}'`);
      if (error) return res.status(500).json({ error });
      return res.status(200).json({ result });
    }

    if (action === 'analyze' && file) {
      const buffer = Buffer.from(file, 'base64');
      const tmpPath = path.join(os.tmpdir(), `radare2-${Date.now()}`);
      fs.writeFileSync(tmpPath, buffer);
      const { result, error } = await run(`rabin2 -I ${tmpPath}`);
      fs.unlink(tmpPath, () => {});
      if (error) return res.status(500).json({ error });
      return res.status(200).json({ result });
    }

    return res.status(400).json({ error: 'Invalid request' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

