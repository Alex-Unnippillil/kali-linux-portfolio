import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

export class UserInputError extends Error {
  code = 'user_input';
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'UserInputError';
  }
}

export class UpstreamError extends Error {
  code = 'upstream';
  status = 502;
  constructor(message: string) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export class TimeoutError extends Error {
  code = 'timeout';
  status = 504;
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class RateLimitError extends Error {
  code = 'rate_limit';
  status = 429;
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export interface ErrorResponse {
  ok: false;
  code: string;
  message: string;
}

export const toErrorResponse = (err: any): ErrorResponse => ({
  ok: false,
  code: err?.code || 'error',
  message: err?.message || 'Unknown error',
});

export const handleApiError = (res: NextApiResponse, err: any): void => {
  const status = typeof err?.status === 'number' ? err.status : 500;
  res.status(status).json(toErrorResponse(err));
};

export const withErrorHandler = (handler: NextApiHandler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (err) {
      handleApiError(res, err);
    }
  };
};

export const fail = (
  res: NextApiResponse,
  status: number,
  code: string,
  message: string
): void => {
  res.status(status).json({ ok: false, code, message });
};
