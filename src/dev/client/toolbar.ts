import type { DevLogger, CleanupResult } from '../types';

interface ToolbarOptions {
  nonce?: string;
  logger?: DevLogger;
}

function hasToolbarConfiguration() {
  if (typeof process === 'undefined') {
    return false;
  }

  const ownerId = process.env.NEXT_PUBLIC_VERCEL_TOOLBAR_OWNER_ID;
  const projectId = process.env.NEXT_PUBLIC_VERCEL_TOOLBAR_PROJECT_ID;
  const deploymentId =
    process.env.NEXT_PUBLIC_VERCEL_TOOLBAR_DEPLOYMENT_ID || process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID;

  return Boolean((ownerId && projectId) || deploymentId);
}

export async function registerToolbar(options: ToolbarOptions = {}): Promise<CleanupResult> {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const logger = options.logger ?? console;

  if (!hasToolbarConfiguration()) {
    logger.debug?.('[dev] Skipping Vercel toolbar: configuration not provided');
    return undefined;
  }

  const { mountVercelToolbar, unmountVercelToolbar, isVercelToolbarMounted } = await import('@vercel/toolbar');

  if (isVercelToolbarMounted()) {
    logger.debug?.('[dev] Vercel toolbar already mounted');
    return () => {
      if (isVercelToolbarMounted()) {
        unmountVercelToolbar();
      }
    };
  }

  mountVercelToolbar({ nonce: options.nonce });
  logger.info?.('[dev] Mounted Vercel toolbar');

  return () => {
    if (isVercelToolbarMounted()) {
      unmountVercelToolbar();
      logger.info?.('[dev] Unmounted Vercel toolbar');
    }
  };
}
