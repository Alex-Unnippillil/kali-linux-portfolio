import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import Ubuntu from '../components/ubuntu';

jest.mock('../components/screen/desktop', () => function DesktopMock() {
  return <div data-testid="desktop" />;
});
jest.mock('../components/screen/navbar', () => function NavbarMock() {
  return <nav aria-label="Desktop navigation" data-testid="navbar" />;
});
jest.mock('../components/screen/lock_screen', () => function LockScreenMock() {
  return <div data-testid="lock-screen" />;
});
jest.mock('../components/screen/booting_screen', () => function BootingScreenMock({ visible }) {
  return (
    <div role="status" className={visible ? 'visible' : 'invisible'}>
      Booting
    </div>
  );
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
    const originalDescriptor = Object.getOwnPropertyDescriptor(document, 'readyState');
    let readyStateValue = 'loading';

    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => readyStateValue,
    });

    try {
      render(<Ubuntu />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      readyStateValue = 'complete';
      act(() => {
        window.dispatchEvent(new Event('load'));
      });
      expect(screen.getByTestId('desktop')).toBeInTheDocument();
      expect(screen.getByRole('banner', { name: /desktop status bar/i })).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: /desktop navigation/i })).toBeInTheDocument();
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

  it('exposes a labelled desktop region', () => {
    render(<Ubuntu />);

    expect(screen.getByRole('region', { name: /desktop shell/i })).toBeInTheDocument();
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
