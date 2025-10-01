"use client";

import { get, set, update } from 'idb-keyval';
import {
  encodeCacheValue,
  decodeCacheValue,
  type CachePayload,
} from './cacheCompression';

const PROGRESS_KEY = 'progress';
const KEYBINDS_KEY = 'keybinds';
const REPLAYS_KEY = 'replays';

export type ProgressData = Record<string, unknown>;
export type Keybinds = Record<string, string>;
export type Replay = { id: string; data: unknown };

export const getProgress = async (): Promise<ProgressData> => {
  if (typeof window === 'undefined') return {};
  const raw = await get<CachePayload<ProgressData>>(PROGRESS_KEY);
  const decoded = await decodeCacheValue<ProgressData>(raw);
  return decoded ?? {};
};

export const setProgress = async (progress: ProgressData): Promise<void> => {
  if (typeof window === 'undefined') return;
  await set(PROGRESS_KEY, await encodeCacheValue(progress));
};

export const getKeybinds = async (): Promise<Keybinds> => {
  if (typeof window === 'undefined') return {};
  const raw = await get<CachePayload<Keybinds>>(KEYBINDS_KEY);
  const decoded = await decodeCacheValue<Keybinds>(raw);
  return decoded ?? {};
};

export const setKeybinds = async (keybinds: Keybinds): Promise<void> => {
  if (typeof window === 'undefined') return;
  await set(KEYBINDS_KEY, await encodeCacheValue(keybinds));
};

export const getReplays = async (): Promise<Replay[]> => {
  if (typeof window === 'undefined') return [];
  const raw = await get<CachePayload<Replay[]>>(REPLAYS_KEY);
  const decoded = await decodeCacheValue<Replay[]>(raw);
  return decoded ?? [];
};

export const saveReplay = async (replay: Replay): Promise<void> => {
  if (typeof window === 'undefined') return;
  await update<CachePayload<Replay[]>>(REPLAYS_KEY, async (raw) => {
    const current = (await decodeCacheValue<Replay[]>(raw)) ?? [];
    return encodeCacheValue([...current, replay]);
  });
};

export const clearReplays = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  await set(REPLAYS_KEY, await encodeCacheValue([]));
};

const storage = {
  getProgress,
  setProgress,
  getKeybinds,
  setKeybinds,
  getReplays,
  saveReplay,
  clearReplays,
};

export default storage;
