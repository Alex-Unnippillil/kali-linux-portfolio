import {
  addTagToFile,
  clearProfileMetadata,
  getMetadataSnapshot,
} from '../modules/filesystem/metadata';
import {
  createSavedSearch,
  subscribeToSavedSearches,
  clearSavedSearches,
  evaluateSavedSearch,
} from '../utils/files/savedSearches';

const PROFILE_ID = 'saved-search-test';

describe('saved search definitions', () => {
  beforeEach(async () => {
    await clearProfileMetadata(PROFILE_ID);
    await clearSavedSearches(PROFILE_ID);
  });

  afterEach(async () => {
    await clearProfileMetadata(PROFILE_ID);
    await clearSavedSearches(PROFILE_ID);
  });

  it('updates smart folder results when metadata changes', async () => {
    const observations: number[] = [];
    const unsubscribe = subscribeToSavedSearches(PROFILE_ID, (searches) => {
      const smartFolder = searches.find((search) => search.name === 'Logs');
      if (smartFolder) observations.push(smartFolder.results.length);
    });

    await addTagToFile(PROFILE_ID, { path: '/archive/log1.txt', name: 'log1.txt' }, 'logs');
    await addTagToFile(PROFILE_ID, { path: '/archive/log2.txt', name: 'log2.txt' }, 'logs');
    await createSavedSearch(PROFILE_ID, { name: 'Logs', tags: ['logs'] });
    await addTagToFile(PROFILE_ID, { path: '/archive/log3.txt', name: 'log3.txt' }, 'logs');
    await new Promise((resolve) => setTimeout(resolve, 0));

    const metadata = await getMetadataSnapshot(PROFILE_ID);
    const latest = metadata.tagIndex.logs || [];
    expect(latest.sort()).toEqual([
      '/archive/log1.txt',
      '/archive/log2.txt',
      '/archive/log3.txt',
    ]);

    expect(observations.some((count) => count === 3)).toBe(true);

    unsubscribe();
  });

  it('evaluates saved searches using the smallest candidate set', async () => {
    for (let i = 0; i < 100; i += 1) {
      await addTagToFile(PROFILE_ID, { path: `/bulk/file-${i}.txt`, name: `file-${i}.txt` }, 'heavy');
    }
    for (let i = 0; i < 5; i += 1) {
      await addTagToFile(PROFILE_ID, { path: `/focus/file-${i}.txt`, name: `focus-${i}.txt` }, 'heavy');
      await addTagToFile(PROFILE_ID, { path: `/focus/file-${i}.txt`, name: `focus-${i}.txt` }, 'narrow');
    }

    const metadata = await getMetadataSnapshot(PROFILE_ID);
    const definition = {
      id: 'combo',
      name: 'Combo',
      tags: ['heavy', 'narrow'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const { stats, results } = evaluateSavedSearch(definition, metadata, {
      collectStats: true,
    });

    expect(stats?.scanned).toBeLessThanOrEqual(5);
    expect(results.map((file) => file.path).sort()).toEqual([
      '/focus/file-0.txt',
      '/focus/file-1.txt',
      '/focus/file-2.txt',
      '/focus/file-3.txt',
      '/focus/file-4.txt',
    ]);
  });
});

