"use client";

import React, { Component } from "react";
import BootingScreen from "./screen/booting_screen";
import Desktop from "./screen/desktop";
import LockScreen from "./screen/lock_screen";
import Navbar from "./screen/navbar";
import Layout from "./desktop/Layout";
import ReactGA from "react-ga4";
import { safeLocalStorage } from "../utils/safeStorage";
import {
  UBUNTU_THEME_STORAGE_KEYS,
  getUbuntuThemeStorageItem,
  setUbuntuThemeStorageItem,
} from "../utils/ubuntuThemeTokens";

export type UbuntuThemeToken =
  (typeof UBUNTU_THEME_STORAGE_KEYS)[keyof typeof UBUNTU_THEME_STORAGE_KEYS];

interface UbuntuState {
  screen_locked: boolean;
  bg_image_name: string;
  booting_screen: boolean;
  shutDownScreen: boolean;
}

const {
  WALLPAPER: WALLPAPER_TOKEN,
  BOOTING_SCREEN: BOOTING_SCREEN_TOKEN,
  SCREEN_LOCKED: SCREEN_LOCKED_TOKEN,
  SHUT_DOWN: SHUT_DOWN_TOKEN,
} = UBUNTU_THEME_STORAGE_KEYS;

export default class Ubuntu extends Component<Record<string, never>, UbuntuState> {
  state: UbuntuState = {
    screen_locked: false,
    bg_image_name: "wall-2",
    booting_screen: true,
    shutDownScreen: false,
  };

  componentDidMount(): void {
    this.getLocalData();
  }

  setTimeOutBootScreen = (): void => {
    setTimeout(() => {
      this.setState({ booting_screen: false });
    }, 2000);
  };

  getLocalData = (): void => {
    const bgImageName = getUbuntuThemeStorageItem(
      safeLocalStorage,
      WALLPAPER_TOKEN,
    );
    if (bgImageName !== null) {
      this.setState({ bg_image_name: bgImageName });
    }

    const bootingScreen = getUbuntuThemeStorageItem(
      safeLocalStorage,
      BOOTING_SCREEN_TOKEN,
    );
    if (bootingScreen !== null) {
      this.setState({ booting_screen: false });
    } else {
      setUbuntuThemeStorageItem(safeLocalStorage, BOOTING_SCREEN_TOKEN, false);
      this.setTimeOutBootScreen();
    }

    const shutDown = getUbuntuThemeStorageItem(
      safeLocalStorage,
      SHUT_DOWN_TOKEN,
    );
    if (shutDown === "true") {
      this.shutDown();
      return;
    }

    const screenLocked = getUbuntuThemeStorageItem(
      safeLocalStorage,
      SCREEN_LOCKED_TOKEN,
    );
    if (screenLocked !== null) {
      this.setState({ screen_locked: screenLocked === "true" });
    }
  };

  lockScreen = (): void => {
    ReactGA.send({ hitType: "pageview", page: "/lock-screen", title: "Lock Screen" });
    ReactGA.event({
      category: `Screen Change`,
      action: `Set Screen to Locked`,
    });

    const statusBar = document.getElementById("status-bar");
    statusBar?.blur();
    setTimeout(() => {
      this.setState({ screen_locked: true });
    }, 100);
    setUbuntuThemeStorageItem(safeLocalStorage, SCREEN_LOCKED_TOKEN, true);
  };

  unLockScreen = (): void => {
    ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

    window.removeEventListener("click", this.unLockScreen);
    window.removeEventListener("keypress", this.unLockScreen);

    this.setState({ screen_locked: false });
    setUbuntuThemeStorageItem(safeLocalStorage, SCREEN_LOCKED_TOKEN, false);
  };

  changeBackgroundImage = (imgName: string): void => {
    this.setState({ bg_image_name: imgName });
    setUbuntuThemeStorageItem(safeLocalStorage, WALLPAPER_TOKEN, imgName);
  };

  shutDown = (): void => {
    ReactGA.send({ hitType: "pageview", page: "/switch-off", title: "Custom Title" });

    ReactGA.event({
      category: `Screen Change`,
      action: `Switched off the Ubuntu`,
    });

    const statusBar = document.getElementById("status-bar");
    statusBar?.blur();
    this.setState({ shutDownScreen: true });
    setUbuntuThemeStorageItem(safeLocalStorage, SHUT_DOWN_TOKEN, true);
  };

  turnOn = (): void => {
    ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

    this.setState({ shutDownScreen: false, booting_screen: true });
    this.setTimeOutBootScreen();
    setUbuntuThemeStorageItem(safeLocalStorage, SHUT_DOWN_TOKEN, false);
  };

  render(): JSX.Element {
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
        />
      </Layout>
    );
  }
}
