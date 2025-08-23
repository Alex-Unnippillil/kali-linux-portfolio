import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { method = 'GET', url, headers = {}, body } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url' });
  }

  const start = Date.now();

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? undefined : body,
    });

    const duration = Date.now() - start;
    const text = await response.text();
    const headersObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    return res.status(200).json({
      duration,
      status: response.status,
      statusText: response.statusText,
      headers: headersObj,
      body: text,
    });
  } catch (error: any) {
    const duration = Date.now() - start;
    return res.status(500).json({
      error: error?.message || 'Request failed',
      duration,
    });
  }
}
