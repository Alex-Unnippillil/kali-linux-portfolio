import { openLink } from '../modules/system/linkHandler';

export const openMailto = (
  email: string,
  subject = '',
  body = '',
): void => {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const query = params.toString();
  const href = `mailto:${email}${query ? `?${query}` : ''}`;
  if (typeof window === 'undefined') return;
  void openLink({
    url: href,
    allowPrompt: true,
    payload: { email, subject, body },
  });
};

export default openMailto;
