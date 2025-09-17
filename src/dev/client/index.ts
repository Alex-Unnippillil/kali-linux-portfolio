import type { CleanupResult, DevLogger, DevRuntimeOptions } from '../types';

function pushCleanup(cleanups: Array<() => void | Promise<void>>, cleanup?: CleanupResult) {
  if (typeof cleanup === 'function') {
    cleanups.push(cleanup);
  }
}

async function runCleanup(cleanup: () => void | Promise<void>, logger: DevLogger) {
  try {
    await cleanup();
  } catch (error) {
    logger.error?.('[dev] Cleanup failed', error);
  }
}

export async function initClientRuntime(options: DevRuntimeOptions = {}): Promise<CleanupResult> {
  const logger = options.logger ?? console;
  const cleanups: Array<() => void | Promise<void>> = [];

  try {
    const { exposeDevHelpers } = await import('./window-helpers');
    pushCleanup(cleanups, exposeDevHelpers(logger));
  } catch (error) {
    logger.warn?.('[dev] Failed to expose helper API', error);
  }

  try {
    const { installDebugHotkeys } = await import('./hotkeys');
    pushCleanup(cleanups, installDebugHotkeys(logger));
  } catch (error) {
    logger.warn?.('[dev] Failed to install dev hotkeys', error);
  }

  try {
    const { registerToolbar } = await import('./toolbar');
    pushCleanup(cleanups, await registerToolbar({ nonce: options.nonce, logger }));
  } catch (error) {
    logger.warn?.('[dev] Failed to initialize Vercel toolbar', error);
  }

  if (cleanups.length === 0) {
    return undefined;
  }

  return () => Promise.all(cleanups.map((cleanup) => runCleanup(cleanup, logger))).then(() => undefined);
}
