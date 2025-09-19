import {
  loadSettings,
  resetRemoteState,
  resolveConflictSelection,
  saveSettings,
  type SettingsConflict,
  type SettingsPayload,
} from '../utils/settingsSync';

describe('settingsSync adapter', () => {
  beforeEach(() => {
    resetRemoteState();
  });

  const createLocalUpdate = (
    base: SettingsPayload,
    overrides: Partial<SettingsPayload>,
  ): SettingsPayload => ({
    ...base,
    ...overrides,
  });

  it('detects conflicts and provides merge options', async () => {
    const baseSnapshot = await loadSettings();
    const remoteUpdate = createLocalUpdate(baseSnapshot.data, {
      accent: '#e53e3e',
      wallpaper: 'wall-4',
    });
    await saveSettings(remoteUpdate, {
      strategy: 'last-write-wins',
      baseSnapshot,
    });

    const localUpdate = createLocalUpdate(baseSnapshot.data, {
      accent: '#805ad5',
      theme: 'neon',
    });

    const result = await saveSettings(localUpdate, {
      strategy: 'manual',
      baseSnapshot,
    });

    expect(result.ok).toBe(false);
    const conflict = (result as { ok: false; conflict: SettingsConflict }).conflict;
    expect(conflict.conflictingKeys).toEqual(['accent']);
    const optionIds = conflict.options.map((option) => option.id);
    expect(optionIds).toEqual(
      expect.arrayContaining(['keep-local', 'use-remote', 'merge']),
    );
    const merged = resolveConflictSelection(conflict, 'merge');
    expect(merged.accent).toBe(remoteUpdate.accent);
    expect(merged.theme).toBe('neon');
  });

  it('applies last write wins when requested', async () => {
    const baseSnapshot = await loadSettings();
    const remoteUpdate = createLocalUpdate(baseSnapshot.data, {
      wallpaper: 'wall-3',
    });
    await saveSettings(remoteUpdate, {
      strategy: 'last-write-wins',
      baseSnapshot,
    });

    const staleLocal = createLocalUpdate(baseSnapshot.data, {
      wallpaper: 'wall-1',
    });

    const result = await saveSettings(staleLocal, {
      strategy: 'last-write-wins',
      baseSnapshot,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.overwritten).toBe(true);
    }

    const latest = await loadSettings();
    expect(latest.data.wallpaper).toBe('wall-1');
  });
});
