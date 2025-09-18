"use client";

import React, { Component } from 'react';
import NextImage from 'next/image';
import Draggable from 'react-draggable';
import Settings from '../apps/settings';
import ReactGA from 'react-ga4';
import useDocPiP from '../../hooks/useDocPiP';
import styles from './window.module.css';
import {
    clampRectToDisplay,
    findDisplayForRect,
    getDisplayById,
    getDisplayLayout,
    getWorkspaceRect,
    scaleSizeBetweenDisplays,
} from '../../utils/displayManager';

export class Window extends Component {
    constructor(props) {
        super(props);
        this.id = null;
        const displays = typeof window !== "undefined" ? getDisplayLayout() : [];
        const preferredDisplay = props.initialDisplayId ? getDisplayById(props.initialDisplayId, displays) : (displays[0] || null);
        const fallbackWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
        const fallbackHeight = typeof window !== "undefined" ? window.innerHeight : 1080;
        const referenceWidth = preferredDisplay ? preferredDisplay.width : fallbackWidth;
        const referenceHeight = preferredDisplay ? preferredDisplay.height : fallbackHeight;
        const offsetX = preferredDisplay ? preferredDisplay.x : 0;
        const offsetY = preferredDisplay ? preferredDisplay.y : 0;
        const isPortrait = referenceHeight > referenceWidth;
        this.startX = props.initialX ?? (isPortrait ? offsetX + referenceWidth * 0.05 : offsetX + 60);
        this.startY = props.initialY ?? (offsetY + 10);
        const initialWidth = props.defaultWidth || (isPortrait ? 90 : 60);
        const initialHeight = props.defaultHeight || 85;
        this.state = {
            cursorType: "cursor-default",
            width: initialWidth,
            height: initialHeight,
            closed: false,
            maximized: false,
            parentSize: {
                height: 100,
                width: 100,
                minX: 0,
                minY: 0,
            },
            workspace: null,
            snapPreview: null,
            snapPosition: null,
            snapped: null,
            lastSize: null,
            grabbed: false,
            activeDisplayId: props.initialDisplayId || (preferredDisplay ? preferredDisplay.id : null),
        };
        this._usageTimeout = null;
        this._uiExperiments = process.env.NEXT_PUBLIC_UI_EXPERIMENTS === 'true';
        this._menuOpener = null;
        this._displayTransitioning = false;
    }

    componentDidMount() {
        this.id = this.props.id;
        this.setDefaultWindowDimenstion();

        // google analytics
        ReactGA.send({ hitType: "pageview", page: `/${this.id}`, title: "Custom Title" });

        // on window resize, resize boundary
        window.addEventListener('resize', this.handleViewportResize);
        window.addEventListener('kali-display-change', this.handleDisplayLayoutChange);
        // Listen for context menu events to toggle inert background
        window.addEventListener('context-menu-open', this.setInertBackground);
        window.addEventListener('context-menu-close', this.removeInertBackground);
        const root = document.getElementById(this.id);
        root?.addEventListener('super-arrow', this.handleSuperArrow);
        if (this._uiExperiments) {
            this.scheduleUsageCheck();
        }
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(() => this.initializeDisplayContext());
        } else {
            this.initializeDisplayContext();
        }
    }

    componentWillUnmount() {
        ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

        window.removeEventListener('resize', this.handleViewportResize);
        window.removeEventListener('kali-display-change', this.handleDisplayLayoutChange);
        window.removeEventListener('context-menu-open', this.setInertBackground);
        window.removeEventListener('context-menu-close', this.removeInertBackground);
        const root = document.getElementById(this.id);
        root?.removeEventListener('super-arrow', this.handleSuperArrow);
        if (this._usageTimeout) {
            clearTimeout(this._usageTimeout);
        }
    }

    handleViewportResize = () => {
        this.initializeDisplayContext();
    }

    handleDisplayLayoutChange = () => {
        this.initializeDisplayContext();
    }

    prefersReducedMotion = () => {
        return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    getActiveDisplay = (displays = getDisplayLayout()) => {
        return getDisplayById(this.state.activeDisplayId, displays);
    }

    initializeDisplayContext = () => {
        const displays = getDisplayLayout();
        const workspace = getWorkspaceRect(displays);
        const node = typeof document !== 'undefined' ? document.getElementById(this.id) : null;
        const rect = node ? node.getBoundingClientRect() : null;
        const detectedDisplay = findDisplayForRect(rect, displays);
        this.setState((prev) => ({
            activeDisplayId: detectedDisplay ? detectedDisplay.id : prev.activeDisplayId,
            workspace,
        }), () => {
            this.resizeBoundries();
        });
    }

    ensureWithinCurrentDisplay = () => {
        const node = typeof document !== 'undefined' ? document.getElementById(this.id) : null;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const displays = getDisplayLayout();
        const display = findDisplayForRect(rect, displays);
        if (!display) return;
        const clamped = clampRectToDisplay({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }, display);
        if (Math.abs(clamped.x - rect.x) > 0.5 || Math.abs(clamped.y - rect.y) > 0.5) {
            const endTransform = `translate(${clamped.x}px, ${clamped.y}px)`;
            node.style.transform = endTransform;
            this.setWinowsPosition(display.id);
        }
    }

    maybeHandleDisplayChange = (rect) => {
        if (!rect || this._displayTransitioning) return;
        const displays = getDisplayLayout();
        const targetDisplay = findDisplayForRect(rect, displays);
        const currentDisplay = this.getActiveDisplay(displays);
        if (!targetDisplay || !currentDisplay || targetDisplay.id === currentDisplay.id) return;
        this.transitionToDisplay(targetDisplay, rect, currentDisplay, displays);
    }

    transitionToDisplay = (targetDisplay, rect, previousDisplay = null, displays = getDisplayLayout()) => {
        if (!targetDisplay) return;
        const node = typeof document !== 'undefined' ? document.getElementById(this.id) : null;
        if (!node || this._displayTransitioning) return;
        this._displayTransitioning = true;
        const currentDisplay = previousDisplay || this.getActiveDisplay(displays);
        const scaledSize = scaleSizeBetweenDisplays(rect.width, rect.height, currentDisplay, targetDisplay);
        const newWidthPercent = (scaledSize.width / targetDisplay.width) * 100;
        const newHeightPercent = (scaledSize.height / targetDisplay.height) * 100;
        const clamped = clampRectToDisplay({
            x: rect.x,
            y: rect.y,
            width: scaledSize.width,
            height: scaledSize.height,
        }, targetDisplay);
        const startTransform = node.style.transform || `translate(${rect.x}px, ${rect.y}px)`;
        const endTransform = `translate(${clamped.x}px, ${clamped.y}px)`;
        let finished = false;
        const finalize = () => {
            if (finished) return;
            finished = true;
            node.style.transform = endTransform;
            node.style.transition = '';
            this._displayTransitioning = false;
            this.setWinowsPosition(targetDisplay.id);
            this.checkOverlap();
        };
        node.style.transition = 'width 220ms ease, height 220ms ease';
        this.setState({
            width: newWidthPercent,
            height: newHeightPercent,
            snapPreview: null,
            snapPosition: null,
            activeDisplayId: targetDisplay.id,
        }, () => {
            this.resizeBoundries();
        });
        if (this.prefersReducedMotion() || typeof node.animate !== 'function') {
            finalize();
            return;
        }
        const animation = node.animate(
            [{ transform: startTransform }, { transform: endTransform }],
            { duration: 220, easing: 'ease-in-out', fill: 'forwards' }
        );
        animation.onfinish = finalize;
        animation.oncancel = finalize;
    }

    getDraggableBounds = () => {
        const parentSize = this.state.parentSize || {};
        const minX = Number.isFinite(parentSize.minX) ? parentSize.minX : 0;
        const minY = Number.isFinite(parentSize.minY) ? parentSize.minY : 0;
        const maxX = Number.isFinite(parentSize.width) ? parentSize.width : minX;
        const maxY = Number.isFinite(parentSize.height) ? parentSize.height : minY;
        return { left: minX, top: minY, right: maxX, bottom: maxY };
    }

    setDefaultWindowDimenstion = () => {
        if (this.props.defaultHeight && this.props.defaultWidth) {
            this.setState(
                { height: this.props.defaultHeight, width: this.props.defaultWidth },
                this.resizeBoundries
            );
            return;
        }
        const displays = getDisplayLayout();
        const activeDisplay = this.getActiveDisplay(displays);
        const fallbackWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const fallbackHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const widthRef = activeDisplay ? activeDisplay.width : fallbackWidth;
        const heightRef = activeDisplay ? activeDisplay.height : fallbackHeight;
        const offsetX = activeDisplay ? activeDisplay.x : 0;
        const offsetY = activeDisplay ? activeDisplay.y : 0;
        const isPortrait = heightRef > widthRef;
        if (this.props.initialX === undefined || this.props.initialX === null) {
            this.startX = isPortrait ? offsetX + widthRef * 0.05 : offsetX + 60;
        }
        if (this.props.initialY === undefined || this.props.initialY === null) {
            this.startY = offsetY + 10;
        }
        if (isPortrait) {
            this.setState({ height: 85, width: 90 }, this.resizeBoundries);
        } else if (widthRef < 640) {
            this.setState({ height: 60, width: 85 }, this.resizeBoundries);
        } else {
            this.setState({ height: 85, width: 60 }, this.resizeBoundries);
        }
    }

    resizeBoundries = () => {
        const displays = getDisplayLayout();
        const display = this.getActiveDisplay(displays);
        const workspace = getWorkspaceRect(displays);
        const fallbackWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const fallbackHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const widthRef = display ? display.width : fallbackWidth;
        const heightRef = display ? display.height : fallbackHeight;
        const windowWidthPx = widthRef * (this.state.width / 100.0);
        const windowHeightPx = heightRef * (this.state.height / 100.0);
        const minX = workspace.x;
        const minY = workspace.y;
        const maxX = workspace.x + workspace.width - windowWidthPx;
        const maxY = workspace.y + workspace.height - windowHeightPx;
        this.setState({
            parentSize: {
                width: maxX < minX ? minX : maxX,
                height: maxY < minY ? minY : maxY,
                minX,
                minY,
            },
            workspace,
        }, () => {
            if (!this._displayTransitioning) {
                this.ensureWithinCurrentDisplay();
            }
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
        const displays = getDisplayLayout();
        const display = this.getActiveDisplay(displays);
        const fallbackHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const heightRef = display ? display.height : fallbackHeight;
        const px = (this.state.height / 100) * heightRef + 1;
        const snapped = this.snapToGrid(px);
        const heightPercent = snapped / heightRef * 100;
        this.setState({ height: heightPercent }, this.resizeBoundries);
    }

    handleHorizontalResize = () => {
        if (this.props.resizable === false) return;
        const displays = getDisplayLayout();
        const display = this.getActiveDisplay(displays);
        const fallbackWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const widthRef = display ? display.width : fallbackWidth;
        const px = (this.state.width / 100) * widthRef + 1;
        const snapped = this.snapToGrid(px);
        const widthPercent = snapped / widthRef * 100;
        this.setState({ width: widthPercent }, this.resizeBoundries);
    }

    setWinowsPosition = (forcedDisplayId) => {
        var r = document.querySelector("#" + this.id);
        if (!r) return;
        var rect = r.getBoundingClientRect();
        const x = this.snapToGrid(rect.x);
        const y = this.snapToGrid(rect.y - 32);
        r.style.setProperty('--window-transform-x', x.toFixed(1).toString() + "px");
        r.style.setProperty('--window-transform-y', y.toFixed(1).toString() + "px");
        const displays = getDisplayLayout();
        const display = forcedDisplayId ? getDisplayById(forcedDisplayId, displays) : findDisplayForRect(rect, displays);
        const displayId = display ? display.id : this.state.activeDisplayId;
        if (displayId && displayId !== this.state.activeDisplayId) {
            this.setState({ activeDisplayId: displayId });
        }
        if (this.props.onPositionChange) {
            this.props.onPositionChange(x, y, displayId);
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
        const display = this.getActiveDisplay();
        if (!display) return;
        let newWidth = width;
        let newHeight = height;
        let transformX = display.x - 1;
        let transformY = display.y - 2;
        if (position === 'left') {
            newWidth = 50;
            newHeight = 96.3;
        } else if (position === 'right') {
            newWidth = 50;
            newHeight = 96.3;
            transformX = display.x + display.width / 2;
        } else if (position === 'top') {
            newWidth = 100.2;
            newHeight = 50;
        }
        const r = document.querySelector("#" + this.id);
        if (r) {
            r.style.transform = `translate(${transformX}px,${transformY}px)`;
        }
        this.setState({
            snapPreview: null,
            snapPosition: null,
            snapped: position,
            lastSize: { width, height },
            width: newWidth,
            height: newHeight
        }, () => {
            this.resizeBoundries();
            this.setWinowsPosition(display.id);
        });
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
        const displays = getDisplayLayout();
        const display = this.getActiveDisplay(displays);
        if (!display) return;
        const threshold = 30;
        let snap = null;
        if (rect.left <= display.x + threshold) {
            snap = { left: `${display.x}px`, top: `${display.y}px`, width: `${display.width / 2}px`, height: `${display.height}px` };
            this.setState({ snapPreview: snap, snapPosition: 'left' });
        }
        else if (rect.right >= display.x + display.width - threshold) {
            snap = { left: `${display.x + display.width / 2}px`, top: `${display.y}px`, width: `${display.width / 2}px`, height: `${display.height}px` };
            this.setState({ snapPreview: snap, snapPosition: 'right' });
        }
        else if (rect.top <= display.y + threshold) {
            snap = { left: `${display.x}px`, top: `${display.y}px`, width: `${display.width}px`, height: `${display.height / 2}px` };
            this.setState({ snapPreview: snap, snapPosition: 'top' });
        }
        else {
            if (this.state.snapPreview) this.setState({ snapPreview: null, snapPosition: null });
        }
    }

    applyEdgeResistance = (node, data) => {
        if (!node || !data) return;
        const threshold = 30;
        const resistance = 0.35; // how much to slow near edges
        let { x, y } = data;
        const bounds = this.getDraggableBounds();
        const maxX = bounds.right;
        const maxY = bounds.bottom;
        const minX = bounds.left;
        const minY = bounds.top;

        const resist = (pos, min, max) => {
            if (pos < min) return min;
            if (pos < min + threshold) return min + (pos - min) * resistance;
            if (pos > max) return max;
            if (pos > max - threshold) return max - (max - pos) * resistance;
            return pos;
        }

        x = resist(x, minX, maxX);
        y = resist(y, minY, maxY);
        node.style.transform = `translate(${x}px, ${y}px)`;
    }

    handleDrag = (e, data) => {
        let node = null;
        if (data && data.node) {
            node = data.node;
            this.applyEdgeResistance(data.node, data);
        } else {
            node = typeof document !== 'undefined' ? document.getElementById(this.id) : null;
        }
        this.checkOverlap();
        this.checkSnapPreview();
        const rect = node ? node.getBoundingClientRect() : null;
        if (rect) {
            this.maybeHandleDisplayChange(rect);
        }
    }

    handleStop = () => {
        this.changeCursorToDefault();
        const snapPos = this.state.snapPosition;
        if (snapPos) {
            this.snapWindow(snapPos);
        } else {
            this.setState({ snapPreview: null, snapPosition: null }, () => {
                this.setWinowsPosition();
                const node = typeof document !== 'undefined' ? document.getElementById(this.id) : null;
                const rect = node ? node.getBoundingClientRect() : null;
                if (rect) {
                    this.maybeHandleDisplayChange(rect);
                }
            });
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
        const safePreventDefault = () => {
            if (typeof e.preventDefault === 'function') {
                e.preventDefault();
            }
        };
        const safeStopPropagation = () => {
            if (typeof e.stopPropagation === 'function') {
                e.stopPropagation();
            }
        };
        if (e.key === 'Escape') {
            this.closeWindow();
        } else if (e.key === 'Tab') {
            this.focusWindow();
        } else if (e.altKey) {
            if (e.key === 'ArrowDown') {
                safePreventDefault();
                safeStopPropagation();
                this.unsnapWindow();
            } else if (e.key === 'ArrowLeft') {
                safePreventDefault();
                safeStopPropagation();
                this.snapWindow('left');
            } else if (e.key === 'ArrowRight') {
                safePreventDefault();
                safeStopPropagation();
                this.snapWindow('right');
            } else if (e.key === 'ArrowUp') {
                safePreventDefault();
                safeStopPropagation();
                this.snapWindow('top');
            }
            this.focusWindow();
        } else if (e.shiftKey) {
            const step = 1;
            if (e.key === 'ArrowLeft') {
                safePreventDefault();
                safeStopPropagation();
                this.setState(prev => ({ width: Math.max(prev.width - step, 20) }), this.resizeBoundries);
            } else if (e.key === 'ArrowRight') {
                safePreventDefault();
                safeStopPropagation();
                this.setState(prev => ({ width: Math.min(prev.width + step, 100) }), this.resizeBoundries);
            } else if (e.key === 'ArrowUp') {
                safePreventDefault();
                safeStopPropagation();
                this.setState(prev => ({ height: Math.max(prev.height - step, 20) }), this.resizeBoundries);
            } else if (e.key === 'ArrowDown') {
                safePreventDefault();
                safeStopPropagation();
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
        const display = this.getActiveDisplay();
        const fallbackWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const fallbackHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const widthRef = display ? display.width : fallbackWidth;
        const heightRef = display ? display.height : fallbackHeight;
        const widthPx = widthRef * (this.state.width / 100);
        const heightPx = heightRef * (this.state.height / 100);
        return (
            <>
                {this.state.snapPreview && (
                    <div
                        data-testid="snap-preview"
                        className="fixed border-2 border-dashed border-white bg-white bg-opacity-10 pointer-events-none z-40 transition-opacity"
                        style={{ left: this.state.snapPreview.left, top: this.state.snapPreview.top, width: this.state.snapPreview.width, height: this.state.snapPreview.height }}
                    />
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
                    bounds={this.getDraggableBounds()}
                >
                    <div
                        style={{ width: `${widthPx}px`, height: `${heightPx}px` }}
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
