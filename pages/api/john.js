import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { promisify } from 'util';
import createErrorResponse from '@/utils/apiErrorResponse';

const execAsync = promisify(exec);

export default async function handler(req, res) {
  if (process.env.FEATURE_TOOL_APIS !== 'enabled') {
    res.status(501).json(createErrorResponse('Not implemented'));
    return;
  }
  // John the Ripper is optional; environments without the binary can stub
  // this handler to return canned responses for demonstration.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json(createErrorResponse('Method not allowed'));
    return;
  }
  const { hash } = req.body || {};
  if (!hash) {
    res.status(400).json(createErrorResponse('No hash provided'));
    return;
  }
  try {
    await execAsync('which john');
  } catch {
    return res
      .status(500)
      .json(createErrorResponse('John the Ripper not installed'));
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
    res.status(500).json(createErrorResponse(e.stderr || e.message));
  }
}
