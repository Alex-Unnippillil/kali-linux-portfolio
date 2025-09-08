import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ShortcutModal from '../components/keyboard/ShortcutModal';
import Desktop from '../src/components/desktop/Desktop';
import Terminal from '../apps/terminal/components/Terminal';

jest.mock('../src/components/panel/Panel', () => () => <div>panel</div>);
jest.mock('../src/components/desktop/Dock', () => () => <div>dock</div>);
jest.mock('../src/components/desktop/HotCorner', () => () => null);
jest.mock('../src/components/desktop/DesktopContextMenu', () => () => null);

describe('ShortcutModal', () => {
  it('renders shortcuts, traps focus, and closes with Escape', () => {
    const onClose = jest.fn();
    render(<ShortcutModal isOpen onClose={onClose} />);
    expect(screen.getByText('xfce4-appfinder')).toBeInTheDocument();
    const close = screen.getByRole('button', { name: /close/i });
    close.focus();
    fireEvent.keyDown(close, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('opens from Desktop with ? key', () => {
    render(<Desktop />);
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens from Terminal with ? key', () => {
    render(<Terminal />);
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

