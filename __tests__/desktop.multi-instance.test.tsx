import React from 'react';
import { act, render } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => () => <div data-testid="background" />);
jest.mock('../components/base/window', () => (props: { id: string }) => <div data-testid="window" id={props.id} />);
jest.mock('../components/base/ubuntu_app', () => () => <div data-testid="ubuntu-app" />);
jest.mock('../components/screen/all-applications', () => () => <div data-testid="all-apps" />);
jest.mock('../components/screen/shortcut-selector', () => () => <div data-testid="shortcut-selector" />);
jest.mock('../components/screen/window-switcher', () => ({ windows }: { windows: any[] }) => (
  <div data-testid="window-switcher">{windows.length}</div>
));
jest.mock('../components/context-menus/desktop-menu', () => ({
  __esModule: true,
  default: () => <div data-testid="desktop-menu" />,
}));
jest.mock('../components/context-menus/default', () => ({
  __esModule: true,
  default: () => <div data-testid="default-menu" />,
}));
jest.mock('../components/context-menus/app-menu', () => ({
  __esModule: true,
  default: () => <div data-testid="app-menu" />,
}));
jest.mock('../components/context-menus/taskbar-menu', () => ({
  __esModule: true,
  default: () => <div data-testid="taskbar-menu" />,
}));

describe('Desktop multi-instance applications', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const renderDesktop = () => {
    const ref = React.createRef<Desktop>();
    render(
      <Desktop
        ref={ref}
        clearSession={() => {}}
        changeBackgroundImage={() => {}}
        bg_image_name="aurora"
        setSession={() => {}}
        snapEnabled
      />
    );
    act(() => {
      jest.runOnlyPendingTimers();
    });
    return ref;
  };

  const openTerminal = async (desktopRef: React.RefObject<Desktop>) => {
    await act(async () => {
      desktopRef.current?.openApp('terminal');
      jest.runOnlyPendingTimers();
    });
  };

  it('opens multiple instances for apps that allow it', async () => {
    const desktopRef = renderDesktop();

    await openTerminal(desktopRef);
    await openTerminal(desktopRef);

    const instance = desktopRef.current!;
    const openWindows = Object.entries(instance.state.closed_windows)
      .filter(([, closed]) => closed === false)
      .map(([id]) => id);

    expect(openWindows).toEqual(expect.arrayContaining(['terminal#1', 'terminal#2']));
    expect(instance.state.favourite_apps.terminal).toBe(true);

    const terminalSummaries = instance
      .getRunningAppSummaries()
      .filter((app) => app.baseId === 'terminal');

    expect(terminalSummaries).toHaveLength(2);
    expect(new Set(terminalSummaries.map((app) => app.id))).toEqual(new Set(['terminal#1', 'terminal#2']));
    expect(terminalSummaries.map((app) => app.title)).toEqual(
      expect.arrayContaining(['Terminal #1', 'Terminal #2'])
    );
  });

  it('closes a single instance without affecting others', async () => {
    const desktopRef = renderDesktop();

    await openTerminal(desktopRef);
    await openTerminal(desktopRef);

    await act(async () => {
      await desktopRef.current?.closeApp('terminal#1');
    });

    const instance = desktopRef.current!;
    expect(instance.state.closed_windows['terminal#1']).toBeUndefined();
    expect(instance.state.closed_windows['terminal#2']).toBe(false);
    expect(instance.state.minimized_windows['terminal#1']).toBeUndefined();
  });

  it('lists distinct instances in the window switcher', async () => {
    const desktopRef = renderDesktop();

    await openTerminal(desktopRef);
    await openTerminal(desktopRef);

    act(() => {
      desktopRef.current?.openWindowSwitcher();
    });

    const { switcherWindows } = desktopRef.current!.state;
    const titles = switcherWindows
      .filter((window) => window.id.startsWith('terminal#'))
      .map((window) => window.title);

    expect(titles).toEqual(expect.arrayContaining(['Terminal #1', 'Terminal #2']));
  });
});

