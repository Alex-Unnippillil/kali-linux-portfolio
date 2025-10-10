import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import Ubuntu from '../components/ubuntu';
import { getBootAnimationPreferenceSync } from '../utils/settingsStore';

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
jest.mock('../utils/settingsStore', () => {
  const actual = jest.requireActual('../utils/settingsStore');
  return {
    ...actual,
    getBootAnimationPreferenceSync: jest.fn().mockReturnValue('default'),
  };
});

const mockedGetBootAnimationPreference = getBootAnimationPreferenceSync as jest.MockedFunction<
  typeof getBootAnimationPreferenceSync
>;

describe('Ubuntu component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
    mockedGetBootAnimationPreference.mockReturnValue('default');
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
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

  it('skips boot animation when preference requests it', () => {
    mockedGetBootAnimationPreference.mockReturnValueOnce('skip');
    render(<Ubuntu />);
    const bootLogo = screen.getByAltText('Ubuntu Logo');
    const bootScreen = bootLogo.parentElement as HTMLElement;
    expect(bootScreen).toHaveClass('invisible');
  });

  it('extends boot animation when preference is long', () => {
    mockedGetBootAnimationPreference.mockReturnValueOnce('long');
    render(<Ubuntu />);
    const bootLogo = screen.getByAltText('Ubuntu Logo');
    const bootScreen = bootLogo.parentElement as HTMLElement;
    expect(bootScreen).toHaveClass('visible');

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(bootScreen).toHaveClass('visible');

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(bootScreen).toHaveClass('invisible');
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
});
