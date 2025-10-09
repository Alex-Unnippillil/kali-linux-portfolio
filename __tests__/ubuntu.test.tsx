import React, { act } from 'react';
import { render, screen } from '@testing-library/react';

import Ubuntu, { UbuntuHandle } from '../components/ubuntu';

let bootingScreenSnapshot: { visible: boolean; isShutDown: boolean } | null = null;
let lockScreenSnapshot: { isLocked: boolean } | null = null;

jest.mock('../components/screen/desktop', () =>
  function DesktopMock() {
    return <div data-testid="desktop" />;
  },
);

jest.mock('../components/screen/navbar', () =>
  function NavbarMock() {
    return <div data-testid="navbar" />;
  },
);

jest.mock('../components/screen/lock_screen', () => ({
  __esModule: true,
  default: ({ isLocked }: { isLocked: boolean }) => {
    lockScreenSnapshot = { isLocked };
    return <div data-testid="lock-screen" data-locked={isLocked} />;
  },
}));

jest.mock('../components/screen/booting_screen', () => ({
  __esModule: true,
  default: ({ visible, isShutDown }: { visible: boolean; isShutDown: boolean }) => {
    bootingScreenSnapshot = { visible, isShutDown };
    const isVisible = visible || isShutDown;
    return (
      <div data-testid="booting-screen" className={isVisible ? 'visible' : 'invisible'}>
        <img alt="Ubuntu Logo" />
      </div>
    );
  },
}));

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

describe('Ubuntu component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    bootingScreenSnapshot = null;
    lockScreenSnapshot = null;
    window.localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    window.localStorage.clear();
  });

  it('renders boot screen then desktop', () => {
    render(<Ubuntu />);
    const bootLogo = screen.getByAltText('Ubuntu Logo');
    const bootScreen = bootLogo.parentElement as HTMLElement;
    expect(bootScreen).toHaveClass('visible');

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(bootScreen).toHaveClass('invisible');
    expect(screen.getByTestId('desktop')).toBeInTheDocument();
  });

  it('handles lockScreen when status bar is missing', () => {
    const ref = React.createRef<UbuntuHandle>();
    render(<Ubuntu ref={ref} />);
    expect(ref.current).not.toBeNull();
    act(() => {
      ref.current!.lockScreen();
    });
    expect(lockScreenSnapshot?.isLocked).toBe(true);
  });

  it('handles shutDown when status bar is missing', () => {
    const ref = React.createRef<UbuntuHandle>();
    render(<Ubuntu ref={ref} />);
    expect(ref.current).not.toBeNull();
    act(() => {
      ref.current!.shutDown();
    });
    expect(bootingScreenSnapshot?.isShutDown).toBe(true);
  });
});
