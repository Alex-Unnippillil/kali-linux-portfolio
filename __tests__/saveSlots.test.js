import 'fake-indexeddb/auto';
// Provide a lightweight structuredClone polyfill for fake-indexeddb
// in environments where it is missing.
// @ts-ignore
if (typeof globalThis.structuredClone !== 'function') {
    // @ts-ignore
    globalThis.structuredClone = (val) => JSON.parse(JSON.stringify(val));
}
import { saveSlot, loadSlot, listSlots, exportSaves, importSaves, } from '../components/apps/Games/common/save';
describe('named save slots', () => {
    test('save and load slots via IndexedDB', async () => {
        await saveSlot('testGame', { name: 'slot1', data: { level: 1 } });
        await saveSlot('testGame', { name: 'slot2', data: { level: 2 } });
        const slots = await listSlots('testGame');
        expect(slots.sort()).toEqual(['slot1', 'slot2']);
        const loaded = await loadSlot('testGame', 'slot2');
        expect(loaded).toEqual({ level: 2 });
    });
    test('export and import saves as JSON', async () => {
        await saveSlot('exportGame', { name: 'a', data: { score: 10 } });
        const exported = await exportSaves('exportGame');
        await importSaves('importGame', exported);
        const importedSlots = await listSlots('importGame');
        expect(importedSlots).toEqual(['a']);
        const data = await loadSlot('importGame', 'a');
        expect(data).toEqual({ score: 10 });
    });
});
