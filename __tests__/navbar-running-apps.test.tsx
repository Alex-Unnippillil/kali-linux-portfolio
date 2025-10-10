import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Navbar from '../components/screen/navbar';

jest.mock('../components/util-components/clock', () => () => <div data-testid="clock" />);
jest.mock('../components/util-components/status', () => () => <div data-testid="status" />);
jest.mock(
  '../components/ui/QuickSettings',
  () => ({ open }: { open: boolean; onToggle: () => void }) => (
  <div data-testid="quick-settings">{open ? 'open' : 'closed'}</div>
  ),
);
jest.mock('../components/menu/WhiskerMenu', () => () => <button type="button">Menu</button>);
jest.mock('../components/ui/PerformanceGraph', () => () => <div data-testid="performance" />);

const workspaceEventDetail = {
  workspaces: [
    { id: 0, label: 'Workspace 1', openWindows: 1 },
    { id: 1, label: 'Workspace 2', openWindows: 0 },
  ],
  activeWorkspace: 0,
  runningApps: [
    {
      id: 'app1',
      title: 'App One',
      icon: '/icon.png',
      isFocused: true,
      isMinimized: false,
    },
  ],
};

describe('Navbar running apps tray', () => {
  let dispatchSpy: jest.SpyInstance;

  beforeEach(() => {
    dispatchSpy = jest.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    dispatchSpy.mockRestore();
  });

  it('dispatches a taskbar command when clicking an open app', () => {
    render(<Navbar />);

    act(() => {
      window.dispatchEvent(new CustomEvent('workspace-state', { detail: workspaceEventDetail }));
    });

    dispatchSpy.mockClear();

    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);

    const taskbarEventCall = dispatchSpy.mock.calls.find(([event]) => event.type === 'taskbar-command');
    expect(taskbarEventCall).toBeTruthy();
    const [event] = taskbarEventCall!;
    expect(event.detail).toEqual({ appId: 'app1', action: 'toggle' });
    expect(button).toHaveAttribute('data-context', 'taskbar');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('data-active', 'true');
    expect(button.querySelector('[data-testid="running-indicator"]')).toBeTruthy();
  });

  it('shows minimized state on button attributes', () => {
    render(<Navbar />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('workspace-state', {
          detail: {
            ...workspaceEventDetail,
            runningApps: [
              {
                id: 'app2',
                title: 'App Two',
                icon: '/icon.png',
                isFocused: false,
                isMinimized: true,
              },
            ],
          },
        }),
      );
    });

    const button = screen.getByRole('button', { name: /app two/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('data-active', 'false');
    expect(button.querySelector('[data-testid="running-indicator"]')).toBeFalsy();
  });
});
