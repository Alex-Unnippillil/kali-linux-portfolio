import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import Ubuntu from '../components/ubuntu';

jest.mock('../components/screen/desktop', () => function DesktopMock() {
  return <div data-testid="desktop" />;
});
jest.mock('../components/screen/navbar', () =>
  function NavbarMock({ statusBarRef }: { statusBarRef?: React.RefObject<HTMLDivElement> }) {
    return <div data-testid="navbar" tabIndex={0} ref={statusBarRef} />;
  },
);
jest.mock('../components/screen/lock_screen', () => function LockScreenMock() {
  return <div data-testid="lock-screen" />;
});
jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

describe('Ubuntu component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
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

  it('handles lockScreen when status bar ref is null', () => {
    let instance: Ubuntu | null = null;
    render(<Ubuntu ref={(c) => (instance = c)} />);
    expect(instance).not.toBeNull();
    instance!.statusBarRef.current = null;
    act(() => {
      instance!.lockScreen();
      jest.advanceTimersByTime(100);
    });
    expect(instance!.state.screen_locked).toBe(true);
  });

  it('handles shutDown when status bar ref is null', () => {
    let instance: Ubuntu | null = null;
    render(<Ubuntu ref={(c) => (instance = c)} />);
    expect(instance).not.toBeNull();
    instance!.statusBarRef.current = null;
    act(() => {
      instance!.shutDown();
    });
    expect(instance!.state.shutDownScreen).toBe(true);
  });

  it('blurs the status bar via ref when locking the screen', () => {
    let instance: Ubuntu | null = null;
    render(<Ubuntu ref={(c) => (instance = c)} />);
    expect(instance).not.toBeNull();

    const statusBar = screen.getByTestId('navbar');
    statusBar.focus();
    expect(statusBar).toHaveFocus();

    act(() => {
      instance!.lockScreen();
      jest.advanceTimersByTime(100);
    });

    expect(statusBar).not.toHaveFocus();
  });

  it('blurs the status bar via ref when shutting down', () => {
    let instance: Ubuntu | null = null;
    render(<Ubuntu ref={(c) => (instance = c)} />);
    expect(instance).not.toBeNull();

    const statusBar = screen.getByTestId('navbar');
    statusBar.focus();
    expect(statusBar).toHaveFocus();

    act(() => {
      instance!.shutDown();
    });

    expect(statusBar).not.toHaveFocus();
  });
});
