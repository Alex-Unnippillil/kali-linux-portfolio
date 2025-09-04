import { isBrowser } from './isBrowser';

export const openMailto = (
  email: string,
  subject = '',
  body = '',
): void => {
  if (!isBrowser) return;
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const query = params.toString();
  const href = `mailto:${email}${query ? `?${query}` : ''}`;
  globalThis.location.href = href;
};

export default openMailto;
