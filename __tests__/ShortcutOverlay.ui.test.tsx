import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ShortcutOverlay from '../components/ui/ShortcutOverlay';

describe('ShortcutOverlay (XFCE style)', () => {
  it('renders shortcuts from the central config', () => {
    render(<ShortcutOverlay open onClose={() => {}} />);

    expect(
      screen.getByRole('dialog', { name: /keyboard shortcuts/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Open the application menu')).toBeInTheDocument();
    expect(screen.getByText('Open the clipboard manager')).toBeInTheDocument();
  });

  it('invokes onClose when pressing Escape', () => {
    const handleClose = jest.fn();
    render(<ShortcutOverlay open onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  it('invokes onClose when clicking outside the panel', () => {
    const handleClose = jest.fn();
    render(<ShortcutOverlay open onClose={handleClose} />);

    fireEvent.click(screen.getByRole('presentation'));
    expect(handleClose).toHaveBeenCalled();
  });
});
