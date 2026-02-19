import { getServiceClient } from '../../../lib/service-client';
import { createLogger } from '../../../lib/logger';
import { requireApiAuth } from '../../../lib/api-auth';

export default async function handler(
  req,
  res
) {
  const logger = createLogger(req.headers['x-correlation-id']);
  if (req.method !== 'GET') {
    logger.warn('method not allowed', { method: req.method });
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!requireApiAuth(req, res)) {
    logger.warn('unauthorized admin access attempt');
    return;
  }

  const client = getServiceClient();
  if (!client) {
    logger.warn('supabase client not configured');
    res.status(503).json({ error: 'Service unavailable' });
    return;
  }

  try {
    const { data, error } = await client
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      logger.error('error fetching messages', { err: error.message });
      throw error;
    }
    logger.info('admin messages retrieved', { count: data.length });
    res.status(200).json({ messages: data });
  } catch (err) {
    logger.error('failed to load admin messages', { err: err.message });
    res.status(500).json({ error: err.message });
  }
}
