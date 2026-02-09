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

describe('Ubuntu component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders boot screen then desktop', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(document, 'readyState');
    let readyStateValue = 'loading';

    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => readyStateValue,
    });

    try {
      render(<Ubuntu />);
      const bootScreen = screen.getByRole('status');
      expect(bootScreen).toHaveClass('visible');

      readyStateValue = 'complete';
      act(() => {
        window.dispatchEvent(new Event('load'));
      });

      expect(bootScreen).toHaveClass('invisible');
      expect(screen.getByTestId('desktop')).toBeInTheDocument();
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(document, 'readyState', originalDescriptor);
      } else {
        delete (document as Record<string, unknown>).readyState;
      }
    }
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
