import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Desktop from '../components/screen/desktop';
import { clearSessionProviders } from '../utils/sessionStore';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn(() => Promise.resolve('data:image/png;base64,')) }));

jest.mock('../components/base/window', () => {
  const React = require('react');
  return function WindowMock(props: any) {
    React.useEffect(() => {
      if (props.onPositionChange) {
        props.onPositionChange(props.initialX ?? 60, props.initialY ?? 10);
      }
    }, [props.onPositionChange, props.initialX, props.initialY]);
    return (
      <div data-testid={`window-${props.id}`} id={props.id}>
        {props.screen(props.addFolder, props.openApp, props.sessionState)}
      </div>
    );
  };
});

jest.mock('../components/screen/side_bar', () => () => null);
jest.mock('../components/screen/taskbar', () => () => null);
jest.mock('../components/context-menus/desktop-menu', () => () => null);
jest.mock('../components/context-menus/default', () => () => null);
jest.mock('../components/context-menus/app-menu', () => () => null);
jest.mock('../components/context-menus/taskbar-menu', () => () => null);
jest.mock('../components/screen/all-applications', () => () => null);
jest.mock('../components/screen/shortcut-selector', () => () => null);
jest.mock('../components/screen/window-switcher', () => () => null);
jest.mock('../components/util-components/background-image', () => () => null);

jest.mock('../apps.config', () => {
  const React = require('react');
  const { registerSessionProvider } = require('../utils/sessionStore');

  const AboutApp = () => <div data-testid="about-app">About</div>;

  function TestApp({ session }: { session?: { value?: string } }) {
    const [value, setValue] = React.useState(session?.value || '');
    React.useEffect(() => {
      const unregister = registerSessionProvider('test-app', () => ({ value }));
      return unregister;
    }, [value]);
    return (
      <label>
        <span className="sr-only">Value</span>
        <input
          data-testid="app-input"
          value={value}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setValue(event.target.value)}
        />
      </label>
    );
  }

  const apps = [
    {
      id: 'about-alex',
      title: 'About',
      icon: '',
      disabled: false,
      favourite: true,
      desktop_shortcut: false,
      screen: () => <AboutApp />,
    },
    {
      id: 'test-app',
      title: 'Test App',
      icon: '',
      disabled: false,
      favourite: false,
      desktop_shortcut: false,
      screen: (_addFolder: any, _openApp: any, session: any) => <TestApp session={session} />,
    },
  ];

  return Object.assign(apps, { games: [], utilities: [] });
});

const renderDesktop = () =>
  render(
    <Desktop
      bg_image_name="wall-2"
      changeBackgroundImage={() => {}}
    />,
  );

describe('Desktop session restore banner', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    localStorage.clear();
    clearSessionProviders();
  });

  it('restores previous windows when the user accepts the prompt', async () => {
    localStorage.setItem(
      'desktop-session',
      JSON.stringify({
        windows: [
          {
            id: 'test-app',
            x: 120,
            y: 80,
            minimized: false,
            snapshot: { value: 'persisted' },
          },
        ],
        dock: ['about-alex'],
        pendingRestore: true,
        lastUpdated: Date.now() - 60000,
      }),
    );

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderDesktop();

    expect(await screen.findByText(/restore session/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /restore/i }));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    const input = await screen.findByTestId('app-input');
    expect((input as HTMLInputElement).value).toBe('persisted');

    await user.clear(input);
    await user.type(input, 'updated');

    await act(async () => {
      jest.advanceTimersByTime(16000);
    });

    const stored = JSON.parse(localStorage.getItem('desktop-session') || '{}');
    expect(stored.windows[0].snapshot.value).toBe('updated');
    expect(stored.pendingRestore).toBe(true);

    await act(async () => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    const finalSession = JSON.parse(localStorage.getItem('desktop-session') || '{}');
    expect(finalSession.pendingRestore).toBe(false);
  });

  it('clears stored windows when the user starts fresh', async () => {
    localStorage.setItem(
      'desktop-session',
      JSON.stringify({
        windows: [
          {
            id: 'test-app',
            x: 50,
            y: 40,
            minimized: false,
            snapshot: { value: 'persisted' },
          },
        ],
        dock: ['about-alex'],
        pendingRestore: true,
        lastUpdated: Date.now() - 120000,
      }),
    );

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderDesktop();

    expect(await screen.findByText(/restore session/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /start fresh/i }));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.queryByText(/restore session/i)).not.toBeInTheDocument();
    expect(await screen.findByTestId('about-app')).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem('desktop-session') || '{}');
    expect(stored.windows).toHaveLength(0);
    expect(stored.pendingRestore).toBe(false);
  });
});

