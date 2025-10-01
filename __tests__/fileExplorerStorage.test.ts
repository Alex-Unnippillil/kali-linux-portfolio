import {
  applyTagToPaths,
  clearExplorerDatabase,
  createSavedQuery,
  createTag,
  deleteSavedQuery,
  deleteTag,
  exportExplorerMetadata,
  filterResultsByTagIds,
  getTagAssignmentsForPaths,
  importExplorerMetadata,
  listSavedQueries,
  listTags,
  removeTagFromPaths,
  updateSavedQuery,
  updateTag,
} from '../utils/fileExplorerStorage';

import type { SearchResult } from '../utils/fileExplorerStorage';

describe('fileExplorerStorage', () => {
  beforeEach(async () => {
    await clearExplorerDatabase();
  });

  it('supports CRUD operations for tags and assignments', async () => {
    const created = await createTag({ label: 'Important', color: '#ff0000', description: 'Critical files' });
    expect(created).not.toBeNull();
    expect(created?.label).toBe('Important');
    expect(created?.color).toBe('#ff0000');

    const updated = await updateTag(created!.id, { label: 'Reviewed', color: '#00ff00' });
    expect(updated).not.toBeNull();
    expect(updated?.label).toBe('Reviewed');
    expect(updated?.color).toBe('#00ff00');

    await applyTagToPaths(created!.id, ['docs/report.txt', 'logs/app.log']);
    await applyTagToPaths(created!.id, ['docs/summary.txt']);

    let assignments = await getTagAssignmentsForPaths(['docs/report.txt', 'logs/app.log', 'docs/summary.txt']);
    expect(assignments['docs/report.txt']).toContain(created!.id);
    expect(assignments['logs/app.log']).toContain(created!.id);
    expect(assignments['docs/summary.txt']).toContain(created!.id);

    await removeTagFromPaths(created!.id, ['logs/app.log']);
    assignments = await getTagAssignmentsForPaths(['logs/app.log', 'docs/report.txt']);
    expect(assignments['logs/app.log']).not.toContain(created!.id);
    expect(assignments['docs/report.txt']).toContain(created!.id);

    await deleteTag(created!.id);
    const remainingTags = await listTags();
    expect(remainingTags).toHaveLength(0);
    assignments = await getTagAssignmentsForPaths(['docs/report.txt']);
    expect(assignments['docs/report.txt']).toEqual([]);
  });

  it('persists saved queries with filters', async () => {
    const created = await createSavedQuery({
      name: 'Error Logs',
      query: 'ERROR',
      filters: { tags: ['tag-1', 'tag-2'], directory: 'logs' },
    });
    expect(created).not.toBeNull();
    expect(created?.filters.tags).toEqual(['tag-1', 'tag-2']);
    expect(created?.filters.directory).toBe('logs');

    const updated = await updateSavedQuery(created!.id, {
      name: 'Critical Errors',
      filters: { tags: ['tag-1'], directory: 'logs/services' },
    });
    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('Critical Errors');
    expect(updated?.filters.tags).toEqual(['tag-1']);
    expect(updated?.filters.directory).toBe('logs/services');

    const queries = await listSavedQueries();
    expect(queries).toHaveLength(1);
    expect(queries[0].name).toBe('Critical Errors');

    await deleteSavedQuery(created!.id);
    const remaining = await listSavedQueries();
    expect(remaining).toHaveLength(0);
  });

  it('exports and imports metadata including tags and saved queries', async () => {
    const tag = await createTag({ label: 'Archive', color: '#123456', description: 'To archive' });
    expect(tag).not.toBeNull();
    await applyTagToPaths(tag!.id, ['notes/todo.txt']);
    const query = await createSavedQuery({
      name: 'TODOs',
      query: 'TODO',
      filters: { tags: [tag!.id], directory: 'notes' },
    });
    expect(query).not.toBeNull();

    const payload = await exportExplorerMetadata();
    expect(payload).not.toBeNull();
    expect(payload!.tags).toHaveLength(1);
    expect(payload!.savedQueries).toHaveLength(1);
    expect(payload!.tagAssignments).toHaveLength(1);

    await clearExplorerDatabase();

    await importExplorerMetadata(payload!);
    const tagsAfterImport = await listTags();
    expect(tagsAfterImport).toHaveLength(1);
    expect(tagsAfterImport[0].label).toBe('Archive');

    const queriesAfterImport = await listSavedQueries();
    expect(queriesAfterImport).toHaveLength(1);
    expect(queriesAfterImport[0].filters.tags).toEqual([tag!.id]);

    const assignments = await getTagAssignmentsForPaths(['notes/todo.txt']);
    expect(assignments['notes/todo.txt']).toEqual([tag!.id]);
  });

  it('filters search results by tag requirements', () => {
    const results: SearchResult[] = [
      { file: 'docs/report.txt', line: 5, text: 'INFO Start' },
      { file: 'docs/report.txt', line: 10, text: 'ERROR Failed' },
      { file: 'logs/app.log', line: 2, text: 'WARN retry' },
    ];
    const assignments = {
      'docs/report.txt': ['tag-a', 'tag-b'],
      'logs/app.log': ['tag-c'],
    } as Record<string, string[]>;

    const filtered = filterResultsByTagIds(results, assignments, ['tag-a']);
    expect(filtered).toHaveLength(2);
    expect(filtered.every((item) => item.file === 'docs/report.txt')).toBe(true);

    const none = filterResultsByTagIds(results, assignments, ['tag-d']);
    expect(none).toHaveLength(0);
  });
});

