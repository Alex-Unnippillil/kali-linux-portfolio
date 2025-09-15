export function deriveCookies(country?: string) {
  const preferredMirror = country ? country.toLowerCase() : 'global';
  const locale = country ? `en-${country}` : 'en-US';
  return { preferredMirror, locale };
}
