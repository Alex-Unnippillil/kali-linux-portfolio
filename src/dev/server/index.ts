import type { CleanupResult, DevRuntimeOptions } from '../types';

export async function initServerRuntime(options: DevRuntimeOptions = {}): Promise<CleanupResult> {
  const logger = options.logger ?? console;
  logger.info?.('[dev] Server runtime initialized');
  return () => {
    logger.info?.('[dev] Server runtime cleaned up');
  };
}
