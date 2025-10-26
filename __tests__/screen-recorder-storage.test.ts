import 'fake-indexeddb/auto';

import {
    clearRecordings,
    deleteRecording,
    listRecordings,
    renameRecording,
    saveRecording,
} from '../components/apps/screen-recorder-storage';

describe('screen recorder persistence', () => {
    beforeEach(async () => {
        await clearRecordings();
    });

    test('saves recordings with metadata and lists newest first', async () => {
        const first = await saveRecording(new Blob(['first']), 5000);
        await new Promise((resolve) => setTimeout(resolve, 5));
        const second = await saveRecording(new Blob(['second recording']), 2000);

        const items = await listRecordings();
        expect(items).toHaveLength(2);
        expect(items[0].id).toBe(second.id);
        expect(items[0].durationMs).toBe(2000);
        expect(items[0].size).toBeGreaterThan(0);
        expect(items[1].id).toBe(first.id);
        expect(items[1].durationMs).toBe(5000);
    });

    test('renames stored recordings', async () => {
        const saved = await saveRecording(new Blob(['rename-me']), 1000);
        const renamed = await renameRecording(saved.id, 'Custom name');
        expect(renamed).not.toBeNull();
        expect(renamed?.name).toBe('Custom name');

        const [item] = await listRecordings();
        expect(item.name).toBe('Custom name');
    });

    test('deletes recordings individually and clears all', async () => {
        const savedOne = await saveRecording(new Blob(['a']), 100);
        const savedTwo = await saveRecording(new Blob(['b']), 200);

        await deleteRecording(savedOne.id);
        let items = await listRecordings();
        expect(items).toHaveLength(1);
        expect(items[0].id).toBe(savedTwo.id);

        await clearRecordings();
        items = await listRecordings();
        expect(items).toHaveLength(0);
    });
});
