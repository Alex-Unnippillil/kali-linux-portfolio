import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchHead } from '../../lib/headCache';
import { URL } from 'url';
import dgram from 'dgram';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url } = req.query;
  if (typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  let head;
  try {
    head = await fetchHead(url);
  } catch {
    res.status(502).json({ error: 'Failed to fetch headers' });
    return;
  }

  const altSvc = head.headers['alt-svc'] as string | undefined;
  const h3Advertised = !!altSvc && /(?:^|,\s*)h3(?:=|\s|$)/i.test(altSvc);

  let udpError: string | null = null;
  try {
    await new Promise<void>((resolve) => {
      const socket = dgram.createSocket(parsed.hostname.includes(':') ? 'udp6' : 'udp4');
      socket.once('error', (err) => {
        udpError = err.message;
        socket.close();
        resolve();
      });
      socket.send(Buffer.alloc(1), Number(parsed.port) || 443, parsed.hostname, (err) => {
        if (err) {
          udpError = err.message;
        }
        socket.close();
        resolve();
      });
    });
  } catch (err: any) {
    udpError = err.message;
  }

  res.status(200).json({
    altSvc: altSvc ?? null,
    negotiatedProtocol: head.alpn,
    h3Advertised,
    documentation: 'https://developer.mozilla.org/docs/Web/HTTP/Headers/Alt-Svc',
    udpError,
    note: 'Browsers limit UDP error details; HTTP/3 failures often appear as generic network errors.'
  });
}
