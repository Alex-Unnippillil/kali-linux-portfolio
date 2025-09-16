'use server';

import { revalidateTag } from 'next/cache';

import {
  readDockConfig,
  resolveDockConfig,
  writeDockConfig,
  type DockConfig,
  type DockConfigUpdate,
} from '../lib/dockConfig';

export type { DockConfig, DockConfigUpdate } from '../lib/dockConfig';

export async function updateDockConfig(update: DockConfigUpdate): Promise<DockConfig> {
  const current = await readDockConfig();
  const next = resolveDockConfig(current, update, { strict: true });
  const persisted = await writeDockConfig(next);
  await revalidateTag('dock');
  return persisted;
}
