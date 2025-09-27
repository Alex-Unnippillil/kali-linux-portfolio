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
    expect(
      screen.getByText('Show keyboard shortcuts')
    ).toBeInTheDocument();
    expect(screen.getByText('Open settings')).toBeInTheDocument();
    const conflictRows = screen
      .getAllByRole('row')
      .filter((row) => row.getAttribute('data-conflict') === 'true');
    expect(conflictRows).toHaveLength(2);
    conflictRows.forEach((row) => {
      expect(row).toHaveAttribute('data-conflict', 'true');
    });
  });
});
