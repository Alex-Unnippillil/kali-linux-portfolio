import {
  createEntry,
  deleteEntry,
  duplicateEntry,
  findNodeByPathIds,
  findNodeByPathNames,
  listDirectory,
  loadFauxFileSystem,
  renameEntry,
} from '../../../services/fileExplorer/fauxFileSystem';

describe('fauxFileSystem operations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates, renames, duplicates, and deletes entries', () => {
    const tree = loadFauxFileSystem();
    const pathIds = findNodeByPathNames(tree, ['Documents']);

    let nextTree = createEntry(tree, pathIds, {
      type: 'file',
      name: 'notes.txt',
      content: 'hello',
    });

    let nodes = findNodeByPathIds(nextTree, pathIds);
    let { files } = listDirectory(nodes[nodes.length - 1]);
    const original = files.find((file) => file.name === 'notes.txt');
    expect(original).toBeTruthy();

    nextTree = renameEntry(nextTree, pathIds, original.id, 'notes-renamed.txt');
    nodes = findNodeByPathIds(nextTree, pathIds);
    files = listDirectory(nodes[nodes.length - 1]).files;
    const renamed = files.find((file) => file.name === 'notes-renamed.txt');
    expect(renamed).toBeTruthy();

    nextTree = duplicateEntry(nextTree, pathIds, renamed.id, 'notes-copy.txt');
    nodes = findNodeByPathIds(nextTree, pathIds);
    files = listDirectory(nodes[nodes.length - 1]).files;
    expect(files.some((file) => file.name === 'notes-copy.txt')).toBe(true);

    nextTree = deleteEntry(nextTree, pathIds, renamed.id);
    nodes = findNodeByPathIds(nextTree, pathIds);
    files = listDirectory(nodes[nodes.length - 1]).files;
    expect(files.some((file) => file.name === 'notes-renamed.txt')).toBe(false);
  });
});
