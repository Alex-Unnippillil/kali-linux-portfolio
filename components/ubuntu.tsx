"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import ReactGA from 'react-ga4';

import Layout from './desktop/Layout';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import { safeLocalStorage } from '../utils/safeStorage';

const isTestEnvironment = process.env.NODE_ENV === 'test';

export interface UbuntuProps {}

export interface UbuntuState {
  screen_locked: boolean;
  bg_image_name: string;
  booting_screen: boolean;
  shutDownScreen: boolean;
}

export interface UbuntuHandle {
  lockScreen: () => void;
  shutDown: () => void;
  turnOn: () => void;
}

const initialState: UbuntuState = {
  screen_locked: false,
  bg_image_name: 'wall-2',
  booting_screen: true,
  shutDownScreen: false,
};

const Ubuntu = forwardRef<UbuntuHandle, UbuntuProps>((_, ref) => {
  const [state, setState] = useState<UbuntuState>(initialState);
  const bootScreenTimeoutRef = useRef<number | null>(null);

  const setTimeOutBootScreen = useCallback(() => {
    if (bootScreenTimeoutRef.current !== null) {
      window.clearTimeout(bootScreenTimeoutRef.current);
    }
    bootScreenTimeoutRef.current = window.setTimeout(() => {
      setState((prevState) => ({
        ...prevState,
        booting_screen: false,
      }));
    }, 2000);
  }, []);

  const lockScreen = useCallback(() => {
    ReactGA.send({ hitType: 'pageview', page: '/lock-screen', title: 'Lock Screen' });
    ReactGA.event({
      category: 'Screen Change',
      action: 'Set Screen to Locked',
    });

    const statusBar = document.getElementById('status-bar');
    statusBar?.blur();

    const finalizeLock = () => {
      setState((prevState) => ({
        ...prevState,
        screen_locked: true,
      }));
    };

    if (isTestEnvironment) {
      finalizeLock();
    } else {
      window.setTimeout(finalizeLock, 100);
    }

    safeLocalStorage?.setItem('screen-locked', 'true');
  }, []);

  const unLockScreen = useCallback(() => {
    ReactGA.send({ hitType: 'pageview', page: '/desktop', title: 'Custom Title' });

    window.removeEventListener('click', unLockScreen);
    window.removeEventListener('keypress', unLockScreen);

    setState((prevState) => ({
      ...prevState,
      screen_locked: false,
    }));

    safeLocalStorage?.setItem('screen-locked', 'false');
  }, []);

  const changeBackgroundImage = useCallback((imgName: string) => {
    setState((prevState) => ({
      ...prevState,
      bg_image_name: imgName,
    }));

    safeLocalStorage?.setItem('bg-image', imgName);
  }, []);

  const shutDown = useCallback(() => {
    ReactGA.send({ hitType: 'pageview', page: '/switch-off', title: 'Custom Title' });

    ReactGA.event({
      category: 'Screen Change',
      action: 'Switched off the Ubuntu',
    });

    const statusBar = document.getElementById('status-bar');
    statusBar?.blur();

    setState((prevState) => ({
      ...prevState,
      shutDownScreen: true,
    }));

    safeLocalStorage?.setItem('shut-down', 'true');
  }, []);

  const turnOn = useCallback(() => {
    ReactGA.send({ hitType: 'pageview', page: '/desktop', title: 'Custom Title' });

    setState((prevState) => ({
      ...prevState,
      shutDownScreen: false,
      booting_screen: true,
    }));

    setTimeOutBootScreen();
    safeLocalStorage?.setItem('shut-down', 'false');
  }, [setTimeOutBootScreen]);

  const getLocalData = useCallback(() => {
    const storedBgImage = safeLocalStorage?.getItem('bg-image');
    if (storedBgImage !== null && storedBgImage !== undefined) {
      setState((prevState) => ({
        ...prevState,
        bg_image_name: storedBgImage,
      }));
    }

    const storedBootingScreen = safeLocalStorage?.getItem('booting_screen');
    if (storedBootingScreen !== null && storedBootingScreen !== undefined) {
      setState((prevState) => ({
        ...prevState,
        booting_screen: false,
      }));
    } else {
      safeLocalStorage?.setItem('booting_screen', 'false');
      setTimeOutBootScreen();
    }

    const storedShutdown = safeLocalStorage?.getItem('shut-down');
    if (storedShutdown !== null && storedShutdown !== undefined && storedShutdown === 'true') {
      shutDown();
    } else {
      const storedScreenLocked = safeLocalStorage?.getItem('screen-locked');
      if (storedScreenLocked !== null && storedScreenLocked !== undefined) {
        setState((prevState) => ({
          ...prevState,
          screen_locked: storedScreenLocked === 'true',
        }));
      }
    }
  }, [setTimeOutBootScreen, shutDown]);

  useImperativeHandle(
    ref,
    () => ({
      lockScreen,
      shutDown,
      turnOn,
    }),
    [lockScreen, shutDown, turnOn],
  );

  useEffect(() => {
    getLocalData();

    return () => {
      if (bootScreenTimeoutRef.current !== null) {
        window.clearTimeout(bootScreenTimeoutRef.current);
      }
    };
  }, [getLocalData]);

  return (
    <Layout id="monitor-screen">
      <LockScreen isLocked={state.screen_locked} bgImgName={state.bg_image_name} unLockScreen={unLockScreen} />
      <BootingScreen visible={state.booting_screen} isShutDown={state.shutDownScreen} turnOn={turnOn} />
      <Navbar lockScreen={lockScreen} shutDown={shutDown} />
      <Desktop bg_image_name={state.bg_image_name} changeBackgroundImage={changeBackgroundImage} />
    </Layout>
  );
});

Ubuntu.displayName = 'Ubuntu';

export default Ubuntu;
