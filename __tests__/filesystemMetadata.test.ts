import {
  addTagToFile,
  removeTagFromFile,
  getMetadataSnapshot,
  subscribeToMetadata,
  listFilesForTag,
  clearProfileMetadata,
} from '../modules/filesystem/metadata';

const PROFILE_ID = 'metadata-test-profile';

describe('filesystem metadata tag sync', () => {
  beforeEach(async () => {
    await clearProfileMetadata(PROFILE_ID);
  });

  afterEach(async () => {
    await clearProfileMetadata(PROFILE_ID);
  });

  it('persists tags and notifies subscribers with the latest state', async () => {
    const updates: string[][] = [];
    const unsubscribe = subscribeToMetadata(PROFILE_ID, (metadata) => {
      const tags = metadata.files['/docs/report.txt']?.tags ?? [];
      updates.push(tags);
    });

    await addTagToFile(PROFILE_ID, { path: '/docs/report.txt', name: 'report.txt' }, 'project');
    await addTagToFile(PROFILE_ID, { path: '/docs/report.txt', name: 'report.txt' }, 'security');
    await removeTagFromFile(PROFILE_ID, '/docs/report.txt', 'project');

    const snapshot = await getMetadataSnapshot(PROFILE_ID);
    expect(snapshot.files['/docs/report.txt'].tags).toEqual(['security']);

    const taggedFiles = await listFilesForTag(PROFILE_ID, 'security');
    expect(taggedFiles.map((file) => file.path)).toEqual(['/docs/report.txt']);

    expect(updates.length).toBeGreaterThanOrEqual(1);
    expect(updates[updates.length - 1]).toEqual(['security']);

    unsubscribe();
  });

  it('isolates metadata by profile identifier', async () => {
    await addTagToFile(PROFILE_ID, { path: '/notes/todo.txt', name: 'todo.txt' }, 'work');
    await addTagToFile('other-profile', { path: '/notes/todo.txt', name: 'todo.txt' }, 'personal');

    const first = await getMetadataSnapshot(PROFILE_ID);
    const second = await getMetadataSnapshot('other-profile');

    expect(first.files['/notes/todo.txt'].tags).toEqual(['work']);
    expect(second.files['/notes/todo.txt'].tags).toEqual(['personal']);

    await clearProfileMetadata('other-profile');
  });
});

