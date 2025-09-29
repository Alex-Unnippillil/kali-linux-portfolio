import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';

import HexView from '../apps/radare2/components/HexView';

const HEX_SAMPLE = '000102030405060708090a0b0c0d0e0f';

describe('HexView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  test('reflows grid when column count changes', async () => {
    render(
      <HexView
        hex={HEX_SAMPLE}
        theme="dark"
        file="columns.bin"
        baseAddress="0x1000"
      />,
    );

    const initialRows = await screen.findAllByTestId('hex-row');
    expect(initialRows).toHaveLength(1);

    const columnSelect = screen.getByLabelText(/columns/i);
    fireEvent.change(columnSelect, { target: { value: '8' } });

    const updatedRows = await screen.findAllByTestId('hex-row');
    expect(updatedRows).toHaveLength(2);
  });

  test('restores bookmarks from persistent storage', async () => {
    const storageKey = 'r2-hex-bookmarks-book.bin';
    const { unmount } = render(
      <HexView
        hex={HEX_SAMPLE}
        theme="dark"
        file="book.bin"
        baseAddress="0x2000"
      />,
    );

    const cells = await screen.findAllByTestId('hex-cell');
    fireEvent.mouseDown(cells[0]);

    const addButton = screen.getByRole('button', { name: /add bookmark/i });
    fireEvent.click(addButton);

    await screen.findByText('0x2000');

    await waitFor(() => {
      expect(localStorage.getItem(storageKey)).toBe('[0]');
    });

    unmount();

    render(
      <HexView
        hex={HEX_SAMPLE}
        theme="dark"
        file="book.bin"
        baseAddress="0x2000"
      />,
    );

    await screen.findByText('0x2000');
  });
});

