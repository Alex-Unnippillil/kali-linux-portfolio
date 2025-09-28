import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import Ubuntu from '../components/ubuntu';

jest.mock('../components/screen/desktop', () => function DesktopMock() {
  return <div data-testid="desktop" />;
});
jest.mock('../components/screen/navbar', () => function NavbarMock() {
  return <div data-testid="navbar" />;
});
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

  it('handles lockScreen when status bar is missing', () => {
    let instance: Ubuntu | null = null;
    render(<Ubuntu ref={(c) => (instance = c)} />);
    expect(instance).not.toBeNull();
    act(() => {
      instance!.lockScreen();
      jest.advanceTimersByTime(100);
    });
    expect(instance!.state.screen_locked).toBe(true);
  });

  it('handles shutDown when status bar is missing', () => {
    let instance: Ubuntu | null = null;
    render(<Ubuntu ref={(c) => (instance = c)} />);
    expect(instance).not.toBeNull();
    act(() => {
      instance!.shutDown();
    });
    expect(instance!.state.shutDownScreen).toBe(true);
  });

  it('restarts the UI and shows the boot sequence', () => {
    let instance: Ubuntu | null = null;
    render(<Ubuntu ref={(c) => (instance = c)} />);
    expect(instance).not.toBeNull();
    act(() => {
      instance!.restart();
    });
    expect(instance!.state.shutDownScreen).toBe(true);
    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(instance!.state.booting_screen).toBe(true);
  });

  it('resets UI state and reloads the page', () => {
    let instance: Ubuntu | null = null;
    render(<Ubuntu ref={(c) => (instance = c)} />);
    expect(instance).not.toBeNull();
    window.localStorage.setItem('screen-locked', 'true');
    act(() => {
      try {
        instance!.resetUI();
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('navigation')) {
          throw error;
        }
      }
    });

    expect(window.localStorage.getItem('screen-locked')).toBeNull();
  });
});
