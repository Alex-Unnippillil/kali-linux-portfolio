"use client";

import React, { Component } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import Layout from './desktop/Layout';
import { logEvent, logPageView } from '../utils/analytics';
import NotificationCenter from './common/NotificationCenter';
import SystemNotifications from './common/SystemNotifications';
import { blurActiveElement } from '../utils/focusManager';
import { shellController } from '../services/shell/shellController';

export default class Ubuntu extends Component {
        constructor() {
                super();
                const shellState = shellController.getState();
                this.state = {
                        session: shellState.session,
                        bg_image_name: shellState.prefs.wallpaperName
                };
                this.desktopRef = React.createRef();
                this.shellUnsubscribe = null;
        }

        componentDidMount() {
                this.shellUnsubscribe = shellController.subscribe((state) => {
                        this.setState({
                                session: state.session,
                                bg_image_name: state.prefs.wallpaperName,
                        });
                });

                if (shellController.getState().session === 'booting') {
                        shellController.runBootSequence();
                }
        }

        componentWillUnmount() {
                if (this.shellUnsubscribe) {
                        this.shellUnsubscribe();
                        this.shellUnsubscribe = null;
                }
        }

        prepareDesktopForSessionChange = (nextSession) => {
                if (!this.desktopRef?.current) return;
                this.desktopRef.current.prepareForShellTransition(nextSession);
        };

        lockScreen = () => {
                logPageView('/lock-screen', 'Lock Screen');
                logEvent({
                        category: 'Screen Change',
                        action: 'Set Screen to Locked'
                });

                blurActiveElement();
                this.prepareDesktopForSessionChange('locked');
                shellController.lock();
        };

        unLockScreen = () => {
                logPageView('/desktop', 'Custom Title');

                window.removeEventListener('click', this.unLockScreen);
                window.removeEventListener('keypress', this.unLockScreen);

                shellController.unlock();
        };

        changeBackgroundImage = (img_name) => {
                shellController.setWallpaper(img_name);
        };

        shutDown = () => {
                logPageView('/switch-off', 'Custom Title');

                logEvent({
                        category: 'Screen Change',
                        action: 'Switched off the Ubuntu'
                });

                blurActiveElement();
                this.prepareDesktopForSessionChange('shutdown');
                shellController.shutdown();
        };

        turnOn = () => {
                logPageView('/desktop', 'Custom Title');

                shellController.turnOn();
        };

        render() {
                const screen_locked = this.state.session === 'locked';
                const booting_screen = this.state.session === 'booting';
                const shutDownScreen = this.state.session === 'shutdown';
                return (
                        <Layout id="monitor-screen">
                                <NotificationCenter>
                                        <SystemNotifications />
                                        <LockScreen
                                                isLocked={screen_locked}
                                                bgImgName={this.state.bg_image_name}
                                                unLockScreen={this.unLockScreen}
                                        />
                                        <BootingScreen
                                                visible={booting_screen}
                                                isShutDown={shutDownScreen}
                                                turnOn={this.turnOn}
                                                disableMessageSequence={typeof jest !== 'undefined'}
                                        />
                                        <Navbar lockScreen={this.lockScreen} shutDown={this.shutDown} />
                                        <Desktop
                                                ref={this.desktopRef}
                                                bg_image_name={this.state.bg_image_name}
                                                changeBackgroundImage={this.changeBackgroundImage}
                                                isInputFrozen={screen_locked || shutDownScreen}
                                        />
                                </NotificationCenter>
                        </Layout>
                );
        }
}
