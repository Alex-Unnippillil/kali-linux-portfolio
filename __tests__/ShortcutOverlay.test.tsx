import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ShortcutOverlay from '../components/common/ShortcutOverlay';
import { registerShortcut, clearShortcuts } from '../utils/shortcutRegistry';

describe('ShortcutOverlay', () => {
  beforeEach(() => {
    clearShortcuts();
  });

  it('lists shortcuts and highlights conflicts', () => {
    registerShortcut({ keys: 'a', description: 'Action A' });
    registerShortcut({ keys: 'a', description: 'Action B' });
    render(<ShortcutOverlay />);
    fireEvent.keyDown(window, { key: '?', shiftKey: true });
    expect(screen.getByText('Action A')).toBeInTheDocument();
    expect(screen.getByText('Action B')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('data-conflict', 'true');
    expect(items[1]).toHaveAttribute('data-conflict', 'true');
  });
});
