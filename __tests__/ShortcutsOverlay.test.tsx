import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import ShortcutsOverlay from '../components/common/ShortcutsOverlay';

describe('ShortcutsOverlay', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // @ts-expect-error jsdom defines print optionally
    window.print = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the overlay with Ctrl+/ and focuses the search box', async () => {
    render(<ShortcutsOverlay />);

    fireEvent.keyDown(window, { key: '/', ctrlKey: true });

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const searchBox = screen.getByRole('searchbox');
    await waitFor(() => expect(searchBox).toHaveFocus());
  });

  it('filters shortcuts based on the search query', async () => {
    render(<ShortcutsOverlay />);

    fireEvent.keyDown(window, { key: '/', ctrlKey: true });
    const searchBox = await screen.findByRole('searchbox');

    fireEvent.change(searchBox, { target: { value: 'settings' } });

    expect(await screen.findByText('Open settings')).toBeInTheDocument();
    expect(screen.queryByText('Toggle app launcher')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation and Escape to close', async () => {
    render(<ShortcutsOverlay />);

    fireEvent.keyDown(window, { key: '/', ctrlKey: true });
    const searchBox = await screen.findByRole('searchbox');

    const initialOptions = await screen.findAllByRole('option');
    expect(initialOptions[0]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(searchBox, { key: 'ArrowDown' });
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
    });

    const updatedOptions = screen.getAllByRole('option');
    fireEvent.keyDown(updatedOptions[1], { key: 'ArrowDown' });
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options[2 % options.length]).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });
});
