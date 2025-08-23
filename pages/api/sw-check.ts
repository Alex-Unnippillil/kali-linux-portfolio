import type { NextApiRequest, NextApiResponse } from 'next';

interface Finding {
  pattern: string;
  explanation: string;
  remediation: string;
  docs: string;
}

const PATTERNS: { regex: RegExp; explanation: string; remediation: string; docs: string }[] = [
  {
    regex: /self\.skipWaiting\s*\(\s*\)/,
    explanation: 'self.skipWaiting() allows a new service worker to activate immediately, which may leave older tabs running previous versions and lead to unexpected behavior or security risks.',
    remediation: 'Remove automatic skipWaiting or prompt users before activating a new service worker.',
    docs: 'https://developer.chrome.com/docs/workbox/handling-service-worker-updates/',
  },
  {
    regex: /clients\.claim\s*\(\s*\)/,
    explanation: 'clients.claim() forces uncontrolled pages to be controlled by the service worker without a reload, which can cause inconsistent state if used prematurely.',
    remediation: 'Call clients.claim() only after ensuring the service worker is ready to safely control pages.',
    docs: 'https://developer.mozilla.org/docs/Web/API/Clients/claim',
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const swUrl = url.endsWith('/') ? `${url}service-worker.js` : `${url}/service-worker.js`;
    const response = await fetch(swUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: `Unable to fetch service worker: ${response.statusText}` });
    }
    const text = await response.text();
    const findings: Finding[] = [];
    PATTERNS.forEach((p) => {
      if (p.regex.test(text)) {
        findings.push({ pattern: p.regex.source, explanation: p.explanation, remediation: p.remediation, docs: p.docs });
      }
    });
    return res.status(200).json({ findings });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to check service worker' });
  }
}

