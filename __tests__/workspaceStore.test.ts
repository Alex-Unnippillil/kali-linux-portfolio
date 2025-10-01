import {
  getOrderedProjects,
  getStateForTests,
  resetStoreForTests,
  selectProject,
  togglePin,
} from '../utils/workspaces/store';

describe('workspace store', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStoreForTests();
  });

  test('selectProject updates MRU ordering', () => {
    selectProject(1);
    selectProject(2);
    let items = getOrderedProjects('');
    expect(items.slice(0, 2).map((item) => item.id)).toEqual([2, 1]);

    selectProject(1);
    items = getOrderedProjects('');
    expect(items.slice(0, 2).map((item) => item.id)).toEqual([1, 2]);
  });

  test('togglePin persists selection to storage', () => {
    togglePin(1);
    expect(getStateForTests().pinned).toEqual([1]);

    const stored = JSON.parse(localStorage.getItem('workspace-store') ?? '{}');
    expect(stored.pinned).toEqual([1]);

    resetStoreForTests({ preserveStorage: true });
    expect(getStateForTests().pinned).toEqual([1]);
  });

  test('search filters projects with fuzzy matching', () => {
    const results = getOrderedProjects('alpha');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Alpha');
  });
});
