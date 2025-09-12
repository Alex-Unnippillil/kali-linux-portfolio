import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Shortcuts from '../components/overlays/Shortcuts';

describe('Shortcuts overlay', () => {
  beforeEach(() => {
    window.localStorage.removeItem('keymap');
    (window as any).__appShortcuts = [
      { description: 'App action', keys: 'Ctrl+G' },
    ];
  });

  afterEach(() => {
    delete (window as any).__appShortcuts;
  });

  it('opens with ? and filters global shortcuts', () => {
    render(<Shortcuts />);
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const search = screen.getByPlaceholderText('Search shortcuts...');
    fireEvent.change(search, { target: { value: 'settings' } });
    expect(screen.getByText('Open settings')).toBeInTheDocument();
    expect(screen.queryByText('Show keyboard shortcuts')).not.toBeInTheDocument();
  });

  it('navigates between categories with arrow keys', () => {
    render(<Shortcuts />);
    fireEvent.keyDown(window, { key: '?' });
    const globalTab = screen.getByRole('tab', { name: /global/i });
    const appTab = screen.getByRole('tab', { name: /app/i });
    fireEvent.keyDown(globalTab, { key: 'ArrowRight' });
    expect(appTab).toHaveAttribute('aria-selected', 'true');
    screen.getByText('App action');
  });
});
