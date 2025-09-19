"use client";

import React, { Component } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import ReactGA from 'react-ga4';
import { safeLocalStorage } from '../utils/safeStorage';
import useDailyTip from '../hooks/useDailyTip';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';

const DailyTipToast = () => {
        const { tip, dismissTip, neverShow } = useDailyTip();
        const prefersReducedMotion = usePrefersReducedMotion();
        const [renderedTip, setRenderedTip] = React.useState(null);
        const [visible, setVisible] = React.useState(false);

        React.useEffect(() => {
                if (tip) {
                        setRenderedTip(tip);
                        setVisible(true);
                }
        }, [tip]);

        React.useEffect(() => {
                if (!tip && renderedTip) {
                        setVisible(false);
                        if (prefersReducedMotion || typeof window === 'undefined') {
                                setRenderedTip(null);
                                return;
                        }

                        const timeout = window.setTimeout(() => setRenderedTip(null), 200);
                        return () => window.clearTimeout(timeout);
                }
                return undefined;
        }, [tip, renderedTip, prefersReducedMotion]);

        if (!renderedTip) return null;

        const transitionClasses = prefersReducedMotion ? '' : 'transition-opacity duration-300 ease-out';
        const opacityClass = visible ? 'opacity-100' : 'opacity-0 pointer-events-none';

        return (
                <div
                        className={`fixed bottom-6 left-1/2 z-50 flex w-[min(28rem,90vw)] -translate-x-1/2 flex-col gap-2 rounded-lg bg-slate-900/90 p-4 text-slate-100 shadow-lg backdrop-blur ${transitionClasses} ${opacityClass}`}
                        role="status"
                        aria-live="polite"
                >
                        <div className="text-sm font-semibold text-sky-200">{renderedTip.title}</div>
                        <p className="text-sm leading-snug">{renderedTip.body}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                <button
                                        type="button"
                                        onClick={dismissTip}
                                        className="rounded border border-slate-500/50 px-3 py-1 font-semibold text-slate-100/90 transition hover:border-slate-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                                >
                                        Dismiss
                                </button>
                                <button
                                        type="button"
                                        onClick={neverShow}
                                        className="rounded border border-transparent px-3 py-1 font-semibold text-slate-100/80 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                                >
                                        Never show tips
                                </button>
                        </div>
                </div>
        );
};

export default class Ubuntu extends Component {
	constructor() {
		super();
		this.state = {
			screen_locked: false,
			bg_image_name: 'wall-2',
			booting_screen: true,
			shutDownScreen: false
		};
	}

	componentDidMount() {
		this.getLocalData();
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
                                <DailyTipToast />
                        </div>
                );
        }
}
