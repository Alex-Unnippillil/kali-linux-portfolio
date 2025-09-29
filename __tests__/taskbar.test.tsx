import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Taskbar from '../components/screen/taskbar';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const apps = [
  { id: 'app1', title: 'App One', icon: '/icon1.png' },
  { id: 'app2', title: 'App Two', icon: '/icon2.png' },
];

const createDataTransfer = () => {
  const data: Record<string, string> = {};
  return {
    data,
    setData: (key: string, value: string) => {
      data[key] = value;
    },
    getData: (key: string) => data[key],
    dropEffect: 'move',
    effectAllowed: 'move',
    setDragImage: jest.fn(),
  } as unknown as DataTransfer;
};

describe('Taskbar', () => {
  it('minimizes focused window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    render(
      <Taskbar
        apps={apps}
        pinnedAppIds={['app1']}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: false }}
        focused_windows={{ app1: true }}
        openApp={openApp}
        minimize={minimize}
        onReorderPinnedApps={jest.fn()}
      />
    );
    const button = screen.getByRole('button', { name: /^app one$/i });
    fireEvent.click(button);
    expect(minimize).toHaveBeenCalledWith('app1');
    expect(button).toHaveAttribute('data-context', 'taskbar');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('data-active', 'true');
    expect(button.querySelector('[data-testid="running-indicator"]')).toBeTruthy();
  });

  it('restores minimized window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    render(
      <Taskbar
        apps={apps}
        pinnedAppIds={['app1']}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: true }}
        focused_windows={{ app1: false }}
        openApp={openApp}
        minimize={minimize}
        onReorderPinnedApps={jest.fn()}
      />
    );
    const button = screen.getByRole('button', { name: /^app one$/i });
    fireEvent.click(button);
    expect(openApp).toHaveBeenCalledWith('app1');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('data-active', 'false');
    expect(button.querySelector('[data-testid="running-indicator"]')).toBeFalsy();
  });

  it('announces drag reorder changes', async () => {
    const handleReorder = jest.fn();
    const dataTransfer = createDataTransfer();
    render(
      <Taskbar
        apps={apps}
        pinnedAppIds={['app1', 'app2']}
        closed_windows={{ app1: false, app2: true }}
        minimized_windows={{ app1: false, app2: false }}
        focused_windows={{ app1: false, app2: false }}
        openApp={jest.fn()}
        minimize={jest.fn()}
        onReorderPinnedApps={handleReorder}
      />
    );
    const first = screen.getByRole('button', { name: /^app one$/i });
    const second = screen.getByRole('button', { name: /^app two$/i });
    fireEvent.dragStart(first, { dataTransfer });
    fireEvent.dragOver(second, { dataTransfer });
    fireEvent.drop(second, { dataTransfer });
    await waitFor(() => {
      expect(handleReorder).toHaveBeenCalledWith(['app2', 'app1']);
    });
    const status = screen.getByRole('status');
    await waitFor(() => {
      expect(status).toHaveTextContent(/app one moved to position 2/i);
    });
  });

  it('supports keyboard reorder controls', () => {
    const handleReorder = jest.fn();
    render(
      <Taskbar
        apps={apps}
        pinnedAppIds={['app1', 'app2']}
        closed_windows={{ app1: true, app2: true }}
        minimized_windows={{}}
        focused_windows={{}}
        openApp={jest.fn()}
        minimize={jest.fn()}
        onReorderPinnedApps={handleReorder}
      />
    );
    const moveRight = screen.getByRole('button', { name: /move app one right/i });
    fireEvent.click(moveRight);
    expect(handleReorder).toHaveBeenCalledWith(['app2', 'app1']);
  });
});
