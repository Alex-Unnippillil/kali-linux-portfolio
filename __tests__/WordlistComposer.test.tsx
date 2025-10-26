import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

interface InMemoryDirectory {
  name: string;
  files: Map<string, string>;
  subdirs: Map<string, InMemoryDirectory>;
}

const createDirectory = (name: string): InMemoryDirectory => ({
  name,
  files: new Map(),
  subdirs: new Map(),
});

const createOPFSStore = () => {
  const root = createDirectory('root');

  const traverse = (path: string, create = true): InMemoryDirectory | null => {
    let dir = root;
    const parts = path
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);
    for (const part of parts) {
      let next = dir.subdirs.get(part);
      if (!next) {
        if (!create) return null;
        next = createDirectory(part);
        dir.subdirs.set(part, next);
      }
      dir = next;
    }
    return dir;
  };

  return {
    reset: () => {
      root.files.clear();
      root.subdirs.clear();
    },
    getDir: async (path = '', options: FileSystemGetDirectoryOptions = { create: true }) =>
      traverse(path, options?.create ?? true),
    readFile: async (name: string, dir: InMemoryDirectory | null = root) => {
      if (!dir) return null;
      return dir.files.get(name) ?? null;
    },
    writeFile: async (
      name: string,
      data: string | Blob,
      dir: InMemoryDirectory | null = root,
    ) => {
      if (!dir) return false;
      const text =
        typeof data === 'string'
          ? data
          : 'text' in data && typeof data.text === 'function'
          ? await data.text()
          : '';
      dir.files.set(name, text);
      return true;
    },
    listFiles: async (dir: InMemoryDirectory | null = root) => {
      if (!dir) return [];
      return Array.from(dir.files.keys()).map(
        (name) => ({ kind: 'file', name } as unknown as FileSystemFileHandle),
      );
    },
  };
};

const opfsStore = createOPFSStore();

jest.mock('../hooks/useOPFS', () => ({
  __esModule: true,
  default: () => ({
    supported: true,
    root: null,
    getDir: opfsStore.getDir,
    readFile: opfsStore.readFile,
    writeFile: opfsStore.writeFile,
    deleteFile: jest.fn(),
    listFiles: opfsStore.listFiles,
  }),
}));

import WordlistComposer, { dedupeWordlist } from '../apps/john/components/WordlistComposer';

describe('WordlistComposer', () => {
  beforeEach(() => {
    cleanup();
    opfsStore.reset();
  });

  afterEach(() => {
    cleanup();
  });

  it('deduplicates entries before saving to OPFS', async () => {
    render(<WordlistComposer />);

    fireEvent.change(screen.getByLabelText('List name'), {
      target: { value: 'Engagement Alpha' },
    });
    fireEvent.change(screen.getByLabelText('Entries'), {
      target: { value: 'admin\npassword\nadmin\nPassword' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Wordlist' }));
    });

    const dir = await opfsStore.getDir('john/wordlists');
    const raw = await opfsStore.readFile('engagement-alpha.json', dir);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.entries).toEqual(['admin', 'password', 'Password']);
    expect(new Set(parsed.entries).size).toBe(parsed.entries.length);
  });

  it('persists lists across renders using OPFS', async () => {
    const { unmount } = render(<WordlistComposer />);

    fireEvent.change(screen.getByLabelText('List name'), {
      target: { value: 'Persistent List' },
    });
    fireEvent.change(screen.getByLabelText('Entries'), {
      target: { value: 'alpha\nbeta\nalpha' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Wordlist' }));
    });

    unmount();

    render(<WordlistComposer />);

    const persisted = await screen.findByTestId('saved-list-persistent-list');
    expect(persisted.textContent).toContain('2 unique entries');
    expect(persisted.textContent).toContain('alpha');
    expect(persisted.textContent).toContain('beta');
  });

  it('dedupeWordlist trims whitespace and removes duplicates', () => {
    expect(dedupeWordlist('  foo\nbar\nfoo\nbar  ')).toEqual(['foo', 'bar']);
  });
});
