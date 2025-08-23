import React, { Component } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import ReactGA from 'react-ga4';

interface UbuntuProps {}

interface UbuntuState {
  screen_locked: boolean;
  bg_image_name: string;
  booting_screen: boolean;
  shutDownScreen: boolean;
}

interface UbuntuContext {}

export default class Ubuntu extends Component<UbuntuProps, UbuntuState, UbuntuContext> {
  context!: UbuntuContext;

  constructor(props: UbuntuProps) {
    super(props);
    this.state = {
      screen_locked: false,
      bg_image_name: 'wall-2',
      booting_screen: true,
      shutDownScreen: false,
    };
  }

  componentDidMount(): void {
    this.getLocalData();
  }

  setTimeOutBootScreen = (): void => {
    setTimeout(() => {
      this.setState({ booting_screen: false });
    }, 2000);
  };

  getLocalData = (): void => {
    if (typeof window !== 'undefined') {
      try {
        const bg_image_name = window.localStorage.getItem('bg-image');
        if (bg_image_name !== null && bg_image_name !== undefined) {
          this.setState({ bg_image_name });
        }

        const booting_screen = window.localStorage.getItem('booting_screen');
        if (booting_screen !== null && booting_screen !== undefined) {
          this.setState({ booting_screen: false });
        } else {
          window.localStorage.setItem('booting_screen', 'false');
          this.setTimeOutBootScreen();
        }

        const shut_down = window.localStorage.getItem('shut-down');
        if (shut_down !== null && shut_down !== undefined && shut_down === 'true') this.shutDown();
        else {
          const screen_locked = window.localStorage.getItem('screen-locked');
          if (screen_locked !== null && screen_locked !== undefined) {
            this.setState({ screen_locked: screen_locked === 'true' });
          }
        }
      } catch (e) {
        console.error('Error accessing localStorage', e);
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
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('screen-locked', 'true');
      } catch (e) {
        console.error('Error accessing localStorage', e);
      }
    }
  };

  unLockScreen = (): void => {
    ReactGA.send({ hitType: 'pageview', page: '/desktop', title: 'Custom Title' });

    if (typeof window !== 'undefined') {
      try {
        window.removeEventListener('click', this.unLockScreen);
        window.removeEventListener('keypress', this.unLockScreen);
      } catch (e) {
        console.error('Error removing event listeners', e);
      }
    }

    this.setState({ screen_locked: false });
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('screen-locked', 'false');
      } catch (e) {
        console.error('Error accessing localStorage', e);
      }
    }
  };

  changeBackgroundImage = (img_name: string): void => {
    this.setState({ bg_image_name: img_name });
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('bg-image', img_name);
      } catch (e) {
        console.error('Error accessing localStorage', e);
      }
    }
  };

  shutDown = (): void => {
    ReactGA.send({ hitType: 'pageview', page: '/switch-off', title: 'Custom Title' });

    ReactGA.event({
      category: `Screen Change`,
      action: `Switched off the Ubuntu`,
    });

    document.getElementById('status-bar')?.blur();
    this.setState({ shutDownScreen: true });
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('shut-down', 'true');
      } catch (e) {
        console.error('Error accessing localStorage', e);
      }
    }
  };

  turnOn = (): void => {
    ReactGA.send({ hitType: 'pageview', page: '/desktop', title: 'Custom Title' });

    this.setState({ shutDownScreen: false, booting_screen: true });
    this.setTimeOutBootScreen();
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('shut-down', 'false');
      } catch (e) {
        console.error('Error accessing localStorage', e);
      }
    }
  };

  render(): React.ReactNode {
    return (
      <div className="w-screen h-screen overflow-hidden" id="monitor-screen">
        <LockScreen
          isLocked={this.state.screen_locked}
          bgImgName={this.state.bg_image_name}
          unLockScreen={this.unLockScreen}
        />
        <BootingScreen
          visible={this.state.booting_screen}
          isShutDown={this.state.shutDownScreen}
          turnOn={this.turnOn}
        />
        <Navbar lockScreen={this.lockScreen} shutDown={this.shutDown} />
        <Desktop bg_image_name={this.state.bg_image_name} changeBackgroundImage={this.changeBackgroundImage} />
      </div>
    );
  }
}
