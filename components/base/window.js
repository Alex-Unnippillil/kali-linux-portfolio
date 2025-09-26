"use client";

import React, { Component } from 'react';
import NextImage from 'next/image';
import Draggable from 'react-draggable';
import Settings from '../apps/settings';
import ReactGA from 'react-ga4';
import useDocPiP from '../../hooks/useDocPiP';
import styles from './window.module.css';

const SNAP_TARGET_STYLES = {
    left: { left: '0', top: '0', width: '50%', height: '100%' },
    right: { left: '50%', top: '0', width: '50%', height: '100%' },
    top: { left: '0', top: '0', width: '100%', height: '50%' },
};

const SNAP_POSITIONS = ['left', 'right', 'top'];

export class Window extends Component {
    constructor(props) {
        super(props);
        this.id = null;
        const isPortrait =
            typeof window !== "undefined" && window.innerHeight > window.innerWidth;
        this.startX =
            props.initialX ??
            (isPortrait ? window.innerWidth * 0.05 : 60);
        this.startY = props.initialY ?? 10;
        this.state = {
            cursorType: "cursor-default",
            width: props.defaultWidth || (isPortrait ? 90 : 60),
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
            showSnapGuides: false,
        }
        this._usageTimeout = null;
        this._uiExperiments = process.env.NEXT_PUBLIC_UI_EXPERIMENTS === 'true';
        this._menuOpener = null;
    }

    componentDidMount() {
        this.id = this.props.id;
        this.setDefaultWindowDimenstion();

        // google analytics
        ReactGA.send({ hitType: "pageview", page: `/${this.id}`, title: "Custom Title" });

        // on window resize, resize boundary
        window.addEventListener('resize', this.resizeBoundries);
        // Listen for context menu events to toggle inert background
        window.addEventListener('context-menu-open', this.setInertBackground);
        window.addEventListener('context-menu-close', this.removeInertBackground);
        const root = document.getElementById(this.id);
        root?.addEventListener('super-arrow', this.handleSuperArrow);
        if (this._uiExperiments) {
            this.scheduleUsageCheck();
        }
    }

    componentWillUnmount() {
        ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

        window.removeEventListener('resize', this.resizeBoundries);
        window.removeEventListener('context-menu-open', this.setInertBackground);
        window.removeEventListener('context-menu-close', this.removeInertBackground);
        const root = document.getElementById(this.id);
        root?.removeEventListener('super-arrow', this.handleSuperArrow);
        if (this._usageTimeout) {
            clearTimeout(this._usageTimeout);
        }
    }

    setDefaultWindowDimenstion = () => {
        if (this.props.defaultHeight && this.props.defaultWidth) {
            this.setState(
                { height: this.props.defaultHeight, width: this.props.defaultWidth },
                this.resizeBoundries
            );
            return;
        }

        const isPortrait = window.innerHeight > window.innerWidth;
        if (isPortrait) {
            this.startX = window.innerWidth * 0.05;
            this.setState({ height: 85, width: 90 }, this.resizeBoundries);
        } else if (window.innerWidth < 640) {
            this.setState({ height: 60, width: 85 }, this.resizeBoundries);
        } else {
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

    getOverlayRoot = () => {
        if (this.props.overlayRoot) {
            if (typeof this.props.overlayRoot === 'string') {
                return document.getElementById(this.props.overlayRoot);
            }
            return this.props.overlayRoot;
        }
        return document.getElementById('__next');
    }

    activateOverlay = () => {
        const root = this.getOverlayRoot();
        if (root) {
            root.setAttribute('inert', '');
        }
        this._menuOpener = document.activeElement;
    }

    deactivateOverlay = () => {
        const root = this.getOverlayRoot();
        if (root) {
            root.removeAttribute('inert');
        }
        if (this._menuOpener && typeof this._menuOpener.focus === 'function') {
            this._menuOpener.focus();
        }
        this._menuOpener = null;
    }

    changeCursorToMove = () => {
        this.focusWindow();
        if (this.state.maximized) {
            this.restoreWindow();
        }
        if (this.state.snapped) {
            this.unsnapWindow();
        }
        this.setState({ cursorType: "cursor-move", grabbed: true, showSnapGuides: true })
    }

    changeCursorToDefault = () => {
        this.setState({ cursorType: "cursor-default", grabbed: false, showSnapGuides: false })
    }

    snapToGrid = (value) => {
        if (!this.props.snapEnabled) return value;
        return Math.round(value / 8) * 8;
    }

    handleVerticleResize = () => {
        if (this.props.resizable === false) return;
        const px = (this.state.height / 100) * window.innerHeight + 1;
        const snapped = this.snapToGrid(px);
        const heightPercent = snapped / window.innerHeight * 100;
        this.setState({ height: heightPercent }, this.resizeBoundries);
    }

    handleHorizontalResize = () => {
        if (this.props.resizable === false) return;
        const px = (this.state.width / 100) * window.innerWidth + 1;
        const snapped = this.snapToGrid(px);
        const widthPercent = snapped / window.innerWidth * 100;
        this.setState({ width: widthPercent }, this.resizeBoundries);
    }

    setWinowsPosition = () => {
        var r = document.querySelector("#" + this.id);
        if (!r) return;
        var rect = r.getBoundingClientRect();
        const x = this.snapToGrid(rect.x);
        const y = this.snapToGrid(rect.y - 32);
        r.style.setProperty('--window-transform-x', x.toFixed(1).toString() + "px");
        r.style.setProperty('--window-transform-y', y.toFixed(1).toString() + "px");
        if (this.props.onPositionChange) {
            this.props.onPositionChange(x, y);
        }
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

    snapWindow = (position) => {
        this.setWinowsPosition();
        const { width, height } = this.state;
        let newWidth = width;
        let newHeight = height;
        let transform = '';
        if (position === 'left') {
            newWidth = 50;
            newHeight = 96.3;
            transform = 'translate(-1pt,-2pt)';
        } else if (position === 'right') {
            newWidth = 50;
            newHeight = 96.3;
            transform = `translate(${window.innerWidth / 2}px,-2pt)`;
        } else if (position === 'top') {
            newWidth = 100.2;
            newHeight = 50;
            transform = 'translate(-1pt,-2pt)';
        }
        const r = document.querySelector("#" + this.id);
        if (r && transform) {
            r.style.transform = transform;
        }
        this.setState({
            snapPreview: null,
            snapPosition: null,
            snapped: position,
            lastSize: { width, height },
            width: newWidth,
            height: newHeight
        }, this.resizeBoundries);
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

    setInertBackground = () => {
        const root = document.getElementById(this.id);
        if (root) {
            root.setAttribute('inert', '');
        }
    }

    removeInertBackground = () => {
        const root = document.getElementById(this.id);
        if (root) {
            root.removeAttribute('inert');
        }
    }

    checkSnapPreview = () => {
        var r = document.querySelector("#" + this.id);
        if (!r) return;
        var rect = r.getBoundingClientRect();
        const threshold = 30;
        let snap = null;
        if (rect.left <= threshold) {
            snap = SNAP_TARGET_STYLES.left;
            this.setState({ snapPreview: snap, snapPosition: 'left' });
        }
        else if (rect.right >= window.innerWidth - threshold) {
            snap = SNAP_TARGET_STYLES.right;
            this.setState({ snapPreview: snap, snapPosition: 'right' });
        }
        else if (rect.top <= threshold) {
            snap = SNAP_TARGET_STYLES.top;
            this.setState({ snapPreview: snap, snapPosition: 'top' });
        }
        else {
            if (this.state.snapPreview) this.setState({ snapPreview: null, snapPosition: null });
        }
    }

    ensureSnapGuidesVisible = () => {
        if (!this.state.showSnapGuides) {
            this.setState({ showSnapGuides: true });
        }
    }

    getSnapRegionBounds = (position) => {
        if (typeof window === 'undefined') return null;
        const width = window.innerWidth;
        const height = window.innerHeight;
        switch (position) {
            case 'left':
                return { left: 0, right: width / 2, top: 0, bottom: height };
            case 'right':
                return { left: width / 2, right: width, top: 0, bottom: height };
            case 'top':
                return { left: 0, right: width, top: 0, bottom: height / 2 };
            default:
                return null;
        }
    }

    shouldSnapOnRelease = (position) => {
        const node = document.querySelector("#" + this.id);
        if (!node) return false;
        const region = this.getSnapRegionBounds(position);
        if (!region) return false;
        const rect = node.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        return (
            centerX >= region.left &&
            centerX <= region.right &&
            centerY >= region.top &&
            centerY <= region.bottom
        );
    }

    applyEdgeResistance = (node, data) => {
        if (!node || !data) return;
        const threshold = 30;
        const resistance = 0.35; // how much to slow near edges
        let { x, y } = data;
        const maxX = this.state.parentSize.width;
        const maxY = this.state.parentSize.height;

        const resist = (pos, min, max) => {
            if (pos < min) return min;
            if (pos < min + threshold) return min + (pos - min) * resistance;
            if (pos > max) return max;
            if (pos > max - threshold) return max - (max - pos) * resistance;
            return pos;
        }

        x = resist(x, 0, maxX);
        y = resist(y, 0, maxY);
        node.style.transform = `translate(${x}px, ${y}px)`;
    }

    handleDrag = (e, data) => {
        this.ensureSnapGuidesVisible();
        if (data && data.node) {
            this.applyEdgeResistance(data.node, data);
        }
        this.checkOverlap();
        this.checkSnapPreview();
    }

    handleStop = () => {
        const snapPos = this.state.snapPosition;
        const shouldSnap = snapPos ? this.shouldSnapOnRelease(snapPos) : false;
        if (shouldSnap && snapPos) {
            this.snapWindow(snapPos);
        } else {
            this.setState({ snapPreview: null, snapPosition: null });
        }
        this.changeCursorToDefault();
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

        const node = document.querySelector("#" + this.id);
        const endTransform = `translate(${posx}px,${sidebBarApp.y.toFixed(1) - 240}px) scale(0.2)`;
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            node.style.transform = endTransform;
            this.props.hasMinimised(this.id);
            return;
        }

        const startTransform = node.style.transform;
        this._dockAnimation = node.animate(
            [{ transform: startTransform }, { transform: endTransform }],
            { duration: 300, easing: 'ease-in-out', fill: 'forwards' }
        );
        this._dockAnimation.onfinish = () => {
            node.style.transform = endTransform;
            this.props.hasMinimised(this.id);
            this._dockAnimation.onfinish = null;
        };
    }

    restoreWindow = () => {
        const node = document.querySelector("#" + this.id);
        this.setDefaultWindowDimenstion();
        // get previous position
        let posx = node.style.getPropertyValue("--window-transform-x");
        let posy = node.style.getPropertyValue("--window-transform-y");
        const startTransform = node.style.transform;
        const endTransform = `translate(${posx},${posy})`;
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            node.style.transform = endTransform;
            this.setState({ maximized: false });
            this.checkOverlap();
            return;
        }

        if (this._dockAnimation) {
            this._dockAnimation.onfinish = () => {
                node.style.transform = endTransform;
                this.setState({ maximized: false });
                this.checkOverlap();
                this._dockAnimation.onfinish = null;
            };
            this._dockAnimation.reverse();
        } else {
            this._dockAnimation = node.animate(
                [{ transform: startTransform }, { transform: endTransform }],
                { duration: 300, easing: 'ease-in-out', fill: 'forwards' }
            );
            this._dockAnimation.onfinish = () => {
                node.style.transform = endTransform;
                this.setState({ maximized: false });
                this.checkOverlap();
                this._dockAnimation.onfinish = null;
            };
        }
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
            this.deactivateOverlay();
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
        } else if (e.altKey) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                this.unsnapWindow();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                this.snapWindow('left');
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                this.snapWindow('right');
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                this.snapWindow('top');
            }
            this.focusWindow();
        } else if (e.shiftKey) {
            const step = 1;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                this.setState(prev => ({ width: Math.max(prev.width - step, 20) }), this.resizeBoundries);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                this.setState(prev => ({ width: Math.min(prev.width + step, 100) }), this.resizeBoundries);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                this.setState(prev => ({ height: Math.max(prev.height - step, 20) }), this.resizeBoundries);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                this.setState(prev => ({ height: Math.min(prev.height + step, 100) }), this.resizeBoundries);
            }
            this.focusWindow();
        }
    }

    handleSuperArrow = (e) => {
        const key = e.detail;
        if (key === 'ArrowLeft') {
            if (this.state.snapped === 'left') this.unsnapWindow();
            else this.snapWindow('left');
        } else if (key === 'ArrowRight') {
            if (this.state.snapped === 'right') this.unsnapWindow();
            else this.snapWindow('right');
        } else if (key === 'ArrowUp') {
            this.maximizeWindow();
        } else if (key === 'ArrowDown') {
            if (this.state.maximized) {
                this.restoreWindow();
            } else if (this.state.snapped) {
                this.unsnapWindow();
            }
        }
    }

    snapWindow = (pos) => {
        this.focusWindow();
        const { width, height } = this.state;
        let newWidth = width;
        let newHeight = height;
        let transform = '';
        if (pos === 'left') {
            newWidth = 50;
            newHeight = 96.3;
            transform = 'translate(-1pt,-2pt)';
        } else if (pos === 'right') {
            newWidth = 50;
            newHeight = 96.3;
            transform = `translate(${window.innerWidth / 2}px,-2pt)`;
        } else if (pos === 'top') {
            newWidth = 100.2;
            newHeight = 50;
            transform = 'translate(-1pt,-2pt)';
        }
        const node = document.getElementById(this.id);
        if (node && transform) {
            node.style.transform = transform;
        }
        this.setState({
            snapped: pos,
            lastSize: { width, height },
            width: newWidth,
            height: newHeight
        }, this.resizeBoundries);
    }

    render() {
        return (
            <>
                {this.state.showSnapGuides && (
                    SNAP_POSITIONS.map((position) => {
                        const style = SNAP_TARGET_STYLES[position];
                        const isActive = this.state.snapPosition === position && this.state.snapPreview;
                        return (
                            <div
                                key={position}
                                data-snap-target={position}
                                data-testid={isActive ? "snap-preview" : undefined}
                                className={`fixed pointer-events-none z-40 transition-opacity duration-150 ${isActive
                                    ? 'border-2 border-dashed border-blue-400 bg-blue-400 bg-opacity-20 shadow-lg'
                                    : 'border border-dashed border-white border-opacity-10 bg-white bg-opacity-5'
                                }`}
                                style={{ left: style.left, top: style.top, width: style.width, height: style.height }}
                            />
                        );
                    })
                )}
                <Draggable
                    axis="both"
                    handle=".bg-ub-window-title"
                    grid={this.props.snapEnabled ? [8, 8] : [1, 1]}
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
                        className={this.state.cursorType + " " + (this.state.closed ? " closed-window " : "") + (this.state.maximized ? " duration-300 rounded-none" : " rounded-lg rounded-b-none") + (this.props.minimized ? " opacity-0 invisible duration-200 " : "") + (this.state.grabbed ? " opacity-70 " : "") + (this.state.snapPreview ? " ring-2 ring-blue-400 " : "") + (this.props.isFocused ? " z-30 " : " z-20 notFocused") + " opened-window overflow-hidden min-w-1/4 min-h-1/4 main-window absolute window-shadow border-black border-opacity-40 border border-t-0 flex flex-col"}
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
                        <WindowEditButtons
                            minimize={this.minimizeWindow}
                            maximize={this.maximizeWindow}
                            isMaximised={this.state.maximized}
                            close={this.closeWindow}
                            id={this.id}
                            allowMaximize={this.props.allowMaximize !== false}
                            pip={() => this.props.screen(this.props.addFolder, this.props.openApp)}
                        />
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
            className={" relative bg-ub-window-title border-t-2 border-white border-opacity-5 px-3 text-white w-full select-none rounded-b-none flex items-center h-11"}
            tabIndex={0}
            role="button"
            aria-grabbed={grabbed}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
        >
            <div className="flex justify-center w-full text-sm font-bold">{title}</div>
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
                <div
                    className={`${styles.windowYBorder} cursor-[e-resize] border-transparent border-1 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}
                    onDragStart={(e) => { e.dataTransfer.setDragImage(this.trpImg, 0, 0) }}
                    onDrag={this.props.resize}
                ></div>
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
                <div
                    className={`${styles.windowXBorder} cursor-[n-resize] border-transparent border-1 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}
                    onDragStart={(e) => { e.dataTransfer.setDragImage(this.trpImg, 0, 0) }}
                    onDrag={this.props.resize}
                ></div>
            )
        }
    }

// Window's Edit Buttons
export function WindowEditButtons(props) {
    const { togglePin } = useDocPiP(props.pip || (() => null));
    const pipSupported = typeof window !== 'undefined' && !!window.documentPictureInPicture;
    return (
        <div className="absolute select-none right-0 top-0 mt-1 mr-1 flex justify-center items-center h-11 min-w-[8.25rem]">
            {pipSupported && props.pip && (
                <button
                    type="button"
                    aria-label="Window pin"
                    className="mx-1 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-6 w-6"
                    onClick={togglePin}
                >
                    <NextImage
                        src="/themes/Yaru/window/window-pin-symbolic.svg"
                        alt="Kali window pin"
                        className="h-4 w-4 inline"
                        width={16}
                        height={16}
                        sizes="16px"
                    />
                </button>
            )}
            <button
                type="button"
                aria-label="Window minimize"
                className="mx-1 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-6 w-6"
                onClick={props.minimize}
            >
                <NextImage
                    src="/themes/Yaru/window/window-minimize-symbolic.svg"
                    alt="Kali window minimize"
                    className="h-4 w-4 inline"
                    width={16}
                    height={16}
                    sizes="16px"
                />
            </button>
            {props.allowMaximize && (
                props.isMaximised
                    ? (
                        <button
                            type="button"
                            aria-label="Window restore"
                            className="mx-1 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-6 w-6"
                            onClick={props.maximize}
                        >
                            <NextImage
                                src="/themes/Yaru/window/window-restore-symbolic.svg"
                                alt="Kali window restore"
                                className="h-4 w-4 inline"
                                width={16}
                                height={16}
                                sizes="16px"
                            />
                        </button>
                    ) : (
                        <button
                            type="button"
                            aria-label="Window maximize"
                            className="mx-1 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-6 w-6"
                            onClick={props.maximize}
                        >
                            <NextImage
                                src="/themes/Yaru/window/window-maximize-symbolic.svg"
                                alt="Kali window maximize"
                                className="h-4 w-4 inline"
                                width={16}
                                height={16}
                                sizes="16px"
                            />
                        </button>
                    )
            )}
            <button
                type="button"
                id={`close-${props.id}`}
                aria-label="Window close"
                className="mx-1 focus:outline-none cursor-default bg-ub-cool-grey bg-opacity-90 hover:bg-opacity-100 rounded-full flex justify-center items-center h-6 w-6"
                onClick={props.close}
            >
                <NextImage
                    src="/themes/Yaru/window/window-close-symbolic.svg"
                    alt="Kali window close"
                    className="h-4 w-4 inline"
                    width={16}
                    height={16}
                    sizes="16px"
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
