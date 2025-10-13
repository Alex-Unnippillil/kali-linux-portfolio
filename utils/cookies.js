export function formatCookie(name, value, options = {}) {
  const segments = [`${name}=${value}`];

  if (options.httpOnly) {
    segments.push('HttpOnly');
  }

  if (options.path) {
    segments.push(`Path=${options.path}`);
  }

  if (options.sameSite) {
    segments.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    segments.push('Secure');
  }

  return segments.join('; ');
}
