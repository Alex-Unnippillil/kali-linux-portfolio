"use client";

import React, { Component } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import ReactGA from 'react-ga4';
import { safeLocalStorage } from '../utils/safeStorage';

export default class Ubuntu extends Component {
	constructor() {
		super();
                this.bootScreenTimeout = null;
                this.statusBarRef = React.createRef();
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
		if (this.bootScreenTimeout) {
			clearTimeout(this.bootScreenTimeout);
		}

		this.bootScreenTimeout = setTimeout(() => {
			this.setState({ booting_screen: false });
			this.bootScreenTimeout = null;
		}, 2000);
	};

	getLocalData = () => {
		// Get Previously selected Background Image
		let bg_image_name = safeLocalStorage?.getItem('bg-image');
		if (bg_image_name !== null && bg_image_name !== undefined) {
			this.setState({ bg_image_name });
		}

		// get shutdown state
		let shut_down = safeLocalStorage?.getItem('shut-down');
		if (shut_down !== null && shut_down !== undefined && shut_down === 'true') {
			this.shutDown();
		} else {
			// Get previous lock screen state
			let screen_locked = safeLocalStorage?.getItem('screen-locked');
			if (screen_locked !== null && screen_locked !== undefined) {
				this.setState({ screen_locked: screen_locked === 'true' ? true : false });
			}

			safeLocalStorage?.removeItem('booting_screen');

			// Always show boot screen briefly on load
			this.setTimeOutBootScreen();
		}
	};

	componentWillUnmount = () => {
		if (this.bootScreenTimeout) {
			clearTimeout(this.bootScreenTimeout);
		}
	};

	lockScreen = () => {
		// google analytics
		ReactGA.send({ hitType: "pageview", page: "/lock-screen", title: "Lock Screen" });
		ReactGA.event({
			category: `Screen Change`,
			action: `Set Screen to Locked`
		});

                this.blurStatusBar();
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

                this.blurStatusBar();
                this.setState({ shutDownScreen: true });
                safeLocalStorage?.setItem('shut-down', true);
        };

        blurStatusBar = () => {
                const statusBarNode = this.statusBarRef?.current;
                statusBarNode?.blur?.();
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
                                <Navbar statusBarRef={this.statusBarRef} lockScreen={this.lockScreen} shutDown={this.shutDown} />
				<Desktop bg_image_name={this.state.bg_image_name} changeBackgroundImage={this.changeBackgroundImage} />
			</div>
		);
	}
}
