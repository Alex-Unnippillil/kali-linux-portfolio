export const CSRF_TOKEN = process.env.NEXT_PUBLIC_CSRF_TOKEN || 'devcsrf';
export const CSRF_HEADER = 'x-csrf-token';

export const verifyCsrf = (req) => {
  const token = req.headers[CSRF_HEADER];
  return typeof token === 'string' && token === CSRF_TOKEN;
};
