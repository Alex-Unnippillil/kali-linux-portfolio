import type { NextApiRequest, NextApiResponse } from 'next';

const { GITLEAKS_URL, TRUFFLEHOG_URL } = process.env;

async function callTool(url: string | undefined, patch: string) {
  if (!url) return [];
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patch }),
  });
  if (!res.ok) throw new Error(`Server responded ${res.status}`);
  return res.json();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { patch } = req.body as { patch?: string };
  if (!patch) {
    res.status(400).json({ error: 'Missing patch' });
    return;
  }

  try {
    const [gitleaks, trufflehog] = await Promise.all([
      callTool(GITLEAKS_URL, patch).catch((e) => ({ error: e.message })),
      callTool(TRUFFLEHOG_URL, patch).catch((e) => ({ error: e.message })),
    ]);
    res.status(200).json({ gitleaks, trufflehog });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Error' });
  }
}

