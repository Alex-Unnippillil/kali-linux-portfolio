"use client";

import React, { Component } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import Layout from './desktop/Layout';
import ReactGA from 'react-ga4';
import { safeLocalStorage } from '../utils/safeStorage';

const QUICK_KEY_BINDINGS = [
        {
                combo: ['Ctrl', 'Alt', 'T'],
                description: 'Open Terminal',
        },
        {
                combo: ['Ctrl', 'Alt', 'L'],
                description: 'Lock Screen',
        },
        {
                combo: ['Super', 'D'],
                description: 'Show Desktop',
        },
];

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
                const { screen_locked, bg_image_name, booting_screen, shutDownScreen } = this.state;
                const showQuickKeys = !(booting_screen || shutDownScreen || screen_locked);

                return (
                        <Layout id="monitor-screen" className="has-quick-keys">
                                <LockScreen
                                        isLocked={screen_locked}
                                        bgImgName={bg_image_name}
                                        unLockScreen={this.unLockScreen}
                                />
                                <BootingScreen
                                        visible={booting_screen}
                                        isShutDown={shutDownScreen}
                                        turnOn={this.turnOn}
                                />
                                <Navbar lockScreen={this.lockScreen} shutDown={this.shutDown} />
                                <Desktop bg_image_name={bg_image_name} changeBackgroundImage={this.changeBackgroundImage} />
                                {showQuickKeys && (
                                        <aside className="quick-keys-bar" role="complementary" aria-label="Desktop quick keys">
                                                <h2 className="sr-only">Common keyboard shortcuts</h2>
                                                <ul className="quick-keys-list">
                                                        {QUICK_KEY_BINDINGS.map(({ combo, description }) => (
                                                                <li key={description} className="quick-keys-item">
                                                                        <div className="quick-keys-combo" aria-label={combo.join(' plus ')}>
                                                                                {combo.map((keyName, index) => (
                                                                                        <React.Fragment key={`${keyName}-${index}`}>
                                                                                                <kbd>{keyName}</kbd>
                                                                                                {index < combo.length - 1 && (
                                                                                                        <span className="quick-keys-plus" aria-hidden="true">
                                                                                                                +
                                                                                                        </span>
                                                                                                )}
                                                                                        </React.Fragment>
                                                                                ))}
                                                                        </div>
                                                                        <span className="quick-keys-label">{description}</span>
                                                                </li>
                                                        ))}
                                                </ul>
                                        </aside>
                                )}
                                <style jsx>{`
                                        .quick-keys-bar {
                                                position: fixed;
                                                left: 50%;
                                                bottom: calc(var(--safe-area-bottom, 0px) + clamp(0.75rem, 1.5vw + 0.5rem, 1.5rem));
                                                transform: translateX(-50%);
                                                width: min(calc(100% - clamp(1.25rem, 3vw, 2.25rem)), 40rem);
                                                background: linear-gradient(135deg, rgba(9, 11, 18, 0.92), rgba(18, 29, 49, 0.88));
                                                border: 1px solid rgba(255, 255, 255, 0.15);
                                                border-radius: clamp(0.75rem, 1vw, 1.25rem);
                                                padding: clamp(0.75rem, 1vw + 0.25rem, 1.25rem);
                                                box-shadow: 0 18px 45px rgba(0, 0, 0, 0.35);
                                                backdrop-filter: blur(16px);
                                                color: #f8fafc;
                                                z-index: 80;
                                        }

                                        .quick-keys-list {
                                                display: grid;
                                                grid-template-columns: repeat(auto-fit, minmax(12.5rem, 1fr));
                                                gap: clamp(0.75rem, 1vw + 0.25rem, 1.25rem);
                                                margin: 0;
                                                padding: 0;
                                                list-style: none;
                                        }

                                        .quick-keys-item {
                                                display: flex;
                                                flex-direction: column;
                                                gap: 0.5rem;
                                                padding: clamp(0.5rem, 0.75rem, 0.75rem);
                                                border-radius: clamp(0.5rem, 0.75rem, 0.85rem);
                                                background: rgba(15, 23, 42, 0.55);
                                                border: 1px solid rgba(148, 163, 184, 0.3);
                                                min-height: 3.25rem;
                                        }

                                        .quick-keys-combo {
                                                display: flex;
                                                flex-wrap: wrap;
                                                align-items: center;
                                                gap: 0.35rem;
                                                font-size: clamp(0.95rem, 0.85rem + 0.2vw, 1.05rem);
                                                letter-spacing: 0.015em;
                                        }

                                        .quick-keys-combo kbd {
                                                font-family: "JetBrains Mono", "Fira Code", monospace;
                                                font-weight: 600;
                                                padding: 0.3rem 0.55rem;
                                                border-radius: 0.45rem;
                                                border: 1px solid rgba(148, 163, 184, 0.5);
                                                background: rgba(15, 23, 42, 0.75);
                                                color: inherit;
                                                box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
                                                text-transform: uppercase;
                                                letter-spacing: 0.05em;
                                        }

                                        .quick-keys-plus {
                                                opacity: 0.75;
                                        }

                                        .quick-keys-label {
                                                font-size: clamp(0.75rem, 0.7rem + 0.25vw, 0.9rem);
                                                color: rgba(226, 232, 240, 0.9);
                                                font-weight: 500;
                                                letter-spacing: 0.02em;
                                        }

                                        .sr-only {
                                                position: absolute;
                                                width: 1px;
                                                height: 1px;
                                                padding: 0;
                                                margin: -1px;
                                                overflow: hidden;
                                                clip: rect(0, 0, 0, 0);
                                                white-space: nowrap;
                                                border: 0;
                                        }

                                        @media (max-width: 720px) {
                                                .quick-keys-bar {
                                                        width: min(calc(100% - 1.5rem), 32rem);
                                                }

                                                .quick-keys-item {
                                                        background: rgba(15, 23, 42, 0.7);
                                                }
                                        }

                                        @media (max-width: 480px) {
                                                .quick-keys-bar {
                                                        left: 50%;
                                                        transform: translateX(-50%);
                                                        width: calc(100% - 1.25rem);
                                                }

                                                .quick-keys-list {
                                                        grid-template-columns: 1fr;
                                                }
                                        }

                                        @media (max-width: 360px) {
                                                .quick-keys-bar {
                                                        padding: 0.75rem;
                                                        bottom: calc(var(--safe-area-bottom, 0px) + 0.75rem);
                                                }

                                                .quick-keys-combo {
                                                        font-size: clamp(0.9rem, 0.85rem + 0.25vw, 0.98rem);
                                                }

                                                .quick-keys-label {
                                                        font-size: clamp(0.72rem, 0.7rem + 0.2vw, 0.82rem);
                                                }
                                        }
                                `}</style>
                                <style jsx global>{`
                                        :root {
                                                --terminal-font-size: clamp(0.95rem, 0.85rem + 0.35vw, 1.125rem);
                                                --terminal-line-height: clamp(1.35, 1.2 + 0.25vw, 1.6);
                                        }

                                        @media (max-width: 960px) {
                                                :root {
                                                        --terminal-font-size: clamp(0.9rem, 0.8rem + 0.4vw, 1.05rem);
                                                        --terminal-line-height: clamp(1.32, 1.2 + 0.28vw, 1.55);
                                                }
                                        }

                                        @media (max-width: 640px) {
                                                :root {
                                                        --terminal-font-size: clamp(0.88rem, 0.78rem + 0.45vw, 1.02rem);
                                                        --terminal-line-height: clamp(1.3, 1.18 + 0.32vw, 1.5);
                                                }
                                        }

                                        @media (max-width: 400px) {
                                                :root {
                                                        --terminal-font-size: clamp(0.86rem, 0.76rem + 0.5vw, 0.98rem);
                                                        --terminal-line-height: clamp(1.28, 1.16 + 0.35vw, 1.45);
                                                }
                                        }

                                        #terminal .windowMainScreen,
                                        #ettercap [aria-label="terminal log"],
                                        .terminal-section,
                                        .terminal-section pre,
                                        .terminal-section code {
                                                font-size: var(--terminal-font-size);
                                                line-height: var(--terminal-line-height);
                                        }

                                        #terminal .windowMainScreen pre,
                                        #terminal .windowMainScreen code,
                                        #ettercap [aria-label="terminal log"] pre,
                                        #ettercap [aria-label="terminal log"] code {
                                                font-size: inherit;
                                                line-height: inherit;
                                        }

                                        .desktop-shell.has-quick-keys {
                                                padding-bottom: clamp(6.5rem, 6rem + 2vw, 8rem);
                                        }

                                        @media (max-width: 480px) {
                                                .desktop-shell.has-quick-keys {
                                                        padding-bottom: clamp(7rem, 6.5rem + 2vw, 9rem);
                                                }
                                        }

                                        @media (max-width: 360px) {
                                                .desktop-shell.has-quick-keys .opened-window {
                                                        width: calc(100% - 1.25rem) !important;
                                                        left: 50% !important;
                                                        transform: translate(-50%, 0) !important;
                                                }
                                        }
                                `}</style>
                        </Layout>
                );
        }
}
