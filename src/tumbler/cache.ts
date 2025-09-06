import os from 'os';
import path from 'path';

/**
 * Resolve the directory used for caching generated thumbnails.
 * Uses the XDG_CACHE_HOME environment variable if provided, falling back
 * to the standard ~/.cache location.
 */
export function getCacheDir(): string {
  const base = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  return path.join(base, 'tumbler');
}

