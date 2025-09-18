import React, { Component } from "react";
import Image from 'next/image';
import { toCanvas } from 'html-to-image';
import { Tooltip } from '../ui/TooltipProvider';

export class SideBarApp extends Component {
    constructor() {
        super();
        this.id = null;
        this.state = {
            showPreview: false,
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
        this.setState({ showPreview: false, thumbnail: null });
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
                placement={["right", "left", "top"]}
                id={`tooltip-${this.props.id}`}
            >
                <button
                    type="button"
                    aria-label={this.props.title}
                    data-context="app"
                    data-app-id={this.props.id}
                    onClick={this.openApp}
                    onPointerEnter={() => {
                        this.captureThumbnail();
                        this.setState({ showPreview: true });
                    }}
                    onPointerLeave={() => {
                        this.setState({ showPreview: false, thumbnail: null });
                    }}
                    className={(this.props.isClose[this.id] === false && this.props.isFocus[this.id] ? "bg-white bg-opacity-10 " : "") +
                        " w-auto p-2 outline-none relative hover:bg-white hover:bg-opacity-10 rounded m-1 transition-hover transition-active"}
                    id={"sidebar-" + this.props.id}
                >
                    <Image
                        width={28}
                        height={28}
                        className="w-7"
                        src={this.props.icon.replace('./', '/')}
                        alt="Ubuntu App Icon"
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
                    {
                        (
                            this.props.isClose[this.id] === false
                                ? <div className=" w-2 h-1 absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-white rounded-md"></div>
                                : null
                        )
                    }
                    {this.state.thumbnail && (
                        <div
                            className={
                                (this.state.showPreview ? " visible " : " invisible " ) +
                                " pointer-events-none absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2" +
                                " rounded border border-gray-400 border-opacity-40 shadow-lg overflow-hidden bg-black bg-opacity-50"
                            }
                        >
                            <Image
                                width={128}
                                height={80}
                                src={this.state.thumbnail}
                                alt={`Preview of ${this.props.title}`}
                                className="w-32 h-20 object-cover"
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
