export function formatCookie(name, value, attributes = {}) {
  const segments = [`${name}=${value}`];

  if (attributes.httpOnly) {
    segments.push('HttpOnly');
  }

  if (attributes.maxAge !== undefined) {
    segments.push(`Max-Age=${attributes.maxAge}`);
  }

  if (attributes.expires) {
    const expiresValue =
      attributes.expires instanceof Date
        ? attributes.expires.toUTCString()
        : attributes.expires;
    segments.push(`Expires=${expiresValue}`);
  }

  if (attributes.domain) {
    segments.push(`Domain=${attributes.domain}`);
  }

  if (attributes.path) {
    segments.push(`Path=${attributes.path}`);
  }

  if (attributes.sameSite) {
    segments.push(`SameSite=${attributes.sameSite}`);
  }

  if (attributes.secure) {
    segments.push('Secure');
  }

  return segments.join('; ');
}
