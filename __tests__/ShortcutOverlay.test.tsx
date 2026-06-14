import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShortcutOverlay from '../components/common/ShortcutOverlay';

describe('ShortcutOverlay', () => {
  beforeEach(() => {
    window.localStorage.removeItem('keymap');
    (navigator as any).clipboard = undefined;
    jest.restoreAllMocks();
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
    expect(screen.getByText('Open settings')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('data-conflict', 'true');
    expect(items[1]).toHaveAttribute('data-conflict', 'true');
  });

  it('copies shortcuts as CSV when clipboard API is available', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    (navigator as any).clipboard = { writeText };
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({
        'Show keyboard shortcuts': 'A',
        'Open settings': 'Ctrl+,',
      })
    );

    render(<ShortcutOverlay />);
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.click(screen.getByRole('button', { name: /copy as csv/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });

    const payload = writeText.mock.calls[0][0];
    expect(payload).toContain('"Description","Keys"');
    expect(payload).toContain('"Show keyboard shortcuts","A"');
    expect(payload).toContain('"Open settings","Ctrl+,"');
    await screen.findByText('Copied 2 shortcuts to clipboard.');
  });

  it('falls back to execCommand when clipboard API is unavailable', async () => {
    const originalExecCommand = (document as any).execCommand;
    (document as any).execCommand = jest.fn().mockReturnValue(true);
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({
        'Show keyboard shortcuts': 'A',
        'Open settings': 'Ctrl+,',
      })
    );

    render(<ShortcutOverlay />);
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.click(screen.getByRole('button', { name: /copy as csv/i }));

    await waitFor(() => {
      expect((document as any).execCommand).toHaveBeenCalledWith('copy');
    });
    await screen.findByText('Copied 2 shortcuts to clipboard.');

    (document as any).execCommand = originalExecCommand;
  });

  it('shows error feedback when copying fails', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('nope'));
    (navigator as any).clipboard = { writeText };
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({
        'Show keyboard shortcuts': 'A',
        'Open settings': 'Ctrl+,',
      })
    );

    render(<ShortcutOverlay />);
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.click(screen.getByRole('button', { name: /copy as csv/i }));

    await screen.findByText('Failed to copy shortcuts to clipboard.');
  });
});
