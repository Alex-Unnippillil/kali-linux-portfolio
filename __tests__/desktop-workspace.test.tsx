import React, { act } from 'react';
import { render, fireEvent } from '@testing-library/react';
import Desktop from '../components/screen/desktop';

jest.mock('../components/util-components/background-image', () => () => null);
jest.mock('../components/screen/side_bar', () => () => null);
jest.mock('../components/base/window', () => (props: any) => (
  <div data-testid={`window-${props.id}`} />
));
jest.mock('../components/base/ubuntu_app', () => () => null);
jest.mock('../components/screen/all-applications', () => () => null);
jest.mock('../components/screen/shortcut-selector', () => () => null);
jest.mock('../components/context-menus/desktop-menu', () => () => null);
jest.mock('../components/context-menus/default', () => () => null);
jest.mock('../components/context-menus/app-menu', () => () => null);
jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('../utils/safeStorage', () => ({ safeLocalStorage: { getItem: jest.fn(), setItem: jest.fn() } }));
jest.mock('../apps.config', () => ({
  __esModule: true,
  default: [
    {
      id: 'test-app',
      title: 'Test App',
      icon: '',
      disabled: false,
      favourite: false,
      desktop_shortcut: false,
      screen: () => null,
    },
  ],
  games: [],
}));

describe('Desktop workspaces', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('cycles active workspace with keyboard shortcut', () => {
    let instance: any = null;
    render(
      <Desktop
        ref={(c) => (instance = c)}
        session={{ windows: [{ id: 'test-app', x: 0, y: 0 }], dock: [] }}
        setSession={jest.fn()}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(instance.state.activeWorkspace).toBe(0);
    expect(document.querySelector('[data-testid="window-test-app"]')).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document, { key: 'ArrowRight', ctrlKey: true, metaKey: true });
    });

    expect(instance.state.activeWorkspace).toBe(1);
    expect(document.querySelector('[data-testid="window-test-app"]')).not.toBeInTheDocument();
  });
});

