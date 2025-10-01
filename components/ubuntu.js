"use client";

import React, { Component } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import Layout from './desktop/Layout';
import ReactGA from 'react-ga4';
import { safeLocalStorage } from '../utils/safeStorage';
import { loadAppRegistry } from '../lib/appRegistry';

const BOOT_PROGRESS_TEMPLATE = [
  { id: 'fonts', label: 'Loading system fonts', status: 'pending' },
  { id: 'window', label: 'Finalizing desktop environment', status: 'pending' },
  { id: 'apps', label: 'Preparing app catalog', status: 'pending' },
];

const cloneBootProgress = () => BOOT_PROGRESS_TEMPLATE.map((step) => ({ ...step }));

const getNow = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const waitForFontsReady = () => {
  if (typeof document === 'undefined') {
    return Promise.resolve();
  }
  const fontSet = document.fonts;
  if (!fontSet) {
    return Promise.resolve();
  }
  if (fontSet.status === 'loaded') {
    return Promise.resolve();
  }
  return fontSet.ready.catch(() => undefined);
};

const waitForWindowLoad = () =>
  new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    if (document.readyState === 'complete') {
      resolve();
      return;
    }
    const handler = () => {
      window.removeEventListener('load', handler);
      resolve();
    };
    window.addEventListener('load', handler, { once: true });
  });

let sharedAppRegistryPromise;

const waitForAppRegistry = () => {
  if (!sharedAppRegistryPromise) {
    sharedAppRegistryPromise = loadAppRegistry().catch((error) => {
      console.error('Failed to preload app registry', error);
      return null;
    });
  }
  return sharedAppRegistryPromise.then(() => undefined);
};

export default class Ubuntu extends Component {
  constructor() {
    super();
    this.state = {
      screen_locked: false,
      bg_image_name: 'wall-2',
      booting_screen: true,
      shutDownScreen: false,
      bootProgress: cloneBootProgress(),
    };
    this.bootHideTimer = null;
    this.unmounted = false;
  }

  componentDidMount() {
    const localData = this.getLocalData();
    this.setState(
      {
        bg_image_name: localData.bgImageName,
        screen_locked: localData.screenLocked,
        shutDownScreen: localData.wasShutDown,
        bootProgress: cloneBootProgress(),
      },
      () => {
        if (!localData.wasShutDown) {
          this.startBootSequence({ warmBoot: localData.visitedBefore });
        }
      }
    );
  }

  componentWillUnmount() {
    this.unmounted = true;
    if (this.bootHideTimer) {
      clearTimeout(this.bootHideTimer);
      this.bootHideTimer = null;
    }
  }

  getLocalData = () => {
    let bgImageName = this.state.bg_image_name;
    const storedBackground = safeLocalStorage?.getItem('bg-image');
    if (storedBackground !== null && storedBackground !== undefined) {
      bgImageName = storedBackground;
    }

    const bootingScreenFlag = safeLocalStorage?.getItem('booting_screen');
    const visitedBefore = bootingScreenFlag !== null && bootingScreenFlag !== undefined;
    if (!visitedBefore) {
      safeLocalStorage?.setItem('booting_screen', 'false');
    }

    const shutDown = safeLocalStorage?.getItem('shut-down');
    const wasShutDown = shutDown !== null && shutDown !== undefined && shutDown === 'true';

    let screenLocked = this.state.screen_locked;
    if (!wasShutDown) {
      const storedScreenLocked = safeLocalStorage?.getItem('screen-locked');
      if (storedScreenLocked !== null && storedScreenLocked !== undefined) {
        screenLocked = storedScreenLocked === 'true';
      }
    }

    return {
      bgImageName,
      screenLocked,
      visitedBefore,
      wasShutDown,
    };
  };

  startBootSequence = async ({ warmBoot = false } = {}) => {
    if (this.unmounted) {
      return;
    }
    this.setState({ booting_screen: true, bootProgress: cloneBootProgress() });

    const startTime = getNow();
    const sequence = [
      { id: 'fonts', waitFor: waitForFontsReady },
      { id: 'window', waitFor: waitForWindowLoad },
      { id: 'apps', waitFor: waitForAppRegistry },
    ];

    for (const step of sequence) {
      try {
        await step.waitFor();
      } catch (error) {
        console.error(`Boot step ${step.id} failed`, error);
      } finally {
        this.markBootStepComplete(step.id);
      }
    }

    const elapsed = getNow() - startTime;
    const minimumVisible = warmBoot ? 0 : 2000;
    const remaining = Math.max(minimumVisible - elapsed, 0);

    const finish = () => {
      if (this.unmounted) {
        return;
      }
      this.setState({ booting_screen: false });
    };

    if (remaining > 0) {
      this.bootHideTimer = setTimeout(finish, remaining);
    } else {
      finish();
    }
  };

  markBootStepComplete = (id) => {
    if (this.unmounted) {
      return;
    }
    this.setState((prev) => ({
      bootProgress: prev.bootProgress.map((step) =>
        step.id === id
          ? {
              ...step,
              status: 'complete',
            }
          : step
      ),
    }));
  };

  lockScreen = () => {
    // google analytics
    ReactGA.send({ hitType: "pageview", page: "/lock-screen", title: "Lock Screen" });
    ReactGA.event({
      category: `Screen Change`,
      action: `Set Screen to Locked`,
    });

    const statusBar = document.getElementById('status-bar');
    // Consider using a React ref if the status bar element lives within this component tree
    statusBar?.blur();
    setTimeout(() => {
      this.setState({ screen_locked: true });
    }, 100); // waiting for all windows to close (transition-duration)
    safeLocalStorage?.setItem('screen-locked', true);
  };

  unLockScreen = () => {
    ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

    window.removeEventListener('click', this.unLockScreen);
    window.removeEventListener('keypress', this.unLockScreen);

    this.setState({ screen_locked: false });
    safeLocalStorage?.setItem('screen-locked', false);
  };

  changeBackgroundImage = (img_name) => {
    this.setState({ bg_image_name: img_name });
    safeLocalStorage?.setItem('bg-image', img_name);
  };

  shutDown = () => {
    ReactGA.send({ hitType: "pageview", page: "/switch-off", title: "Custom Title" });

    ReactGA.event({
      category: `Screen Change`,
      action: `Switched off the Ubuntu`,
    });

    const statusBar = document.getElementById('status-bar');
    // Consider using a React ref if the status bar element lives within this component tree
    statusBar?.blur();
    this.setState({ shutDownScreen: true, bootProgress: cloneBootProgress() });
    safeLocalStorage?.setItem('shut-down', 'true');
  };

  turnOn = () => {
    ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

    this.setState(
      { shutDownScreen: false, booting_screen: true, bootProgress: cloneBootProgress() },
      () => {
        this.startBootSequence({ warmBoot: true });
      }
    );
    safeLocalStorage?.setItem('shut-down', 'false');
  };

  render() {
    return (
      <Layout id="monitor-screen">
        <LockScreen
          isLocked={this.state.screen_locked}
          bgImgName={this.state.bg_image_name}
          unLockScreen={this.unLockScreen}
        />
        <BootingScreen
          visible={this.state.booting_screen}
          isShutDown={this.state.shutDownScreen}
          turnOn={this.turnOn}
          progressSteps={this.state.bootProgress}
        />
        <Navbar lockScreen={this.lockScreen} shutDown={this.shutDown} />
        <Desktop
          bg_image_name={this.state.bg_image_name}
          changeBackgroundImage={this.changeBackgroundImage}
        />
      </Layout>
    );
  }
}
