import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesktopMenu from '../components/context-menus/desktop-menu';

describe('DesktopMenu accessibility', () => {
  const props = {
    active: true,
    openApp: jest.fn(),
    addNewFolder: jest.fn(),
    openShortcutSelector: jest.fn(),
    clearSession: jest.fn(),
  };

  const getInteractiveMenuItems = () => {
    const menu = screen.getByRole('menu', { name: /desktop context menu/i });
    return within(menu)
      .getAllByRole('menuitem', { hidden: true })
      .filter((item) => item.getAttribute('aria-disabled') !== 'true');
  };

  it('moves focus between menu items with arrow keys', async () => {
    const user = userEvent.setup();
    render(<DesktopMenu {...props} />);

    const menuItems = getInteractiveMenuItems();
    menuItems[0].focus();
    expect(menuItems[0]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(menuItems[1]).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(menuItems[0]).toHaveFocus();
  });

  it('allows tab navigation to exit the menu', async () => {
    const user = userEvent.setup();
    render(
      <>
        <DesktopMenu {...props} />
        <button type="button" aria-label="After menu focus target" />
      </>
    );

    const menuItems = getInteractiveMenuItems();
    const afterButton = screen.getByRole('button', { name: /after menu focus target/i });

    menuItems[0].focus();
    expect(menuItems[0]).toHaveFocus();

    await user.tab();
    expect(afterButton).toHaveFocus();
  });
});
