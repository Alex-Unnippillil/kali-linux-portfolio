import React, { useContext, useEffect, useRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

function createMockComponent(
  name: string,
  renderer: () => JSX.Element
) {
  const Component = () => renderer();
  Component.displayName = name;
  return Component;
}

jest.mock('next/dynamic', () => () => {
  const DynamicStub = () => null;
  DynamicStub.displayName = 'DynamicStub';
  return DynamicStub;
});

jest.mock('../components/util-components/background-image', () =>
  createMockComponent('MockBackgroundImage', () => (
    <div data-testid="background-image" />
  ))
);

jest.mock('../components/screen/side_bar', () =>
  createMockComponent('MockSideBar', () => <div data-testid="sidebar" />)
);

jest.mock('../components/base/window', () => {
  const MockWindow = ({ title }: { title: string }) => (
    <div role="dialog" aria-label={`${title} window`} />
  );
  MockWindow.displayName = 'MockWindow';
  return {
    __esModule: true,
    default: MockWindow,
  };
});

jest.mock('../components/context-menus/desktop-menu', () =>
  createMockComponent('MockDesktopMenu', () => (
    <div data-testid="desktop-menu" />
  ))
);

jest.mock('../components/context-menus/default', () =>
  createMockComponent('MockDefaultMenu', () => (
    <div data-testid="default-menu" />
  ))
);

jest.mock('../components/context-menus/app-menu', () =>
  createMockComponent('MockAppMenu', () => (
    <div data-testid="app-menu" />
  ))
);

jest.mock('../components/context-menus/taskbar-menu', () =>
  createMockComponent('MockTaskbarMenu', () => (
    <div data-testid="taskbar-menu" />
  ))
);

jest.mock('../components/screen/window-switcher', () =>
  createMockComponent('MockWindowSwitcher', () => (
    <div data-testid="window-switcher" />
  ))
);

jest.mock('../components/screen/shortcut-selector', () =>
  createMockComponent('MockShortcutSelector', () => (
    <div data-testid="shortcut-selector" />
  ))
);

jest.mock('../apps.config', () => ({
  __esModule: true,
  default: [
    {
      id: 'about-alex',
      title: 'About Alex',
      icon: '/icons/about.png',
      favourite: false,
      disabled: false,
      desktop_shortcut: false,
      screen: () => null,
    },
  ],
  games: [],
}));

import { Desktop } from '../components/screen/desktop';
import Taskbar from '../components/screen/taskbar';
import AllApplications from '../components/screen/all-applications';
import {
  NotificationCenter,
  NotificationsContext,
} from '../components/common/NotificationCenter';

describe('Desktop accessibility landmarks', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('exposes labelled main region and live announcements', () => {
    const { unmount } = render(
      <Desktop
        session={{}}
        setSession={jest.fn()}
        clearSession={jest.fn()}
      />
    );

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(
      screen.getByRole('main', { name: 'Desktop workspace' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Open windows' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('desktop-live-region')).toHaveAttribute(
      'aria-live',
      'polite'
    );

    unmount();
  });
});

describe('Taskbar roles', () => {
  it('labels the taskbar navigation and running app buttons', () => {
    const props = {
      apps: [
        { id: 'app-1', title: 'Analyzer', icon: '/icons/a.png' },
        { id: 'app-2', title: 'Logs', icon: '/icons/b.png' },
      ],
      closed_windows: { 'app-1': false, 'app-2': false },
      minimized_windows: { 'app-1': false, 'app-2': true },
      focused_windows: { 'app-1': true, 'app-2': false },
      openApp: jest.fn(),
      minimize: jest.fn(),
    };

    render(<Taskbar {...props} />);

    expect(
      screen.getByRole('navigation', { name: 'Taskbar' })
    ).toBeInTheDocument();

    const analyzerButton = screen.getByRole('button', { name: 'Analyzer' });
    expect(analyzerButton).toHaveAttribute('aria-pressed', 'true');
    expect(analyzerButton).toHaveAttribute('aria-current', 'true');

    const logsButton = screen.getByRole('button', { name: 'Logs' });
    expect(logsButton).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('Application launcher dialog', () => {
  it('announces dialog semantics and searchable grid', () => {
    render(
      <AllApplications
        apps={[{ id: 'app-1', title: 'Analyzer', icon: '/icons/a.png' }]}
        games={[]}
        openApp={jest.fn()}
      />
    );

    expect(
      screen.getByRole('dialog', { name: 'Application launcher' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Search applications' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Application shortcuts' })
    ).toBeInTheDocument();
  });
});

describe('Notification center live regions', () => {
  it('provides labelled notification region and list items', async () => {
    const Collector = () => {
      const ctx = useContext(NotificationsContext);
      const hasPushedRef = useRef(false);
      if (!ctx) throw new Error('Missing context');
      useEffect(() => {
        if (hasPushedRef.current) return;
        hasPushedRef.current = true;
        ctx.pushNotification('Terminal', 'Job finished');
      }, [ctx]);
      return null;
    };

    render(
      <NotificationCenter>
        <Collector />
      </NotificationCenter>
    );

    expect(
      screen.getByRole('region', { name: 'Notification center' })
    ).toBeInTheDocument();
    const items = await screen.findAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Job finished');
  });
});

export { Desktop } from '../components/screen/desktop';
export { default as Taskbar } from '../components/screen/taskbar';
export { default as AllApplications } from '../components/screen/all-applications';
export {
  NotificationCenter,
  NotificationsContext,
} from '../components/common/NotificationCenter';
