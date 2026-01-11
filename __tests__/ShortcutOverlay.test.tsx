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
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('data-conflict', 'true');
    expect(items[1]).toHaveAttribute('data-conflict', 'true');
  });

  it('focuses the close button on open and restores focus after closing', () => {
    render(
      <>
        <button type="button">Invoker</button>
        <ShortcutOverlay />
      </>
    );

    const invoker = screen.getByRole('button', { name: 'Invoker' });
    invoker.focus();

    fireEvent.keyDown(invoker, { key: '?', shiftKey: true });

    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toHaveFocus();

    fireEvent.click(closeButton);
    expect(invoker).toHaveFocus();
  });

  it('closes with Escape and surfaces touch hints', () => {
    render(<ShortcutOverlay />);

    fireEvent.keyDown(document.body, { key: '?', shiftKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Touch equivalents')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
