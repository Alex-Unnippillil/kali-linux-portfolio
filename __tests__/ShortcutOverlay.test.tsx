import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HelpOverlay from '../components/system/HelpOverlay';

describe('System HelpOverlay', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('opens with stored shortcut and filters results', () => {
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({
        'Show keyboard shortcuts': 'A',
      }),
    );
    render(<HelpOverlay />);
    fireEvent.keyDown(window, { key: 'a' });

    const dialog = screen.getByRole('dialog', { name: /keyboard shortcuts/i });
    expect(dialog).toBeInTheDocument();

    const search = screen.getByPlaceholderText(/search shortcuts/i);
    fireEvent.change(search, { target: { value: 'clipboard' } });

    expect(
      screen.getByText('Open the clipboard manager'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Open the application menu (Super / Windows key)'),
    ).not.toBeInTheDocument();
  });

  it('copies shortcut to the clipboard', async () => {
    render(<HelpOverlay />);
    fireEvent.keyDown(window, { key: '?', shiftKey: true });

    const copyButton = await screen.findByRole('button', {
      name: /copy meta to the clipboard/i,
    });

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Meta');
    });
  });
});
