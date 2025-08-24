import type { NextApiRequest, NextApiResponse } from 'next';
import {
import { setupUrlGuard } from '../../lib/urlGuard';
setupUrlGuard();
  UserInputError,
  UpstreamError,
  withErrorHandler,
  fail,
} from '../../lib/errors';

export default withErrorHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    fail(res, 405, 'method_not_allowed', 'Method not allowed');
    return;
  }

  const { method = 'GET', url, headers = {}, body } = req.body || {};

  if (!url || typeof url !== 'string') {
    throw new UserInputError('Missing url');
  }

  const response = await fetch(url, {
    method,
    headers,
    body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? undefined : body,
  });

  const text = await response.text();
  const headersObj: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headersObj[key] = value;
  });

  if (!response.ok) {
    throw new UpstreamError(response.statusText || 'Request failed');
  }

  return res.status(200).json({
    status: response.status,
    statusText: response.statusText,
    headers: headersObj,
    body: text,
  });
});
