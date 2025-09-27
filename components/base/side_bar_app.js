import React, { Component } from "react";
import Image from 'next/image';
import { toCanvas } from 'html-to-image';

export class SideBarApp extends Component {
    constructor() {
        super();
        this.id = null;
        this.state = {
            showTitle: false,
            scaleImage: false,
            thumbnail: null,
        };
    }

    componentDidMount() {
        this.id = this.props.id;
        this.updateBadge();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.notifications !== this.props.notifications || prevProps.tasks !== this.props.tasks) {
            this.updateBadge();
        }
    }

    updateBadge = () => {
        if (typeof navigator === 'undefined') return;
        const hasSet = 'setAppBadge' in navigator;
        const hasClear = 'clearAppBadge' in navigator;
        if (!hasSet && !hasClear) return;

        const notifications = Array.isArray(this.props.notifications)
            ? this.props.notifications.length
            : (typeof this.props.notifications === 'number' ? this.props.notifications : 0);
        const tasks = Array.isArray(this.props.tasks)
            ? this.props.tasks.length
            : (typeof this.props.tasks === 'number' ? this.props.tasks : 0);
        const count = notifications + tasks;

        if (count > 0 && hasSet) {
            navigator.setAppBadge(count).catch(() => {});
        } else if (hasClear) {
            navigator.clearAppBadge().catch(() => {});
        }
    };

    scaleImage = () => {
        setTimeout(() => {
            this.setState({ scaleImage: false });
        }, 1000);
        this.setState({ scaleImage: true });
    }

    openApp = () => {
        if (!this.props.isMinimized[this.id] && this.props.isClose[this.id]) {
            this.scaleImage();
        }
        this.props.openApp(this.id);
        this.setState({ showTitle: false, thumbnail: null });
    };

    captureThumbnail = async () => {
        const win = document.getElementById(this.id);
        if (!win) return;
        let dataUrl = null;
        const canvas = win.querySelector('canvas');
        if (canvas && canvas.toDataURL) {
            try {
                dataUrl = canvas.toDataURL();
            } catch (e) {
                dataUrl = null;
            }
        }
        if (!dataUrl) {
            try {
                const temp = await toCanvas(win);
                dataUrl = temp.toDataURL();
            } catch (e) {
                dataUrl = null;
            }
        }
        if (dataUrl) {
            this.setState({ thumbnail: dataUrl });
        }
    };

    render() {
        const isOpen = this.props.isClose[this.id] === false;
        const isFocused = this.props.isFocus[this.id];
        const buttonClasses = [
            'dock-button',
            'm-1',
            'outline-none',
            'relative',
            'focus-visible:ring-2',
            'focus-visible:ring-ubb-orange/70',
            'focus-visible:ring-offset-2',
            'focus-visible:ring-offset-transparent',
            isOpen ? 'dock-button-active' : '',
            isFocused ? 'ring-1 ring-ubb-orange/60' : '',
        ].filter(Boolean).join(' ');
        return (
            <button
                type="button"
                aria-label={this.props.title}
                data-context="app"
                data-app-id={this.props.id}
                onClick={this.openApp}
                onMouseEnter={() => {
                    this.captureThumbnail();
                    this.setState({ showTitle: true });
                }}
                onMouseLeave={() => {
                    this.setState({ showTitle: false, thumbnail: null });
                }}
                className={buttonClasses}
                id={"sidebar-" + this.props.id}
            >
                <Image
                    width={28}
                    height={28}
                    className="w-7 drop-shadow-[0_0_12px_rgba(23,147,209,0.45)]"
                    src={this.props.icon.replace('./', '/')}
                    alt={`${this.props.title} icon`}
                    sizes="28px"
                />
                <Image
                    width={28}
                    height={28}
                    className={(this.state.scaleImage ? " scale " : "") + " scalable-app-icon w-7 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"}
                    src={this.props.icon.replace('./', '/')}
                    alt=""
                    sizes="28px"
                />
                {this.state.thumbnail && (
                    <div
                        className={`${this.state.showTitle ? 'visible' : 'invisible'} pointer-events-none absolute bottom-full mb-3 left-1/2 w-32 -translate-x-1/2 overflow-hidden rounded-lg border border-white/10 bg-ub-grey/90 shadow-xl backdrop-blur`}
                    >
                        <Image
                            width={128}
                            height={80}
                            src={this.state.thumbnail}
                            alt={`Preview of ${this.props.title}`}
                            className="h-20 w-full object-cover"
                            sizes="128px"
                        />
                    </div>
                )}
                <div
                    className={`${this.state.showTitle ? 'visible' : 'invisible'} pointer-events-none absolute top-1.5 left-full ml-3 whitespace-nowrap rounded-lg border border-white/10 bg-ub-grey/90 px-2 py-1 text-xs text-ubt-grey shadow-lg backdrop-blur`}
                >
                    {this.props.title}
                </div>
            </button>
        );
    }
}

export default SideBarApp;
