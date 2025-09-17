import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ShortcutOverlay from '../components/common/ShortcutOverlay';
import { __resetShortcutRegistryForTests } from '../src/system/shortcuts';

describe('ShortcutOverlay', () => {
  beforeEach(() => {
    window.localStorage.removeItem('keymap');
  });

  afterEach(() => {
    __resetShortcutRegistryForTests();
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
});
