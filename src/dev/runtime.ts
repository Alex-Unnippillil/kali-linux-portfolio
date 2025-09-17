import type { CleanupResult, DevRuntimeOptions } from './types';

export async function initDevRuntime(options: DevRuntimeOptions = {}): Promise<CleanupResult> {
  if (process.env.NODE_ENV !== 'development') {
    return undefined;
  }

  if (typeof window === 'undefined') {
    const { initServerRuntime } = await import('./server');
    return initServerRuntime(options);
  }

  const { initClientRuntime } = await import('./client');
  return initClientRuntime(options);
}
