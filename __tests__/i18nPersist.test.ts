import {
  LOCALE_PERSISTENCE_KEY,
  __resetLocalePersistenceForTests,
  clearPersistedLocale,
  getPersistedLocale,
  persistLocale,
  subscribeToLocaleChanges,
} from '@/src/i18n/persist';

const dispatchStorageEvent = (value: string | null) => {
  const event = new StorageEvent('storage', {
    key: LOCALE_PERSISTENCE_KEY,
    newValue: value,
    storageArea: window.localStorage,
  });
  window.dispatchEvent(event);
};

describe('locale persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetLocalePersistenceForTests();
  });

  test('returns fallback locale when nothing stored', () => {
    expect(getPersistedLocale('en-US')).toBe('en-US');
    expect(window.localStorage.getItem(LOCALE_PERSISTENCE_KEY)).toBeNull();
  });

  test('persists and restores the last selected locale', () => {
    persistLocale('fr-CA');
    expect(window.localStorage.getItem(LOCALE_PERSISTENCE_KEY)).toBe('fr-CA');

    // Reset cache to simulate a fresh load
    __resetLocalePersistenceForTests();
    expect(getPersistedLocale('en-US')).toBe('fr-CA');
  });

  test('notifies subscribers when locale changes locally and remotely', () => {
    const updates: string[] = [];
    const unsubscribe = subscribeToLocaleChanges((locale) => {
      updates.push(locale);
    });

    persistLocale('de-DE');
    expect(updates).toEqual(['de-DE']);

    dispatchStorageEvent('it-IT');
    expect(updates).toEqual(['de-DE', 'it-IT']);

    unsubscribe();
  });

  test('falls back to default locale when storage entry is cleared', () => {
    getPersistedLocale('en-US');
    const updates: string[] = [];
    const unsubscribe = subscribeToLocaleChanges((locale) => {
      updates.push(locale);
    });

    dispatchStorageEvent(null);
    expect(updates).toEqual(['en-US']);

    unsubscribe();
    clearPersistedLocale();
    expect(getPersistedLocale('en-US')).toBe('en-US');
  });
});
