import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('next/dynamic', () => () => {
  const Stub = () => null;
  Stub.displayName = 'DynamicStub';
  return Stub;
});

jest.mock('../components/util-components/background-image', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/base/ubuntu_app', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/screen/all-applications', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/screen/shortcut-selector', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/screen/window-switcher', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/context-menus/desktop-menu', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/context-menus/default', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/context-menus/app-menu', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/context-menus/taskbar-menu', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/base/window', () => {
  const React = require('react');
  const Window = ({ id, focus, title, zIndex, isFocused }) =>
    React.createElement(
      'div',
      {
        id,
        role: 'group',
        'data-testid': `window-${id}`,
        'data-title': title,
        'data-focused': isFocused ? 'true' : 'false',
        style: { zIndex },
        onPointerDown: () => focus(id),
      },
      React.createElement('span', null, title),
    );
  return {
    __esModule: true,
    default: Window,
  };
});

jest.mock('../apps.config', () => ({
  __esModule: true,
  default: [
    {
      id: 'alpha',
      title: 'Alpha',
      icon: '/alpha.svg',
      desktop_shortcut: false,
      favourite: false,
      disabled: false,
      resizable: true,
      allowMaximize: true,
      screen: () => <div>Alpha</div>,
    },
    {
      id: 'beta',
      title: 'Beta',
      icon: '/beta.svg',
      desktop_shortcut: false,
      favourite: false,
      disabled: false,
      resizable: true,
      allowMaximize: true,
      screen: () => <div>Beta</div>,
    },
  ],
  games: [],
}));

jest.mock('../utils/safeStorage', () => ({
  __esModule: true,
  safeLocalStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
  },
}));

jest.mock('../utils/recentStorage', () => ({
  __esModule: true,
  addRecentApp: jest.fn(),
}));

jest.mock('../utils/windowLayout', () => ({
  __esModule: true,
  clampWindowTopPosition: jest.fn((value) => value ?? 0),
  getSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
  measureWindowTopOffset: jest.fn(() => 0),
}));

jest.mock('../hooks/usePersistentState', () => ({
  __esModule: true,
  useSnapSetting: () => [false],
}));

jest.mock('react-ga4', () => ({
  send: jest.fn(),
  event: jest.fn(),
}));

jest.mock('html-to-image', () => ({
  toPng: jest.fn(() => Promise.resolve('data:image/png;base64,')),
}));

describe('Desktop window z-ordering', () => {
  let warnSpy: jest.SpyInstance;
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    warnSpy.mockRestore();
  });

  it('updates windowStack and focused_windows on click focus', async () => {
    const ref = React.createRef<Desktop>();
    render(
      <Desktop
        ref={ref}
        session={{}}
        setSession={jest.fn()}
        clearSession={jest.fn()}
        snapEnabled={false}
      />,
    );

    expect(ref.current).toBeTruthy();

    act(() => {
      ref.current?.openApp('alpha');
      ref.current?.openApp('beta');
      jest.advanceTimersByTime(250);
    });

    await waitFor(() => {
      expect(ref.current?.state.closed_windows.alpha).toBe(false);
      expect(ref.current?.state.closed_windows.beta).toBe(false);
    });

    expect(ref.current?.state.windowStack).toEqual(['beta', 'alpha']);
    expect(ref.current?.state.focused_windows.beta).toBe(true);

    const alphaWindow = await screen.findByTestId('window-alpha');

    act(() => {
      fireEvent.pointerDown(alphaWindow);
    });

    await waitFor(() => {
      expect(ref.current?.state.focused_windows.alpha).toBe(true);
    });

    expect(ref.current?.state.focused_windows.beta).toBe(false);
    expect(ref.current?.state.windowStack).toEqual(['alpha', 'beta']);
  });
});
