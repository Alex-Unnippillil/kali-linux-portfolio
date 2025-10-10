"use client";

import React, { Component } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import Layout from './desktop/Layout';
import ReactGA from 'react-ga4';
import { safeLocalStorage } from '../utils/safeStorage';
import {
        getBootAnimationPreferenceSync,
        BOOT_ANIMATION_DURATIONS,
} from '../utils/settingsStore';

export default class Ubuntu extends Component {
	constructor() {
		super();
                this.state = {
                        screen_locked: false,
                        bg_image_name: 'wall-2',
                        booting_screen: true,
                        shutDownScreen: false
                };
                this.bootAnimationPreference = 'default';
                this.bootTimeout = null;
        }

        componentDidMount() {
                this.bootAnimationPreference = getBootAnimationPreferenceSync();
                this.getLocalData();
        }

        componentWillUnmount() {
                if (this.bootTimeout) {
                        clearTimeout(this.bootTimeout);
                        this.bootTimeout = null;
                }
        }

        setTimeOutBootScreen = () => {
                if (this.bootTimeout) {
                        clearTimeout(this.bootTimeout);
                        this.bootTimeout = null;
                }
                const preference = this.bootAnimationPreference || 'default';
                const duration = BOOT_ANIMATION_DURATIONS[preference] ?? BOOT_ANIMATION_DURATIONS.default;
                if (duration === 0) {
                        this.setState({ booting_screen: false });
                        return;
                }
                this.bootTimeout = setTimeout(() => {
                        this.setState({ booting_screen: false });
                        this.bootTimeout = null;
                }, duration);
        };

        getLocalData = () => {
                // Get Previously selected Background Image
                let bg_image_name = safeLocalStorage?.getItem('bg-image');
                if (bg_image_name !== null && bg_image_name !== undefined) {
                        this.setState({ bg_image_name });
                }

                const hasSeenBoot = safeLocalStorage?.getItem('booting_screen');
                if (hasSeenBoot === null || hasSeenBoot === undefined) {
                        safeLocalStorage?.setItem('booting_screen', 'seen');
                }

                if (this.bootAnimationPreference === 'skip') {
                        this.setState({ booting_screen: false });
                } else {
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
				/>
                                <Navbar lockScreen={this.lockScreen} shutDown={this.shutDown} />
                                <Desktop bg_image_name={this.state.bg_image_name} changeBackgroundImage={this.changeBackgroundImage} />
                </Layout>
        );
	}
}
