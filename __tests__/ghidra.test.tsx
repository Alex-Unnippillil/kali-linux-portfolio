import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import GhidraApp from '../components/apps/ghidra';

describe('Ghidra plugin upload', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('handles plugin upload and shows plugin name', () => {
    render(<GhidraApp />);
    const file = new File(['content'], 'plugin.jar', { type: 'application/java-archive' });
    const input = screen.getByTestId('plugin-input');
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText('Loaded plugin: plugin.jar')).toBeInTheDocument();
  });

  it('allows symbol renaming and persists it', () => {
    const { unmount } = render(<GhidraApp />);
    const input = screen.getByTestId('symbol-0') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'start' } });
    unmount();
    render(<GhidraApp />);
    expect(screen.getByDisplayValue('start')).toBeInTheDocument();
  });
});
