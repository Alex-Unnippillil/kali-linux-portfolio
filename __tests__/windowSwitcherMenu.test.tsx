import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WindowSwitcher from '../components/screen/window-switcher';

const baseWorkspaces = [
  { id: 'workspace-1', name: 'Workspace 1' },
  { id: 'workspace-2', name: 'Workspace 2' },
];

const windows = [{ id: 'app1', title: 'App One' }];

describe('WindowSwitcher overview menu', () => {
  it('invokes close handler and updates state', async () => {
    const state = { closed: false };
    render(
      <WindowSwitcher
        windows={windows}
        minimizedMap={{ app1: false }}
        windowWorkspaces={{ app1: 'workspace-1' }}
        workspaces={baseWorkspaces}
        onCloseWindow={(id) => {
          if (id === 'app1') {
            state.closed = true;
          }
        }}
      />
    );

    const windowButton = screen.getByRole('button', { name: /app one/i });
    fireEvent.contextMenu(windowButton);

    const closeButton = await screen.findByRole('menuitem', {
      name: /close window/i,
    });
    fireEvent.click(closeButton);

    expect(state.closed).toBe(true);
  });

  it('toggles minimize state from the menu', async () => {
    const state = { minimized: false };
    render(
      <WindowSwitcher
        windows={windows}
        minimizedMap={{ app1: false }}
        windowWorkspaces={{ app1: 'workspace-1' }}
        workspaces={baseWorkspaces}
        onToggleMinimize={(id) => {
          if (id === 'app1') {
            state.minimized = !state.minimized;
          }
        }}
      />
    );

    const windowButton = screen.getByRole('button', { name: /app one/i });
    fireEvent.contextMenu(windowButton);

    const minimizeButton = await screen.findByRole('menuitem', {
      name: /minimize window/i,
    });
    fireEvent.click(minimizeButton);

    expect(state.minimized).toBe(true);
  });

  it('moves a window to another workspace', async () => {
    const state = { workspace: 'workspace-1' };
    render(
      <WindowSwitcher
        windows={windows}
        minimizedMap={{ app1: false }}
        windowWorkspaces={{ app1: 'workspace-1' }}
        workspaces={baseWorkspaces}
        onMoveWindow={(id, workspaceId) => {
          if (id === 'app1') {
            state.workspace = workspaceId;
          }
        }}
      />
    );

    const windowButton = screen.getByRole('button', { name: /app one/i });
    fireEvent.contextMenu(windowButton);

    const workspaceButton = await screen.findByRole('menuitem', {
      name: /move to workspace 2/i,
    });
    fireEvent.click(workspaceButton);

    expect(state.workspace).toBe('workspace-2');
  });

  it('opens the menu with Shift+F10', async () => {
    render(
      <WindowSwitcher
        windows={windows}
        minimizedMap={{ app1: false }}
        windowWorkspaces={{ app1: 'workspace-1' }}
        workspaces={baseWorkspaces}
      />
    );

    const windowButton = screen.getByRole('button', { name: /app one/i });
    windowButton.focus();
    const user = userEvent.setup();
    await user.keyboard('{Shift>}{F10}{/Shift}');

    expect(await screen.findByRole('menu')).toBeInTheDocument();
  });
});
