import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceClient } from '../../../lib/service-client';
import { createLogger } from '../../../lib/logger';
import {
  AdminMessagesResponseData,
  createAdminMessagesResponse,
} from '../../../lib/contracts';

function respond(
  res: NextApiResponse,
  status: number,
  data: AdminMessagesResponseData,
) {
  res.status(status).json(createAdminMessagesResponse(data));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const logger = createLogger(req.headers['x-correlation-id']);
  if (req.method !== 'GET') {
    logger.warn('method not allowed', { method: req.method });
    respond(res, 405, { error: 'Method not allowed' });
    return;
  }

  const key = req.headers['x-admin-key'];
  if (key !== process.env.ADMIN_READ_KEY) {
    logger.warn('unauthorized admin access attempt');
    respond(res, 401, { error: 'Unauthorized' });
    return;
  }

  const client = getServiceClient();
  if (!client) {
    logger.warn('supabase client not configured');
    respond(res, 503, { error: 'Service unavailable' });
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
    logger.info('admin messages retrieved', { count: data?.length ?? 0 });
    respond(res, 200, { messages: data ?? [] });
  } catch (err: any) {
    logger.error('failed to load admin messages', { err: err.message });
    respond(res, 500, { error: err.message });
  }
}
