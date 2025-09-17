export const kioskSessionCookieName = 'kiosk-session';

export const kioskAllowedRoutes = [
  { path: '/', label: 'Return to desktop' },
  { path: '/apps', label: 'Open app grid' },
  { path: '/profile', label: 'View profile timeline' },
  { path: '/daily-quote', label: 'Daily quote' },
  { path: '/video-gallery', label: 'Video gallery' },
  { path: '/kiosk-blocked', label: 'Kiosk notice' },
] as const;

export const kioskAllowedApps = [
  { slug: 'project-gallery', title: 'Project Gallery' },
  { slug: 'weather', title: 'Weather Center' },
  { slug: 'weather_widget', title: 'Weather Widget' },
  { slug: 'quote', title: 'Quote of the Day' },
  { slug: 'contact', title: 'Contact' },
] as const;

const kioskRouteAllowSet = new Set(kioskAllowedRoutes.map((route) => route.path));
const kioskAllowedAppSlugs = new Set(kioskAllowedApps.map((app) => app.slug));

export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }
  const normalized = pathname.replace(/\/+$/, '');
  return normalized === '' ? '/' : normalized;
}

export function isKioskRouteAllowed(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  if (kioskRouteAllowSet.has(normalized)) {
    return true;
  }
  if (normalized.startsWith('/apps/')) {
    const slug = normalized.slice('/apps/'.length);
    return kioskAllowedAppSlugs.has(slug);
  }
  return false;
}

export function kioskAppLabel(slug: string): string | null {
  const match = kioskAllowedApps.find((app) => app.slug === slug);
  return match ? match.title : null;
}
