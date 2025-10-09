import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Ubuntu from '../components/ubuntu';
import SettingsApp from '../components/apps/settings';
import { SettingsProvider, useSettings } from '../hooks/useSettings';

const DesktopMock: any = jest.fn((props) => {
  DesktopMock.latestProps = props;
  return <div data-testid="desktop" />;
});
DesktopMock.latestProps = {};
DesktopMock.getLastProps = () => DesktopMock.latestProps;

const NavbarMock: any = jest.fn((props) => {
  NavbarMock.latestProps = props;
  return (
    <div data-testid="navbar">
      <button data-testid="navbar-lock" onClick={props.lockScreen}>
        Lock
      </button>
      <button data-testid="navbar-shutdown" onClick={props.shutDown}>
        Shutdown
      </button>
    </div>
  );
});
NavbarMock.latestProps = {};
NavbarMock.getLastProps = () => NavbarMock.latestProps;

const LockScreenMock: any = jest.fn((props) => {
  LockScreenMock.latestProps = props;
  return <div data-testid="lock-screen" data-locked={props.isLocked} />;
});
LockScreenMock.latestProps = {};
LockScreenMock.getLastProps = () => LockScreenMock.latestProps;

jest.mock('../components/screen/desktop', () => ({
  __esModule: true,
  default: (props: any) => DesktopMock(props),
}));

jest.mock('../components/screen/navbar', () => ({
  __esModule: true,
  default: (props: any) => NavbarMock(props),
}));

jest.mock('../components/screen/lock_screen', () => ({
  __esModule: true,
  default: (props: any) => LockScreenMock(props),
}));

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const SettingsProbe = () => {
  const { wallpaper, screenLocked, useKaliWallpaper } = useSettings();
  return (
    <div>
      <span data-testid="probe-wallpaper">{wallpaper}</span>
      <span data-testid="probe-locked">{screenLocked ? 'locked' : 'unlocked'}</span>
      <span data-testid="probe-kali">{useKaliWallpaper ? 'on' : 'off'}</span>
    </div>
  );
};

const SettingsLockToggle = () => {
  const { setScreenLocked } = useSettings();
  return (
    <div>
      <button data-testid="settings-lock" onClick={() => setScreenLocked(true)}>
        Lock via settings
      </button>
      <button data-testid="settings-unlock" onClick={() => setScreenLocked(false)}>
        Unlock via settings
      </button>
    </div>
  );
};

const renderWithProvider = (ui: React.ReactNode) =>
  render(<SettingsProvider>{ui}</SettingsProvider>);

describe('Ubuntu component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
    DesktopMock.mockClear();
    NavbarMock.mockClear();
    LockScreenMock.mockClear();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders boot screen then desktop', () => {
    renderWithProvider(<Ubuntu />);
    const bootLogo = screen.getByAltText('Ubuntu Logo');
    const bootScreen = bootLogo.parentElement as HTMLElement;
    expect(bootScreen).toHaveClass('visible');

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(bootScreen).toHaveClass('invisible');
    expect(screen.getByTestId('desktop')).toBeInTheDocument();
  });

  it('locks from navbar and updates shared settings', () => {
    renderWithProvider(
      <>
        <Ubuntu />
        <SettingsProbe />
      </>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('navbar-lock'));
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('probe-locked')).toHaveTextContent('locked');
    expect(LockScreenMock.getLastProps().isLocked).toBe(true);
  });

  it('updates lock state from settings UI actions', () => {
    renderWithProvider(
      <>
        <Ubuntu />
        <SettingsProbe />
        <SettingsLockToggle />
      </>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('settings-lock'));
    });
    expect(screen.getByTestId('probe-locked')).toHaveTextContent('locked');
    expect(LockScreenMock.getLastProps().isLocked).toBe(true);

    act(() => {
      fireEvent.click(screen.getByTestId('settings-unlock'));
    });
    expect(screen.getByTestId('probe-locked')).toHaveTextContent('unlocked');
    expect(LockScreenMock.getLastProps().isLocked).toBe(false);
  });

  it('keeps wallpaper in sync when changed from desktop', () => {
    renderWithProvider(
      <>
        <Ubuntu />
        <SettingsProbe />
      </>
    );

    act(() => {
      DesktopMock.getLastProps().changeBackgroundImage('wall-7');
    });

    expect(screen.getByTestId('probe-wallpaper')).toHaveTextContent('wall-7');
    expect(screen.getByTestId('probe-kali')).toHaveTextContent('off');
    expect(DesktopMock.getLastProps().bg_image_name).toBe('wall-7');
  });

  it('keeps wallpaper in sync when changed from settings app', () => {
    renderWithProvider(
      <>
        <Ubuntu />
        <SettingsApp />
        <SettingsProbe />
      </>
    );

    const wallpaperButton = screen.getByRole('button', { name: /Select wallpaper 3/i });
    act(() => {
      fireEvent.click(wallpaperButton);
    });

    expect(screen.getByTestId('probe-wallpaper')).toHaveTextContent('wall-3');
    expect(DesktopMock.getLastProps().bg_image_name).toBe('wall-3');
  });
});
