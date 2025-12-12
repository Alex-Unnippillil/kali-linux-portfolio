"use client";

import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import Layout from './desktop/Layout';
import ReactGA from 'react-ga4';
import { safeLocalStorage } from '../utils/safeStorage';

export const OS_STATES = Object.freeze({
        SHUTDOWN: 'shutdown',
        BOOTING: 'booting',
        LOCKED: 'locked',
        DESKTOP: 'desktop'
});

export const initialUbuntuState = {
        osState: OS_STATES.BOOTING,
        bgImageName: 'wall-2'
};

export function osReducer(state, action) {
        switch (action.type) {
                case 'SET_OS_STATE':
                        if (state.osState === action.payload) return state;
                        return { ...state, osState: action.payload };
                case 'SET_BG_IMAGE':
                        if (state.bgImageName === action.payload) return state;
                        return { ...state, bgImageName: action.payload };
                default:
                        return state;
        }
}

export default function Ubuntu() {
        const [state, dispatch] = useReducer(osReducer, initialUbuntuState);
        const osStateRef = useRef(state.osState);
        const bootScreenLoadHandlerRef = useRef(null);
        const bootScreenLoadEventRef = useRef(null);
        const bootScreenLoadTargetRef = useRef(null);
        const bootSequenceTimeoutRef = useRef(null);

        useEffect(() => {
                osStateRef.current = state.osState;
        }, [state.osState]);

        const detachBootScreenLoadHandler = useCallback(() => {
                if (typeof window === 'undefined') return;

                if (bootScreenLoadHandlerRef.current) {
                        const target = bootScreenLoadTargetRef.current || window;
                        const eventType = bootScreenLoadEventRef.current || 'load';
                        target.removeEventListener(eventType, bootScreenLoadHandlerRef.current);
                        bootScreenLoadHandlerRef.current = null;
                        bootScreenLoadEventRef.current = null;
                        bootScreenLoadTargetRef.current = null;
                }

                if (bootSequenceTimeoutRef.current) {
                        window.clearTimeout(bootSequenceTimeoutRef.current);
                        bootSequenceTimeoutRef.current = null;
                }
        }, []);

        const waitForBootSequence = useCallback(() => {
                if (typeof window === 'undefined' || typeof document === 'undefined') return;

                const MIN_BOOT_DELAY = 350;
                const MAX_BOOT_DELAY = 1200;
                const hasPerformanceNow = typeof performance !== 'undefined' && typeof performance.now === 'function';
                const bootStartTime = hasPerformanceNow ? performance.now() : null;

                const finalizeBoot = () => {
                        if (osStateRef.current !== OS_STATES.BOOTING) return;
                        dispatch({ type: 'SET_OS_STATE', payload: OS_STATES.DESKTOP });
                        detachBootScreenLoadHandler();
                };

                const scheduleFinalize = () => {
                        if (typeof window === 'undefined' || osStateRef.current !== OS_STATES.BOOTING) return;

                        const run = () => {
                                if (typeof window === 'undefined' || osStateRef.current !== OS_STATES.BOOTING) return;
                                const schedule =
                                        typeof window.requestAnimationFrame === 'function'
                                                ? window.requestAnimationFrame.bind(window)
                                                : (cb) => window.setTimeout(cb, 0);
                                schedule(finalizeBoot);
                        };

                        if (bootStartTime !== null) {
                                const elapsed = performance.now() - bootStartTime;
                                const remaining = Math.max(MIN_BOOT_DELAY - elapsed, 0);
                                if (remaining > 0) {
                                        window.setTimeout(run, remaining);
                                        return;
                                }
                        } else if (MIN_BOOT_DELAY > 0) {
                                window.setTimeout(run, MIN_BOOT_DELAY);
                                return;
                        }

                        run();
                };

                detachBootScreenLoadHandler();

                const finalizeAndClearTimers = () => {
                        if (bootSequenceTimeoutRef.current) {
                                window.clearTimeout(bootSequenceTimeoutRef.current);
                                bootSequenceTimeoutRef.current = null;
                        }
                        scheduleFinalize();
                };

                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                        scheduleFinalize();
                        return;
                }

                bootScreenLoadHandlerRef.current = () => {
                        finalizeAndClearTimers();
                };
                bootScreenLoadEventRef.current = 'DOMContentLoaded';
                bootScreenLoadTargetRef.current = document;
                document.addEventListener('DOMContentLoaded', bootScreenLoadHandlerRef.current, { once: true });

                bootSequenceTimeoutRef.current = window.setTimeout(() => {
                        scheduleFinalize();
                }, MAX_BOOT_DELAY);
        }, [detachBootScreenLoadHandler, dispatch]);

        useEffect(() => {
                // Get Previously selected Background Image
                const bgImageName = safeLocalStorage?.getItem('bg-image');
                if (bgImageName !== null && bgImageName !== undefined) {
                        dispatch({ type: 'SET_BG_IMAGE', payload: bgImageName });
                }

                const bootingScreen = safeLocalStorage?.getItem('booting_screen');
                const shutDown = safeLocalStorage?.getItem('shut-down');

                if (shutDown === 'true') {
                        dispatch({ type: 'SET_OS_STATE', payload: OS_STATES.SHUTDOWN });
                        return;
                }

                const screenLocked = safeLocalStorage?.getItem('screen-locked');

                if (bootingScreen !== null && bootingScreen !== undefined) {
                        dispatch({
                                type: 'SET_OS_STATE',
                                payload: screenLocked === 'true' ? OS_STATES.LOCKED : OS_STATES.DESKTOP
                        });
                } else {
                        safeLocalStorage?.setItem('booting_screen', 'false');
                        dispatch({ type: 'SET_OS_STATE', payload: OS_STATES.BOOTING });
                }
        }, [dispatch]);

        useEffect(() => {
                if (state.osState !== OS_STATES.BOOTING) {
                        detachBootScreenLoadHandler();
                        return undefined;
                }

                waitForBootSequence();
                return detachBootScreenLoadHandler;
        }, [state.osState, detachBootScreenLoadHandler, waitForBootSequence]);

        const lockScreen = useCallback(() => {
                ReactGA.send({ hitType: 'pageview', page: '/lock-screen', title: 'Lock Screen' });
                ReactGA.event({
                        category: `Screen Change`,
                        action: `Set Screen to Locked`
                });

                const statusBar = document.getElementById('status-bar');
                statusBar?.blur();

                const finalizeLock = () => {
                        dispatch({ type: 'SET_OS_STATE', payload: OS_STATES.LOCKED });
                        safeLocalStorage?.setItem('screen-locked', 'true');
                };

                if (typeof jest !== 'undefined') {
                        finalizeLock();
                } else {
                        setTimeout(finalizeLock, 100);
                }
        }, [dispatch]);

        const unLockScreen = useCallback(() => {
                ReactGA.send({ hitType: 'pageview', page: '/desktop', title: 'Custom Title' });
                window.removeEventListener('click', unLockScreen);
                window.removeEventListener('keypress', unLockScreen);

                dispatch({ type: 'SET_OS_STATE', payload: OS_STATES.DESKTOP });
                safeLocalStorage?.setItem('screen-locked', 'false');
        }, [dispatch]);

        const changeBackgroundImage = useCallback((imgName) => {
                dispatch({ type: 'SET_BG_IMAGE', payload: imgName });
                safeLocalStorage?.setItem('bg-image', imgName);
        }, []);

        const shutDown = useCallback(() => {
                ReactGA.send({ hitType: 'pageview', page: '/switch-off', title: 'Custom Title' });

                ReactGA.event({
                        category: `Screen Change`,
                        action: `Switched off the Ubuntu`
                });

                const statusBar = document.getElementById('status-bar');
                statusBar?.blur();

                dispatch({ type: 'SET_OS_STATE', payload: OS_STATES.SHUTDOWN });
                safeLocalStorage?.setItem('shut-down', 'true');
        }, [dispatch]);

        const turnOn = useCallback(() => {
                ReactGA.send({ hitType: 'pageview', page: '/desktop', title: 'Custom Title' });
                dispatch({ type: 'SET_OS_STATE', payload: OS_STATES.BOOTING });
                safeLocalStorage?.setItem('shut-down', 'false');
        }, [dispatch]);

        const isLocked = state.osState === OS_STATES.LOCKED;
        const isBooting = state.osState === OS_STATES.BOOTING;
        const isShutDown = state.osState === OS_STATES.SHUTDOWN;

        return (
                <Layout id="monitor-screen">
                        <LockScreen isLocked={isLocked} bgImgName={state.bgImageName} unLockScreen={unLockScreen} />
                        <BootingScreen visible={isBooting} isShutDown={isShutDown} turnOn={turnOn} />
                        <Navbar lockScreen={lockScreen} shutDown={shutDown} />
                        <Desktop bg_image_name={state.bgImageName} changeBackgroundImage={changeBackgroundImage} />
                </Layout>
        );
}
