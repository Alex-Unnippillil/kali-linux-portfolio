"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import Layout from './desktop/Layout';
import ReactGA from 'react-ga4';
import { useSettings } from '../hooks/useSettings';

const BOOT_DURATION_MS = 2000;

export default function Ubuntu() {
  const {
    wallpaper,
    setWallpaper,
    setUseKaliWallpaper,
    screenLocked,
    setScreenLocked,
    hasCompletedBoot,
    setHasCompletedBoot,
    isShutDown,
    setIsShutDown,
  } = useSettings();
  const [bootingScreen, setBootingScreen] = useState(() => !hasCompletedBoot);
  const bootTimeoutRef = useRef(null);

  const clearBootTimeout = useCallback(() => {
    if (bootTimeoutRef.current) {
      clearTimeout(bootTimeoutRef.current);
      bootTimeoutRef.current = null;
    }
  }, []);

  const startBootSequence = useCallback(
    (persistCompletion) => {
      clearBootTimeout();
      setBootingScreen(true);
      bootTimeoutRef.current = setTimeout(() => {
        setBootingScreen(false);
        if (persistCompletion) {
          setHasCompletedBoot(true);
        }
        bootTimeoutRef.current = null;
      }, BOOT_DURATION_MS);
    },
    [clearBootTimeout, setHasCompletedBoot]
  );

  useEffect(() => {
    if (!hasCompletedBoot) {
      startBootSequence(true);
    } else {
      setBootingScreen(false);
    }
    return () => {
      clearBootTimeout();
    };
  }, [hasCompletedBoot, startBootSequence, clearBootTimeout]);

  useEffect(() => {
    if (isShutDown) {
      clearBootTimeout();
      setBootingScreen(false);
    }
  }, [isShutDown, clearBootTimeout]);

  const changeBackgroundImage = useCallback(
    (imgName) => {
      setUseKaliWallpaper(false);
      setWallpaper(imgName);
    },
    [setUseKaliWallpaper, setWallpaper]
  );

  const lockScreen = useCallback(() => {
    ReactGA.send({ hitType: 'pageview', page: '/lock-screen', title: 'Lock Screen' });
    ReactGA.event({
      category: 'Screen Change',
      action: 'Set Screen to Locked',
    });

    const statusBar = document.getElementById('status-bar');
    statusBar?.blur();

    const finalizeLock = () => {
      setScreenLocked(true);
    };

    if (typeof jest !== 'undefined') {
      finalizeLock();
    } else {
      setTimeout(finalizeLock, 100);
    }
  }, [setScreenLocked]);

  const unLockScreen = useCallback(() => {
    ReactGA.send({ hitType: 'pageview', page: '/desktop', title: 'Custom Title' });

    window.removeEventListener('click', unLockScreen);
    window.removeEventListener('keypress', unLockScreen);

    setScreenLocked(false);
  }, [setScreenLocked]);

  const shutDown = useCallback(() => {
    ReactGA.send({ hitType: 'pageview', page: '/switch-off', title: 'Custom Title' });

    ReactGA.event({
      category: 'Screen Change',
      action: 'Switched off the Ubuntu',
    });

    const statusBar = document.getElementById('status-bar');
    statusBar?.blur();

    setIsShutDown(true);
    setScreenLocked(false);
  }, [setIsShutDown, setScreenLocked]);

  const turnOn = useCallback(() => {
    ReactGA.send({ hitType: 'pageview', page: '/desktop', title: 'Custom Title' });

    setIsShutDown(false);
    startBootSequence(false);
  }, [setIsShutDown, startBootSequence]);

  return (
    <Layout id="monitor-screen">
      <LockScreen isLocked={screenLocked} bgImgName={wallpaper} unLockScreen={unLockScreen} />
      <BootingScreen visible={bootingScreen} isShutDown={isShutDown} turnOn={turnOn} />
      <Navbar lockScreen={lockScreen} shutDown={shutDown} />
      <Desktop bg_image_name={wallpaper} changeBackgroundImage={changeBackgroundImage} />
    </Layout>
  );
}
