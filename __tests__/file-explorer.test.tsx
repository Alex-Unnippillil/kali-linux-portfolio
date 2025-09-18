import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileExplorer from '../components/apps/file-explorer';

type TestFile = {
  name: string;
  content: string;
};

function createFileHandle(file: TestFile) {
  return {
    kind: 'file' as const,
    name: file.name,
    async getFile() {
      return {
        name: file.name,
        async text() {
          return file.content;
        },
      };
    },
  };
}

function createDirectoryHandle(files: TestFile[]) {
  return {
    name: 'TestDir',
    async *entries(): AsyncGenerator<[string, any]> {
      for (const file of files) {
        yield [file.name, createFileHandle(file)];
      }
    },
  };
}

describe('FileExplorer selection interactions', () => {
  const files: TestFile[] = [
    { name: 'alpha.txt', content: 'alpha contents' },
    { name: 'bravo.txt', content: 'bravo contents' },
    { name: 'charlie.txt', content: 'charlie contents' },
  ];

  beforeEach(() => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      writable: true,
      value: jest.fn(() => Promise.resolve(createDirectoryHandle(files))),
    });
  });

  afterEach(() => {
    // @ts-expect-error - clean up stub
    delete window.showDirectoryPicker;
  });

  async function openTestDirectory() {
    const user = userEvent.setup();
    render(<FileExplorer />);

    await user.click(screen.getByRole('button', { name: /open folder/i }));
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(files.length));
    return user;
  }

  it('selects ranges with shift+click and persists selection after reload', async () => {
    const user = await openTestDirectory();

    const listbox = screen.getByRole('listbox', { name: /files/i });
    const checkboxes = within(listbox).getAllByRole('checkbox', { name: /select/i });

    await user.click(checkboxes[0]);
    await user.keyboard('{Shift>}');
    await user.click(checkboxes[2]);
    await user.keyboard('{/Shift}');

    await waitFor(() => {
      const currentOptions = within(listbox).getAllByRole('option');
      currentOptions.forEach((option) =>
        expect(option).toHaveAttribute('aria-selected', 'true'),
      );
    });

    await user.click(screen.getByRole('button', { name: /open folder/i }));
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(files.length));

    const reloadedOptions = screen.getAllByRole('option');
    reloadedOptions.forEach((option) =>
      expect(option).toHaveAttribute('aria-selected', 'true'),
    );
  });

  it('supports keyboard selection and activation', async () => {
    const user = await openTestDirectory();

    const listbox = screen.getByRole('listbox', { name: /files/i });
    const options = within(listbox).getAllByRole('option');

    options[1].focus();
    expect(options[1]).toHaveFocus();

    await user.keyboard('[Space]');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(screen.getByDisplayValue('bravo contents')).toBeInTheDocument(),
    );
  });
});
