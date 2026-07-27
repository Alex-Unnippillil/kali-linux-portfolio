import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskbarItemMenu from '../components/desktop/TaskbarItemMenu';

const DESKTOPS = [
  { id: 'desktop-1', name: 'Desktop 1' },
  { id: 'desktop-2', name: 'Desktop 2' },
];

function renderMenu(overrides?: Partial<React.ComponentProps<typeof TaskbarItemMenu>>) {
  const ref = React.createRef<HTMLButtonElement>();
  const closeWindow = jest.fn();
  const pinWindow = jest.fn();
  const unpinWindow = jest.fn();
  const moveWindowToDesktop = jest.fn();
  const openNewWindow = jest.fn();

  function Wrapper() {
    return (
      <div>
        <button ref={ref}>Taskbar Item</button>
        <TaskbarItemMenu
          targetRef={ref}
          windowId="win-1"
          appId="app-1"
          isPinned={overrides?.isPinned ?? false}
          desktops={overrides?.desktops ?? DESKTOPS}
          currentDesktopId={overrides?.currentDesktopId ?? 'desktop-1'}
          closeWindow={overrides?.closeWindow ?? closeWindow}
          pinWindow={overrides?.pinWindow ?? pinWindow}
          unpinWindow={overrides?.unpinWindow ?? unpinWindow}
          moveWindowToDesktop={
            overrides?.moveWindowToDesktop ?? moveWindowToDesktop
          }
          openNewWindow={overrides?.openNewWindow ?? openNewWindow}
          allowNewWindow={overrides?.allowNewWindow ?? true}
        />
      </div>
    );
  }

  const utils = render(<Wrapper />);
  const trigger = screen.getByRole('button', { name: /taskbar item/i });

  return {
    ...utils,
    trigger,
    closeWindow,
    pinWindow,
    unpinWindow,
    moveWindowToDesktop,
    openNewWindow,
  };
}

describe('TaskbarItemMenu', () => {
  it('opens on context menu and triggers actions', async () => {
    const {
      trigger,
      closeWindow,
      pinWindow,
      moveWindowToDesktop,
      openNewWindow,
    } = renderMenu();

    fireEvent.contextMenu(trigger);
    expect(
      await screen.findByRole('menu', { name: /taskbar item actions/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: /close/i }));
    expect(closeWindow).toHaveBeenCalledWith('win-1');

    fireEvent.contextMenu(trigger);
    fireEvent.click(
      await screen.findByRole('menuitem', { name: /pin to taskbar/i })
    );
    expect(pinWindow).toHaveBeenCalledWith('win-1');

    fireEvent.contextMenu(trigger);
    const moveButton = await screen.findByRole('menuitem', {
      name: /move to desktop/i,
    });
    fireEvent.pointerEnter(moveButton);
    const desktopTwo = await screen.findByRole('menuitemradio', {
      name: /desktop 2/i,
    });
    fireEvent.click(desktopTwo);
    expect(moveWindowToDesktop).toHaveBeenCalledWith('win-1', 'desktop-2');

    fireEvent.contextMenu(trigger);
    fireEvent.click(
      await screen.findByRole('menuitem', { name: /new window/i })
    );
    expect(openNewWindow).toHaveBeenCalledWith('app-1');
  });

  it('supports keyboard invocation and submenu navigation', async () => {
    const user = userEvent.setup();
    const { trigger, moveWindowToDesktop } = renderMenu();

    trigger.focus();
    await user.keyboard('{Shift>}{F10}{/Shift}');
    await screen.findByRole('menu', { name: /taskbar item actions/i });
    const moveButton = screen.getByRole('menuitem', { name: /move to desktop/i });
    moveButton.focus();
    await user.keyboard('{ArrowRight}');
    const desktopOne = await screen.findByRole('menuitemradio', {
      name: /desktop 1/i,
    });
    expect(desktopOne).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    const desktopTwo = await screen.findByRole('menuitemradio', {
      name: /desktop 2/i,
    });
    expect(desktopTwo).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(moveWindowToDesktop).toHaveBeenCalledWith('win-1', 'desktop-2');
  });

  it('uses unpin handler when already pinned', () => {
    const { trigger, unpinWindow } = renderMenu({ isPinned: true });

    fireEvent.contextMenu(trigger);
    fireEvent.click(
      screen.getByRole('menuitem', { name: /unpin from taskbar/i })
    );
    expect(unpinWindow).toHaveBeenCalledWith('win-1');
  });
});

