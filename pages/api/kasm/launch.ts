import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const baseUrl = process.env.KASM_URL;
  const username = process.env.KASM_USERNAME;
  const password = process.env.KASM_PASSWORD;
  const profileId = process.env.KASM_WORKSPACE_ID;

  if (!baseUrl || !username || !password || !profileId) {
    res.status(500).json({ error: 'Kasm not configured' });
    return;
  }

  try {
    const authRes = await fetch(`${baseUrl}/api/v1/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const { token } = await authRes.json();

    const launchRes = await fetch(`${baseUrl}/api/v1/containers/launch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ profile_id: profileId }),
    });
    const { url } = await launchRes.json();

    res.status(200).json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to launch session' });
  }
}

