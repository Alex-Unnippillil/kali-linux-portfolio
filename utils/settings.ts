export interface GlobalSettings {
  sound: boolean;
  haptics: boolean;
  colorblind: boolean;
}

export const defaults: GlobalSettings = {
  sound: true,
  haptics: true,
  colorblind: false,
};

let state: GlobalSettings = { ...defaults };

try {
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('global-settings');
    if (raw) state = { ...state, ...JSON.parse(raw) };
  }
} catch {
  /* ignore */
}

type Listener = (s: GlobalSettings) => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l(state));
}

function persist() {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('global-settings', JSON.stringify(state));
    }
  } catch {
    // ignore write errors
  }
}

export function getSettings(): GlobalSettings {
  return state;
}

export function setSettings(partial: Partial<GlobalSettings>): void {
  state = { ...state, ...partial };
  persist();
  notify();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSound = () => state.sound;
export const setSound = (v: boolean) => setSettings({ sound: v });
export const getHaptics = () => state.haptics;
export const setHaptics = (v: boolean) => setSettings({ haptics: v });
export const getColorblind = () => state.colorblind;
export const setColorblind = (v: boolean) => setSettings({ colorblind: v });

export default {
  getSettings,
  setSettings,
  subscribe,
  getSound,
  setSound,
  getHaptics,
  setHaptics,
  getColorblind,
  setColorblind,
  defaults,
};
