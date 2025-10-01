"use client";

import React, { Component } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import Layout from './desktop/Layout';
import ReactGA from 'react-ga4';
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

                this.minimumBootDuration = 2000;
                this.bootScreenStart = Date.now();
                this.bootReleaseTimer = null;
                this.isBootSequenceActive = true;
        }

        componentDidMount() {
                this.getLocalData();
        }

        componentWillUnmount() {
                if (this.bootReleaseTimer) {
                        clearTimeout(this.bootReleaseTimer);
                        this.bootReleaseTimer = null;
                }
        }

        getLocalData = () => {
                // Get Previously selected Background Image
                let bg_image_name = safeLocalStorage?.getItem('bg-image');
                if (bg_image_name !== null && bg_image_name !== undefined) {
                        this.setState({ bg_image_name });
                }

                safeLocalStorage?.removeItem('booting_screen');

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

        startBootSequence = () => {
                if (this.bootReleaseTimer) {
                        clearTimeout(this.bootReleaseTimer);
                        this.bootReleaseTimer = null;
                }

                this.bootScreenStart = Date.now();
                this.isBootSequenceActive = true;
                this.setState({ booting_screen: true });
        };

        handleBootReady = () => {
                if (!this.isBootSequenceActive) return;

                if (this.bootReleaseTimer) {
                        clearTimeout(this.bootReleaseTimer);
                        this.bootReleaseTimer = null;
                }

                const now = Date.now();
                const elapsed = now - this.bootScreenStart;
                const remaining = Math.max(this.minimumBootDuration - elapsed, 0);

                const finalizeBoot = () => {
                        this.setState({ booting_screen: false });
                        this.isBootSequenceActive = false;
                        this.bootReleaseTimer = null;
                };

                if (remaining <= 0) finalizeBoot();
                else this.bootReleaseTimer = setTimeout(finalizeBoot, remaining);
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

                this.startBootSequence();
                this.setState({ shutDownScreen: false }, () => {
                        this.handleBootReady();
                });
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
                                <Desktop
                                        bg_image_name={this.state.bg_image_name}
                                        changeBackgroundImage={this.changeBackgroundImage}
                                        onReady={this.handleBootReady}
                                />
                </Layout>
        );
        }
}
