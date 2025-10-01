"use client";

import { get, set, update } from 'idb-keyval';
import { requestQuotaCheck } from './quota';

const PROGRESS_KEY = 'progress';
const KEYBINDS_KEY = 'keybinds';
const REPLAYS_KEY = 'replays';

export type ProgressData = Record<string, unknown>;
export type Keybinds = Record<string, string>;
export type Replay = { id: string; data: unknown };

export const getProgress = async (): Promise<ProgressData> =>
  (typeof window === 'undefined'
    ? {}
    : (await get<ProgressData>(PROGRESS_KEY)) || {});

export const setProgress = async (progress: ProgressData): Promise<void> => {
  if (typeof window === 'undefined') return;
  await set(PROGRESS_KEY, progress);
  requestQuotaCheck();
};

export const getKeybinds = async (): Promise<Keybinds> =>
  (typeof window === 'undefined'
    ? {}
    : (await get<Keybinds>(KEYBINDS_KEY)) || {});

export const setKeybinds = async (keybinds: Keybinds): Promise<void> => {
  if (typeof window === 'undefined') return;
  await set(KEYBINDS_KEY, keybinds);
  requestQuotaCheck();
};

export const getReplays = async (): Promise<Replay[]> =>
  (typeof window === 'undefined'
    ? []
    : (await get<Replay[]>(REPLAYS_KEY)) || []);

export const saveReplay = async (replay: Replay): Promise<void> => {
  if (typeof window === 'undefined') return;
  await update<Replay[]>(REPLAYS_KEY, (replays = []) => [...replays, replay]);
  requestQuotaCheck();
};

export const clearReplays = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  await set(REPLAYS_KEY, []);
  requestQuotaCheck();
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
