import { get, set, update } from 'idb-keyval';

const PROGRESS_KEY = 'progress';
const KEYBINDS_KEY = 'keybinds';
const REPLAYS_KEY = 'replays';

export type ProgressData = Record<string, unknown>;
export type Keybinds = Record<string, string>;
export type Replay = { id: string; data: unknown };

export const getProgress = async (): Promise<ProgressData> =>
  (await get<ProgressData>(PROGRESS_KEY)) || {};

export const setProgress = async (progress: ProgressData): Promise<void> => {
  await set(PROGRESS_KEY, progress);
};

export const getKeybinds = async (): Promise<Keybinds> =>
  (await get<Keybinds>(KEYBINDS_KEY)) || {};

export const setKeybinds = async (keybinds: Keybinds): Promise<void> => {
  await set(KEYBINDS_KEY, keybinds);
};

export const getReplays = async (): Promise<Replay[]> =>
  (await get<Replay[]>(REPLAYS_KEY)) || [];

export const saveReplay = async (replay: Replay): Promise<void> => {
  await update<Replay[]>(REPLAYS_KEY, (replays = []) => [...replays, replay]);
};

export const clearReplays = async (): Promise<void> => {
  await set(REPLAYS_KEY, []);
};

export default {
  getProgress,
  setProgress,
  getKeybinds,
  setKeybinds,
  getReplays,
  saveReplay,
  clearReplays,
};
