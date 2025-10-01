import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileExplorer from '../components/apps/file-explorer';

jest.mock('../hooks/useOPFS', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    supported: false,
    root: null,
    getDir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    deleteFile: jest.fn(),
  })),
}));

const dbMock = {
  getAll: jest.fn(async () => []),
  put: jest.fn(async () => {}),
};

jest.mock('../utils/safeIDB', () => ({
  getDb: jest.fn(() => Promise.resolve(dbMock)),
}));

function createNotAllowedError(): DOMException | Error {
  if (typeof DOMException === 'function') {
    return new DOMException('Permission denied', 'NotAllowedError');
  }
  const error = new Error('Permission denied');
  error.name = 'NotAllowedError';
  return error;
}

function createFileHandle(name: string, initialContent = 'Initial contents') {
  let content = initialContent;
  const writes: unknown[] = [];
  const writable = {
    write: jest.fn(async (value: unknown) => {
      if (file.permissionRevoked) throw createNotAllowedError();
      writes.push(value);
      content = value as string;
    }),
    close: jest.fn(async () => {}),
  };

  const file = {
    kind: 'file' as const,
    name,
    permissionRevoked: false,
    getFile: jest.fn(async () => {
      if (file.permissionRevoked) throw createNotAllowedError();
      return {
        text: jest.fn(async () => {
          if (file.permissionRevoked) throw createNotAllowedError();
          return content;
        }),
      };
    }),
    createWritable: jest.fn(async () => {
      if (file.permissionRevoked) throw createNotAllowedError();
      return writable;
    }),
    get writes() {
      return writes;
    },
    get writable() {
      return writable;
    },
  };

  return file;
}

function createDirectoryHandle(
  name: string,
  entries: Record<string, ReturnType<typeof createFileHandle> | ReturnType<typeof createDirectoryHandle>>,
) {
  const dir: any = {
    kind: 'directory',
    name,
    permissionRevoked: false,
  };

  dir.entries = jest.fn(async function* entriesIterator() {
    if (dir.permissionRevoked) throw createNotAllowedError();
    for (const [entryName, entryHandle] of Object.entries(entries)) {
      yield [entryName, entryHandle];
    }
  });

  dir.getDirectoryHandle = jest.fn(async (segment: string) => {
    if (dir.permissionRevoked) throw createNotAllowedError();
    const entry = entries[segment];
    if (!entry || entry.kind !== 'directory') {
      throw Object.assign(new Error('NotFound'), { name: 'NotFoundError' });
    }
    return entry;
  });

  dir.getFileHandle = jest.fn(async (segment: string) => {
    if (dir.permissionRevoked) throw createNotAllowedError();
    const entry = entries[segment];
    if (!entry || entry.kind !== 'file') {
      throw Object.assign(new Error('NotFound'), { name: 'NotFoundError' });
    }
    return entry;
  });

  dir.removeEntry = jest.fn(async (segment: string) => {
    if (dir.permissionRevoked) throw createNotAllowedError();
    delete entries[segment];
  });

  return dir;
}

function setupHandles(initialContent = 'Initial contents') {
  const fileHandle = createFileHandle('notes.txt', initialContent);
  const rootHandle = createDirectoryHandle('root', { 'notes.txt': fileHandle });
  const showDirectoryPicker = jest.fn().mockResolvedValue(rootHandle);
  Object.defineProperty(window, 'showDirectoryPicker', {
    configurable: true,
    value: showDirectoryPicker,
  });
  return { fileHandle, rootHandle, showDirectoryPicker };
}

describe('FileExplorer permission recovery', () => {
  beforeEach(() => {
    dbMock.getAll.mockClear();
    dbMock.put.mockClear();
  });

  test('re-opens a file after permissions are re-granted', async () => {
    const { fileHandle, rootHandle, showDirectoryPicker } = setupHandles();
    const user = userEvent.setup();

    render(<FileExplorer />);

    await user.click(screen.getByRole('button', { name: /open folder/i }));
    await screen.findByText('notes.txt');
    await user.click(screen.getByText('notes.txt'));
    await screen.findByDisplayValue('Initial contents');
    expect(fileHandle.getFile).toHaveBeenCalledTimes(1);

    rootHandle.permissionRevoked = true;
    fileHandle.permissionRevoked = true;

    await user.click(screen.getByText('notes.txt'));
    await screen.findByText(/Access to this folder was revoked/i);
    const blockedCalls = fileHandle.getFile.mock.calls.length;

    rootHandle.permissionRevoked = false;
    fileHandle.permissionRevoked = false;
    showDirectoryPicker.mockResolvedValueOnce(rootHandle);

    await user.click(screen.getByRole('button', { name: /re-open folder/i }));
    await waitFor(() =>
      expect(fileHandle.getFile.mock.calls.length).toBeGreaterThan(blockedCalls),
    );
    await waitFor(() => expect(screen.queryByText(/Access to this folder was revoked/i)).toBeNull());
  });

  test('queued save is flushed after access is restored', async () => {
    const { fileHandle, rootHandle, showDirectoryPicker } = setupHandles();
    const user = userEvent.setup();

    render(<FileExplorer />);

    await user.click(screen.getByRole('button', { name: /open folder/i }));
    await screen.findByText('notes.txt');
    await user.click(screen.getByText('notes.txt'));
    const editor = await screen.findByDisplayValue('Initial contents');

    await user.clear(editor);
    await user.type(editor, 'Updated text');

    rootHandle.permissionRevoked = true;
    fileHandle.permissionRevoked = true;

    await user.click(screen.getByRole('button', { name: /^save$/i }));
    await screen.findByText(/Access to this folder was revoked/i);
    const blockedSaves = fileHandle.createWritable.mock.calls.length;

    rootHandle.permissionRevoked = false;
    fileHandle.permissionRevoked = false;
    showDirectoryPicker.mockResolvedValueOnce(rootHandle);

    await user.click(screen.getByRole('button', { name: /re-open folder/i }));
    await waitFor(() =>
      expect(fileHandle.createWritable.mock.calls.length).toBeGreaterThan(blockedSaves),
    );
    expect(fileHandle.writable.write).toHaveBeenLastCalledWith('Updated text');
  });
});
