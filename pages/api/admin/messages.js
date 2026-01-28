import { createLogger } from '../../../lib/logger';

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

  const key = req.headers['x-admin-key'];
  if (key !== process.env.ADMIN_READ_KEY) {
    logger.warn('unauthorized admin access attempt');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const messages = [];
    logger.info('admin messages retrieved (demo)', { count: messages.length });
    res.status(200).json({ messages });
  } catch (err) {
    logger.error('failed to load admin messages', { err: err.message });
    res.status(500).json({ error: err.message });
  }
}
