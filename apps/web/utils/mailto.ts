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
  window.location.href = href;
};

export default openMailto;
