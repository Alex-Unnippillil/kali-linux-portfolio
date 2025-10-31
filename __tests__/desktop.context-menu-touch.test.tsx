import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';
import ReactGA from 'react-ga4';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

jest.mock('next/image', () => {
  function MockNextImage({ src, alt, ...rest }: any) {
    return <img src={src} alt={alt} {...rest} />;
  }
  MockNextImage.displayName = 'MockNextImage';
  return { __esModule: true, default: MockNextImage };
});

jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));

jest.mock('../components/util-components/background-image', () => {
  const MockBackground = () => <div data-testid="background" />;
  MockBackground.displayName = 'MockBackgroundImage';
  return { __esModule: true, default: MockBackground };
});

jest.mock('../components/base/window', () => {
  const React = require('react');
  const MockWindow = React.forwardRef((props: any, ref: React.Ref<HTMLDivElement>) => {
    return (
      <div data-testid={`window-${props.id}`}>
        <div ref={ref} data-context="window" data-app-id={props.id}>
          {props.title}
        </div>
      </div>
    );
  });
  MockWindow.displayName = 'MockWindow';
  return { __esModule: true, default: MockWindow };
});

jest.mock('../components/base/SystemOverlayWindow', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="system-overlay">{children}</div>,
}));

jest.mock('../components/context-menus/desktop-menu', () => ({
  __esModule: true,
  default: ({ active }: { active: boolean }) => (active ? <div id="desktop-menu" data-testid="desktop-menu" /> : <div id="desktop-menu" style={{ display: 'none' }} />),
}));

jest.mock('../components/context-menus/default', () => ({
  __esModule: true,
  default: ({ active }: { active: boolean }) => (active ? <div id="default-menu" data-testid="default-menu" /> : <div id="default-menu" style={{ display: 'none' }} />),
}));

jest.mock('../components/context-menus/app-menu', () => ({
  __esModule: true,
  default: ({ active }: { active: boolean }) => (active ? <div id="app-menu" data-testid="app-menu" /> : <div id="app-menu" style={{ display: 'none' }} />),
}));

jest.mock('../components/context-menus/taskbar-menu', () => ({
  __esModule: true,
  default: ({ active }: { active: boolean }) => (active ? <div id="taskbar-menu" data-testid="taskbar-menu" /> : <div id="taskbar-menu" style={{ display: 'none' }} />),
}));

const createPointerState = (target: Element, overrides?: Partial<PointerEventInit>) => ({
  pointerId: overrides?.pointerId ?? 1,
  pointerType: overrides?.pointerType ?? 'touch',
  clientX: overrides?.clientX ?? 40,
  clientY: overrides?.clientY ?? 50,
  pageX: overrides?.pageX ?? 40,
  pageY: overrides?.pageY ?? 50,
  target,
});

describe('Desktop touch context menus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }),
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  const renderDesktop = () => {
    const desktopRef = React.createRef<Desktop>();
    const result = render(
      <Desktop
        ref={desktopRef}
        clearSession={() => {}}
        changeBackgroundImage={() => {}}
        bg_image_name="aurora"
        snapEnabled
      />
    );

    act(() => {
      jest.runOnlyPendingTimers();
    });

    return { desktopRef, ...result };
  };

  const runShortTap = async (instance: Desktop, target: Element, pointerId: number) => {
    const baseEvent = createPointerState(target, { pointerId });
    await act(async () => {
      instance.handleContextPointerDown(baseEvent as any);
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await act(async () => {
      instance.handleContextPointerUp({
        ...baseEvent,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as any);
    });
  };

  const runLongPress = async (instance: Desktop, target: Element, pointerId: number) => {
    const baseEvent = createPointerState(target, { pointerId });
    await act(async () => {
      instance.handleContextPointerDown(baseEvent as any);
    });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    return baseEvent;
  };

  it('distinguishes long press from tap on the desktop area', async () => {
    const { desktopRef, unmount } = renderDesktop();
    const desktopArea = await waitFor(() => {
      const node = document.querySelector('[data-context="desktop-area"]');
      expect(node).toBeTruthy();
      return node as Element;
    });
    const instance = desktopRef.current!;

    await runShortTap(instance, desktopArea!, 1);
    expect(instance.state.context_menus.desktop).toBe(false);
    expect(ReactGA.event).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'Opened Desktop Context Menu' }));

    const longPressEvent = await runLongPress(instance, desktopArea!, 2);
    await waitFor(() => {
      expect(instance.state.context_menus.desktop).toBe(true);
    });
    expect(ReactGA.event).toHaveBeenCalledWith(expect.objectContaining({ action: 'Opened Desktop Context Menu' }));
    await act(async () => {
      instance.handleContextPointerUp({
        ...longPressEvent,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as any);
    });
    unmount();
  });

  it('distinguishes long press from tap on desktop icons', async () => {
    const { desktopRef, unmount } = renderDesktop();
    const icon = await waitFor(() => {
      const node = document.querySelector('[data-context="app"]');
      expect(node).toBeTruthy();
      return node as Element;
    });

    const instance = desktopRef.current!;
    await runShortTap(instance, icon!, 3);
    expect(instance.state.context_menus.app).toBe(false);

    const longPressEvent = await runLongPress(instance, icon!, 4);
    await waitFor(() => {
      expect(instance.state.context_menus.app).toBe(true);
    });
    expect(ReactGA.event).toHaveBeenCalledWith(expect.objectContaining({ action: 'Opened App Context Menu' }));
    await act(async () => {
      instance.handleContextPointerUp({
        ...longPressEvent,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as any);
    });

    unmount();
  });

  it('distinguishes long press from tap on taskbar buttons', async () => {
    const { desktopRef, unmount } = renderDesktop();

    await act(async () => {
      desktopRef.current?.openApp('terminal');
    });
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    const instance = desktopRef.current!;
    const taskbarButton = document.createElement('button');
    taskbarButton.dataset.context = 'taskbar';
    taskbarButton.dataset.appId = 'terminal';
    document.body.appendChild(taskbarButton);

    await runShortTap(instance, taskbarButton, 5);
    expect(instance.state.context_menus.taskbar).toBe(false);

    const longPressEvent = await runLongPress(instance, taskbarButton, 6);
    await waitFor(() => {
      expect(instance.state.context_menus.taskbar).toBe(true);
    });
    expect(ReactGA.event).toHaveBeenCalledWith(expect.objectContaining({ action: 'Opened Taskbar Context Menu' }));
    await act(async () => {
      instance.handleContextPointerUp({
        ...longPressEvent,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as any);
    });

    document.body.removeChild(taskbarButton);
    unmount();
  });

  it('distinguishes long press from tap on window chrome', async () => {
    const { desktopRef, unmount } = renderDesktop();
    const titlebar = await waitFor(() => {
      const node = document.querySelector('[data-context="window"]');
      expect(node).toBeTruthy();
      return node as Element;
    });

    const instance = desktopRef.current!;
    await runShortTap(instance, titlebar!, 7);
    expect(instance.state.context_menus.default).toBe(false);

    const longPressEvent = await runLongPress(instance, titlebar!, 8);
    await waitFor(() => {
      expect(instance.state.context_menus.default).toBe(true);
    });
    expect(ReactGA.event).toHaveBeenCalledWith(expect.objectContaining({ action: 'Opened Default Context Menu' }));
    await act(async () => {
      instance.handleContextPointerUp({
        ...longPressEvent,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as any);
    });

    unmount();
  });
});
