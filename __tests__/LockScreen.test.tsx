import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LockScreen from '../components/overlays/LockScreen';

describe('LockScreen', () => {
  beforeEach(() => {
    window.localStorage.removeItem('keymap');
  });

  it('toggles with Ctrl+L and restores focus on close', () => {
    render(
      <div>
        <button>focus-me</button>
        <LockScreen />
      </div>
    );
    const btn = screen.getByText('focus-me');
    btn.focus();
    expect(document.activeElement).toBe(btn);

    fireEvent.keyDown(window, { key: 'l', ctrlKey: true });
    expect(screen.getByText(/Locked/)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText(/Locked/)).toBeNull();
    expect(document.activeElement).toBe(btn);
  });
});
