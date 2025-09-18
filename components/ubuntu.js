"use client";

import React, { Component } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import UserSwitcher from './apps/user-switcher/UserSwitcher';
import ReactGA from 'react-ga4';
import { safeLocalStorage } from '../utils/safeStorage';
import { createInitialDesktopSession } from '../hooks/useSession';
import {
        getSnapshot as getSessionSnapshot,
        isUserSwitcherEnabled,
        setLockState,
        subscribe as subscribeToSessions,
        updateActiveSessionState,
} from '../modules/system/sessionManager';

const toNumber = (value, fallback) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
};

const cloneDesktopSession = (session) => {
        const base = createInitialDesktopSession();
        if (!session) {
                return { ...base };
        }
        const wallpaper = typeof session.wallpaper === 'string' ? session.wallpaper : base.wallpaper;
        const dock = Array.isArray(session.dock) ? [...session.dock] : [];
        const windows = Array.isArray(session.windows)
                ? session.windows
                        .filter((win) => win && typeof win.id === 'string')
                        .map((win) => ({
                                id: win.id,
                                x: toNumber(win.x, 60),
                                y: toNumber(win.y, 10),
                        }))
                : [];
        return { wallpaper, dock, windows };
};

export default class Ubuntu extends Component {
        constructor() {
                super();
                this.userSwitcherEnabled = isUserSwitcherEnabled();
                this.sessionUnsubscribe = null;
                this.state = {
                        screen_locked: false,
                        bg_image_name: 'wall-2',
                        booting_screen: true,
                        shutDownScreen: false,
                        session: createInitialDesktopSession(),
                        activeSessionId: null,
                        showUserSwitcher: false,
                };
        }

        componentDidMount() {
                this.getLocalData();
                this.setupSessionManager();
        }

        componentWillUnmount() {
                if (this.sessionUnsubscribe) {
                        this.sessionUnsubscribe();
                        this.sessionUnsubscribe = null;
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

        setupSessionManager = () => {
                if (!this.userSwitcherEnabled) return;
                const snapshot = getSessionSnapshot();
                this.applySessionSnapshot(snapshot);
                this.sessionUnsubscribe = subscribeToSessions(this.applySessionSnapshot);
        };

        applySessionSnapshot = (snapshot) => {
                if (!snapshot || !snapshot.active) {
                        this.setState({ activeSessionId: null, session: createInitialDesktopSession() });
                        return;
                }
                const nextSession = cloneDesktopSession(snapshot.active.session);
                const wallpaper = nextSession.wallpaper || this.state.bg_image_name;
                if (wallpaper) {
                        safeLocalStorage?.setItem('bg-image', wallpaper);
                }
                const locked = !!snapshot.active.meta.locked;
                safeLocalStorage?.setItem('screen-locked', locked ? 'true' : 'false');
                this.setState({
                        session: { ...nextSession, wallpaper },
                        activeSessionId: snapshot.active.meta.id,
                        screen_locked: locked,
                        bg_image_name: wallpaper,
                });
        };

        handleSessionUpdate = (session) => {
                if (!this.userSwitcherEnabled || !this.state.activeSessionId) return;
                const nextSession = cloneDesktopSession(session);
                if (!nextSession.wallpaper) {
                        nextSession.wallpaper = this.state.bg_image_name;
                }
                this.setState({ session: nextSession });
                updateActiveSessionState(nextSession);
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
                if (this.userSwitcherEnabled && this.state.activeSessionId) {
                        setLockState(this.state.activeSessionId, true);
                }
        };

        unLockScreen = () => {
                ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

                window.removeEventListener('click', this.unLockScreen);
                window.removeEventListener('keypress', this.unLockScreen);

                this.setState({ screen_locked: false });
                safeLocalStorage?.setItem('screen-locked', false);
                if (this.userSwitcherEnabled && this.state.activeSessionId) {
                        setLockState(this.state.activeSessionId, false);
                }
        };

        changeBackgroundImage = (img_name) => {
                this.setState({ bg_image_name: img_name });
                safeLocalStorage?.setItem('bg-image', img_name);
                if (this.userSwitcherEnabled && this.state.activeSessionId) {
                        const baseSession = this.state.session || createInitialDesktopSession();
                        const nextSession = { ...cloneDesktopSession(baseSession), wallpaper: img_name };
                        this.setState({ session: nextSession });
                        updateActiveSessionState(nextSession);
                }
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

        openUserSwitcher = () => {
                if (!this.userSwitcherEnabled) return;
                this.setState({ showUserSwitcher: true });
        };

        closeUserSwitcher = () => {
                this.setState({ showUserSwitcher: false });
        };

        render() {
                const sessionProps = this.userSwitcherEnabled && this.state.activeSessionId ? {
                        session: this.state.session,
                        setSession: this.handleSessionUpdate,
                        activeSessionId: this.state.activeSessionId,
                } : {};
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
                                        onOpenUserSwitcher={this.openUserSwitcher}
                                        userSwitcherEnabled={this.userSwitcherEnabled}
                                />
                                {this.userSwitcherEnabled && this.state.showUserSwitcher && (
                                        <UserSwitcher onClose={this.closeUserSwitcher} />
                                )}
                                <Desktop
                                        bg_image_name={this.state.bg_image_name}
                                        changeBackgroundImage={this.changeBackgroundImage}
                                        {...sessionProps}
                                />
                        </div>
                );
        }
}
