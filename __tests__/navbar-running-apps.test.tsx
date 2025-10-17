import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import Navbar from '../components/screen/navbar';

jest.mock('../components/util-components/clock', () => {
  const MockClock = () => <div data-testid="clock" />;
  MockClock.displayName = 'MockClock';
  return { __esModule: true, default: MockClock };
});

jest.mock('../components/util-components/status', () => {
  const MockStatus = () => <div data-testid="status" />;
  MockStatus.displayName = 'MockStatus';
  return { __esModule: true, default: MockStatus };
});

jest.mock('../components/ui/QuickSettings', () => {
  const MockQuickSettings = ({ open }: { open: boolean }) => (
    <div data-testid="quick-settings">{open ? 'open' : 'closed'}</div>
  );
  MockQuickSettings.displayName = 'MockQuickSettings';
  return { __esModule: true, default: MockQuickSettings };
});

jest.mock('../components/menu/WhiskerMenu', () => {
  const MockMenu = () => <button type="button">Menu</button>;
  MockMenu.displayName = 'MockWhiskerMenu';
  return { __esModule: true, default: MockMenu };
});

jest.mock('../components/ui/PerformanceGraph', () => {
  const MockPerformanceGraph = () => <div data-testid="performance" />;
  MockPerformanceGraph.displayName = 'MockPerformanceGraph';
  return { __esModule: true, default: MockPerformanceGraph };
});

const workspaceEventDetail = {
  workspaces: [
    { id: 0, label: 'Workspace 1', openWindows: 1 },
    { id: 1, label: 'Workspace 2', openWindows: 0 },
  ],
  activeWorkspace: 0,
  runningApps: [
    {
      id: 'terminal',
      title: 'Terminal',
      icon: '/themes/Yaru/apps/bash.svg',
      isFocused: true,
      isMinimized: false,
    },
  ],
};

const multiAppWorkspaceDetail = {
  ...workspaceEventDetail,
  runningApps: [
    {
      id: 'terminal',
      title: 'Terminal',
      icon: '/themes/Yaru/apps/bash.svg',
      isFocused: true,
      isMinimized: false,
    },
    {
      id: 'calculator',
      title: 'Calculator',
      icon: '/themes/Yaru/apps/calc.svg',
      isFocused: false,
      isMinimized: false,
    },
    {
      id: 'firefox',
      title: 'Firefox',
      icon: '/themes/Yaru/apps/firefox.svg',
      isFocused: false,
      isMinimized: true,
    },
  ],
};

const createDataTransfer = () => {
  const store = new Map<string, string>();
  const types: string[] = [];
  return {
    dropEffect: 'none',
    effectAllowed: 'all',
    files: [],
    items: [],
    types,
    setData: (type: string, value: string) => {
      store.set(type, value);
      if (!types.includes(type)) {
        types.push(type);
      }
    },
    getData: (type: string) => store.get(type) || '',
    clearData: (type?: string) => {
      if (type) {
        store.delete(type);
      } else {
        store.clear();
        types.splice(0, types.length);
      }
    },
  } as DataTransfer;
};

describe('Navbar running apps tray', () => {
  let dispatchSpy: jest.SpyInstance;

  beforeEach(() => {
    dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    window.localStorage.clear();
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

    const button = screen.getByRole('button', { name: /terminal/i });
    fireEvent.click(button);

    const taskbarEventCall = dispatchSpy.mock.calls.find(([event]) => event.type === 'taskbar-command');
    expect(taskbarEventCall).toBeTruthy();
    const [event] = taskbarEventCall!;
    expect(event.detail).toEqual({ appId: 'terminal', action: 'toggle' });
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
                id: 'calculator',
                title: 'Calculator',
                icon: '/themes/Yaru/apps/calc.svg',
                isFocused: false,
                isMinimized: true,
              },
            ],
          },
        }),
      );
    });

    const button = screen.getByRole('button', { name: /calculator/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('data-active', 'false');
    expect(button.querySelector('[data-testid="running-indicator"]')).toBeFalsy();
  });

  it('reorders running apps through drag and drop', () => {
    render(<Navbar />);

    act(() => {
      window.dispatchEvent(new CustomEvent('workspace-state', { detail: multiAppWorkspaceDetail }));
    });

    dispatchSpy.mockClear();

    const list = screen.getByRole('list', { name: /open applications/i });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);

    const [firstItem,, thirdItem] = items;
    Object.defineProperty(thirdItem, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 120, top: 0, right: 120, bottom: 32, height: 32 }),
    });

    const dataTransfer = createDataTransfer();

    act(() => {
      fireEvent.dragStart(firstItem, { dataTransfer });
    });

    expect(dataTransfer.getData('application/x-taskbar-app-id')).toBe('terminal');

    act(() => {
      fireEvent.dragOver(thirdItem, { dataTransfer, clientX: 100 });
    });

    act(() => {
      fireEvent.drop(thirdItem, { dataTransfer, clientX: 100 });
    });

    act(() => {
      fireEvent.dragEnd(firstItem, { dataTransfer });
    });

    const buttons = within(list).getAllByRole('button', { name: /(terminal|calculator|firefox)/i });
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Calculator',
      'Firefox',
      'Terminal',
    ]);

    const taskbarEventCall = dispatchSpy.mock.calls.find(([event]) => event.type === 'taskbar-command');
    expect(taskbarEventCall).toBeTruthy();
    expect(taskbarEventCall && taskbarEventCall[0].detail).toEqual({
      action: 'reorder',
      order: ['calculator', 'firefox', 'terminal'],
    });
  });

  it('renders pinned apps and toggles them even when not running', () => {
    render(<Navbar />);

    act(() => {
      window.dispatchEvent(new CustomEvent('taskbar-pin-request', { detail: { appId: 'calculator', pin: true } }));
    });

    const list = screen.getByRole('list', { name: /open applications/i });
    const pinnedButton = within(list).getByRole('button', { name: /calculator/i });
    expect(pinnedButton).toHaveAttribute('data-pinned', 'true');
    expect(pinnedButton).toHaveAttribute('aria-pressed', 'false');

    dispatchSpy.mockClear();
    fireEvent.click(pinnedButton);

    const taskbarEventCall = dispatchSpy.mock.calls.find(([event]) => event.type === 'taskbar-command');
    expect(taskbarEventCall).toBeTruthy();
    expect(taskbarEventCall && taskbarEventCall[0].detail).toEqual({ appId: 'calculator', action: 'toggle' });
  });

  it('supports reordering pinned apps and persists the order per viewport', () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 1600, configurable: true });

    render(<Navbar />);

    act(() => {
      window.dispatchEvent(new CustomEvent('taskbar-pin-request', { detail: { appId: 'terminal', pin: true } }));
      window.dispatchEvent(new CustomEvent('taskbar-pin-request', { detail: { appId: 'firefox', pin: true } }));
    });

    const list = screen.getByRole('list', { name: /open applications/i });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);

    const [firstItem, secondItem] = items;
    Object.defineProperty(secondItem, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 120, top: 0, right: 120, bottom: 32, height: 32 }),
    });

    const dataTransfer = createDataTransfer();

    act(() => {
      fireEvent.dragStart(firstItem, { dataTransfer });
      fireEvent.dragOver(secondItem, { dataTransfer, clientX: 10 });
      fireEvent.drop(secondItem, { dataTransfer, clientX: 10 });
      fireEvent.dragEnd(firstItem, { dataTransfer });
    });

    const buttons = within(list).getAllByRole('button', { name: /(terminal|firefox)/i });
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Firefox',
      'Terminal',
    ]);

    const stored = window.localStorage.getItem('taskbar-pins:default:wide');
    expect(stored).toBe(JSON.stringify(['firefox', 'terminal']));

    Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
  });
});
