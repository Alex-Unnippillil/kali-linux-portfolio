import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HelpOverlay from '../components/system/HelpOverlay';

const originalClipboard = navigator.clipboard;

const mockClipboard = {
  writeText: jest.fn().mockResolvedValue(undefined),
};

beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: mockClipboard,
  });
});

afterAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: originalClipboard,
  });
});

describe('HelpOverlay', () => {
  beforeEach(() => {
    window.localStorage.removeItem('keymap');
    mockClipboard.writeText.mockClear();
  });

  it('respects custom toggle key and highlights conflicts', async () => {
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({
        'Show keyboard shortcuts': 'Shift+Q',
        'Open settings': 'Shift+Q',
      }),
    );
    render(<HelpOverlay />);

    fireEvent.keyDown(window, { key: 'q', shiftKey: true });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    const showItem = screen.getByText('Show keyboard shortcuts').closest('li');
    const settingsItem = screen.getByText('Open settings').closest('li');

    expect(showItem).toHaveAttribute('data-conflict', 'true');
    expect(settingsItem).toHaveAttribute('data-conflict', 'true');
  });

  it('filters shortcuts and copies them to the clipboard', async () => {
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({
        'Show keyboard shortcuts': '?',
        'Open settings': 'Ctrl+,',
      }),
    );
    render(<HelpOverlay />);

    fireEvent.keyDown(window, { key: '?', shiftKey: true });

    await screen.findByRole('dialog');

    const search = screen.getByPlaceholderText('Search shortcuts');
    fireEvent.change(search, { target: { value: 'clipboard' } });

    expect(screen.getByText('Open clipboard manager')).toBeInTheDocument();
    expect(screen.queryByText('Switch between apps')).not.toBeInTheDocument();

    const copyButton = screen.getByRole('button', {
      name: /copy ctrl\+shift\+v/i,
    });
    fireEvent.click(copyButton);

    await waitFor(() =>
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        'Ctrl+Shift+V — Open clipboard manager',
      ),
    );
  });
});
