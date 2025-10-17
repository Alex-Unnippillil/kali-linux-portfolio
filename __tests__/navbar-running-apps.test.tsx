import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import Navbar from '../components/screen/navbar';

jest.mock('../components/util-components/clock', () => () => <div data-testid="clock" />);
jest.mock('../components/util-components/status', () => () => <div data-testid="status" />);
jest.mock('../components/ui/QuickSettings', () => ({ open }: { open: boolean }) => (
  <div data-testid="quick-settings">{open ? 'open' : 'closed'}</div>
));
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

const groupedAppWorkspaceDetail = {
  ...workspaceEventDetail,
  runningApps: [
    {
      id: 'editor#1',
      appId: 'editor',
      windowId: 'editor#1',
      appTitle: 'Editor',
      title: 'Editor - Notes',
      icon: '/editor.png',
      isFocused: true,
      isMinimized: false,
      preview: 'data:image/png;base64,AAA=',
    },
    {
      id: 'editor#2',
      appId: 'editor',
      windowId: 'editor#2',
      appTitle: 'Editor',
      title: 'Editor - Report',
      icon: '/editor.png',
      isFocused: false,
      isMinimized: false,
    },
    {
      id: 'terminal',
      title: 'Terminal',
      icon: '/terminal.png',
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

  it('groups multiple windows per app and opens flyout menu', () => {
    render(<Navbar />);

    act(() => {
      window.dispatchEvent(new CustomEvent('workspace-state', { detail: groupedAppWorkspaceDetail }));
    });

    dispatchSpy.mockClear();

    const list = screen.getByRole('list', { name: /open applications/i });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);

    const editorButton = within(items[0]).getByRole('button', { name: /editor/i });
    expect(editorButton).toHaveAttribute('data-has-multiple', 'true');
    expect(editorButton).toHaveAttribute('aria-haspopup', 'menu');
    expect(editorButton).toHaveAttribute('aria-expanded', 'false');

    act(() => {
      fireEvent.keyDown(editorButton, { key: 'ArrowDown' });
    });

    expect(editorButton).toHaveAttribute('aria-expanded', 'true');

    const menu = screen.getByRole('menu', { name: /editor/i });
    const menuItems = within(menu).getAllByRole('menuitem');
    expect(menuItems).toHaveLength(2);
    expect(menuItems[0]).toHaveTextContent('Editor - Notes');
    expect(menuItems[1]).toHaveTextContent('Editor - Report');

    act(() => {
      fireEvent.click(menuItems[1]);
    });

    const taskbarEventCall = dispatchSpy.mock.calls.find(([event]) => event.type === 'taskbar-command');
    expect(taskbarEventCall).toBeTruthy();
    expect(taskbarEventCall && taskbarEventCall[0].detail).toEqual({
      appId: 'editor',
      action: 'focus',
      windowId: 'editor#2',
    });
  });
});
