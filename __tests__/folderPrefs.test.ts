import { saveFolderPrefs, loadFolderPrefs } from '../utils/folderPrefs';

describe('folderPrefs', () => {
  test('stores view mode, sort and zoom per folder', () => {
    saveFolderPrefs('/docs', { viewMode: 'list', sort: 'name', zoom: 1.5 });
    saveFolderPrefs('/pics', { viewMode: 'icon', sort: 'date', zoom: 2 });
    expect(loadFolderPrefs('/docs')).toEqual({ viewMode: 'list', sort: 'name', zoom: 1.5 });
    expect(loadFolderPrefs('/pics')).toEqual({ viewMode: 'icon', sort: 'date', zoom: 2 });
    expect(loadFolderPrefs('/other')).toBeNull();
  });
});
