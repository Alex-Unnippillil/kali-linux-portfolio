import type { ComponentType } from 'react';

export type AppHelpComponent = ComponentType<{ onClose: () => void }>;

type Loader = () => Promise<{ default: AppHelpComponent }>;

const HELP_LOADERS: Record<string, Loader> = {
  chrome: () => import('../chrome/Help'),
  quote: () => import('../quote/Help'),
  trash: () => import('../trash/Help'),
  youtube: () => import('../youtube/Help'),
};

const cache = new Map<string, AppHelpComponent>();

export const hasAppHelp = (id?: string | null): id is string =>
  !!id && Object.prototype.hasOwnProperty.call(HELP_LOADERS, id);

export const loadAppHelp = async (id: string): Promise<AppHelpComponent> => {
  if (!hasAppHelp(id)) {
    throw new Error(`No help registered for app: ${id}`);
  }
  if (cache.has(id)) {
    return cache.get(id)!;
  }
  const mod = await HELP_LOADERS[id]();
  cache.set(id, mod.default);
  return mod.default;
};
