"use client";

import React, { Component } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import ReactGA from 'react-ga4';
import { safeLocalStorage } from '../utils/safeStorage';
import useSession from '../hooks/useSession';

export class Ubuntu extends Component {
        constructor(props) {
                super(props);
                this.state = {
                        screen_locked: false,
                        bg_image_name: 'wall-2',
                        booting_screen: true,
                        shutDownScreen: false
                };
                this.desktopRef = React.createRef();
                this.restartTimeout = null;
        }

        componentDidMount() {
                this.getLocalData();
        }

        componentWillUnmount() {
                if (this.restartTimeout) {
                        clearTimeout(this.restartTimeout);
                }
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

        logOut = () => {
                const desktop = this.desktopRef.current;
                if (desktop?.handleLogOut) {
                        desktop.handleLogOut();
                }
                this.lockScreen();
        };

        restart = () => {
                const desktop = this.desktopRef.current;
                if (desktop?.handleRestart) {
                        desktop.handleRestart();
                }
                this.shutDown();
                if (this.restartTimeout) {
                        clearTimeout(this.restartTimeout);
                }
                this.restartTimeout = setTimeout(() => {
                        this.turnOn();
                        this.restartTimeout = null;
                }, 1200);
        };

        softReboot = () => {
                const desktop = this.desktopRef.current;
                if (desktop?.handleSoftReboot) {
                        desktop.handleSoftReboot();
                }
        };

        render() {
                const { session, setSession, clearSession } = this.props;
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
                                <Navbar
                                        lockScreen={this.lockScreen}
                                        shutDown={this.shutDown}
                                        logOut={this.logOut}
                                        restart={this.restart}
                                        softReboot={this.softReboot}
                                />
                                <Desktop
                                        ref={this.desktopRef}
                                        bg_image_name={this.state.bg_image_name}
                                        changeBackgroundImage={this.changeBackgroundImage}
                                        session={session}
                                        setSession={setSession}
                                        clearSession={clearSession}
                                />
                        </div>
                );
        }
}

const UbuntuWithSession = React.forwardRef((props, ref) => {
        const { session, setSession, resetSession } = useSession();
        return (
                <Ubuntu
                        {...props}
                        ref={ref}
                        session={session}
                        setSession={setSession}
                        clearSession={resetSession}
                />
        );
});

UbuntuWithSession.displayName = 'UbuntuWithSession';

export default UbuntuWithSession;
