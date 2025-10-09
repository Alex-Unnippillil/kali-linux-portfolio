import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AllApplications from '../components/screen/all-applications';
import { safeLocalStorage } from '../utils/safeStorage';

jest.mock('../components/base/ubuntu_app', () => ({
  __esModule: true,
  default: (props: any) => (
    <button
      type="button"
      data-testid={`ubuntu-app-${props.id}`}
      onClick={() => props.openApp(props.id)}
    >
      {props.name}
    </button>
  ),
}));

jest.mock('../utils/safeStorage', () => {
  const mockStorage = {
    getItem: jest.fn(() => '[]'),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  };
  return { safeLocalStorage: mockStorage };
});

describe('AllApplications launcher menu', () => {
  const app = { id: 'demo-app', title: 'Demo App', icon: '/icons/demo.png' };
  const workspaces = [
    { id: 0, label: 'Workspace 1' },
    { id: 1, label: 'Workspace 2' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (safeLocalStorage.getItem as jest.Mock).mockReturnValue('[]');
  });

  it('opens the overflow menu and triggers the open action', async () => {
    const openApp = jest.fn();
    const user = userEvent.setup();

    render(
      <AllApplications
        apps={[app]}
        games={[]}
        recentApps={[]}
        openApp={openApp}
        openAppInWorkspace={jest.fn()}
        pinApp={jest.fn()}
        unpinApp={jest.fn()}
        isAppPinned={() => false}
        workspaces={workspaces}
        activeWorkspace={0}
      />
    );

    const menuButton = await screen.findByRole('button', {
      name: /more options for demo app/i,
    });
    await user.click(menuButton);

    const openItem = await screen.findByRole('menuitem', { name: 'Open' });
    await user.click(openItem);

    expect(openApp).toHaveBeenCalledWith('demo-app');
  });

  it('opens an app in a selected workspace', async () => {
    const openAppInWorkspace = jest.fn();
    const user = userEvent.setup();

    render(
      <AllApplications
        apps={[app]}
        games={[]}
        recentApps={[]}
        openApp={jest.fn()}
        openAppInWorkspace={openAppInWorkspace}
        pinApp={jest.fn()}
        unpinApp={jest.fn()}
        isAppPinned={() => false}
        workspaces={workspaces}
        activeWorkspace={0}
      />
    );

    const menuButton = await screen.findByRole('button', {
      name: /more options for demo app/i,
    });
    await user.click(menuButton);

    const workspaceMenuTrigger = await screen.findByRole('menuitem', {
      name: /open in workspace/i,
    });
    await user.click(workspaceMenuTrigger);

    const workspaceOption = await screen.findByRole('menuitem', {
      name: 'Workspace 2',
    });
    await user.click(workspaceOption);

    expect(openAppInWorkspace).toHaveBeenCalledWith('demo-app', 1);
  });

  it('pins an app from the overflow menu', async () => {
    const pinApp = jest.fn();
    const user = userEvent.setup();

    render(
      <AllApplications
        apps={[app]}
        games={[]}
        recentApps={[]}
        openApp={jest.fn()}
        openAppInWorkspace={jest.fn()}
        pinApp={pinApp}
        unpinApp={jest.fn()}
        isAppPinned={() => false}
        workspaces={workspaces}
        activeWorkspace={0}
      />
    );

    const menuButton = await screen.findByRole('button', {
      name: /more options for demo app/i,
    });
    await user.click(menuButton);

    const pinItem = await screen.findByRole('menuitem', { name: /pin to dock/i });
    await user.click(pinItem);

    expect(pinApp).toHaveBeenCalledWith('demo-app');
  });

  it('unpins an app when already pinned', async () => {
    const unpinApp = jest.fn();
    const user = userEvent.setup();

    render(
      <AllApplications
        apps={[app]}
        games={[]}
        recentApps={[]}
        openApp={jest.fn()}
        openAppInWorkspace={jest.fn()}
        pinApp={jest.fn()}
        unpinApp={unpinApp}
        isAppPinned={() => true}
        workspaces={workspaces}
        activeWorkspace={0}
      />
    );

    const menuButton = await screen.findByRole('button', {
      name: /more options for demo app/i,
    });
    await user.click(menuButton);

    const unpinItem = await screen.findByRole('menuitem', { name: /unpin from dock/i });
    await user.click(unpinItem);

    expect(unpinApp).toHaveBeenCalledWith('demo-app');
  });
});
