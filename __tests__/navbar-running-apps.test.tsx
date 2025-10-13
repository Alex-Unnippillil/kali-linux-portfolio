import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import Navbar from '../components/screen/navbar';
import { clearRecentAppHistory, getRecentAppHistory } from '../utils/recentStorage';

jest.mock('../components/util-components/clock', () => {
  const MockClock = () => <div data-testid="clock" />;
  MockClock.displayName = 'MockClock';
  return MockClock;
});
jest.mock('../components/util-components/status', () => {
  const MockStatus = () => <div data-testid="status" />;
  MockStatus.displayName = 'MockStatus';
  return MockStatus;
});
jest.mock('../components/ui/QuickSettings', () => {
  const MockQuickSettings = ({ open }: { open: boolean }) => (
    <div data-testid="quick-settings">{open ? 'open' : 'closed'}</div>
  );
  MockQuickSettings.displayName = 'MockQuickSettings';
  return MockQuickSettings;
});
jest.mock('../components/menu/WhiskerMenu', () => {
  const MockWhiskerMenu = () => <button type="button">Menu</button>;
  MockWhiskerMenu.displayName = 'MockWhiskerMenu';
  return MockWhiskerMenu;
});
jest.mock('../components/ui/PerformanceGraph', () => {
  const MockPerformanceGraph = () => <div data-testid="performance" />;
  MockPerformanceGraph.displayName = 'MockPerformanceGraph';
  return MockPerformanceGraph;
});
jest.mock('../utils/recentStorage', () => {
  const actual = jest.requireActual('../utils/recentStorage');
  return {
    ...actual,
    getRecentAppHistory: jest.fn(),
    clearRecentAppHistory: jest.fn(),
  };
});

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

const multiAppWorkspaceDetail = {
  ...workspaceEventDetail,
  runningApps: [
    {
      id: 'app1',
      title: 'App One',
      icon: '/icon.png',
      isFocused: true,
      isMinimized: false,
    },
    {
      id: 'app2',
      title: 'App Two',
      icon: '/icon.png',
      isFocused: false,
      isMinimized: false,
    },
    {
      id: 'app3',
      title: 'App Three',
      icon: '/icon.png',
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

const mockedGetRecentAppHistory = getRecentAppHistory as jest.MockedFunction<typeof getRecentAppHistory>;
const mockedClearRecentAppHistory = clearRecentAppHistory as jest.MockedFunction<typeof clearRecentAppHistory>;

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

beforeEach(() => {
  mockedGetRecentAppHistory.mockReset();
  mockedClearRecentAppHistory.mockReset();
  mockedGetRecentAppHistory.mockReturnValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

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

    expect(dataTransfer.getData('application/x-taskbar-app-id')).toBe('app1');

    act(() => {
      fireEvent.dragOver(thirdItem, { dataTransfer, clientX: 100 });
    });

    act(() => {
      fireEvent.drop(thirdItem, { dataTransfer, clientX: 100 });
    });

    act(() => {
      fireEvent.dragEnd(firstItem, { dataTransfer });
    });

    const buttons = within(list).getAllByRole('button', { name: /app/i });
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'App Two',
      'App Three',
      'App One',
    ]);

    const taskbarEventCall = dispatchSpy.mock.calls.find(([event]) => event.type === 'taskbar-command');
    expect(taskbarEventCall).toBeTruthy();
    expect(taskbarEventCall && taskbarEventCall[0].detail).toEqual({
      action: 'reorder',
      order: ['app2', 'app3', 'app1'],
    });
  });

  it('shows recent history items and allows clearing them from the context menu', async () => {
    const events = [
      { type: 'open' as const, timestamp: Date.UTC(2024, 0, 2, 5, 10) },
      { type: 'close' as const, timestamp: Date.UTC(2024, 0, 1, 3, 15) },
    ];
    mockedGetRecentAppHistory.mockReturnValue(events);

    render(<Navbar />);

    act(() => {
      window.dispatchEvent(new CustomEvent('workspace-state', { detail: workspaceEventDetail }));
    });

    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.contextMenu(button);

    const menu = await screen.findByRole('menu');
    const items = within(menu).getAllByRole('menuitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(`Opened ${formatTimestamp(events[0].timestamp)}`);
    expect(items[1]).toHaveTextContent(`Closed ${formatTimestamp(events[1].timestamp)}`);

    dispatchSpy.mockClear();
    fireEvent.click(items[0]);

    const taskbarEventCall = dispatchSpy.mock.calls.find(([event]) => event.type === 'taskbar-command');
    expect(taskbarEventCall).toBeTruthy();
    expect(taskbarEventCall && taskbarEventCall[0].detail).toEqual({ appId: 'app1', action: 'open' });

    fireEvent.contextMenu(button);
    const menuAfter = await screen.findByRole('menu');
    const itemsAfter = within(menuAfter).getAllByRole('menuitem');
    const clearItem = itemsAfter[itemsAfter.length - 1];
    fireEvent.click(clearItem);

    expect(mockedClearRecentAppHistory).toHaveBeenCalledWith('app1');
  });

  it('opens the context menu on long press interactions', async () => {
    jest.useFakeTimers();

    render(<Navbar />);

    act(() => {
      window.dispatchEvent(new CustomEvent('workspace-state', { detail: workspaceEventDetail }));
    });

    const button = screen.getByRole('button', { name: /app one/i });
    const contextSpy = jest.fn();
    button.addEventListener('contextmenu', contextSpy);

    act(() => {
      fireEvent.pointerDown(button, { pointerType: 'touch', button: 0, clientX: 24, clientY: 36 });
    });

    act(() => {
      jest.advanceTimersByTime(650);
    });

    expect(contextSpy).toHaveBeenCalled();

    act(() => {
      fireEvent.pointerUp(button, { pointerType: 'touch' });
    });
    button.removeEventListener('contextmenu', contextSpy);
  });
});
