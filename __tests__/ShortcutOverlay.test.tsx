import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import ShortcutOverlay from '../components/common/ShortcutOverlay';

describe('ShortcutOverlay', () => {
  beforeEach(() => {
    window.localStorage.removeItem('keymap');
  });

  it('lists shortcuts and highlights conflicts', () => {
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({
        'Show keyboard shortcuts': 'A',
        'Open settings': 'A',
      })
    );
    render(<ShortcutOverlay />);
    fireEvent.keyDown(window, { key: 'a' });
    expect(
      screen.getByText('Show keyboard shortcuts')
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('Open settings'))
    ).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('data-conflict', 'true');
    expect(items[1]).toHaveAttribute('data-conflict', 'true');
  });

  it('filters shortcuts, highlights matches, and disables export when empty', () => {
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({
        'Show keyboard shortcuts': 'A',
        'Open settings': 'Ctrl+Shift+O',
        'Launch terminal': 'Ctrl+Alt+T',
      })
    );
    render(<ShortcutOverlay />);
    fireEvent.keyDown(window, { key: 'a' });
    const filterInput = screen.getByLabelText('Filter keyboard shortcuts');
    fireEvent.change(filterInput, { target: { value: 'ctrl+shift' } });
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('Open settings')).toBeInTheDocument();
    expect(screen.getAllByText('Ctrl+Shift', { selector: 'mark' })).not.toHaveLength(0);

    fireEvent.change(filterInput, { target: { value: 'nope' } });
    expect(screen.getByText('No shortcuts match your filter.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export JSON' })).toBeDisabled();
  });

  it('exports only the filtered shortcuts', async () => {
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({
        'Show keyboard shortcuts': 'A',
        'Open settings': 'Ctrl+Shift+O',
        'Launch terminal': 'Ctrl+Alt+T',
      })
    );

    const originalBlob = global.Blob;
    const originalWindowBlob = window.Blob;
    const blobs: Array<{ parts: BlobPart[]; options?: BlobPropertyBag }> = [];
    class MockBlob {
      parts: BlobPart[];
      options?: BlobPropertyBag;
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        this.parts = parts;
        this.options = options;
        blobs.push({ parts, options });
      }
    }
    global.Blob = MockBlob as unknown as typeof Blob;
    (window as typeof window & { Blob: typeof Blob }).Blob = MockBlob as unknown as typeof Blob;

    type UrlWithObjectUrl = {
      createObjectURL?: (object: Blob) => string;
      revokeObjectURL?: (url: string) => void;
    };

    const globalUrl = URL as unknown as UrlWithObjectUrl;
    const windowUrl = window.URL as unknown as UrlWithObjectUrl;
    const originalCreateObjectURL = globalUrl.createObjectURL;
    const originalRevokeObjectURL = globalUrl.revokeObjectURL;
    const createUrlMock = jest.fn<(object: Blob) => string>(() => 'blob:url');
    const revokeUrlMock = jest.fn<(url: string) => void>();
    globalUrl.createObjectURL = createUrlMock;
    globalUrl.revokeObjectURL = revokeUrlMock;
    windowUrl.createObjectURL = createUrlMock;
    windowUrl.revokeObjectURL = revokeUrlMock;

    try {
      render(<ShortcutOverlay />);
      fireEvent.keyDown(window, { key: 'a' });
      const filterInput = screen.getByLabelText('Filter keyboard shortcuts');
      fireEvent.change(filterInput, { target: { value: 'settings' } });
      await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
      const exportButton = await screen.findByRole('button', { name: 'Export JSON' });
      await waitFor(() => expect(exportButton).not.toBeDisabled());
      fireEvent.click(exportButton);

      expect(createUrlMock).toHaveBeenCalledTimes(1);
      expect(revokeUrlMock).toHaveBeenCalledTimes(1);
      expect(blobs).toHaveLength(1);
      const exported = JSON.parse(String(blobs[0].parts[0]));
      expect(exported).toEqual([
        { description: 'Open settings', keys: 'Ctrl+Shift+O' },
      ]);
    } finally {
      if (originalCreateObjectURL === undefined) {
        delete globalUrl.createObjectURL;
        delete windowUrl.createObjectURL;
      } else {
        globalUrl.createObjectURL = originalCreateObjectURL;
        windowUrl.createObjectURL = originalCreateObjectURL;
      }
      if (originalRevokeObjectURL === undefined) {
        delete globalUrl.revokeObjectURL;
        delete windowUrl.revokeObjectURL;
      } else {
        globalUrl.revokeObjectURL = originalRevokeObjectURL;
        windowUrl.revokeObjectURL = originalRevokeObjectURL;
      }
      global.Blob = originalBlob;
      (window as typeof window & { Blob: typeof Blob }).Blob = originalWindowBlob;
    }
  });
});
