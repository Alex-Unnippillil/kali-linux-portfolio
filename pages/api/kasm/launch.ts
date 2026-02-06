import type { NextApiRequest, NextApiResponse } from 'next';

interface LaunchResponse {
  url: string;
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LaunchResponse | ErrorResponse>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { KASM_URL, KASM_USERNAME, KASM_PASSWORD, KASM_IMAGE_ID } = process.env;
  if (!KASM_URL || !KASM_USERNAME || !KASM_PASSWORD || !KASM_IMAGE_ID) {
    return res.status(500).json({ error: 'Kasm is not configured' });
  }

  try {
    const loginRes = await fetch(`${KASM_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: KASM_USERNAME, password: KASM_PASSWORD }),
    });
    if (!loginRes.ok) {
      throw new Error('login failed');
    }
    const { token } = await loginRes.json();

    const sessionRes = await fetch(`${KASM_URL}/api/create-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ image_id: KASM_IMAGE_ID }),
    });
    if (!sessionRes.ok) {
      throw new Error('session failed');
    }
    const data = await sessionRes.json();
    const url = data.session_url || data.url;
    if (!url) {
      throw new Error('no url');
    }

    return res.status(200).json({ url });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to launch Kasm session' });
  }
}
