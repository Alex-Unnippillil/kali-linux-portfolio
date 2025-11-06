import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ShortcutOverlay from '../components/common/ShortcutOverlay';

describe('ShortcutOverlay', () => {
  beforeEach(() => {
    window.localStorage.removeItem('keymap');
  });

  it('lists shortcuts and highlights conflicts', () => {
    window.localStorage.setItem(
      'keymap',
      JSON.stringify({
        'shortcutOverlay.toggle': 'A',
        'settings.open': 'A',
      })
    );
    render(<ShortcutOverlay />);
    fireEvent.keyDown(window, { key: 'a' });
    const showRow = screen
      .getByText('Show keyboard shortcuts')
      .closest('li');
    const settingsRow = screen.getByText('Open settings').closest('li');
    if (!showRow || !settingsRow) {
      throw new Error('Expected conflict rows to be rendered');
    }
    expect(showRow).toHaveAttribute('data-conflict', 'true');
    expect(settingsRow).toHaveAttribute('data-conflict', 'true');
    expect(
      screen.getAllByText(/Conflicts with .*Open settings/)[0]
    ).toBeInTheDocument();
  });
});
