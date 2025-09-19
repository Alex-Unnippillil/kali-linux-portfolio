import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Ubuntu from '../components/ubuntu';
import { undoManager } from '../hooks/useUndoManager';

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

  it('routes ctrl+alt+z to the global undo stack', () => {
    const spy = jest.spyOn(undoManager, 'undoGlobal').mockReturnValue(true);
    render(<Ubuntu />);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, altKey: true });

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
