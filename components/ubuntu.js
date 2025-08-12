import React, { useState, useEffect, useRef, useCallback } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import ReactGA from 'react-ga4';

export default function Ubuntu() {
        const [screenLocked, setScreenLocked] = useState(false);
        const [bgImageName, setBgImageName] = useState('wall-2');
        const [bootingScreen, setBootingScreen] = useState(true);
        const [shutDownScreen, setShutDownScreen] = useState(false);
        const statusBarRef = useRef(null);
        const desktopRef = useRef(null);

        useEffect(() => {
                getLocalData();
        }, []);

        const setTimeOutBootScreen = () => {
                setTimeout(() => {
                        setBootingScreen(false);
                }, 2000);
        };

        const getLocalData = () => {
                let bg_image_name = localStorage.getItem('bg-image');
                if (bg_image_name !== null && bg_image_name !== undefined) {
                        setBgImageName(bg_image_name);
                }

                let booting_screen = localStorage.getItem('booting_screen');
                if (booting_screen !== null && booting_screen !== undefined) {
                        setBootingScreen(false);
                } else {
                        localStorage.setItem('booting_screen', false);
                        setTimeOutBootScreen();
                }

                let shut_down = localStorage.getItem('shut-down');
                if (shut_down !== null && shut_down !== undefined && shut_down === 'true') shutDown();
                else {
                        let screen_locked = localStorage.getItem('screen-locked');
                        if (screen_locked !== null && screen_locked !== undefined) {
                                setScreenLocked(screen_locked === 'true');
                        }
                }
        };

        const lockScreen = () => {
                ReactGA.send({ hitType: "pageview", page: "/lock-screen", title: "Lock Screen" });
                ReactGA.event({
                        category: `Screen Change`,
                        action: `Set Screen to Locked`
                });

                statusBarRef.current?.blur();
                setTimeout(() => {
                        setScreenLocked(true);
                }, 100);
                localStorage.setItem('screen-locked', true);
        };

        const unLockScreen = useCallback(() => {
                ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

                window.removeEventListener('click', unLockScreen);
                window.removeEventListener('keypress', unLockScreen);

                setScreenLocked(false);
                localStorage.setItem('screen-locked', false);
        }, []);

        const changeBackgroundImage = (img_name) => {
                setBgImageName(img_name);
                localStorage.setItem('bg-image', img_name);
        };

        const shutDown = () => {
                ReactGA.send({ hitType: "pageview", page: "/switch-off", title: "Custom Title" });

                ReactGA.event({
                        category: `Screen Change`,
                        action: `Switched off the Ubuntu`
                });

                statusBarRef.current?.blur();
                setShutDownScreen(true);
                localStorage.setItem('shut-down', true);
        };

        const turnOn = () => {
                ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

                setShutDownScreen(false);
                setBootingScreen(true);
                setTimeOutBootScreen();
                localStorage.setItem('shut-down', false);
        };

        const openSettings = () => {
                desktopRef.current?.openApp && desktopRef.current.openApp('settings');
        };

        return (
                <div className="w-screen h-screen overflow-hidden" id="monitor-screen">
                        <LockScreen
                                isLocked={screenLocked}
                                bgImgName={bgImageName}
                                unLockScreen={unLockScreen}
                        />
                        <BootingScreen
                                visible={bootingScreen}
                                isShutDown={shutDownScreen}
                                turnOn={turnOn}
                        />
                        <Navbar lockScreen={lockScreen} shutDown={shutDown} statusRef={statusBarRef} openSettings={openSettings} />
                        <Desktop ref={desktopRef} bg_image_name={bgImageName} changeBackgroundImage={changeBackgroundImage} />
                </div>
        );
}
