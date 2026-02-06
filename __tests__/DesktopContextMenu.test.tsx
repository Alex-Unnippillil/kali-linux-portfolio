import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Desktop from '../components/shell/Desktop';

describe('Desktop context menu', () => {
  function setup() {
    const onCreateFolder = jest.fn();
    const onChangeWallpaper = jest.fn();
    const onOpenSettings = jest.fn();

    render(
      <Desktop
        onCreateFolder={onCreateFolder}
        onChangeWallpaper={onChangeWallpaper}
        onOpenSettings={onOpenSettings}
      >
        <div>desktop content</div>
      </Desktop>,
    );

    const desktop = screen.getByTestId('desktop');
    return { desktop, onCreateFolder, onChangeWallpaper, onOpenSettings };
  }

  it('opens and acts on context menu selections', async () => {
    const user = userEvent.setup();
    const { desktop, onCreateFolder, onChangeWallpaper, onOpenSettings } = setup();

    await user.pointer([{ target: desktop, keys: '[MouseRight]' }]);

    const menu = screen.getByRole('menu', { name: /desktop context menu/i });
    expect(menu).toBeInTheDocument();

    const newFolder = screen.getByRole('menuitem', { name: /new folder/i });
    await user.click(newFolder);

    expect(onCreateFolder).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu', { name: /desktop context menu/i })).not.toBeInTheDocument();

    // Re-open and test the remaining handlers
    await user.pointer([{ target: desktop, keys: '[MouseRight]' }]);
    await user.click(screen.getByRole('menuitem', { name: /change wallpaper/i }));
    expect(onChangeWallpaper).toHaveBeenCalledTimes(1);

    await user.pointer([{ target: desktop, keys: '[MouseRight]' }]);
    await user.click(screen.getByRole('menuitem', { name: /settings/i }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard invocation and navigation', async () => {
    const user = userEvent.setup();
    const { desktop } = setup();

    desktop.focus();
    expect(desktop).toHaveFocus();

    await user.keyboard('{Shift>}{F10}{/Shift}');

    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(items[1]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(items[2]).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu', { name: /desktop context menu/i })).not.toBeInTheDocument();
    expect(desktop).toHaveFocus();
  });
});
