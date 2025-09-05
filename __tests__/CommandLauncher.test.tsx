import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CommandLauncher from '../components/common/CommandLauncher';

describe('CommandLauncher', () => {
  beforeEach(() => {
    window.localStorage.removeItem('launcher-history');
  });

  it('opens with Ctrl+Space and launches app with history', () => {
    const openApp = jest.fn();
    render(<CommandLauncher openApp={openApp} apps={[{ id: 'a', title: 'Alpha' }]} games={[]} />);
    fireEvent.keyDown(window, { ctrlKey: true, code: 'Space' });
    const input = screen.getByLabelText('Command launcher');
    fireEvent.change(input, { target: { value: 'Al' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(openApp).toHaveBeenCalledWith('a');
    const stored = JSON.parse(window.localStorage.getItem('launcher-history') || '[]');
    expect(stored[0]).toBe('a');
  });

  it('closes on Escape', () => {
    const openApp = jest.fn();
    render(<CommandLauncher openApp={openApp} apps={[{ id: 'a', title: 'Alpha' }]} games={[]} />);
    fireEvent.keyDown(window, { ctrlKey: true, code: 'Space' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByLabelText('Command launcher')).toBeNull();
  });
});
