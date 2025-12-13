const normalizeBasePath = (value?: string | null): string => {
  if (!value) return '';
  let candidate = value.trim();

  try {
    const url = new URL(candidate);
    candidate = url.pathname || '';
  } catch (e) {
    // not a full URL; use raw string
  }

  if (candidate === '/') return '';

  candidate = candidate.replace(/\s+/g, '');
  candidate = candidate.replace(/\/$/, '');
  if (!candidate) return '';

  return candidate.startsWith('/') ? candidate : `/${candidate}`;
};

const getBasePath = (): string => {
  if (typeof window !== 'undefined') {
    const assetPrefix = (window as any).__NEXT_DATA__?.assetPrefix as
      | string
      | undefined
      | null;
    const normalized = normalizeBasePath(assetPrefix);
    if (normalized) return normalized;
  }

  return normalizeBasePath(
    process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH ?? '',
  );
};

export const assetUrl = (path: string): string => {
  const basePath = getBasePath();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!basePath) return normalizedPath;

  return `${basePath}${normalizedPath}`;
};

export default assetUrl;
