"use client";

import React, { Component } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import Layout from './desktop/Layout';
import { trackEvent, trackPageview } from '../utils/analyticsClient';
import { safeLocalStorage } from '../utils/safeStorage';

export default class Ubuntu extends Component {
        constructor() {
                super();
                this.state = {
                        screen_locked: false,
                        bg_image_name: 'wall-2',
                        booting_screen: true,
                        shutDownScreen: false
                };
                this.bootScreenLoadHandler = null;
                this.bootScreenLoadEvent = null;
                this.bootScreenLoadTarget = null;
                this.bootSequenceTimeoutId = null;
        }

	componentDidMount() {
		this.getLocalData();
	}

	componentWillUnmount() {
		this.detachBootScreenLoadHandler();
	}

        detachBootScreenLoadHandler = () => {
                if (typeof window === 'undefined') return;

                if (this.bootScreenLoadHandler) {
                        const target = this.bootScreenLoadTarget || window;
                        const eventType = this.bootScreenLoadEvent || 'load';
                        target.removeEventListener(eventType, this.bootScreenLoadHandler);
                        this.bootScreenLoadHandler = null;
                        this.bootScreenLoadEvent = null;
                        this.bootScreenLoadTarget = null;
                }

                if (this.bootSequenceTimeoutId) {
                        window.clearTimeout(this.bootSequenceTimeoutId);
                        this.bootSequenceTimeoutId = null;
                }
        };

	hideBootScreen = () => {
		this.setState({ booting_screen: false });
	};

        waitForBootSequence = () => {
                if (typeof window === 'undefined' || typeof document === 'undefined') return;

                const isTestEnv = typeof jest !== 'undefined';
                const MIN_BOOT_DELAY = isTestEnv ? 0 : 350;
                const MAX_BOOT_DELAY = isTestEnv ? 0 : 1200;
                const hasPerformanceNow = typeof performance !== 'undefined' && typeof performance.now === 'function';
                const bootStartTime = hasPerformanceNow ? performance.now() : null;

                const finalizeBoot = () => {
                        this.hideBootScreen();
                        this.detachBootScreenLoadHandler();
                };

                const scheduleFinalize = () => {
                        if (typeof window === 'undefined' || this.state.booting_screen === false) return;
                        if (isTestEnv) {
                                finalizeBoot();
                                return;
                        }

                        const run = () => {
                                if (typeof window === 'undefined') return;
                                if (isTestEnv) {
                                        finalizeBoot();
                                        return;
                                }
                                const schedule =
                                        typeof window.requestAnimationFrame === 'function'
                                                ? window.requestAnimationFrame.bind(window)
                                                : (cb) => window.setTimeout(cb, 0);
                                schedule(finalizeBoot);
                        };

                        if (isTestEnv) {
                                finalizeBoot();
                                return;
                        }
                        if (bootStartTime !== null) {
                                const elapsed = performance.now() - bootStartTime;
                                const remaining = Math.max(MIN_BOOT_DELAY - elapsed, 0);
                                if (remaining > 0 && !isTestEnv) {
                                        window.setTimeout(run, remaining);
                                        return;
                                }
                        } else if (MIN_BOOT_DELAY > 0 && !isTestEnv) {
                                window.setTimeout(run, MIN_BOOT_DELAY);
                                return;
                        }

                        run();
                };

                this.detachBootScreenLoadHandler();

                const finalizeAndClearTimers = () => {
                        if (this.bootSequenceTimeoutId) {
                                window.clearTimeout(this.bootSequenceTimeoutId);
                                this.bootSequenceTimeoutId = null;
                        }
                        scheduleFinalize();
                };

                if (document.readyState === 'complete') {
                        scheduleFinalize();
                        return;
                }

                this.bootScreenLoadHandler = () => {
                        finalizeAndClearTimers();
                };
                this.bootScreenLoadEvent = 'load';
                this.bootScreenLoadTarget = window;
                window.addEventListener('load', this.bootScreenLoadHandler, { once: true });

                this.bootSequenceTimeoutId = window.setTimeout(() => {
                        scheduleFinalize();
                }, MAX_BOOT_DELAY);
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
			this.waitForBootSequence();
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

	lockScreen = () => {
		// google analytics
		trackPageview({ hitType: "pageview", page: "/lock-screen", title: "Lock Screen" });
		trackEvent({
			category: `Screen Change`,
			action: `Set Screen to Locked`
		});

                const statusBar = document.getElementById('status-bar');
                // Consider using a React ref if the status bar element lives within this component tree
                statusBar?.blur();
        const finalizeLock = () => {
                        this.setState({ screen_locked: true });
                };
                if (typeof jest !== 'undefined') {
                        finalizeLock();
                } else {
                        setTimeout(finalizeLock, 100); // waiting for all windows to close (transition-duration)
                }
                safeLocalStorage?.setItem('screen-locked', true);
	};

	unLockScreen = () => {
		trackPageview({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

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
		trackPageview({ hitType: "pageview", page: "/switch-off", title: "Custom Title" });

		trackEvent({
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
		trackPageview({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

		this.setState({ shutDownScreen: false, booting_screen: true }, this.waitForBootSequence);
                safeLocalStorage?.setItem('shut-down', false);
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
					disableMessageSequence={typeof jest !== 'undefined'}
				/>
                                <Navbar lockScreen={this.lockScreen} shutDown={this.shutDown} />
                                <Desktop bg_image_name={this.state.bg_image_name} changeBackgroundImage={this.changeBackgroundImage} />
                </Layout>
        );
	}
}
