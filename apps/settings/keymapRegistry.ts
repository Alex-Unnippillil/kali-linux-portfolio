import { useCallback, useEffect, useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import {
  SHORTCUT_DEFINITIONS,
  SHORTCUT_STORAGE_KEY,
  createDefaultShortcutMap,
  detectConflicts,
  normalizeBinding,
  resolveShortcuts,
  shortcutMapValidator,
  upgradeShortcutMap,
} from '@/src/system/shortcuts';

export function useKeymap() {
  const [map, setMap] = usePersistentState(
    SHORTCUT_STORAGE_KEY,
    () => createDefaultShortcutMap(),
    shortcutMapValidator
  );

  useEffect(() => {
    const upgraded = upgradeShortcutMap(map, SHORTCUT_DEFINITIONS);
    if (upgraded !== map) {
      setMap(upgraded);
    }
  }, [map, setMap]);

  const resolved = useMemo(
    () => resolveShortcuts(map, SHORTCUT_DEFINITIONS),
    [map]
  );
  const conflicts = useMemo(() => detectConflicts(resolved), [resolved]);

  const shortcuts = useMemo(
    () =>
      resolved.map((shortcut) => ({
        ...shortcut,
        conflict: shortcut.conflictsWith.length > 0,
      })),
    [resolved]
  );

  const updateShortcut = useCallback(
    (id: string, keys: string) => {
      const normalized = normalizeBinding(keys);
      setMap((prev) => ({
        ...prev,
        [id]: normalized,
      }));
    },
    [setMap]
  );

  const resetShortcut = useCallback(
    (id: string) => {
      setMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [setMap]
  );

  const restoreDefaults = useCallback(() => {
    setMap(createDefaultShortcutMap(SHORTCUT_DEFINITIONS));
  }, [setMap]);

  return {
    shortcuts,
    updateShortcut,
    resetShortcut,
    restoreDefaults,
    conflicts,
  };
}

export type ShortcutEntry = ReturnType<typeof useKeymap>['shortcuts'][number];

export default useKeymap;
