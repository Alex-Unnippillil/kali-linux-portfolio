import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { enforceRateLimit, sendError, sendMethodNotAllowed } from '../../utils/api-helpers';

const execFileAsync = promisify(execFile);

export default async function handler(req, res) {
  if (enforceRateLimit(req, res, { max: 15 })) return;

  if (process.env.FEATURE_TOOL_APIS !== 'enabled') {
    sendError(res, 501, 'feature_disabled', 'Not implemented');
    return;
  }
  // Radare2 utilities are optional; this endpoint may be stubbed when the
  // binaries are unavailable.
  if (req.method !== 'POST') {
    sendMethodNotAllowed(req, res, ['POST']);
    return;
  }

  const { action, hex, file } = req.body || {};

  try {
    if (action === 'disasm' && hex) {
      try {
        await execFileAsync('which', ['rasm2']);
      } catch {
        return sendError(res, 500, 'radare2_missing', 'radare2 not installed');
      }
      try {
        const { stdout } = await execFileAsync('rasm2', ['-d', hex], {
          timeout: 1000 * 60,
        });
        return res.status(200).json({ result: stdout });
      } catch (error) {
        const msg = error.stderr?.toString() || error.message;
        return sendError(res, 500, 'radare2_error', msg);
      }
    }

    if (action === 'analyze' && file) {
      try {
        await execFileAsync('which', ['rabin2']);
      } catch {
        return sendError(res, 500, 'radare2_missing', 'radare2 not installed');
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
        return sendError(res, 500, 'radare2_error', msg);
      }
    }

    return sendError(res, 400, 'invalid_request', 'Invalid request');
  } catch (e) {
    return sendError(res, 500, 'radare2_error', e.message);
  }
}

