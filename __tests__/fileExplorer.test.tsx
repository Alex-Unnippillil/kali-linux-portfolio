import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileExplorer from '../components/apps/file-explorer';
import useOPFS from '../hooks/useOPFS';

jest.mock('../hooks/useOPFS');

const entries: Array<[string, { kind: 'file' | 'directory'; handle: any }]> = [];

const createIterator = async function* () {
  for (const entry of entries) {
    yield entry;
  }
};

const rootHandle = {
  name: 'root',
  entries: () => createIterator(),
};

const unsavedHandle = {
  name: 'unsaved',
  entries: () => createIterator(),
};

const mockUseOPFS = useOPFS as jest.Mock;

describe('FileExplorer permission handling', () => {
  beforeEach(() => {
    entries.splice(0, entries.length);
    mockUseOPFS.mockReturnValue({
      supported: true,
      root: rootHandle as any,
      getDir: jest.fn(async () => unsavedHandle as any),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      deleteFile: jest.fn(),
      listFiles: jest.fn().mockResolvedValue([]),
    });
  });

  afterEach(() => {
    mockUseOPFS.mockReset();
    delete (window as any).showDirectoryPicker;
  });

  it('surfaces permission errors in an accessible alert', async () => {
    const user = userEvent.setup();
    const permissionError = new DOMException('Denied', 'NotAllowedError');
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      writable: true,
      value: jest.fn().mockRejectedValue(permissionError),
    });

    render(<FileExplorer />);

    const grantButton = await screen.findByRole('button', { name: /grant access/i });
    await user.click(grantButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/permission/i);
    expect(window.showDirectoryPicker).toHaveBeenCalled();
  });

  it('renders an empty state when the directory has no entries', async () => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });

    render(<FileExplorer />);

    const emptyMessage = await screen.findByText(/this folder is empty/i);
    expect(emptyMessage).toBeInTheDocument();
  });
});

