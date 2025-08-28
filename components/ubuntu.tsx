import React, { Component, useEffect } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import ReactGA from 'react-ga4';
import useSession from '../hooks/useSession';
import { useSettings } from '../hooks/useSettings';

interface UbuntuProps {
  session: ReturnType<typeof useSession>['session'];
  setSession: ReturnType<typeof useSession>['setSession'];
  clearSession: ReturnType<typeof useSession>['resetSession'];
}

interface UbuntuState {
  screen_locked: boolean;
  booting_screen: boolean;
  shutDownScreen: boolean;
}

interface UbuntuContext {}

export class Ubuntu extends Component<UbuntuProps, UbuntuState, UbuntuContext> {
  context!: UbuntuContext;

  constructor(props: UbuntuProps) {
    super(props);
    this.state = {
      screen_locked: false,
      booting_screen: true,
      shutDownScreen: false,
    };
  }

  componentDidMount(): void {
    try {
      this.getLocalData();
    } catch {
      this.setTimeOutBootScreen();
    }
  }

  setTimeOutBootScreen = (): void => {
    setTimeout(() => {
      this.setState({ booting_screen: false });
    }, 2000);
  };

  getLocalData = (): void => {
    let booting_screen: string | null = null;
    try {
      booting_screen = localStorage.getItem('booting_screen');
    } catch {
      this.setTimeOutBootScreen();
      return;
    }
    if (booting_screen !== null && booting_screen !== undefined) {
      this.setState({ booting_screen: false });
    } else {
      try {
        localStorage.setItem('booting_screen', 'false');
      } catch {
        // ignore persistence when storage is unavailable
      }
      this.setTimeOutBootScreen();
    }

    let shut_down: string | null = null;
    try {
      shut_down = localStorage.getItem('shut-down');
    } catch {
      return;
    }
    if (shut_down !== null && shut_down !== undefined && shut_down === 'true') this.shutDown();
    else {
      let screen_locked: string | null = null;
      try {
        screen_locked = localStorage.getItem('screen-locked');
      } catch {
        return;
      }
      if (screen_locked !== null && screen_locked !== undefined) {
        this.setState({ screen_locked: screen_locked === 'true' });
      }
    }
  };

  lockScreen = (): void => {
    ReactGA.send({ hitType: 'pageview', page: '/lock-screen', title: 'Lock Screen' });
    ReactGA.event({
      category: `Screen Change`,
      action: `Set Screen to Locked`,
    });

    document.getElementById('status-bar')?.blur();
    setTimeout(() => {
      this.setState({ screen_locked: true });
    }, 100);
    localStorage.setItem('screen-locked', 'true');
  };

  unLockScreen = (): void => {
    ReactGA.send({ hitType: 'pageview', page: '/desktop', title: 'Custom Title' });

    window.removeEventListener('click', this.unLockScreen);
    window.removeEventListener('keypress', this.unLockScreen);

    this.setState({ screen_locked: false });
    localStorage.setItem('screen-locked', 'false');
  };

  shutDown = (): void => {
    ReactGA.send({ hitType: 'pageview', page: '/switch-off', title: 'Custom Title' });

    ReactGA.event({
      category: `Screen Change`,
      action: `Switched off the Ubuntu`,
    });

    document.getElementById('status-bar')?.blur();
    this.setState({ shutDownScreen: true });
    localStorage.setItem('shut-down', 'true');
  };

  turnOn = (): void => {
    ReactGA.send({ hitType: 'pageview', page: '/desktop', title: 'Custom Title' });

    this.setState({ shutDownScreen: false, booting_screen: true });
    this.setTimeOutBootScreen();
    localStorage.setItem('shut-down', 'false');
  };

  render(): React.ReactNode {
    return (
      <div className="w-screen h-screen overflow-hidden" id="monitor-screen">
        <LockScreen
          isLocked={this.state.screen_locked}
          unLockScreen={this.unLockScreen}
        />
        <BootingScreen
          visible={this.state.booting_screen}
          isShutDown={this.state.shutDownScreen}
          turnOn={this.turnOn}
        />
        <Navbar lockScreen={this.lockScreen} shutDown={this.shutDown} />
        <Desktop
          session={this.props.session}
          setSession={this.props.setSession}
          clearSession={this.props.clearSession}
        />
      </div>
    );
  }
}

export default function UbuntuWithSession() {
  const { session, setSession, resetSession } = useSession();
  const { wallpaper, setWallpaper } = useSettings();

  useEffect(() => {
    setWallpaper(session.wallpaper);
  }, [session.wallpaper, setWallpaper]);

  useEffect(() => {
    setSession({ ...session, wallpaper });
  }, [wallpaper]);

  return (
    <Ubuntu
      session={session}
      setSession={setSession}
      clearSession={resetSession}
    />
  );
}
