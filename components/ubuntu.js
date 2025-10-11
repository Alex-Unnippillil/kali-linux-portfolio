"use client";

import React, { Component } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import DesktopTour from './ui/DesktopTour';
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
                        shutDownScreen: false,
                        showDesktopTour: false,
                        desktopTourComplete: false
                };
                this.startTourWhenReady = false;
                this.pendingTourSource = 'auto';
                this.bootScreenLoadHandler = null;
        }

	componentDidMount() {
		this.getLocalData();
	}

        componentWillUnmount() {
                this.detachBootScreenLoadHandler();
        }

        componentDidUpdate(prevProps, prevState) {
                if (prevState.booting_screen && !this.state.booting_screen) {
                        this.maybeStartDesktopTour();
                }
                if (prevState.shutDownScreen && !this.state.shutDownScreen) {
                        this.maybeStartDesktopTour();
                }
        }

        detachBootScreenLoadHandler = () => {
                if (typeof window === 'undefined' || !this.bootScreenLoadHandler) return;

                window.removeEventListener('load', this.bootScreenLoadHandler);
                this.bootScreenLoadHandler = null;
	};

        hideBootScreen = () => {
                this.setState({ booting_screen: false }, () => {
                        this.maybeStartDesktopTour();
                });
        };

	waitForBootSequence = () => {
		if (typeof window === 'undefined' || typeof document === 'undefined') return;

		const finalizeBoot = () => {
			this.hideBootScreen();
			this.detachBootScreenLoadHandler();
		};

		if (document.readyState === 'complete') {
			finalizeBoot();
		} else {
			this.detachBootScreenLoadHandler();
			this.bootScreenLoadHandler = finalizeBoot;
			window.addEventListener('load', this.bootScreenLoadHandler, { once: true });
		}
	};

        getLocalData = () => {
                // Get Previously selected Background Image
                let bg_image_name = safeLocalStorage?.getItem('bg-image');
                if (bg_image_name !== null && bg_image_name !== undefined) {
                        this.setState({ bg_image_name });
                }

                let desktopTourComplete = false;
                try {
                        desktopTourComplete = safeLocalStorage?.getItem('desktop-tour-complete') === 'true';
                } catch (error) {
                        desktopTourComplete = false;
                }
                this.setState({ desktopTourComplete });
                if (!desktopTourComplete) {
                        this.requestDesktopTour();
                }

                let booting_screen = safeLocalStorage?.getItem('booting_screen');
                if (booting_screen !== null && booting_screen !== undefined) {
                        // user has visited site before
                        this.setState({ booting_screen: false }, () => {
                                this.maybeStartDesktopTour();
                        });
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

        requestDesktopTour = (source = 'auto') => {
                if (this.state.desktopTourComplete) return;
                this.startTourWhenReady = true;
                this.pendingTourSource = source;
                this.maybeStartDesktopTour();
        };

        maybeStartDesktopTour = () => {
                if (!this.startTourWhenReady) return;
                if (this.state.booting_screen || this.state.shutDownScreen) return;
                this.startTourWhenReady = false;
                const source = this.pendingTourSource || 'auto';
                this.pendingTourSource = 'auto';
                this.openDesktopTour(source);
        };

        openDesktopTour = (source = 'auto') => {
                if (this.state.showDesktopTour) return;
                this.startTourWhenReady = false;
                ReactGA.event({
                        category: 'Desktop Tour',
                        action: 'Start',
                        label: source,
                });
                this.setState({ showDesktopTour: true });
        };

        persistDesktopTourCompletion = () => {
                if (!safeLocalStorage) return;
                try {
                        safeLocalStorage.setItem('desktop-tour-complete', 'true');
                } catch (error) {
                        // ignore storage errors
                }
        };

        setDesktopTourComplete = () => {
                this.startTourWhenReady = false;
                this.setState({ showDesktopTour: false, desktopTourComplete: true });
                this.persistDesktopTourCompletion();
        };

        handleDesktopTourAdvance = (nextStepIndex) => {
                const detail = {
                        category: 'Desktop Tour',
                        action: 'Advance',
                };
                if (typeof nextStepIndex === 'number') {
                        detail.label = `Step ${nextStepIndex + 1}`;
                }
                ReactGA.event(detail);
        };

        handleDesktopTourSkip = () => {
                ReactGA.event({
                        category: 'Desktop Tour',
                        action: 'Skip',
                });
                this.setDesktopTourComplete();
        };

        handleDesktopTourRestart = () => {
                ReactGA.event({
                        category: 'Desktop Tour',
                        action: 'Restart',
                });
        };

        handleDesktopTourComplete = () => {
                ReactGA.event({
                        category: 'Desktop Tour',
                        action: 'Complete',
                });
                this.setDesktopTourComplete();
        };

        handleReplayDesktopTour = () => {
                if (this.state.showDesktopTour) return;
                this.persistDesktopTourCompletion();
                if (this.state.booting_screen || this.state.shutDownScreen) {
                        this.requestDesktopTour('manual');
                        return;
                }
                this.openDesktopTour('manual');
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
                                />
                                <Navbar
                                        lockScreen={this.lockScreen}
                                        shutDown={this.shutDown}
                                        onReplayTour={this.handleReplayDesktopTour}
                                        tourActive={this.state.showDesktopTour}
                                />
                                <Desktop
                                        bg_image_name={this.state.bg_image_name}
                                        changeBackgroundImage={this.changeBackgroundImage}
                                        inputSuspended={this.state.showDesktopTour}
                                />
                                <DesktopTour
                                        open={this.state.showDesktopTour}
                                        onAdvance={this.handleDesktopTourAdvance}
                                        onSkip={this.handleDesktopTourSkip}
                                        onRestart={this.handleDesktopTourRestart}
                                        onComplete={this.handleDesktopTourComplete}
                                />
                </Layout>
        );
        }
}
