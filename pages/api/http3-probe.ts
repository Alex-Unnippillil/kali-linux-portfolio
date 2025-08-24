import type { NextApiRequest, NextApiResponse } from 'next';
import util from 'util';
import { execFile } from 'child_process';
import { setupUrlGuard } from '../../lib/urlGuard';

setupUrlGuard();

const execFileAsync = util.promisify(execFile);

interface ProbeResult {
  altSvc: string | null;
  alpn: string | null;
  h3Probe?: { ok: boolean; output: string };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProbeResult | { error: string }>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, probe } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid url' });
  }

  try {
    const response = await fetch(url, { method: 'GET' });
    const altSvc = response.headers.get('alt-svc');
    const hostname = new URL(url).hostname;

    let alpn: string | null = null;
    try {
      const { stdout } = await execFileAsync(
        'openssl',
        ['s_client', '-alpn', 'h3,h2,http/1.1', '-connect', `${hostname}:443`],
        { timeout: 4000 },
      );
      const match = stdout.match(/ALPN protocol: (.*)/);
      if (match) alpn = match[1].trim();
    } catch {
      // ignore openssl errors
    }

    let h3Probe: { ok: boolean; output: string } | undefined;
    if (probe === '1' || probe === 'true') {
      try {
        const { stdout } = await execFileAsync(
          'curl',
          ['-I', '--http3', '--max-time', '5', url],
          { timeout: 7000 },
        );
        h3Probe = { ok: true, output: stdout };
      } catch (e: any) {
        h3Probe = { ok: false, output: (e.stdout || e.stderr || e.message || '').toString() };
      }
    }

    return res.status(200).json({ altSvc, alpn, h3Probe });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Request failed' });
  }
}
