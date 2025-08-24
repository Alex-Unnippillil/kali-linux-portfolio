import type { NextApiRequest, NextApiResponse } from 'next';
import { setupUrlGuard } from '../../lib/urlGuard';
import { fetchHead } from '../../lib/headCache';
setupUrlGuard();

interface ProbeResult {
  ok: boolean;
  altSvc: string | null;
  alpnHints: string[];
  negotiatedProtocol: string;
  quicVersions: string[];
  zeroRtt: boolean;
  fallbackOk: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProbeResult>
) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).json({
      ok: false,
      altSvc: null,
      alpnHints: [],
      negotiatedProtocol: '',
      quicVersions: [],
      zeroRtt: false,
      fallbackOk: false,
    });
    return;
  }

  let target: URL;
  try {
    target = new URL(`https://${url}`);
  } catch {
    res.status(400).json({
      ok: false,
      altSvc: null,
      alpnHints: [],
      negotiatedProtocol: '',
      quicVersions: [],
      zeroRtt: false,
      fallbackOk: false,
    });
    return;
  }

  try {
    const { headers, alpn } = await fetchHead(target.toString());
    const altSvc = (headers['alt-svc'] as string | undefined) ?? null;

    const alpnHints: string[] = [];
    const quicVersions: string[] = [];
    let zeroRtt = false;

    if (altSvc) {
      const entries = altSvc.split(',').map((s) => s.trim());
      for (const entry of entries) {
        const [protoPart, ...paramParts] = entry.split(';').map((p) => p.trim());
        const proto = protoPart.split('=')[0];
        if (proto) {
          alpnHints.push(proto);
          const m = proto.match(/^h3-(\d+)/i);
          if (m) {
            quicVersions.push(m[1]);
          }
        }
        for (const param of paramParts) {
          const [k, v = ''] = param.split('=').map((p) => p.trim());
          if (k.toLowerCase() === 'v') {
            const versions = v.replace(/"/g, '').split(/\s*,\s*/);
            quicVersions.push(...versions);
          }
          if (k.toLowerCase() === '0rtt') {
            zeroRtt = true;
          }
        }
      }
    }

    const uniqueVersions = Array.from(new Set(quicVersions));
    res.status(200).json({
      ok: alpnHints.some((p) => p.toLowerCase().startsWith('h3')),
      altSvc,
      alpnHints,
      negotiatedProtocol: alpn,
      quicVersions: uniqueVersions,
      zeroRtt,
      fallbackOk: ['h2', 'http/1.1', 'unknown'].includes(alpn),
    });
  } catch {
    res.status(500).json({
      ok: false,
      altSvc: null,
      alpnHints: [],
      negotiatedProtocol: '',
      quicVersions: [],
      zeroRtt: false,
      fallbackOk: false,
    });
  }
}
