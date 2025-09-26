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
        'Show keyboard shortcuts': 'A',
        'Open settings': 'A',
      })
    );
    render(<ShortcutOverlay />);
    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const showRow = screen
      .getByText('Show keyboard shortcuts')
      .closest('tr');
    const settingsRow = screen.getByText('Open settings').closest('tr');
    expect(showRow).toHaveAttribute('data-conflict', 'true');
    expect(settingsRow).toHaveAttribute('data-conflict', 'true');
  });
});
