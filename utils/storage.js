import { get, set, update } from 'idb-keyval';
const PROGRESS_KEY = 'progress';
const KEYBINDS_KEY = 'keybinds';
const REPLAYS_KEY = 'replays';
export const getProgress = async () => (await get(PROGRESS_KEY)) || {};
export const setProgress = async (progress) => {
    await set(PROGRESS_KEY, progress);
};
export const getKeybinds = async () => (await get(KEYBINDS_KEY)) || {};
export const setKeybinds = async (keybinds) => {
    await set(KEYBINDS_KEY, keybinds);
};
export const getReplays = async () => (await get(REPLAYS_KEY)) || [];
export const saveReplay = async (replay) => {
    await update(REPLAYS_KEY, (replays = []) => [...replays, replay]);
};
export const clearReplays = async () => {
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
