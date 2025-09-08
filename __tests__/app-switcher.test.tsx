import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import Desktop from '../src/components/desktop/Desktop';
import { registerWindow, reset, getActiveWindow } from '../lib/window-manager';

jest.mock('../src/components/desktop/Dock', () => () => <div />);
jest.mock('../src/components/desktop/DesktopContextMenu', () => () => null);
jest.mock('../src/components/desktop/HotCorner', () => () => null);
jest.mock('../src/components/panel/Panel', () => () => <div />);

describe('AppSwitcher', () => {
  beforeEach(() => {
    reset();
    registerWindow({ id: 'one', title: 'One' });
    registerWindow({ id: 'two', title: 'Two' });
  });

  it('cycles through windows and activates on release', () => {
    render(<Desktop />);

    fireEvent.keyDown(window, { key: 'Alt' });
    expect(screen.getByTestId('app-switcher')).toBeInTheDocument();
    let items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(window, { key: 'Tab' });
    items = screen.getAllByRole('listitem');
    expect(items[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyUp(window, { key: 'Alt' });
    expect(screen.queryByTestId('app-switcher')).not.toBeInTheDocument();
    expect(getActiveWindow()).toBe('two');
  });
});
