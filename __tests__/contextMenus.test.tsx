import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DefaultMenu from '../components/context-menus/default';
import DesktopMenu from '../components/context-menus/desktop-menu';
import TaskbarMenu from '../components/context-menus/taskbar-menu';

describe('context menus accessibility', () => {
  beforeAll(() => {
    if (!window.requestAnimationFrame) {
      // @ts-ignore - jsdom does not implement RAF
      window.requestAnimationFrame = (cb: FrameRequestCallback) => window.setTimeout(cb, 0);
    }
    if (!window.cancelAnimationFrame) {
      // @ts-ignore - complement the mock above
      window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
    }
  });

  it('supports roving focus and escape on the default menu', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<DefaultMenu active onClose={onClose} />);

    const menu = screen.getByRole('menu');
    expect(menu).toHaveAttribute('aria-orientation', 'vertical');

    const firstItem = await screen.findByRole('menuitem', { name: /linkedin/i });
    await waitFor(() => expect(firstItem).toHaveFocus());

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: /github/i })).toHaveFocus();

    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: /reset kali linux/i })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(firstItem).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('skips disabled items and handles escape on the desktop menu', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(
      <DesktopMenu
        active
        onClose={onClose}
        openApp={jest.fn()}
        addNewFolder={jest.fn()}
        openShortcutSelector={jest.fn()}
        iconSizePreset="medium"
        setIconSizePreset={jest.fn()}
        clearSession={jest.fn()}
      />
    );

    const menu = screen.getByRole('menu', { name: /desktop context menu/i });
    expect(menu).toHaveAttribute('aria-orientation', 'vertical');

    const firstItem = await screen.findByRole('menuitem', { name: /new folder/i });
    await waitFor(() => expect(firstItem).toHaveFocus());

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: /create shortcut/i })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: /small icons/i })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: /medium icons/i })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: /large icons/i })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: /open in terminal/i })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('provides vertical arrow navigation for the taskbar menu', async () => {
    const onCloseMenu = jest.fn();
    const user = userEvent.setup();
    render(
      <TaskbarMenu
        active
        minimized={false}
        onCloseMenu={onCloseMenu}
        onMinimize={jest.fn()}
        onClose={jest.fn()}
      />
    );

    const menu = screen.getByRole('menu');
    expect(menu).toHaveAttribute('aria-orientation', 'vertical');

    const firstItem = await screen.findByRole('menuitem', { name: /minimize/i });
    await waitFor(() => expect(firstItem).toHaveFocus());

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: /close/i })).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(firstItem).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(onCloseMenu).toHaveBeenCalledTimes(1);
  });
});
