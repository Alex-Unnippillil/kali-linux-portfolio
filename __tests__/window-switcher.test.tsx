import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import WindowSwitcher from '../components/screen/window-switcher';

describe('WindowSwitcher', () => {
  const windows = [
    { id: 'one', title: 'One' },
    { id: 'two', title: 'Two' },
    { id: 'three', title: 'Three' },
  ];

  it('navigates with arrow keys and selects with Enter', () => {
    const onSelect = jest.fn();
    render(<WindowSwitcher windows={windows} onSelect={onSelect} onClose={() => {}} />);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('two');
  });

  it('selects current window on Alt release', () => {
    const onSelect = jest.fn();
    render(<WindowSwitcher windows={windows} onSelect={onSelect} onClose={() => {}} />);

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyUp(window, { key: 'Alt' });

    expect(onSelect).toHaveBeenCalledWith('two');
  });
});

