import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export default async function handler(req, res) {
  // Hydra is an optional external dependency. Environments without the
  // actual binary may stub this handler for demonstration purposes.
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

  try {
    await execFileAsync('which', ['hydra']);
  } catch {
    await fs.unlink(userPath).catch(() => {});
    await fs.unlink(passPath).catch(() => {});
    res.status(500).json({ error: 'Hydra not installed' });
    return;
  }

  const args = ['-L', userPath, '-P', passPath, `${service}://${target}`];

  try {
    const { stdout } = await execFileAsync('hydra', args, { timeout: 1000 * 60 });
    res.status(200).json({ output: stdout.toString() });
  } catch (error) {
    const msg = error.stderr?.toString() || error.message;
    res.status(500).json({ error: msg });
  } finally {
    fs.unlink(userPath).catch(() => {});
    fs.unlink(passPath).catch(() => {});
  }
}
