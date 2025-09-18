import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Taskbar from '../components/screen/taskbar';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const apps = [{ id: 'app1', title: 'App One', icon: '/icon.png' }];
const workspaces = [
  { id: 'ws-1', name: 'Workspace 1' },
  { id: 'ws-2', name: 'Workspace 2' },
];

describe('Taskbar', () => {
  it('minimizes focused window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    render(
      <Taskbar
        apps={apps}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: false }}
        focused_windows={{ app1: true }}
        openApp={openApp}
        minimize={minimize}
        workspaces={workspaces}
        currentWorkspaceId="ws-1"
      />
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(minimize).toHaveBeenCalledWith('app1');
    expect(button).toHaveAttribute('data-context', 'taskbar');
  });

  it('restores minimized window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    render(
      <Taskbar
        apps={apps}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: true }}
        focused_windows={{ app1: false }}
        openApp={openApp}
        minimize={minimize}
        workspaces={workspaces}
        currentWorkspaceId="ws-1"
      />
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(openApp).toHaveBeenCalledWith('app1');
  });

  it('opens workspace menu and triggers actions', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    const handleCreate = jest.fn();
    const handleRename = jest.fn();
    const handleDuplicate = jest.fn();
    const handleSwitch = jest.fn();
    render(
      <Taskbar
        apps={apps}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: false }}
        focused_windows={{ app1: false }}
        openApp={openApp}
        minimize={minimize}
        workspaces={workspaces}
        currentWorkspaceId="ws-1"
        onCreateWorkspace={handleCreate}
        onRenameWorkspace={handleRename}
        onDuplicateWorkspace={handleDuplicate}
        onSwitchWorkspace={handleSwitch}
      />
    );

    const switcherButton = screen.getByRole('button', { name: /switch workspace/i });
    fireEvent.click(switcherButton);

    const createButton = screen.getByRole('menuitem', { name: /new workspace/i });
    fireEvent.click(createButton);
    expect(handleCreate).toHaveBeenCalled();

    fireEvent.click(switcherButton);
    const duplicateButton = screen.getByRole('menuitem', { name: /duplicate workspace/i });
    fireEvent.click(duplicateButton);
    expect(handleDuplicate).toHaveBeenCalledWith('ws-1');

    fireEvent.click(switcherButton);
    const renameButton = screen.getByRole('menuitem', { name: /rename workspace/i });
    fireEvent.click(renameButton);

    const renameInput = screen.getByLabelText(/rename current workspace/i);
    fireEvent.change(renameInput, { target: { value: 'Pentest' } });
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    expect(handleRename).toHaveBeenCalledWith('ws-1', 'Pentest');

    fireEvent.click(switcherButton);
    const workspaceOption = screen.getByRole('menuitemradio', { name: /workspace 2/i });
    fireEvent.click(workspaceOption);
    expect(handleSwitch).toHaveBeenCalledWith('ws-2');
  });
});
