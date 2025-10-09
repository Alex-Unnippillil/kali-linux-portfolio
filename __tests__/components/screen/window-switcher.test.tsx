import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import WindowSwitcher from '../../../components/screen/window-switcher';

describe('WindowSwitcher interactions', () => {
  const windows = [
    { id: 'terminal', title: 'Terminal' },
    { id: 'browser', title: 'Browser' },
  ];

  it('commits the keyboard-selected window when Alt is released', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <WindowSwitcher windows={windows} onSelect={onSelect} onClose={onClose} />
    );

    const input = screen.getByPlaceholderText('Search windows');
    fireEvent.keyDown(input, { key: 'Tab' });
    fireEvent.keyUp(window, { key: 'Alt' });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('browser');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('updates the highlighted window when hovering and activates it on Alt release', () => {
    const onSelect = jest.fn();

    render(<WindowSwitcher windows={windows} onSelect={onSelect} />);

    const hoveredItem = screen.getByText('Browser');
    fireEvent.mouseEnter(hoveredItem);

    expect(hoveredItem).toHaveClass('bg-ub-orange', 'text-black');

    fireEvent.keyUp(window, { key: 'Alt' });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('browser');
  });

  it('keeps the switcher open when Alt is released without a pending selection', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <WindowSwitcher windows={[]} onSelect={onSelect} onClose={onClose} />
    );

    fireEvent.keyUp(window, { key: 'Alt' });

    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
