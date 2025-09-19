import 'fake-indexeddb/auto';

// Provide a lightweight structuredClone polyfill for fake-indexeddb
// in environments where it is missing.
// @ts-ignore
if (typeof globalThis.structuredClone !== 'function') {
  // @ts-ignore
  globalThis.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}

import { renderHook, act } from '@testing-library/react';
import useGameSaves from '@/components/apps/Games/common/save';

describe('named save slots', () => {
  test('save and load slots via IndexedDB', async () => {
    const { result } = renderHook(() => useGameSaves('testGame'));
    await act(async () => {
      await result.current.saveSlot({ name: 'slot1', data: { level: 1 } });
      await result.current.saveSlot({ name: 'slot2', data: { level: 2 } });
    });
    const slots = await result.current.listSlots();
    expect(slots.sort()).toEqual(['slot1', 'slot2']);
    const loaded = await result.current.loadSlot<{ level: number }>('slot2');
    expect(loaded).toEqual({ level: 2 });
  });

  test('export and import saves as JSON', async () => {
    const { result: exportHook } = renderHook(() => useGameSaves('exportGame'));
    await act(async () => {
      await exportHook.current.saveSlot({ name: 'a', data: { score: 10 } });
    });
    const exported = await exportHook.current.exportSaves();
    const { result: importHook } = renderHook(() => useGameSaves('importGame'));
    await act(async () => {
      await importHook.current.importSaves(exported);
    });
    const importedSlots = await importHook.current.listSlots();
    expect(importedSlots).toEqual(['a']);
    const data = await importHook.current.loadSlot<{ score: number }>('a');
    expect(data).toEqual({ score: 10 });
  });
});

