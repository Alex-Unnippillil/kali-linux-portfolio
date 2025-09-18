const DENSITY_KEY = 'display:density';
const DENSITY_LOCK_KEY = 'display:density-lock';

export type DensityPreference = 'regular' | 'compact';
export type DensityLock = 'auto' | 'touch';

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const normalizeDensity = (value: string | null | undefined): DensityPreference => {
  return value === 'compact' ? 'compact' : 'regular';
};

const normalizeLock = (value: string | null | undefined): DensityLock => {
  return value === 'touch' ? 'touch' : 'auto';
};

export async function getDensityPreference(): Promise<DensityPreference> {
  if (!isBrowser()) return 'regular';
  const stored = window.localStorage.getItem(DENSITY_KEY) ?? window.localStorage.getItem('density');
  return normalizeDensity(stored);
}

export async function setDensityPreference(value: DensityPreference) {
  if (!isBrowser()) return;
  window.localStorage.setItem(DENSITY_KEY, value);
  // Maintain compatibility with older settings storage
  window.localStorage.setItem('density', value);
}

export async function getDensityLock(): Promise<DensityLock> {
  if (!isBrowser()) return 'auto';
  const stored = window.localStorage.getItem(DENSITY_LOCK_KEY);
  return normalizeLock(stored);
}

export async function setDensityLock(value: DensityLock) {
  if (!isBrowser()) return;
  if (value === 'auto') {
    window.localStorage.removeItem(DENSITY_LOCK_KEY);
  } else {
    window.localStorage.setItem(DENSITY_LOCK_KEY, value);
  }
}

export const displayDefaults: { density: DensityPreference; lock: DensityLock } = {
  density: 'regular',
  lock: 'auto',
};
