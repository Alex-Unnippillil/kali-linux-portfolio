import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WindowSwitcher from '../components/screen/window-switcher';

describe('WindowSwitcher overlay interactions', () => {
  const windows = [
    { id: 'alpha', title: 'Alpha', icon: '/icon-alpha.png' },
    { id: 'beta', title: 'Beta', icon: '/icon-beta.png' },
    { id: 'gamma', title: 'Gamma', icon: '/icon-gamma.png' },
  ];

  it('invokes navigation callback for directional keys', async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();

    render(
      <WindowSwitcher
        windows={windows}
        selectedIndex={0}
        onNavigate={onNavigate}
        onSelect={jest.fn()}
        onClose={jest.fn()}
        previews={{}}
      />
    );

    await user.keyboard('{Tab}');
    expect(onNavigate).toHaveBeenLastCalledWith(1);

    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(onNavigate).toHaveBeenLastCalledWith(-1);

    await user.keyboard('{ArrowRight}');
    expect(onNavigate).toHaveBeenLastCalledWith(1);

    await user.keyboard('{ArrowLeft}');
    expect(onNavigate).toHaveBeenLastCalledWith(-1);
  });

  it('activates selection with Enter and Space', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();

    render(
      <WindowSwitcher
        windows={windows}
        selectedIndex={1}
        onNavigate={jest.fn()}
        onSelect={onSelect}
        onClose={jest.fn()}
        previews={{}}
      />
    );

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('beta');

    await user.keyboard(' ');
    expect(onSelect).toHaveBeenLastCalledWith('beta');
  });

  it('calls close handler on Escape', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    render(
      <WindowSwitcher
        windows={windows}
        selectedIndex={0}
        onNavigate={jest.fn()}
        onSelect={jest.fn()}
        onClose={onClose}
        previews={{}}
      />
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('notifies highlight changes on pointer focus', () => {
    const onHighlight = jest.fn();

    render(
      <WindowSwitcher
        windows={windows}
        selectedIndex={0}
        onNavigate={jest.fn()}
        onSelect={jest.fn()}
        onClose={jest.fn()}
        onHighlight={onHighlight}
        previews={{}}
      />
    );

    const options = screen.getAllByRole('option');
    fireEvent.mouseEnter(options[2]);
    expect(onHighlight).toHaveBeenCalledWith(2);

    options[1].focus();
    expect(onHighlight).toHaveBeenCalledWith(1);
  });
});
