import type { NextApiRequest, NextApiResponse } from 'next';
import tls, { PeerCertificate } from 'tls';
import { LRUCache } from 'lru-cache';

interface FormattedCert {
  subject: Record<string, string>;
  issuer: Record<string, string>;
  san: string[];
  validFrom: string;
  validTo: string;
  daysRemaining: number;
}

const explanations = {
  subject: 'The entity this certificate was issued to.',
  issuer: 'The certificate authority that issued this certificate.',
  san: 'Subject Alternative Names that this certificate is valid for.',
  validFrom: 'The date when this certificate becomes valid.',
  validTo: 'The date when this certificate expires.',
  daysRemaining: 'Number of days until the certificate expires.',
  ocspStapled: 'Whether the server provided an OCSP stapling response indicating revocation status.',
  cipher: 'The negotiated cipher suite for the TLS connection.',
  protocol: 'The negotiated TLS protocol version.'
};

function parseSAN(input?: string): string[] {
  if (!input) return [];
  return input.split(',').map((s) => s.trim().replace(/^DNS:/i, ''));
}

function formatCert(cert: PeerCertificate): FormattedCert {
  const san = parseSAN((cert as any).subjectaltname);
  const validFrom = new Date((cert as any).valid_from);
  const validTo = new Date((cert as any).valid_to);
  const daysRemaining = Math.round((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return {
    subject: (cert.subject as unknown as Record<string, string>) || {},
    issuer: (cert.issuer as unknown as Record<string, string>) || {},
    san,
    validFrom: validFrom.toISOString(),
    validTo: validTo.toISOString(),
    daysRemaining
  };
}

function collectChain(cert: PeerCertificate): PeerCertificate[] {
  const chain: PeerCertificate[] = [];
  let current: any = cert;
  const seen = new Set<string>();
  while (current && Object.keys(current).length) {
    if (seen.has(current.fingerprint256)) break;
    chain.push(current);
    seen.add(current.fingerprint256);
    if (!current.issuerCertificate || current.issuerCertificate === current) break;
    current = current.issuerCertificate;
  }
  return chain;
}

function getTLSInfo(host: string, port: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host, port, servername: host, rejectUnauthorized: false, requestOCSP: true } as any,
      () => {
        try {
          const peer = socket.getPeerCertificate(true);
          const chain = collectChain(peer).map(formatCert);
          const ocspStapled = Boolean(
            (socket as any).ocspResponse || (socket as any).getOCSPResponse?.()
          );
          const cipher = socket.getCipher();
          const protocol = socket.getProtocol?.();
          socket.end();
          resolve({
            host,
            port,
            ocspStapled,
            cipher,
            protocol,
            chain,
            explanations,
            sslLabsUrl: `https://www.ssllabs.com/ssltest/analyze.html?d=${encodeURIComponent(host)}`,
          });
        } catch (err) {
          reject(err);
        }
      }
    );
    socket.on('error', reject);
  });
}

const cache = new LRUCache<string, any>({
  max: 100,
  ttl: 60 * 60 * 1000,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { host, port } = req.query;
  if (!host || typeof host !== 'string') {
    res.status(400).json({ error: 'host query parameter required' });
    return;
  }

  const portNum = typeof port === 'string' ? parseInt(port, 10) || 443 : 443;

  const key = `${host}:${portNum}`;
  try {
    const cached = cache.get(key);
    if (cached) {
      res.status(200).json({ ...cached, cached: true });
      return;
    }
    const info = await getTLSInfo(host, portNum);
    cache.set(key, info);
    res.status(200).json(info);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

