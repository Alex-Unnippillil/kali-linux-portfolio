import type { NextApiRequest, NextApiResponse } from 'next';
import JSZip from 'jszip';
import { spawn, spawnSync } from 'child_process';
import { z } from 'zod';
import { validateRequest } from '../../lib/validate';
import { defaultPatterns, redactSecret } from '../../components/apps/git-secrets-tester';
import { setupUrlGuard } from '../../lib/urlGuard';

setupUrlGuard();

interface ApiResult {
  file: string;
  pattern: string;
  match: string;
  index: number;
  line: number;
  severity: string;
  confidence: string;
  remediation: string;
  whitelist: string;
}

function scanFile(name: string, content: string): ApiResult[] {
  const res: ApiResult[] = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    defaultPatterns.forEach((p) => {
      try {
        const re = new RegExp(p.regex, 'g');
        let m: RegExpExecArray | null;
        while ((m = re.exec(line)) !== null) {
          res.push({
            file: name,
            pattern: p.name,
            match: redactSecret(m[0]),
            index: m.index,
            line: idx + 1,
            severity: p.severity,
            confidence: 'high',
            remediation: p.remediation,
            whitelist: p.whitelist,
          });
        }
      } catch {
        // ignore bad regex
      }
    });
  });
  return res;
}

async function runGitSecrets(input: string, logs: string[]): Promise<void> {
  try {
    spawnSync('git', ['secrets', '--register-aws']);
    await new Promise<void>((resolve) => {
      const proc = spawn('git', ['secrets', '--scan', '-']);
      let out = '';
      proc.stdout.on('data', (d) => {
        out += d.toString();
      });
      proc.stderr.on('data', (d) => {
        out += d.toString();
      });
      proc.on('close', () => {
        if (out.trim()) logs.push(out.trim());
        resolve();
      });
      proc.on('error', (e) => {
        logs.push(`git secrets failed: ${e.message}`);
        resolve();
      });
      proc.stdin.write(input);
      proc.stdin.end();
    });
  } catch (e: any) {
    logs.push(`git secrets error: ${e.message}`);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const bodySchema = z
    .object({ patch: z.string().optional(), archive: z.string().optional() })
    .refine((d) => d.patch || d.archive, { message: 'Missing patch or archive' });
  const parsed = validateRequest(req, res, { bodySchema });
  if (!parsed) return;
  const { patch, archive } = parsed.body as {
    patch?: string;
    archive?: string;
  };

  const logs: string[] = [];
  let combined = '';
  let results: ApiResult[] = [];

  if (archive) {
    try {
      const zip = await JSZip.loadAsync(Buffer.from(archive, 'base64'));
      const entries = Object.values(zip.files);
      for (const entry of entries) {
        if (entry.dir) continue;
        const txt = await entry.async('string');
        results = results.concat(scanFile(entry.name, txt));
        combined += `${txt}\n`;
      }
    } catch (e: any) {
      logs.push(`archive error: ${e.message}`);
    }
  }

  if (patch) {
    results = results.concat(scanFile('input', patch));
    combined += patch;
  }

  await runGitSecrets(combined, logs);

  res.status(200).json({ results, logs });
}

