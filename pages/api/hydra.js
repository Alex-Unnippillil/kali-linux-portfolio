import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { target, service, userList, passList } = req.body || {};
  if (!target || !service || !userList || !passList) {
    res.status(400).json({ error: 'Missing parameters' });
    return;
  }

  const userPath = `/tmp/hydra-users-${randomUUID()}.txt`;
  const passPath = `/tmp/hydra-pass-${randomUUID()}.txt`;

  try {
    await fs.writeFile(userPath, userList);
    await fs.writeFile(passPath, passList);
  } catch (err) {
    res.status(500).json({ error: err.message });
    return;
  }

  const args = ['-L', userPath, '-P', passPath, `${service}://${target}`];

  execFile('hydra', args, { timeout: 1000 * 60 }, (error, stdout, stderr) => {
    // Clean up temp files
    fs.unlink(userPath).catch(() => {});
    fs.unlink(passPath).catch(() => {});

    if (error) {
      const msg = stderr?.toString() || error.message;
      res.status(200).json({ output: msg });
      return;
    }
    res.status(200).json({ output: stdout.toString() });
  });
}
