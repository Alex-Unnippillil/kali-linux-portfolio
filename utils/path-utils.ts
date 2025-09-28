export type DisplayPathBase = '~' | '/';

export interface DisplayPathInfo {
  base: DisplayPathBase;
  segments: string[];
}

function normalizeInput(input?: string | null): string {
  if (!input) return '';
  return String(input).trim().replace(/\\/g, '/');
}

export function normalizeDisplayPath(input?: string | null): string {
  const value = normalizeInput(input);
  if (!value || value === '~') {
    return '~';
  }
  if (value === '/') {
    return '/';
  }
  if (value.startsWith('~/')) {
    const rest = value.slice(2).replace(/^\/+/, '');
    return rest ? `~/${rest}` : '~';
  }
  const stripped = value.replace(/^\/+/, '');
  if (!stripped) {
    return '/';
  }
  const parts = stripped.split('/').filter(Boolean);
  if (parts.length >= 2 && parts[0] === 'home' && parts[1] === 'kali') {
    const rest = parts.slice(2);
    return rest.length ? `~/${rest.join('/')}` : '~';
  }
  return `/${parts.join('/')}`;
}

export function parseDisplayPath(input?: string | null): DisplayPathInfo {
  const normalized = normalizeDisplayPath(input);
  if (normalized === '~') {
    return { base: '~', segments: [] };
  }
  if (normalized === '/') {
    return { base: '/', segments: [] };
  }
  if (normalized.startsWith('~/')) {
    return {
      base: '~',
      segments: normalized
        .slice(2)
        .split('/')
        .filter(Boolean),
    };
  }
  if (normalized.startsWith('/')) {
    return {
      base: '/',
      segments: normalized
        .slice(1)
        .split('/')
        .filter(Boolean),
    };
  }
  return { base: '~', segments: [] };
}

export function formatDisplayPath(info: DisplayPathInfo): string {
  if (info.segments.length === 0) {
    return info.base;
  }
  if (info.base === '~') {
    return `~/${info.segments.join('/')}`;
  }
  return `/${info.segments.join('/')}`;
}

export function toDisplayPath(input?: string | null): string {
  return formatDisplayPath(parseDisplayPath(input));
}

export function appendPathSegment(
  info: DisplayPathInfo,
  segment: string,
): DisplayPathInfo {
  const clean = normalizeInput(segment).replace(/[\\/]/g, '');
  if (!clean) {
    return info;
  }
  return {
    base: info.base,
    segments: [...info.segments, clean],
  };
}

export function sliceDisplayPath(
  info: DisplayPathInfo,
  depth: number,
): DisplayPathInfo {
  const safeDepth = Math.max(0, Math.min(depth, info.segments.length));
  return {
    base: info.base,
    segments: info.segments.slice(0, safeDepth),
  };
}
