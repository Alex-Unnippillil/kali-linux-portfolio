import type { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler, UserInputError, UpstreamError } from '../../lib/errors';
import { setupUrlGuard } from '../../lib/urlGuard';

setupUrlGuard();

export default withErrorHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    throw new UserInputError('Method not allowed');
  }

  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    throw new UserInputError('Missing url');
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new UpstreamError(`HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  const mime = response.headers.get('content-type') || 'application/octet-stream';

  res.status(200).json({
    ok: true,
    base64,
    size: buffer.length,
    mime,
  });
});
