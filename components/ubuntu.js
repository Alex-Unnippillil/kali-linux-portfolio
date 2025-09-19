"use client";

import React, { Component } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import Toast from './ui/Toast';
import ReactGA from 'react-ga4';
import { safeLocalStorage } from '../utils/safeStorage';
import { createLogger } from '../lib/logger';

export const VERSION_STORAGE_KEY = 'kali-portfolio-version';

export default class Ubuntu extends Component {
        constructor() {
                super();
                this.logger = createLogger('ubuntu-desktop');
                this._isMounted = false;
                this.state = {
                        screen_locked: false,
                        bg_image_name: 'wall-2',
                        booting_screen: true,
                        shutDownScreen: false,
                        toastMessage: ''
                };
        }

        componentDidMount() {
                this._isMounted = true;
                this.getLocalData();
                this.verifyAppVersion();
        }

        componentWillUnmount() {
                this._isMounted = false;
        }

        setTimeOutBootScreen = () => {
                setTimeout(() => {
                        this.setState({ booting_screen: false });
                }, 2000);
        };

        getLocalData = () => {
                // Get Previously selected Background Image
                let bg_image_name = safeLocalStorage?.getItem('bg-image');
                if (bg_image_name !== null && bg_image_name !== undefined) {
                        this.setState({ bg_image_name });
                }

                let booting_screen = safeLocalStorage?.getItem('booting_screen');
                if (booting_screen !== null && booting_screen !== undefined) {
                        // user has visited site before
                        this.setState({ booting_screen: false });
                } else {
                        // user is visiting site for the first time
                        safeLocalStorage?.setItem('booting_screen', false);
                        this.setTimeOutBootScreen();
                }

                // get shutdown state
                let shut_down = safeLocalStorage?.getItem('shut-down');
                if (shut_down !== null && shut_down !== undefined && shut_down === 'true') this.shutDown();
                else {
                        // Get previous lock screen state
                        let screen_locked = safeLocalStorage?.getItem('screen-locked');
                        if (screen_locked !== null && screen_locked !== undefined) {
                                this.setState({ screen_locked: screen_locked === 'true' ? true : false });
                        }
                }
        };

        verifyAppVersion = async () => {
                if (typeof fetch !== 'function') {
                        return;
                }

                try {
                        const response = await fetch('/version.json', { cache: 'no-store' });
                        if (!response?.ok) {
                                throw new Error(`Failed to load version manifest: ${response?.status || 'unknown status'}`);
                        }

                        const versionPayload = await response.json();
                        const storedRaw = safeLocalStorage?.getItem(VERSION_STORAGE_KEY);
                        let storedVersion = null;
                        let hadStoredValue = false;
                        if (storedRaw) {
                                hadStoredValue = true;
                                try {
                                        storedVersion = JSON.parse(storedRaw);
                                } catch (error) {
                                        this.logger.warn('Failed to parse stored version data', {
                                                error: error instanceof Error ? error.message : String(error)
                                        });
                                }
                        }

                        const versionChanged =
                                !storedVersion ||
                                storedVersion.appVersion !== versionPayload.appVersion ||
                                storedVersion.cacheVersion !== versionPayload.cacheVersion;
                        const shouldClearCaches = versionChanged && (hadStoredValue || storedVersion);
                        let clearedCaches = [];

                        if (shouldClearCaches) {
                                clearedCaches = await this.clearOutdatedCaches();
                                if (hadStoredValue && this._isMounted) {
                                        this.setState({ toastMessage: 'Assets refreshed. Reload to use the latest updates.' });
                                }
                                this.logger.info('Refreshed cached application assets', {
                                        previousAppVersion: storedVersion?.appVersion ?? null,
                                        newAppVersion: versionPayload.appVersion,
                                        previousCacheVersion: storedVersion?.cacheVersion ?? null,
                                        newCacheVersion: versionPayload.cacheVersion,
                                        clearedCaches
                                });
                        } else {
                                this.logger.debug('Application assets already current', {
                                        appVersion: versionPayload.appVersion,
                                        cacheVersion: versionPayload.cacheVersion
                                });
                        }

                        safeLocalStorage?.setItem(
                                VERSION_STORAGE_KEY,
                                JSON.stringify({
                                        appVersion: versionPayload.appVersion,
                                        cacheVersion: versionPayload.cacheVersion
                                })
                        );
                } catch (error) {
                        this.logger.warn('Failed to verify cached assets', {
                                error: error instanceof Error ? error.message : String(error)
                        });
                }
        };

        clearOutdatedCaches = async () => {
                if (typeof caches === 'undefined') {
                        this.logger.debug('Cache API unavailable; skipping cache cleanup');
                        return [];
                }

                try {
                        const cacheKeys = await caches.keys();
                        const removed = [];
                        await Promise.all(
                                cacheKeys.map(async (key) => {
                                        try {
                                                const deleted = await caches.delete(key);
                                                if (deleted) {
                                                        removed.push(key);
                                                }
                                        } catch (error) {
                                                this.logger.warn('Failed to delete cache', {
                                                        cacheName: key,
                                                        error: error instanceof Error ? error.message : String(error)
                                                });
                                        }
                                })
                        );
                        return removed;
                } catch (error) {
                        this.logger.warn('Unable to enumerate caches', {
                                error: error instanceof Error ? error.message : String(error)
                        });
                        return [];
                }
        };

        dismissToast = () => {
                if (this._isMounted) {
                        this.setState({ toastMessage: '' });
                }
        };

        refreshPage = () => {
                if (typeof window !== 'undefined' && window.location) {
                        window.location.reload();
                }
        };

        lockScreen = () => {
                // google analytics
                ReactGA.send({ hitType: "pageview", page: "/lock-screen", title: "Lock Screen" });
                ReactGA.event({
                        category: `Screen Change`,
                        action: `Set Screen to Locked`
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
                        action: `Switched off the Ubuntu`
                });

                const statusBar = document.getElementById('status-bar');
                // Consider using a React ref if the status bar element lives within this component tree
                statusBar?.blur();
                this.setState({ shutDownScreen: true });
                safeLocalStorage?.setItem('shut-down', true);
        };

        turnOn = () => {
                ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

                this.setState({ shutDownScreen: false, booting_screen: true });
                this.setTimeOutBootScreen();
                safeLocalStorage?.setItem('shut-down', false);
        };

        render() {
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
                                {this.state.toastMessage ? (
                                        <Toast
                                                message={this.state.toastMessage}
                                                actionLabel="Reload"
                                                onAction={this.refreshPage}
                                                onClose={this.dismissToast}
                                                duration={10000}
                                        />
                                ) : null}
                        </div>
                );
        }
}
