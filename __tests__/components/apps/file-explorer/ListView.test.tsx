import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ListView, { ListViewFile } from '../../../../components/apps/file-explorer/ListView';

describe('ListView presets', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const createHandle = (name: string): FileSystemFileHandle => ({
    name,
    kind: 'file',
    async getFile() {
      return new File(['content'], name, { type: 'text/plain', lastModified: 1700000000000 });
    },
  }) as unknown as FileSystemFileHandle;

  const items: ListViewFile[] = [
    {
      name: 'alpha.txt',
      handle: createHandle('alpha.txt'),
      size: 1024,
      type: 'text/plain',
      modified: new Date('2024-01-01T00:00:00Z'),
    },
    {
      name: 'beta.log',
      handle: createHandle('beta.log'),
      size: 2048,
      type: 'text/plain',
      modified: new Date('2024-02-01T00:00:00Z'),
    },
  ];

  it('saves layout presets per folder and restores them on reload', () => {
    render(
      <ListView
        items={items}
        onOpen={() => {}}
        activeFileName={null}
        folderKey="workspace-a/folder-a"
        workspaceKey="workspace-a"
      />
    );

    fireEvent.click(screen.getByTestId('listview-settings-toggle'));
    fireEvent.click(screen.getByTestId('column-toggle-hash'));
    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(screen.getByTestId('column-move-up-hash'));
    }
    fireEvent.change(screen.getByTestId('preset-name-input'), { target: { value: 'Forensics' } });
    fireEvent.click(screen.getByTestId('save-preset-btn'));

    expect(screen.getByTestId('preset-select')).toHaveValue('Forensics');

    cleanup();

    render(
      <ListView
        items={items}
        onOpen={() => {}}
        activeFileName={null}
        folderKey="workspace-a/folder-b"
        workspaceKey="workspace-a"
      />
    );

    const defaultHeaders = screen.getAllByRole('columnheader').map((node) => node.textContent);
    expect(defaultHeaders).not.toContain('Hash (SHA-256)');
    expect(screen.getByTestId('preset-select')).toHaveValue('');

    cleanup();

    render(
      <ListView
        items={items}
        onOpen={() => {}}
        activeFileName={null}
        folderKey="workspace-a/folder-a"
        workspaceKey="workspace-a"
      />
    );

    const headers = screen.getAllByRole('columnheader').map((node) => node.textContent);
    expect(headers.slice(0, 3)).toEqual(['Name', 'Hash (SHA-256)', 'Size']);
    expect(screen.getByTestId('preset-select')).toHaveValue('Forensics');
  });

  it('renders column data with graceful fallbacks', () => {
    const partialItems: ListViewFile[] = [
      {
        name: 'gamma.bin',
        handle: createHandle('gamma.bin'),
        size: 1024,
        type: 'binary',
        modified: new Date('2024-03-01T00:00:00Z'),
      },
      {
        name: 'delta',
        handle: createHandle('delta'),
      },
    ];

    render(
      <ListView
        items={partialItems}
        onOpen={() => {}}
        activeFileName={null}
        folderKey="workspace-b/root"
        workspaceKey="workspace-b"
      />
    );

    expect(screen.getByTestId('cell-gamma.bin-size')).toHaveTextContent('1.0 KB');
    expect(screen.getByTestId('cell-delta-type')).toHaveTextContent('—');
    expect(screen.getByTestId('cell-delta-size')).toHaveTextContent('—');
  });
});
