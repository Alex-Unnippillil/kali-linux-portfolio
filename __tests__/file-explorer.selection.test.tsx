import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FileExplorer from '../components/apps/file-explorer';

const mockUseOPFS = jest.fn();

jest.mock('../hooks/useOPFS', () => ({
  __esModule: true,
  default: () => mockUseOPFS(),
}));

const createFileHandle = (name: string) => ({
  kind: 'file',
  name,
  move: jest.fn(),
  getFile: jest.fn().mockResolvedValue({
    name,
    text: jest.fn().mockResolvedValue(''),
  }),
});

const createDirHandle = (name: string, children: any[] = []) => {
  const handle = {
    kind: 'directory' as const,
    name,
    move: jest.fn(),
    entries() {
      const pairs = children.map((child) => [child.name, child]);
      return {
        async *[Symbol.asyncIterator]() {
          for (const pair of pairs) {
            yield pair;
          }
        },
      };
    },
  };
  (handle as any).children = children;
  return handle;
};

const structure = {
  directories: ['alpha', 'beta'],
  files: ['notes.txt', 'omega.md', 'zeta.log'],
};

const originalShowDirectoryPicker = (window as any).showDirectoryPicker;

const setShowDirectoryPicker = (value: any) => {
  Object.defineProperty(window, 'showDirectoryPicker', {
    configurable: true,
    writable: true,
    value,
  });
};

const setupExplorerMock = () => {
  const dirHandles = structure.directories.map((name) => createDirHandle(name));
  const fileHandles = structure.files.map((name) => createFileHandle(name));
  const rootHandle = createDirHandle('root', [...dirHandles, ...fileHandles]);
  const unsavedHandle = createDirHandle('unsaved');
  mockUseOPFS.mockReturnValue({
    supported: true,
    root: rootHandle,
    getDir: jest.fn().mockResolvedValue(unsavedHandle),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    deleteFile: jest.fn(),
  });
};

beforeEach(() => {
  mockUseOPFS.mockReset();
  setupExplorerMock();
  setShowDirectoryPicker(jest.fn());
});

afterEach(() => {
  if (originalShowDirectoryPicker === undefined) {
    delete (window as any).showDirectoryPicker;
  } else {
    setShowDirectoryPicker(originalShowDirectoryPicker);
  }
});

describe('FileExplorer selection mechanics', () => {
  it('selects a range with shift-click', async () => {
    render(<FileExplorer />);

    const firstItem = await screen.findByRole('treeitem', { name: 'alpha' });
    fireEvent.click(firstItem);

    const rangeTarget = screen.getByRole('treeitem', { name: 'omega.md' });
    fireEvent.click(rangeTarget, { shiftKey: true });

    const selected = screen
      .getAllByRole('treeitem', { selected: true })
      .map((el) => el.textContent?.trim());

    expect(selected).toEqual(['alpha', 'beta', 'notes.txt', 'omega.md']);
  });

  it('navigates selection with arrow keys', async () => {
    render(<FileExplorer />);

    const firstItem = await screen.findByRole('treeitem', { name: 'alpha' });
    fireEvent.click(firstItem);

    const tree = screen.getByTestId('file-explorer-tree');

    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    expect(screen.getByRole('treeitem', { name: 'beta', selected: true })).toBeInTheDocument();

    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    expect(screen.getByRole('treeitem', { name: 'notes.txt', selected: true })).toBeInTheDocument();

    fireEvent.keyDown(tree, { key: 'ArrowUp' });
    expect(screen.getByRole('treeitem', { name: 'beta', selected: true })).toBeInTheDocument();
  });
});
