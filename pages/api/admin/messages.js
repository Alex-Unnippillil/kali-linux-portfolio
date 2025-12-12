import { getServiceClient } from '../../../lib/service-client';
import { createLogger } from '../../../lib/logger';
import { enforceRateLimit, sendError, sendMethodNotAllowed } from '../../../utils/api-helpers';

export default async function handler(
  req,
  res
) {
  const logger = createLogger(req.headers['x-correlation-id']);
  if (process.env.ADMIN_UI_ENABLED !== 'true') {
    logger.warn('admin ui disabled');
    sendError(res, 404, 'not_found', 'Not Found');
    return;
  }
  if (enforceRateLimit(req, res, { max: 10 })) {
    logger.warn('rate limited admin request');
    return;
  }
  if (req.method !== 'GET') {
    logger.warn('method not allowed', { method: req.method });
    sendMethodNotAllowed(req, res, ['GET']);
    return;
  }

  const key = req.headers['x-admin-key'];
  const otp = req.headers['x-admin-otp'];
  const otpSecret = process.env.ADMIN_OTP_TOKEN;
  if (process.env.NODE_ENV === 'production' && !otpSecret) {
    logger.error('missing admin otp token in production');
    sendError(res, 503, 'admin_otp_missing', 'Admin console unavailable');
    return;
  }
  if (key !== process.env.ADMIN_READ_KEY || (otpSecret && otp !== otpSecret)) {
    logger.warn('unauthorized admin access attempt');
    sendError(res, 401, 'unauthorized', 'Unauthorized');
    return;
  }

  const client = getServiceClient();
  if (!client) {
    logger.warn('supabase client not configured');
    sendError(res, 503, 'service_unavailable', 'Service unavailable');
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
    sendError(res, 500, 'admin_fetch_failed', err.message);
  }
}
