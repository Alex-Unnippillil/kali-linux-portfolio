import React, { Component } from "react";
import Image from 'next/image';
import { toCanvas } from 'html-to-image';
import Tooltip from '../ui/Tooltip';

export class SideBarApp extends Component {
    constructor() {
        super();
        this.id = null;
        this.state = {
            previewVisible: false,
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
        this.setState({ previewVisible: false, thumbnail: null });
    };

    handleTooltipToggle = (open) => {
        if (open) {
            this.captureThumbnail();
            this.setState({ previewVisible: true });
        } else {
            this.setState({ previewVisible: false, thumbnail: null });
        }
    };

    handleAuxClick = (event) => {
        if (event.button !== 1) return;
        event.preventDefault();
        event.stopPropagation();
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-app', { detail: this.props.id }));
        } else {
            this.props.openApp(this.props.id);
        }
        this.setState({ previewVisible: false, thumbnail: null });
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
        return (
            <Tooltip
                content={this.props.title}
                placement="right"
                onOpenChange={this.handleTooltipToggle}
                className="w-full justify-center"
            >
                <button
                    type="button"
                    aria-label={this.props.title}
                    data-context="app"
                    data-app-id={this.props.id}
                    onClick={this.openApp}
                    onAuxClick={this.handleAuxClick}
                    className={(this.props.isClose[this.id] === false && this.props.isFocus[this.id] ? "bg-white bg-opacity-10 " : "") +
                        " relative flex items-center justify-center rounded transition-hover transition-active p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue/60"}
                    id={"sidebar-" + this.props.id}
                >
                    <Image
                        width={24}
                        height={24}
                        className="h-6 w-6"
                        src={this.props.icon.replace('./', '/')}
                        alt="Ubuntu App Icon"
                        sizes="24px"
                    />
                    <Image
                        width={24}
                        height={24}
                        className={(this.state.scaleImage ? " scale " : "") + " scalable-app-icon h-6 w-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"}
                        src={this.props.icon.replace('./', '/')}
                        alt=""
                        sizes="24px"
                    />
                    {
                        (
                            this.props.isClose[this.id] === false
                                ? <div className="w-2 h-1 absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-white rounded-md"></div>
                                : null
                        )
                    }
                    {this.state.thumbnail && (
                        <div
                            className={`pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded border border-gray-400 border-opacity-40 shadow-lg overflow-hidden bg-black bg-opacity-50 transition-opacity duration-150 ${this.state.previewVisible ? 'visible opacity-100' : 'invisible opacity-0'}`}
                        >
                            <Image
                                width={128}
                                height={80}
                                src={this.state.thumbnail}
                                alt={`Preview of ${this.props.title}`}
                                className="h-20 w-32 object-cover"
                                sizes="128px"
                            />
                        </div>
                    )}
                </button>
            </Tooltip>
        );
    }
}

export default SideBarApp;
