import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import Ubuntu from '../components/ubuntu';

jest.mock('../components/screen/desktop', () => {
  const Desktop = () => <div data-testid="desktop" />;
  Desktop.displayName = 'DesktopMock';
  return Desktop;
});
jest.mock('../components/screen/navbar', () => {
  const Navbar = () => <div data-testid="navbar" />;
  Navbar.displayName = 'NavbarMock';
  return Navbar;
});
jest.mock('../components/screen/lock_screen', () => {
  const Lock = () => <div data-testid="lock-screen" />;
  Lock.displayName = 'LockScreenMock';
  return Lock;
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
});
