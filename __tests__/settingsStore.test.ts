import { clear, get as idbGet } from 'idb-keyval';
import {
  getDensity,
  getReducedMotion,
  setReducedMotion,
} from '../utils/settingsStore';

describe('settingsStore persistence', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await clear();
  });

  test('migrates density from localStorage into IndexedDB', async () => {
    window.localStorage.setItem('density', 'compact');
    const density = await getDensity();
    expect(density).toBe('compact');
    await expect(idbGet('density')).resolves.toBe('compact');
  });

  test('falls back to localStorage when IndexedDB is unavailable', async () => {
    const originalIndexedDB = global.indexedDB;
    // @ts-ignore
    global.indexedDB = undefined;

    try {
      await setReducedMotion(true);
      expect(window.localStorage.getItem('reduced-motion')).toBe('true');
      await expect(getReducedMotion()).resolves.toBe(true);
    } finally {
      if (originalIndexedDB !== undefined) {
        // @ts-ignore
        global.indexedDB = originalIndexedDB;
      } else {
        // @ts-ignore
        delete global.indexedDB;
      }
    }
  });
});
