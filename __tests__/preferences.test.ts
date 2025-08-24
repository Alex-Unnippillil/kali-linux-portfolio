import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  exportPreferences,
  importPreferences,
  loadPreferences,
  resetPreferences,
  savePreferences,
  subscribe,
  defaultPreferences,
} from '../lib/preferences';

afterEach(() => {
  localStorage.clear();
});

describe('preferences helpers', () => {
  it('exports and imports settings JSON', () => {
    savePreferences({ ...defaultPreferences, theme: 'dark', units: 'imperial', language: 'fr-FR', dataSaving: true });
    const json = exportPreferences();
    resetPreferences();
    expect(loadPreferences()).toEqual(defaultPreferences);
    importPreferences(json);
    expect(loadPreferences()).toEqual({
      theme: 'dark',
      units: 'imperial',
      language: 'fr-FR',
      dataSaving: true,
    });
  });

  it('notifies subscribers on changes', () => {
    const cb = jest.fn();
    const unsub = subscribe(cb);
    const prefs = { ...defaultPreferences, theme: 'dark' };
    savePreferences(prefs);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'app-preferences',
        newValue: JSON.stringify(prefs),
      })
    );
    expect(cb).toHaveBeenCalledWith(prefs);
    unsub();
  });
});
