import React, { Component } from "react";
import Image from 'next/image';
import { toCanvas } from 'html-to-image';

export class SideBarApp extends Component {
    constructor() {
        super();
        this.id = null;
        this.ref = React.createRef();
        this.state = {
            showTitle: false,
            scaleImage: false,
            thumbnail: null,
            width: 0,
        };
        this._resizeObserver = null;
        this.updateWidth = this.updateWidth.bind(this);
    }

    componentDidMount() {
        this.id = this.props.id;
        this.updateBadge();
        this.updateWidth();
        if (typeof ResizeObserver !== 'undefined' && this.ref.current) {
            this._resizeObserver = new ResizeObserver(this.updateWidth);
            this._resizeObserver.observe(this.ref.current);
        }
        window.addEventListener('resize', this.updateWidth);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.notifications !== this.props.notifications || prevProps.tasks !== this.props.tasks) {
            this.updateBadge();
        }
        if (prevProps.debug !== this.props.debug) {
            this.updateWidth();
        }
    }

    componentWillUnmount() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }
        window.removeEventListener('resize', this.updateWidth);
    }

    updateWidth() {
        const el = this.ref.current;
        if (el) {
            this.setState({ width: el.getBoundingClientRect().width });
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
                className={(this.props.isClose[this.id] === false && this.props.isFocus[this.id] ? "bg-white bg-opacity-10 " : "") +
                    " w-auto p-2 outline-none relative hover:bg-white hover:bg-opacity-10 rounded m-1 transition-hover transition-active"}
                id={"sidebar-" + this.props.id}
                ref={this.ref}
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
                            (this.state.showTitle ? " visible " : " invisible ") +
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
                <div
                    className={
                        (this.state.showTitle ? " visible " : " invisible ") +
                        " w-max py-0.5 px-1.5 absolute top-1.5 left-full ml-3 m-1 text-ubt-grey text-opacity-90 text-sm bg-ub-grey bg-opacity-70 border-gray-400 border border-opacity-40 rounded-md"
                    }
                >
                    {this.props.title}
                </div>
                {this.props.debug && (
                    <div className="absolute inset-0 pointer-events-none border-2 border-red-500 text-red-500 text-[10px] flex flex-col">
                        <span className="m-auto text-center">
                            {this.props.title} ({Math.round(this.state.width)}px)
                        </span>
                        <div className="absolute left-0 top-0 bottom-0 border-l-2 border-red-500" />
                        <div className="absolute right-0 top-0 bottom-0 border-r-2 border-red-500" />
                    </div>
                )}
            </button>
        );
    }
}

export default SideBarApp;
