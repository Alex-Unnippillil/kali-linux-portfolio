const DEFAULT_PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=()';

const PERMISSIONS_POLICY_OVERRIDES = [
  {
    id: 'qr-scanner-camera',
    description: 'Allow camera access for the QR code scanner demo.',
    policy: 'camera=(self), microphone=(), geolocation=()',
    matcher: /^\/apps\/qr(?:\/|$)/,
    source: '/apps/qr/:path*',
  },
];

function normalizePathname(pathname) {
  if (!pathname) return '/';
  const [rawPath] = pathname.split('?');
  if (!rawPath) return '/';
  if (rawPath === '/') return rawPath;
  return rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;
}

function getPermissionsPolicy(pathname) {
  const normalized = normalizePathname(pathname);
  const override = PERMISSIONS_POLICY_OVERRIDES.find(({ matcher }) => matcher.test(normalized));
  return override ? override.policy : DEFAULT_PERMISSIONS_POLICY;
}

module.exports = {
  DEFAULT_PERMISSIONS_POLICY,
  PERMISSIONS_POLICY_OVERRIDES,
  getPermissionsPolicy,
  normalizePathname,
};
