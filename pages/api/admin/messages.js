import { serviceClient } from '../../../lib/service-client';

/**
 * Retrieve recent contact messages (admin only).
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = req.headers['x-admin-key'];
  if (key !== process.env.ADMIN_READ_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { data, error } = await serviceClient
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      throw error;
    }
    res.status(200).json({ messages: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
