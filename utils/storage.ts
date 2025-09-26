"use client";

import { get, set, update } from 'idb-keyval';

const PROGRESS_KEY = 'progress';
const KEYBINDS_KEY = 'keybinds';
const REPLAYS_KEY = 'replays';

export type ProgressData = Record<string, unknown>;
export type Keybinds = Record<string, string>;
export type Replay = { id: string; data: unknown };

const canUsePersistentStorage = (): boolean => typeof indexedDB !== 'undefined';

export const getProgress = async (): Promise<ProgressData> =>
  (canUsePersistentStorage()
    ? (await get<ProgressData>(PROGRESS_KEY)) || {}
    : {});

export const setProgress = async (progress: ProgressData): Promise<void> => {
  if (!canUsePersistentStorage()) return;
  await set(PROGRESS_KEY, progress);
};

export const getKeybinds = async (): Promise<Keybinds> =>
  (canUsePersistentStorage()
    ? (await get<Keybinds>(KEYBINDS_KEY)) || {}
    : {});

export const setKeybinds = async (keybinds: Keybinds): Promise<void> => {
  if (!canUsePersistentStorage()) return;
  await set(KEYBINDS_KEY, keybinds);
};

export const getReplays = async (): Promise<Replay[]> =>
  (canUsePersistentStorage()
    ? (await get<Replay[]>(REPLAYS_KEY)) || []
    : []);

export const saveReplay = async (replay: Replay): Promise<void> => {
  if (!canUsePersistentStorage()) return;
  await update<Replay[]>(REPLAYS_KEY, (replays = []) => [...replays, replay]);
};

export const clearReplays = async (): Promise<void> => {
  if (!canUsePersistentStorage()) return;
  await set(REPLAYS_KEY, []);
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
