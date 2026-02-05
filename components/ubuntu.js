"use client";

import React, { useEffect, useMemo, useReducer, useRef } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import Layout from './desktop/Layout';
import { logEvent, logPageView } from '../utils/analytics';
import { safeLocalStorage } from '../utils/safeStorage';
import NotificationCenter from './common/NotificationCenter';
import SystemNotifications from './common/SystemNotifications';

const STORAGE_KEY = 'desktop-preferences-v1';
const STORAGE_VERSION = 1;

const PHASES = {
  BOOTING: 'booting',
  LOCKED: 'locked',
  DESKTOP: 'desktop',
};

const resolveStorage = () => {
  if (safeLocalStorage) return safeLocalStorage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
};

const validatePreferences = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.version !== STORAGE_VERSION) return null;
  const next = {
    version: STORAGE_VERSION,
    wallpaper: typeof payload.wallpaper === 'string' ? payload.wallpaper : 'wall-2',
    theme: typeof payload.theme === 'string' ? payload.theme : 'default',
    dockPosition: typeof payload.dockPosition === 'string' ? payload.dockPosition : 'bottom',
    reducedMotion: typeof payload.reducedMotion === 'boolean' ? payload.reducedMotion : false,
    screenLocked: typeof payload.screenLocked === 'boolean' ? payload.screenLocked : false,
    lastUnlockAt: typeof payload.lastUnlockAt === 'number' ? payload.lastUnlockAt : null,
    shutDown: typeof payload.shutDown === 'boolean' ? payload.shutDown : false,
  };
  return next;
};

const loadLegacyPreferences = () => {
  const storage = resolveStorage();
  if (!storage) return null;
  const wallpaper = storage.getItem('bg-image') || undefined;
  const lockedValue = storage.getItem('screen-locked');
  const shutDownValue = storage.getItem('shut-down');
  if (!wallpaper && lockedValue == null && shutDownValue == null) return null;
  return {
    version: STORAGE_VERSION,
    wallpaper: wallpaper || 'wall-2',
    theme: 'default',
    dockPosition: 'bottom',
    reducedMotion: false,
    screenLocked: lockedValue === 'true',
    lastUnlockAt: null,
    shutDown: shutDownValue === 'true',
  };
};

const loadPreferences = () => {
  const storage = resolveStorage();
  if (!storage) return null;
  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const validated = validatePreferences(parsed);
      if (validated) return validated;
    }
  } catch (error) {
    // ignore parse errors
  }
  return loadLegacyPreferences();
};

const persistPreferences = (prefs) => {
  const storage = resolveStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    // ignore storage errors
  }
};

const buildInitialState = () => {
  const stored = loadPreferences();
  const skipBoot = process.env.NEXT_PUBLIC_SKIP_BOOT === 'true';
  const hasBootedBefore = typeof safeLocalStorage?.getItem('booting_screen') !== 'undefined'
    ? safeLocalStorage?.getItem('booting_screen') !== null
    : false;
  const shouldBoot = !skipBoot && !hasBootedBefore;
  const prefs = stored || {
    version: STORAGE_VERSION,
    wallpaper: 'wall-2',
    theme: 'default',
    dockPosition: 'bottom',
    reducedMotion: false,
    screenLocked: false,
    lastUnlockAt: null,
    shutDown: false,
  };

  const phase = prefs.shutDown
    ? PHASES.BOOTING
    : prefs.screenLocked
      ? PHASES.LOCKED
      : shouldBoot
        ? PHASES.BOOTING
        : PHASES.DESKTOP;

  return {
    phase,
    boot: {
      showBoot: shouldBoot,
      skipBoot,
      progress: 0,
    },
    auth: {
      screenLocked: prefs.screenLocked,
      lastUnlockAt: prefs.lastUnlockAt,
      user: {
        name: 'Alex',
      },
    },
    desktop: {
      wallpaper: prefs.wallpaper,
      theme: prefs.theme,
      dockPosition: prefs.dockPosition,
      reducedMotion: prefs.reducedMotion,
    },
    shutDown: prefs.shutDown,
  };
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'BOOT_COMPLETE': {
      const nextPhase = state.auth.screenLocked ? PHASES.LOCKED : PHASES.DESKTOP;
      return {
        ...state,
        phase: nextPhase,
        boot: {
          ...state.boot,
          showBoot: false,
          progress: 100,
        },
      };
    }
    case 'LOCK': {
      return {
        ...state,
        phase: PHASES.LOCKED,
        auth: {
          ...state.auth,
          screenLocked: true,
        },
      };
    }
    case 'UNLOCK': {
      return {
        ...state,
        phase: PHASES.DESKTOP,
        auth: {
          ...state.auth,
          screenLocked: false,
          lastUnlockAt: action.timestamp ?? Date.now(),
        },
      };
    }
    case 'SET_WALLPAPER': {
      return {
        ...state,
        desktop: {
          ...state.desktop,
          wallpaper: action.wallpaper,
        },
      };
    }
    case 'SHUTDOWN': {
      return {
        ...state,
        shutDown: true,
        phase: PHASES.BOOTING,
        boot: {
          ...state.boot,
          showBoot: true,
          progress: 0,
        },
      };
    }
    case 'TURN_ON': {
      return {
        ...state,
        shutDown: false,
        phase: PHASES.BOOTING,
        boot: {
          ...state.boot,
          showBoot: true,
          progress: 0,
        },
      };
    }
    default:
      return state;
  }
};

export default function Ubuntu() {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  const bootTimerRef = useRef(null);

  const prefsSnapshot = useMemo(
    () => ({
      version: STORAGE_VERSION,
      wallpaper: state.desktop.wallpaper,
      theme: state.desktop.theme,
      dockPosition: state.desktop.dockPosition,
      reducedMotion: state.desktop.reducedMotion,
      screenLocked: state.auth.screenLocked,
      lastUnlockAt: state.auth.lastUnlockAt,
      shutDown: state.shutDown,
    }),
    [state.desktop, state.auth, state.shutDown],
  );

  useEffect(() => {
    persistPreferences(prefsSnapshot);
  }, [prefsSnapshot]);

  useEffect(() => {
    if (typeof safeLocalStorage?.setItem === 'function') {
      safeLocalStorage.setItem('booting_screen', false);
    }
  }, []);

  useEffect(() => {
    if (state.phase !== PHASES.BOOTING) {
      return undefined;
    }

    if (state.boot.skipBoot) {
      dispatch({ type: 'BOOT_COMPLETE' });
      return undefined;
    }

    if (typeof window === 'undefined') {
      return undefined;
    }

    const isTestEnv = typeof jest !== 'undefined';
    const MIN_BOOT_DELAY = isTestEnv ? 0 : 350;
    const MAX_BOOT_DELAY = isTestEnv ? 0 : 1200;

    const finalizeBoot = () => {
      dispatch({ type: 'BOOT_COMPLETE' });
      if (bootTimerRef.current) {
        window.clearTimeout(bootTimerRef.current);
        bootTimerRef.current = null;
      }
    };

    const startTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const scheduleFinalize = () => {
      if (isTestEnv) {
        finalizeBoot();
        return;
      }
      const elapsed = (typeof performance !== 'undefined' && performance.now)
        ? performance.now() - startTime
        : Date.now() - startTime;
      const remaining = Math.max(MIN_BOOT_DELAY - elapsed, 0);
      if (remaining > 0) {
        bootTimerRef.current = window.setTimeout(finalizeBoot, remaining);
      } else {
        finalizeBoot();
      }
    };

    const handleLoad = () => scheduleFinalize();

    if (document.readyState === 'complete' || isTestEnv) {
      scheduleFinalize();
    } else {
      window.addEventListener('load', handleLoad, { once: true });
      bootTimerRef.current = window.setTimeout(scheduleFinalize, MAX_BOOT_DELAY);
    }

    return () => {
      window.removeEventListener('load', handleLoad);
      if (bootTimerRef.current) {
        window.clearTimeout(bootTimerRef.current);
        bootTimerRef.current = null;
      }
    };
  }, [state.phase, state.boot.skipBoot]);

  const lockScreen = () => {
    logPageView('/lock-screen', 'Lock Screen');
    logEvent({
      category: 'Screen Change',
      action: 'Set Screen to Locked',
    });
    const statusBar = document.getElementById('status-bar');
    statusBar?.blur();
    if (typeof jest !== 'undefined') {
      dispatch({ type: 'LOCK' });
    } else {
      window.setTimeout(() => dispatch({ type: 'LOCK' }), 100);
    }
  };

  const unLockScreen = () => {
    logPageView('/desktop', 'Custom Title');
    dispatch({ type: 'UNLOCK', timestamp: Date.now() });
  };

  const changeBackgroundImage = (imgName) => {
    dispatch({ type: 'SET_WALLPAPER', wallpaper: imgName });
  };

  const shutDown = () => {
    logPageView('/switch-off', 'Custom Title');
    logEvent({
      category: 'Screen Change',
      action: 'Switched off the Ubuntu',
    });
    const statusBar = document.getElementById('status-bar');
    statusBar?.blur();
    dispatch({ type: 'SHUTDOWN' });
  };

  const turnOn = () => {
    logPageView('/desktop', 'Custom Title');
    dispatch({ type: 'TURN_ON' });
  };

  const isLocked = state.phase === PHASES.LOCKED;
  const isBooting = state.phase === PHASES.BOOTING && state.boot.showBoot;

  return (
    <Layout id="monitor-screen">
      <NotificationCenter>
        <SystemNotifications />
        <LockScreen
          isLocked={isLocked}
          bgImgName={state.desktop.wallpaper}
          unLockScreen={unLockScreen}
        />
        <BootingScreen
          visible={isBooting}
          isShutDown={state.shutDown}
          turnOn={turnOn}
          disableMessageSequence={typeof jest !== 'undefined'}
        />
        {state.phase === PHASES.DESKTOP && (
          <>
            <Navbar lockScreen={lockScreen} shutDown={shutDown} />
            <Desktop
              bg_image_name={state.desktop.wallpaper}
              changeBackgroundImage={changeBackgroundImage}
            />
          </>
        )}
      </NotificationCenter>
    </Layout>
  );
}
