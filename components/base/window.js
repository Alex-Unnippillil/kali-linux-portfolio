"use client";

import React, { Component } from 'react';
import NextImage from 'next/image';
import Draggable from 'react-draggable';
import Settings from '../apps/settings';
import ReactGA from 'react-ga4';
import useDocPiP from '../../hooks/useDocPiP';
import {
    clampWindowTopPosition,
    DEFAULT_WINDOW_TOP_OFFSET,
    measureSafeAreaInset,
    measureWindowTopOffset,
} from '../../utils/windowLayout';
import styles from './window.module.css';
import { DESKTOP_TOP_PADDING, SNAP_BOTTOM_INSET, WINDOW_TOP_INSET } from '../../utils/uiConstants';

const EDGE_THRESHOLD_MIN = 48;
const EDGE_THRESHOLD_MAX = 160;
const EDGE_THRESHOLD_RATIO = 0.05;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const computeEdgeThreshold = (size) => clamp(size * EDGE_THRESHOLD_RATIO, EDGE_THRESHOLD_MIN, EDGE_THRESHOLD_MAX);

const percentOf = (value, total) => {
    if (!total) return 0;
    return (value / total) * 100;
};

const computeSnapRegions = (viewportWidth, viewportHeight, topInset = DEFAULT_WINDOW_TOP_OFFSET) => {
    const halfWidth = viewportWidth / 2;
    const safeTop = Math.max(topInset, DEFAULT_WINDOW_TOP_OFFSET);
    const safeBottom = Math.max(0, measureSafeAreaInset('bottom'));
    const availableHeight = Math.max(0, viewportHeight - safeTop - SNAP_BOTTOM_INSET - safeBottom);
    const topHeight = Math.min(availableHeight, Math.max(viewportHeight / 2, 0));
    return {
        left: { left: 0, top: safeTop, width: halfWidth, height: availableHeight },
        right: { left: viewportWidth - halfWidth, top: safeTop, width: halfWidth, height: availableHeight },
        top: { left: 0, top: safeTop, width: viewportWidth, height: topHeight },

    };
};

export class Window extends Component {
    constructor(props) {
        super(props);
        this.id = null;
        const isPortrait =
            typeof window !== "undefined" && window.innerHeight > window.innerWidth;
        const initialTopInset = typeof window !== 'undefined'
            ? measureWindowTopOffset()
            : DEFAULT_WINDOW_TOP_OFFSET;
        this.startX =
            props.initialX ??
            (isPortrait ? window.innerWidth * 0.05 : 60);
        this.startY = clampWindowTopPosition(props.initialY, initialTopInset);

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
            safeAreaTop: initialTopInset,
            snapPreview: null,
            snapPosition: null,
            snapped: null,
            lastSize: null,
            grabbed: false,
        }
        this.windowRef = React.createRef();
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
        const root = this.getWindowNode();
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
        const root = this.getWindowNode();
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
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
        const topInset = typeof window !== 'undefined'
            ? measureWindowTopOffset()
            : DEFAULT_WINDOW_TOP_OFFSET;
        const windowHeightPx = viewportHeight * (this.state.height / 100.0);
        const windowWidthPx = viewportWidth * (this.state.width / 100.0);
        const safeAreaBottom = Math.max(0, measureSafeAreaInset('bottom'));
        const availableVertical = Math.max(viewportHeight - topInset - SNAP_BOTTOM_INSET - safeAreaBottom, 0);
        const availableHorizontal = Math.max(viewportWidth - windowWidthPx, 0);
        const maxTop = Math.max(availableVertical - windowHeightPx, 0);

        this.setState({
            parentSize: {
                height: maxTop,
                width: availableHorizontal,
            },
            safeAreaTop: topInset,

        }, () => {
            if (this._uiExperiments) {
                this.scheduleUsageCheck();
            }
        });
    }

    computeContentUsage = () => {
        const root = this.getWindowNode();
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
        const root = this.getWindowNode();
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

    getWindowNode = () => {
        if (this.windowRef.current) {
            return this.windowRef.current;
        }
        if (this.id) {
            return document.getElementById(this.id);
        }
        return null;
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
        this.setState({ cursorType: "cursor-move", grabbed: true })
    }

    changeCursorToDefault = () => {
        this.setState({ cursorType: "cursor-default", grabbed: false })
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
        const node = this.getWindowNode();
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const topInset = this.state.safeAreaTop ?? DEFAULT_WINDOW_TOP_OFFSET;
        const snappedX = this.snapToGrid(rect.x);
        const relativeY = rect.y - topInset;
        const snappedRelativeY = this.snapToGrid(relativeY);
        const absoluteY = clampWindowTopPosition(snappedRelativeY + topInset, topInset);
        node.style.setProperty('--window-transform-x', `${snappedX.toFixed(1)}px`);
        node.style.setProperty('--window-transform-y', `${absoluteY.toFixed(1)}px`);

        if (this.props.onPositionChange) {
            this.props.onPositionChange(snappedX, absoluteY);
        }
    }

    unsnapWindow = () => {
        if (!this.state.snapped) return;
        const node = this.getWindowNode();
        if (node) {
            const x = node.style.getPropertyValue('--window-transform-x');
            const y = node.style.getPropertyValue('--window-transform-y');
            if (x && y) {
                node.style.transform = `translate(${x},${y})`;
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
        this.focusWindow();
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
        const topInset = this.state.safeAreaTop ?? DEFAULT_WINDOW_TOP_OFFSET;
        if (!viewportWidth || !viewportHeight) return;
        const regions = computeSnapRegions(viewportWidth, viewportHeight, topInset);
        const region = regions[position];
        if (!region) return;
        const { width, height } = this.state;
        const node = this.getWindowNode();
        if (node) {
            const offsetTop = region.top - DESKTOP_TOP_PADDING;
            node.style.transform = `translate(${region.left}px, ${offsetTop}px)`;
        }
        this.setState({
            snapPreview: null,
            snapPosition: null,
            snapped: position,
            lastSize: { width, height },
            width: percentOf(region.width, viewportWidth),
            height: percentOf(region.height, viewportHeight)
        }, this.resizeBoundries);
    }

    setInertBackground = () => {
        const root = this.getWindowNode();
        if (root) {
            root.setAttribute('inert', '');
        }
    }

    removeInertBackground = () => {
        const root = this.getWindowNode();
        if (root) {
            root.removeAttribute('inert');
        }
    }

    checkSnapPreview = () => {
        const node = this.getWindowNode();
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
        if (!viewportWidth || !viewportHeight) return;

        const horizontalThreshold = computeEdgeThreshold(viewportWidth);
        const verticalThreshold = computeEdgeThreshold(viewportHeight);
        const topInset = this.state.safeAreaTop ?? DEFAULT_WINDOW_TOP_OFFSET;
        const regions = computeSnapRegions(viewportWidth, viewportHeight, topInset);

        let candidate = null;
        if (rect.top <= topInset + verticalThreshold && regions.top.height > 0) {

            candidate = { position: 'top', preview: regions.top };
        } else if (rect.left <= horizontalThreshold && regions.left.width > 0) {
            candidate = { position: 'left', preview: regions.left };
        } else if (viewportWidth - rect.right <= horizontalThreshold && regions.right.width > 0) {
            candidate = { position: 'right', preview: regions.right };
        }

        if (candidate) {
            const { position, preview } = candidate;
            const samePosition = this.state.snapPosition === position;
            const samePreview =
                this.state.snapPreview &&
                this.state.snapPreview.left === preview.left &&
                this.state.snapPreview.top === preview.top &&
                this.state.snapPreview.width === preview.width &&
                this.state.snapPreview.height === preview.height;
            if (!samePosition || !samePreview) {
                this.setState({ snapPreview: preview, snapPosition: position });
            }
        } else if (this.state.snapPreview) {
            this.setState({ snapPreview: null, snapPosition: null });
        }
    }

    applyEdgeResistance = (node, data) => {
        if (!node || !data) return;
        const threshold = 30;
        const resistance = 0.35; // how much to slow near edges
        let { x, y } = data;
        const topBound = this.state.safeAreaTop ?? 0;
        const maxX = this.state.parentSize.width;
        const maxY = topBound + this.state.parentSize.height;

        const resist = (pos, min, max) => {
            if (pos < min) return min;
            if (pos < min + threshold) return min + (pos - min) * resistance;
            if (pos > max) return max;
            if (pos > max - threshold) return max - (max - pos) * resistance;
            return pos;
        }

        x = resist(x, 0, maxX);
        y = resist(y, topBound, maxY);
        node.style.transform = `translate(${x}px, ${y}px)`;
    }

    handleDrag = (e, data) => {
        if (data && data.node) {
            this.applyEdgeResistance(data.node, data);
        }
        this.checkSnapPreview();
    }

    handleStop = () => {
        this.changeCursorToDefault();
        const snapPos = this.state.snapPosition;
        if (snapPos) {
            this.snapWindow(snapPos);
        } else {
            this.setState({ snapPreview: null, snapPosition: null });
        }
    }

    focusWindow = () => {
        this.props.focus(this.id);
    }

    minimizeWindow = () => {
        this.setWinowsPosition();
        this.props.hasMinimised(this.id);
    }

    restoreWindow = () => {
        const node = this.getWindowNode();
        if (!node) return;
        this.setDefaultWindowDimenstion();
        // get previous position
        const posx = node.style.getPropertyValue("--window-transform-x") || `${this.startX}px`;
        const posy = node.style.getPropertyValue("--window-transform-y") || `${this.startY}px`;
        const endTransform = `translate(${posx},${posy})`;
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            node.style.transform = endTransform;
            this.setState({ maximized: false });
            return;
        }

        const startTransform = node.style.transform;
        const animation = node.animate(
            [{ transform: startTransform }, { transform: endTransform }],
            { duration: 300, easing: 'ease-in-out', fill: 'forwards' }
        );
        animation.onfinish = () => {
            node.style.transform = endTransform;
            this.setState({ maximized: false });
        };
    }

    maximizeWindow = () => {
        if (this.props.allowMaximize === false) return;
        if (this.state.maximized) {
            this.restoreWindow();
        }
        else {
            this.focusWindow();
            const node = this.getWindowNode();
            this.setWinowsPosition();
            // translate window to maximize position
            const viewportHeight = window.innerHeight;
            const availableHeight = Math.max(
                0,
                viewportHeight - DESKTOP_TOP_PADDING - SNAP_BOTTOM_INSET - Math.max(0, measureSafeAreaInset('bottom')),
            );
            const heightPercent = percentOf(availableHeight, viewportHeight);
            if (node) {
                node.style.transform = `translate(-1pt, 0px)`;
            }
            this.setState({ maximized: true, height: heightPercent, width: 100.2 });
        }
    }

    closeWindow = () => {
        this.setWinowsPosition();
        this.setState({ closed: true }, () => {
            this.deactivateOverlay();
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
                const node = this.getWindowNode();
                if (node) {
                    const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(node.style.transform);
                    let x = match ? parseFloat(match[1]) : 0;
                    let y = match ? parseFloat(match[2]) : 0;
                    x += dx;
                    y += dy;
                    node.style.transform = `translate(${x}px, ${y}px)`;
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

    render() {
        return (
            <>
                {this.state.snapPreview && (
                    <div
                        data-testid="snap-preview"
                        className="fixed border-2 border-dashed border-white bg-white bg-opacity-10 pointer-events-none z-40 transition-opacity"
                        style={{
                            left: `${this.state.snapPreview.left}px`,
                            top: `${this.state.snapPreview.top}px`,
                            width: `${this.state.snapPreview.width}px`,
                            height: `${this.state.snapPreview.height}px`,
                            backdropFilter: 'brightness(1.2)',
                            WebkitBackdropFilter: 'brightness(1.2)'

                        }}
                    />
                )}
                <Draggable
                    nodeRef={this.windowRef}
                    axis="both"
                    handle=".bg-ub-window-title"
                    grid={this.props.snapEnabled ? [8, 8] : [1, 1]}
                    scale={1}
                    onStart={this.changeCursorToMove}
                    onStop={this.handleStop}
                    onDrag={this.handleDrag}
                    allowAnyClick={false}
                    defaultPosition={{ x: this.startX, y: this.startY }}
                    bounds={{
                        left: 0,
                        top: this.state.safeAreaTop,
                        right: this.state.parentSize.width,
                        bottom: this.state.safeAreaTop + this.state.parentSize.height,
                    }}
                >
                    <div
                        ref={this.windowRef}
                        style={{ width: `${this.state.width}%`, height: `${this.state.height}%` }}
                        className={[
                            this.state.cursorType,
                            this.state.closed ? 'closed-window' : '',
                            this.state.maximized ? 'duration-300' : '',
                            this.props.animationState === 'minimizing' ? 'window-animation-minimize' : '',
                            this.props.animationState === 'restoring' ? 'window-animation-restore' : '',
                            this.props.minimized && this.props.animationState !== 'restoring'
                                ? 'opacity-0 invisible duration-200'
                                : '',
                            this.state.grabbed ? 'opacity-70' : '',
                            this.state.snapPreview ? 'ring-2 ring-blue-400' : '',
                            this.props.isFocused ? 'z-30' : 'z-20',
                            'opened-window overflow-hidden min-w-1/4 min-h-1/4 main-window absolute flex flex-col window-shadow',
                            styles.windowFrame,
                            this.props.isFocused ? styles.windowFrameActive : styles.windowFrameInactive,
                            this.state.maximized ? styles.windowFrameMaximized : '',
                        ].filter(Boolean).join(' ')}
                        id={this.id}
                        role="dialog"
                        aria-label={this.props.title}
                        tabIndex={0}
                        onKeyDown={this.handleKeyDown}
                        onPointerDown={this.focusWindow}
                        onFocus={this.focusWindow}
                    >
                        {this.props.resizable !== false && <WindowYBorder resize={this.handleHorizontalResize} />}
                        {this.props.resizable !== false && <WindowXBorder resize={this.handleVerticleResize} />}
                        <WindowTopBar
                            title={this.props.title}
                            onKeyDown={this.handleTitleBarKeyDown}
                            onBlur={this.releaseGrab}
                            grabbed={this.state.grabbed}
                            onPointerDown={this.focusWindow}
                        />
                        <WindowEditButtons
                            minimize={this.minimizeWindow}
                            maximize={this.maximizeWindow}
                            isMaximised={this.state.maximized}
                            close={this.closeWindow}
                            id={this.id}
                            allowMaximize={this.props.allowMaximize !== false}
                            pip={() => this.props.screen(this.props.addFolder, this.props.openApp, this.props.context)}
                        />
                        {(this.id === "settings"
                            ? <Settings />
                            : <WindowMainScreen screen={this.props.screen} title={this.props.title}
                                addFolder={this.props.id === "terminal" ? this.props.addFolder : null}
                                openApp={this.props.openApp}
                                context={this.props.context} />)}
                    </div>
                </Draggable >
            </>
        )
    }
}

export default Window

// Window's title bar
export function WindowTopBar({ title, onKeyDown, onBlur, grabbed, onPointerDown }) {
    return (
        <div
            className={`${styles.windowTitlebar} relative bg-ub-window-title px-3 text-white w-full select-none flex items-center`}
            tabIndex={0}
            role="button"
            aria-grabbed={grabbed}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            onPointerDown={onPointerDown}
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
        <div className={`${styles.windowControls} absolute select-none right-0 top-0 mr-1 flex justify-center items-center min-w-[8.25rem]`}>
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
                {this.props.screen(this.props.addFolder, this.props.openApp, this.props.context)}
            </div>
        )
    }
}
