import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import createErrorResponse from '@/utils/apiErrorResponse';

const execFileAsync = promisify(execFile);

export default async function handler(req, res) {
  if (process.env.FEATURE_TOOL_APIS !== 'enabled') {
    res.status(501).json(createErrorResponse('Not implemented'));
    return;
  }
  // Radare2 utilities are optional; this endpoint may be stubbed when the
  // binaries are unavailable.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json(createErrorResponse('Method not allowed'));
  }

  const { action, hex, file } = req.body || {};

  try {
    if (action === 'disasm' && hex) {
      try {
        await execFileAsync('which', ['rasm2']);
      } catch {
        return res
          .status(500)
          .json(createErrorResponse('radare2 not installed'));
      }
      try {
        const { stdout } = await execFileAsync('rasm2', ['-d', hex], {
          timeout: 1000 * 60,
        });
        return res.status(200).json({ result: stdout });
      } catch (error) {
        const msg = error.stderr?.toString() || error.message;
        return res.status(500).json(createErrorResponse(msg));
      }
    }

    if (action === 'analyze' && file) {
      try {
        await execFileAsync('which', ['rabin2']);
      } catch {
        return res
          .status(500)
          .json(createErrorResponse('radare2 not installed'));
      }
      const buffer = Buffer.from(file, 'base64');
      const tmpPath = path.join(os.tmpdir(), `radare2-${Date.now()}`);
      fs.writeFileSync(tmpPath, buffer);
      try {
        const { stdout } = await execFileAsync('rabin2', ['-I', tmpPath], {
          timeout: 1000 * 60,
        });
        fs.unlink(tmpPath, () => {});
        return res.status(200).json({ result: stdout });
      } catch (error) {
        fs.unlink(tmpPath, () => {});
        const msg = error.stderr?.toString() || error.message;
        return res.status(500).json(createErrorResponse(msg));
      }
    }

    return res.status(400).json(createErrorResponse('Invalid request'));
  } catch (e) {
    return res.status(500).json(createErrorResponse(e.message));
  }
}

