import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();

interface ScriptResult {
  src: string;
  providedIntegrity: string | null;
  computedIntegrity: string;
  status: 'match' | 'mismatch' | 'missing' | 'error';
  severity: 'info' | 'warning' | 'error';
  message: string;
  recommendation?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url query parameter is required' });
  }

  try {
    const response = await fetch(url);
    const html = await response.text();

    const scriptRegex = /<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi;
    const results: ScriptResult[] = [];
    let match;

    while ((match = scriptRegex.exec(html)) !== null) {
      const tag = match[0];
      const src = match[1];
      const integrityMatch = tag.match(/integrity=["']([^"']+)["']/i);
      const provided = integrityMatch ? integrityMatch[1] : null;
      const scriptUrl = src.startsWith('http') ? src : new URL(src, url).href;

      try {
        const scriptRes = await fetch(scriptUrl);
        const buffer = Buffer.from(await scriptRes.arrayBuffer());
        const algo = provided?.split('-')[0] || 'sha384';
        const hash = crypto.createHash(algo).update(buffer).digest('base64');
        const computed = `${algo}-${hash}`;

        if (!provided) {
          results.push({
            src: scriptUrl,
            providedIntegrity: null,
            computedIntegrity: computed,
            status: 'missing',
            severity: 'warning',
            message: 'Missing integrity attribute',
            recommendation: `Add integrity="${computed}"`,
          });
        } else if (provided !== computed) {
          results.push({
            src: scriptUrl,
            providedIntegrity: provided,
            computedIntegrity: computed,
            status: 'mismatch',
            severity: 'error',
            message: 'Integrity mismatch',
            recommendation: `Update integrity to "${computed}"`,
          });
        } else {
          results.push({
            src: scriptUrl,
            providedIntegrity: provided,
            computedIntegrity: computed,
            status: 'match',
            severity: 'info',
            message: 'Integrity OK',
          });
        }
      } catch (err: any) {
        results.push({
          src: scriptUrl,
          providedIntegrity: provided,
          computedIntegrity: '',
          status: 'error',
          severity: 'error',
          message: 'Failed to fetch script',
        });
      }
    }

    return res.status(200).json({ url, results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

