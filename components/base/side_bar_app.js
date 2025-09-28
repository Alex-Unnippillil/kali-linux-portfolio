import React, { Component } from "react";
import Image from 'next/image';
import { toCanvas } from 'html-to-image';
import SidebarAppMenu from '../context-menus/sidebar-app-menu';

export class SideBarApp extends Component {
    constructor() {
        super();
        this.id = null;
        this.buttonRef = React.createRef();
        this.containerRef = React.createRef();
        this.menuRef = React.createRef();
        this.state = {
            showTitle: false,
            scaleImage: false,
            thumbnail: null,
            contextMenuVisible: false,
            contextMenuPosition: { x: 0, y: 0 },
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

    componentWillUnmount() {
        this.removeContextMenuListeners();
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
        this.closeContextMenu();
        this.props.openApp(this.id);
        this.setState({ showTitle: false, thumbnail: null });
    };

    addContextMenuListeners = () => {
        document.addEventListener('mousedown', this.handleDocumentInteraction);
        document.addEventListener('contextmenu', this.handleDocumentInteraction);
        document.addEventListener('keydown', this.handleMenuKeyDown, true);
    };

    removeContextMenuListeners = () => {
        document.removeEventListener('mousedown', this.handleDocumentInteraction);
        document.removeEventListener('contextmenu', this.handleDocumentInteraction);
        document.removeEventListener('keydown', this.handleMenuKeyDown, true);
    };

    handleDocumentInteraction = (event) => {
        const button = this.buttonRef.current;
        const menu = this.menuRef.current;
        if (button && button.contains(event.target)) return;
        if (menu && menu.contains(event.target)) return;
        this.closeContextMenu();
    };

    handleMenuKeyDown = (event) => {
        if (event.key === 'Escape') {
            this.closeContextMenu();
        }
    };

    openContextMenu = (event) => {
        if (event && event.preventDefault) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (event && event.nativeEvent && event.nativeEvent.stopImmediatePropagation) {
            event.nativeEvent.stopImmediatePropagation();
        }

        const container = this.containerRef.current;
        const rect = container ? container.getBoundingClientRect() : null;
        let clientX = event && typeof event.clientX === 'number' ? event.clientX : null;
        let clientY = event && typeof event.clientY === 'number' ? event.clientY : null;

        if (rect && (clientX === null || clientY === null)) {
            clientX = rect.left + rect.width / 2;
            clientY = rect.top + rect.height;
        }

        const baseX = rect ? rect.width + 8 : 0;
        const relativeX = rect && clientX !== null ? clientX - rect.left : baseX;
        const relativeY = rect && clientY !== null ? clientY - rect.top : (rect ? rect.height / 2 : 0);

        const position = {
            x: Math.max(relativeX, baseX),
            y: Math.max(relativeY, 0),
        };

        this.setState({
            contextMenuVisible: true,
            contextMenuPosition: position,
        }, this.addContextMenuListeners);
    };

    closeContextMenu = () => {
        if (this.state.contextMenuVisible) {
            this.setState({ contextMenuVisible: false });
        }
        this.removeContextMenuListeners();
    };

    handleToggleFavourite = () => {
        const { isFavourite, pinApp, unpinApp } = this.props;
        if (isFavourite) {
            unpinApp && unpinApp(this.id);
        } else {
            pinApp && pinApp(this.id);
        }
        this.closeContextMenu();
    };

    handleOpenInWorkspace = () => {
        if (this.props.openInNewWorkspace) {
            this.props.openInNewWorkspace(this.id);
        }
        this.closeContextMenu();
    };

    handleKeyDown = (event) => {
        if (event.shiftKey && event.key === 'F10') {
            this.openContextMenu(event);
        }
        if (event.key === 'ContextMenu') {
            this.openContextMenu(event);
        }
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
            <div ref={this.containerRef} className="relative inline-block">
                <button
                    type="button"
                    aria-label={this.props.title}
                    data-context="app"
                    data-app-id={this.props.id}
                    onClick={this.openApp}
                    onContextMenu={this.openContextMenu}
                    onKeyDown={this.handleKeyDown}
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
                    ref={this.buttonRef}
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
                </button>
                <SidebarAppMenu
                    ref={this.menuRef}
                    active={this.state.contextMenuVisible}
                    position={this.state.contextMenuPosition}
                    pinned={this.props.isFavourite !== false}
                    onClose={this.closeContextMenu}
                    onToggleFavourite={this.handleToggleFavourite}
                    onOpenInNewWorkspace={this.handleOpenInWorkspace}
                />
            </div>
        );
    }
}

export default SideBarApp;
