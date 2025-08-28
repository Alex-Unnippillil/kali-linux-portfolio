import React, { Component } from 'react';
import NextImage from 'next/image';
import Draggable from 'react-draggable';
import Settings from '../apps/settings';
import ReactGA from 'react-ga4';

export class Window extends Component {
    constructor(props) {
        super(props);
        this.id = null;
        this.startX = 60;
        this.startY = 10;
        this.state = {
            cursorType: "cursor-default",
            width: props.defaultWidth || 60,
            height: props.defaultHeight || 85,
            closed: false,
            maximized: false,
            parentSize: {
                height: 100,
                width: 100
            },
            snapPreview: null,
            snapPosition: null,
            snapped: null,
            lastSize: null,
            grabbed: false,
        }
        this._usageTimeout = null;
        this._uiExperiments = process.env.NEXT_PUBLIC_UI_EXPERIMENTS === 'true';
    }

    componentDidMount() {
        this.id = this.props.id;
        this.setDefaultWindowDimenstion();

        // google analytics
        ReactGA.send({ hitType: "pageview", page: `/${this.id}`, title: "Custom Title" });

        // on window resize, resize boundary
        window.addEventListener('resize', this.resizeBoundries);
        if (this._uiExperiments) {
            this.scheduleUsageCheck();
        }
    }

    componentWillUnmount() {
        ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

        window.removeEventListener('resize', this.resizeBoundries);
        if (this._usageTimeout) {
            clearTimeout(this._usageTimeout);
        }
    }

    setDefaultWindowDimenstion = () => {
        if (this.props.defaultHeight && this.props.defaultWidth) {
            this.setState({ height: this.props.defaultHeight, width: this.props.defaultWidth }, this.resizeBoundries);
        }
        else if (window.innerWidth < 640) {
            this.setState({ height: 60, width: 85 }, this.resizeBoundries);
        }
        else {
            this.setState({ height: 85, width: 60 }, this.resizeBoundries);
        }
    }

    resizeBoundries = () => {
        this.setState({
            parentSize: {
                height: window.innerHeight //parent height
                    - (window.innerHeight * (this.state.height / 100.0))  // this window's height
                    - 28 // some padding
                ,
                width: window.innerWidth // parent width
                    - (window.innerWidth * (this.state.width / 100.0)) //this window's width
            }
        }, () => {
            if (this._uiExperiments) {
                this.scheduleUsageCheck();
            }
        });
    }

    computeContentUsage = () => {
        const root = document.getElementById(this.id);
        if (!root) return 100;
        const container = root.querySelector('.windowMainScreen');
        if (!container) return 100;
        const inner = container.firstElementChild || container;
        const innerRect = inner.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const area = containerRect.width * containerRect.height;
        if (area === 0) return 100;
        return (innerRect.width * innerRect.height) / area * 100;
    }

    scheduleUsageCheck = () => {
        if (this._usageTimeout) {
            clearTimeout(this._usageTimeout);
        }
        this._usageTimeout = setTimeout(() => {
            const usage = this.computeContentUsage();
            if (usage < 65) {
                this.optimizeWindow();
            }
        }, 200);
    }

    optimizeWindow = () => {
        const root = document.getElementById(this.id);
        if (!root) return;
        const container = root.querySelector('.windowMainScreen');
        if (!container) return;

        container.style.padding = '0px';

        const shrink = () => {
            const usage = this.computeContentUsage();
            if (usage >= 80) return;
            this.setState(prev => ({
                width: Math.max(prev.width - 1, 20),
                height: Math.max(prev.height - 1, 20)
            }), () => {
                if (this.computeContentUsage() < 80) {
                    setTimeout(shrink, 50);
                }
            });
        };
        shrink();
    }

    changeCursorToMove = () => {
        this.focusWindow();
        if (this.state.maximized) {
            this.restoreWindow();
        }
        if (this.state.snapped) {
            this.unsnapWindow();
        }
        this.setState({ cursorType: "cursor-move", grabbed: true })
    }

    changeCursorToDefault = () => {
        this.setState({ cursorType: "cursor-default", grabbed: false })
    }

    handleVerticleResize = () => {
        if (this.props.resizable === false) return;
        this.setState({ height: this.state.height + 0.1 }, this.resizeBoundries);
    }

    handleHorizontalResize = () => {
        if (this.props.resizable === false) return;
        this.setState({ width: this.state.width + 0.1 }, this.resizeBoundries);
    }

    setWinowsPosition = () => {
        var r = document.querySelector("#" + this.id);
        var rect = r.getBoundingClientRect();
        r.style.setProperty('--window-transform-x', rect.x.toFixed(1).toString() + "px");
        r.style.setProperty('--window-transform-y', (rect.y.toFixed(1) - 32).toString() + "px");
    }

    unsnapWindow = () => {
        if (!this.state.snapped) return;
        var r = document.querySelector("#" + this.id);
        if (r) {
            const x = r.style.getPropertyValue('--window-transform-x');
            const y = r.style.getPropertyValue('--window-transform-y');
            if (x && y) {
                r.style.transform = `translate(${x},${y})`;
            }
        }
        if (this.state.lastSize) {
            this.setState({
                width: this.state.lastSize.width,
                height: this.state.lastSize.height,
                snapped: null
            }, this.resizeBoundries);
        } else {
            this.setState({ snapped: null }, this.resizeBoundries);
        }
    }

    checkOverlap = () => {
        var r = document.querySelector("#" + this.id);
        var rect = r.getBoundingClientRect();
        if (rect.x.toFixed(1) < 50) { // if this window overlapps with SideBar
            this.props.hideSideBar(this.id, true);
        }
        else {
            this.props.hideSideBar(this.id, false);
        }
    }

    checkSnapPreview = () => {
        var r = document.querySelector("#" + this.id);
        if (!r) return;
        var rect = r.getBoundingClientRect();
        const threshold = 30;
        let snap = null;
        if (rect.left <= threshold) {
            snap = { left: '0', top: '0', width: '50%', height: '100%' };
            this.setState({ snapPreview: snap, snapPosition: 'left' });
        }
        else if (rect.right >= window.innerWidth - threshold) {
            snap = { left: '50%', top: '0', width: '50%', height: '100%' };
            this.setState({ snapPreview: snap, snapPosition: 'right' });
        }
        else if (rect.top <= threshold) {
            snap = { left: '0', top: '0', width: '100%', height: '50%' };
            this.setState({ snapPreview: snap, snapPosition: 'top' });
        }
        else {
            if (this.state.snapPreview) this.setState({ snapPreview: null, snapPosition: null });
        }
    }

    handleDrag = () => {
        this.checkOverlap();
        this.checkSnapPreview();
    }

    handleStop = () => {
        this.changeCursorToDefault();
        const snapPos = this.state.snapPosition;
        if (snapPos) {
            this.setWinowsPosition();
            const { width, height } = this.state;
            let newWidth = width;
            let newHeight = height;
            let transform = '';
            if (snapPos === 'left') {
                newWidth = 50;
                newHeight = 96.3;
                transform = 'translate(-1pt,-2pt)';
            } else if (snapPos === 'right') {
                newWidth = 50;
                newHeight = 96.3;
                transform = `translate(${window.innerWidth / 2}px,-2pt)`;
            } else if (snapPos === 'top') {
                newWidth = 100.2;
                newHeight = 50;
                transform = 'translate(-1pt,-2pt)';
            }
            var r = document.querySelector("#" + this.id);
            if (r && transform) {
                r.style.transform = transform;
            }
            this.setState({
                snapPreview: null,
                snapPosition: null,
                snapped: snapPos,
                lastSize: { width, height },
                width: newWidth,
                height: newHeight
            }, this.resizeBoundries);
        }
        else {
            this.setState({ snapPreview: null, snapPosition: null });
        }
    }

    focusWindow = () => {
        this.props.focus(this.id);
    }

    minimizeWindow = () => {
        let posx = -310;
        if (this.state.maximized) {
            posx = -510;
        }
        this.setWinowsPosition();
        // get corrosponding sidebar app's position
        var r = document.querySelector("#sidebar-" + this.id);
        var sidebBarApp = r.getBoundingClientRect();

        r = document.querySelector("#" + this.id);
        // translate window to that position
        r.style.transform = `translate(${posx}px,${sidebBarApp.y.toFixed(1) - 240}px) scale(0.2)`;
        this.props.hasMinimised(this.id);
    }

    restoreWindow = () => {
        var r = document.querySelector("#" + this.id);
        this.setDefaultWindowDimenstion();
        // get previous position
        let posx = r.style.getPropertyValue("--window-transform-x");
        let posy = r.style.getPropertyValue("--window-transform-y");

        r.style.transform = `translate(${posx},${posy})`;
        setTimeout(() => {
            this.setState({ maximized: false });
            this.checkOverlap();
        }, 300);
    }

    maximizeWindow = () => {
        if (this.props.allowMaximize === false) return;
        if (this.state.maximized) {
            this.restoreWindow();
        }
        else {
            this.focusWindow();
            var r = document.querySelector("#" + this.id);
            this.setWinowsPosition();
            // translate window to maximize position
            r.style.transform = `translate(-1pt,-2pt)`;
            this.setState({ maximized: true, height: 96.3, width: 100.2 });
            this.props.hideSideBar(this.id, true);
        }
    }

    closeWindow = () => {
        this.setWinowsPosition();
        this.setState({ closed: true }, () => {
            this.props.hideSideBar(this.id, false);
            setTimeout(() => {
                this.props.closed(this.id)
            }, 300) // after 300ms this window will be unmounted from parent (Desktop)
        });
    }

    handleTitleBarKeyDown = (e) => {
        if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (this.state.grabbed) {
                this.handleStop();
            } else {
                this.changeCursorToMove();
            }
        } else if (this.state.grabbed) {
            const step = 10;
            let dx = 0, dy = 0;
            if (e.key === 'ArrowLeft') dx = -step;
            else if (e.key === 'ArrowRight') dx = step;
            else if (e.key === 'ArrowUp') dy = -step;
            else if (e.key === 'ArrowDown') dy = step;
            if (dx !== 0 || dy !== 0) {
                e.preventDefault();
                e.stopPropagation();
                const node = document.getElementById(this.id);
                if (node) {
                    const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(node.style.transform);
                    let x = match ? parseFloat(match[1]) : 0;
                    let y = match ? parseFloat(match[2]) : 0;
                    x += dx;
                    y += dy;
                    node.style.transform = `translate(${x}px, ${y}px)`;
                    this.checkOverlap();
                    this.checkSnapPreview();
                    this.setWinowsPosition();
                }
            }
        }
    }

    releaseGrab = () => {
        if (this.state.grabbed) {
            this.handleStop();
        }
    }

    handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            this.closeWindow();
        } else if (e.key === 'Tab') {
            this.focusWindow();
        } else if (e.key === 'ArrowDown' && e.altKey) {
            this.unsnapWindow();
        }
    }

    render() {
        return (
            <>
                {this.state.snapPreview && (
                    <div
                        data-testid="snap-preview"
                        className="fixed border-2 border-dashed border-white pointer-events-none z-40"
                        style={{ left: this.state.snapPreview.left, top: this.state.snapPreview.top, width: this.state.snapPreview.width, height: this.state.snapPreview.height }}
                    />
                )}
                <Draggable
                    axis="both"
                    handle=".bg-ub-window-title"
                    grid={[1, 1]}
                    scale={1}
                    onStart={this.changeCursorToMove}
                    onStop={this.handleStop}
                    onDrag={this.handleDrag}
                    allowAnyClick={false}
                    defaultPosition={{ x: this.startX, y: this.startY }}
                    bounds={{ left: 0, top: 0, right: this.state.parentSize.width, bottom: this.state.parentSize.height }}
                >
                    <div
                        style={{ width: `${this.state.width}%`, height: `${this.state.height}%` }}
                        className={this.state.cursorType + " " + (this.state.closed ? " closed-window " : "") + (this.state.maximized ? " duration-300 rounded-none" : " rounded-lg rounded-b-none") + (this.props.minimized ? " opacity-0 invisible duration-200 " : "") + (this.props.isFocused ? " z-30 " : " z-20 notFocused") + " opened-window overflow-hidden min-w-1/4 min-h-1/4 main-window absolute window-shadow border-black border-opacity-40 border border-t-0 flex flex-col"}
                        id={this.id}
                        role="dialog"
                        aria-label={this.props.title}
                        tabIndex={0}
                        onKeyDown={this.handleKeyDown}
                    >
                        {this.props.resizable !== false && <WindowYBorder resize={this.handleHorizontalResize} />}
                        {this.props.resizable !== false && <WindowXBorder resize={this.handleVerticleResize} />}
                        <WindowTopBar
                            title={this.props.title}
                            onKeyDown={this.handleTitleBarKeyDown}
                            onBlur={this.releaseGrab}
                            grabbed={this.state.grabbed}
                        />
                        <WindowEditButtons minimize={this.minimizeWindow} maximize={this.maximizeWindow} isMaximised={this.state.maximized} close={this.closeWindow} id={this.id} allowMaximize={this.props.allowMaximize !== false} />
                        {(this.id === "settings"
                            ? <Settings />
                            : <WindowMainScreen screen={this.props.screen} title={this.props.title}
                                addFolder={this.props.id === "terminal" ? this.props.addFolder : null}
                                openApp={this.props.openApp} />)}
                    </div>
                </Draggable >
            </>
        )
    }
}

export default Window

// Window's title bar
export function WindowTopBar({ title, onKeyDown, onBlur, grabbed }) {
    return (
        <div
            className={" relative bg-ub-window-title border-t-2 border-white border-opacity-5 py-1.5 px-3 text-white w-full select-none rounded-b-none"}
            tabIndex={0}
            role="button"
            aria-grabbed={grabbed}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
        >
            <div className="flex justify-center text-sm font-bold">{title}</div>
        </div>
    )
}

// Window's Borders
export class WindowYBorder extends Component {
    componentDidMount() {
        // Use the browser's Image constructor rather than the imported Next.js
        // Image component to avoid runtime errors when running in tests.

        this.trpImg = new window.Image(0, 0);
        this.trpImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        this.trpImg.style.opacity = 0;
    }
    render() {
        return (
            <div className=" window-y-border border-transparent border-1 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" onDragStart={(e) => { e.dataTransfer.setDragImage(this.trpImg, 0, 0) }} onDrag={this.props.resize}>
            </div>
        )
    }
}

export class WindowXBorder extends Component {
    componentDidMount() {
        // Use the global Image constructor instead of Next.js Image component

        this.trpImg = new window.Image(0, 0);
        this.trpImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        this.trpImg.style.opacity = 0;
    }
    render() {
        return (
            <div className=" window-x-border border-transparent border-1 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" onDragStart={(e) => { e.dataTransfer.setDragImage(this.trpImg, 0, 0) }} onDrag={this.props.resize}>
            </div>
        )
    }
}

// Window's Edit Buttons
export function WindowEditButtons(props) {
    return (
        <div className="absolute select-none right-0 top-0 mt-1 mr-1 flex justify-center items-center">
            <button
                type="button"
                aria-label="Window minimize"
                className="mx-1.5 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-11 w-11"
                onClick={props.minimize}
            >
                <NextImage
                    src="/themes/Yaru/window/window-minimize-symbolic.svg"
                    alt="Kali window minimize"
                    className="h-5 w-5 inline"
                    width={20}
                    height={20}
                    sizes="20px"
                />
            </button>
            {props.allowMaximize && (
                props.isMaximised
                    ? (
                        <button
                            type="button"
                            aria-label="Window restore"
                            className="mx-2 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-11 w-11"
                            onClick={props.maximize}
                        >
                            <NextImage
                                src="/themes/Yaru/window/window-restore-symbolic.svg"
                                alt="Kali window restore"
                                className="h-5 w-5 inline"
                                width={20}
                                height={20}
                                sizes="20px"
                            />
                        </button>
                    ) : (
                        <button
                            type="button"
                            aria-label="Window maximize"
                            className="mx-2 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-11 w-11"
                            onClick={props.maximize}
                        >
                            <NextImage
                                src="/themes/Yaru/window/window-maximize-symbolic.svg"
                                alt="Kali window maximize"
                                className="h-5 w-5 inline"
                                width={20}
                                height={20}
                                sizes="20px"
                            />
                        </button>
                    )
            )}
            <button
                type="button"
                id={`close-${props.id}`}
                aria-label="Window close"
                className="mx-1.5 focus:outline-none cursor-default bg-ub-cool-grey bg-opacity-90 hover:bg-opacity-100 rounded-full flex justify-center items-center h-11 w-11"
                onClick={props.close}
            >
                <NextImage
                    src="/themes/Yaru/window/window-close-symbolic.svg"
                    alt="Kali window close"
                    className="h-5 w-5 inline"
                    width={20}
                    height={20}
                    sizes="20px"
                />
            </button>
        </div>
    )
}

// Window's Main Screen
export class WindowMainScreen extends Component {
    constructor() {
        super();
        this.state = {
            setDarkBg: false,
        }
    }
    componentDidMount() {
        setTimeout(() => {
            this.setState({ setDarkBg: true });
        }, 3000);
    }
    render() {
        return (
            <div className={"w-full flex-grow z-20 max-h-full overflow-y-auto windowMainScreen" + (this.state.setDarkBg ? " bg-ub-drk-abrgn " : " bg-ub-cool-grey")}>
                {this.props.screen(this.props.addFolder, this.props.openApp)}
            </div>
        )
    }
}
