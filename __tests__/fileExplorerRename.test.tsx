import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileListItem, renameFileInDirectory } from '../components/apps/file-explorer';

class MockWritable {
  handle: MockFileHandle;

  constructor(handle: MockFileHandle) {
    this.handle = handle;
  }

  async write(chunk: any) {
    if (typeof chunk === 'string') {
      this.handle.data = chunk;
      return;
    }
    if (chunk && typeof chunk.text === 'function') {
      this.handle.data = await chunk.text();
      return;
    }
    if (chunk instanceof Blob) {
      this.handle.data = await chunk.text();
      return;
    }
    if (chunk instanceof ArrayBuffer) {
      this.handle.data = new TextDecoder().decode(chunk);
    }
  }

  async close() {}
}

class MockFileHandle {
  name: string;
  data: string;
  writableFactory: () => MockWritable;

  constructor(name: string, data: string, writableFactory?: () => MockWritable) {
    this.name = name;
    this.data = data;
    this.writableFactory = writableFactory || (() => new MockWritable(this));
  }

  async getFile() {
    const text = this.data;
    return {
      async text() {
        return text;
      },
    } as File;
  }

  async createWritable() {
    const writable = this.writableFactory();
    if (!writable) {
      throw new Error('Writable not available');
    }
    return writable;
  }
}

class MockDirectoryHandle {
  files: Map<string, MockFileHandle> = new Map();

  constructor(entries: Record<string, string> = {}) {
    Object.entries(entries).forEach(([name, data]) => {
      this.files.set(name, new MockFileHandle(name, data));
    });
  }

  async getFileHandle(name: string, options: { create?: boolean } = {}) {
    const existing = this.files.get(name);
    if (existing) return existing;
    if (!options.create) {
      throw new Error('File not found');
    }
    const handle = new MockFileHandle(name, '');
    this.files.set(name, handle);
    return handle;
  }

  async removeEntry(name: string) {
    if (!this.files.delete(name)) {
      throw new Error('Entry not found');
    }
  }
}

class FailingDirectoryHandle extends MockDirectoryHandle {
  async getFileHandle(name: string, options: { create?: boolean } = {}) {
    if (!this.files.has(name) && options.create && name === 'new.txt') {
      const handle = new MockFileHandle(name, '', () => {
        throw new Error('write failed');
      });
      this.files.set(name, handle);
      return handle;
    }
    return super.getFileHandle(name, options);
  }
}

describe('renameFileInDirectory', () => {
  test('copies data to a new handle and removes the original', async () => {
    const dir = new MockDirectoryHandle({ 'old.txt': 'hello world' });
    const oldHandle = await dir.getFileHandle('old.txt');

    const newHandle = await renameFileInDirectory(dir as any, oldHandle as any, 'old.txt', 'new.txt');

    expect(dir.files.has('old.txt')).toBe(false);
    expect(dir.files.has('new.txt')).toBe(true);
    const newFile = await dir.getFileHandle('new.txt');
    const fileData = await newFile.getFile();
    expect(await fileData.text()).toBe('hello world');
    expect(newHandle).toBe(newFile);
  });

  test('cleans up new handle when writing fails', async () => {
    const failingHandle = new MockFileHandle('broken.txt', 'payload');
    const dir = new FailingDirectoryHandle();
    dir.files.set('broken.txt', failingHandle);

    await expect(
      renameFileInDirectory(dir as any, failingHandle as any, 'broken.txt', 'new.txt')
    ).rejects.toThrow('write failed');

    expect(dir.files.has('new.txt')).toBe(false);
    expect(dir.files.has('broken.txt')).toBe(true);
  });
});

describe('FileListItem', () => {
  test('enters rename mode and commits on Enter', async () => {
    const onRename = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <FileListItem
        file={{ name: 'report.txt' } as any}
        onOpen={jest.fn()}
        onRename={onRename}
        takenNames={new Set(['archive.txt'])}
      />
    );

    const renameButton = screen.getByRole('button', { name: /rename/i });
    await user.click(renameButton);

    const textbox = screen.getByRole('textbox', { name: /rename report.txt/i });
    expect(textbox).toHaveValue('report.txt');

    await user.clear(textbox);
    await user.type(textbox, 'summary.txt');
    await user.keyboard('{Enter}');

    expect(onRename).toHaveBeenCalledWith('summary.txt');
    await waitFor(() => expect(renameButton).toHaveFocus());
  });

  test('cancels rename on Escape and restores focus', async () => {
    const onRename = jest.fn();
    const user = userEvent.setup();

    render(
      <FileListItem
        file={{ name: 'report.txt' } as any}
        onOpen={jest.fn()}
        onRename={onRename}
        takenNames={new Set()}
      />
    );

    const renameButton = screen.getByRole('button', { name: /rename/i });
    await user.click(renameButton);

    const textbox = screen.getByRole('textbox', { name: /rename report.txt/i });
    await user.type(textbox, 'draft.txt');
    await user.keyboard('{Escape}');

    expect(onRename).not.toHaveBeenCalled();
    await waitFor(() => expect(renameButton).toHaveFocus());
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  test('shows validation errors for invalid names', async () => {
    const onRename = jest.fn();
    const user = userEvent.setup();

    render(
      <FileListItem
        file={{ name: 'report.txt' } as any}
        onOpen={jest.fn()}
        onRename={onRename}
        takenNames={new Set(['existing.txt'])}
      />
    );

    await user.click(screen.getByRole('button', { name: /rename/i }));

    const textbox = screen.getByRole('textbox', { name: /rename report.txt/i });
    await user.clear(textbox);
    await user.keyboard('{Enter}');
    expect(screen.getByText(/cannot be empty/i)).toBeInTheDocument();
    expect(onRename).not.toHaveBeenCalled();

    await user.type(textbox, 'existing.txt');
    await user.keyboard('{Enter}');
    expect(screen.getByText(/already exists/i)).toBeInTheDocument();

    await user.clear(textbox);
    await user.type(textbox, 'bad/name');
    await user.keyboard('{Enter}');
    expect(screen.getByText(/cannot contain slashes/i)).toBeInTheDocument();
  });
});

