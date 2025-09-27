"use client";

import React, { Component } from 'react';
import NextImage from 'next/image';
import Draggable from 'react-draggable';
import Settings from '../apps/settings';
import ReactGA from 'react-ga4';
import useDocPiP from '../../hooks/useDocPiP';
import styles from './window.module.css';

const EDGE_THRESHOLD_MIN = 48;
const EDGE_THRESHOLD_MAX = 160;
const EDGE_THRESHOLD_RATIO = 0.05;
const SNAP_BOTTOM_INSET = 28;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const computeEdgeThreshold = (size) => clamp(size * EDGE_THRESHOLD_RATIO, EDGE_THRESHOLD_MIN, EDGE_THRESHOLD_MAX);

const percentOf = (value, total) => {
    if (!total) return 0;
    return (value / total) * 100;
};

const computeSnapRegions = ({ width, height, offsetX = 0, offsetY = 0 }) => {
    const halfWidth = width / 2;
    const availableHeight = Math.max(0, height - SNAP_BOTTOM_INSET);
    const topHeight = Math.min(availableHeight, height / 2);
    return {
        left: { left: offsetX, top: offsetY, width: halfWidth, height: availableHeight },
        right: { left: offsetX + width - halfWidth, top: offsetY, width: halfWidth, height: availableHeight },
        top: { left: offsetX, top: offsetY, width, height: topHeight },
    };
};

const parseNumber = (value, fallback = 0) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
};

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
            restoreSnapshot: null,
            grabbed: false,
        }
        this._usageTimeout = null;
        this._uiExperiments = process.env.NEXT_PUBLIC_UI_EXPERIMENTS === 'true';
        this._menuOpener = null;
    }

    getViewportMetrics = () => {
        const context = this.props.context;
        let candidate = null;
        if (context && typeof context === 'object') {
            const candidates = [
                context.viewport,
                context.bounds,
                context.layout,
                context.workspace?.bounds,
                context.workspace,
                context.display?.bounds,
            ];
            for (const item of candidates) {
                if (item && typeof item === 'object') {
                    candidate = item;
                    break;
                }
            }
        }

        if (candidate) {
            const width = parseNumber(candidate.width, typeof window !== 'undefined' ? window.innerWidth : 0);
            const height = parseNumber(candidate.height, typeof window !== 'undefined' ? window.innerHeight : 0);
            const offsetX = parseNumber(candidate.x ?? candidate.left ?? 0, 0);
            const offsetY = parseNumber(candidate.y ?? candidate.top ?? 0, 0);
            return { width, height, offsetX, offsetY };
        }

        if (typeof document !== 'undefined') {
            const area = document.getElementById('window-area');
            if (area) {
                const rect = area.getBoundingClientRect();
                return { width: rect.width, height: rect.height, offsetX: rect.left, offsetY: rect.top };
            }
        }

        if (typeof window !== 'undefined') {
            return { width: window.innerWidth, height: window.innerHeight, offsetX: 0, offsetY: 0 };
        }

        return { width: 0, height: 0, offsetX: 0, offsetY: 0 };
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

        const metrics = this.getViewportMetrics();
        const fallbackWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
        const fallbackHeight = typeof window !== 'undefined' ? window.innerHeight : 720;
        const viewportWidth = metrics.width || fallbackWidth;
        const viewportHeight = metrics.height || fallbackHeight;
        const isPortrait = viewportHeight > viewportWidth;
        if (isPortrait) {
            this.startX = viewportWidth * 0.05;
            this.setState({ height: 85, width: 90 }, this.resizeBoundries);
        } else if (viewportWidth < 640) {
            this.setState({ height: 60, width: 85 }, this.resizeBoundries);
        } else {
            this.setState({ height: 85, width: 60 }, this.resizeBoundries);
        }
    }

    resizeBoundries = () => {
        const metrics = this.getViewportMetrics();
        const viewportWidth = metrics.width || (typeof window !== 'undefined' ? window.innerWidth : 0);
        const viewportHeight = metrics.height || (typeof window !== 'undefined' ? window.innerHeight : 0);
        const height = Math.max(
            0,
            viewportHeight - (viewportHeight * (this.state.height / 100.0)) - SNAP_BOTTOM_INSET
        );
        const width = Math.max(
            0,
            viewportWidth - (viewportWidth * (this.state.width / 100.0))
        );
        this.setState({
            parentSize: {
                height,
                width
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
        const metrics = this.getViewportMetrics();
        const viewportHeight = metrics.height || (typeof window !== 'undefined' ? window.innerHeight : 0);
        if (!viewportHeight) return;
        const px = (this.state.height / 100) * viewportHeight + 1;
        const snapped = this.snapToGrid(px);
        const heightPercent = (snapped / viewportHeight) * 100;
        this.setState({ height: heightPercent }, this.resizeBoundries);
    }

    handleHorizontalResize = () => {
        if (this.props.resizable === false) return;
        const metrics = this.getViewportMetrics();
        const viewportWidth = metrics.width || (typeof window !== 'undefined' ? window.innerWidth : 0);
        if (!viewportWidth) return;
        const px = (this.state.width / 100) * viewportWidth + 1;
        const snapped = this.snapToGrid(px);
        const widthPercent = (snapped / viewportWidth) * 100;
        this.setState({ width: widthPercent }, this.resizeBoundries);
    }

    setWinowsPosition = () => {
        const node = document.querySelector("#" + this.id);
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const metrics = this.getViewportMetrics();
        const x = this.snapToGrid(rect.left - metrics.offsetX);
        const y = this.snapToGrid(rect.top - metrics.offsetY);
        node.style.setProperty('--window-transform-x', `${x.toFixed(1)}px`);
        node.style.setProperty('--window-transform-y', `${y.toFixed(1)}px`);
        if (this.props.onPositionChange) {
            this.props.onPositionChange(x, y);
        }
    }

    createRestoreSnapshot = () => {
        const node = document.getElementById(this.id);
        if (!node) return this.state.restoreSnapshot;
        const transformX = node.style.getPropertyValue('--window-transform-x') || '0px';
        const transformY = node.style.getPropertyValue('--window-transform-y') || '0px';
        return {
            width: this.state.width,
            height: this.state.height,
            snapped: this.state.snapped,
            maximized: this.state.maximized,
            transformX,
            transformY,
            previous: this.state.restoreSnapshot || null,
        };
    }

    applySnapshot = (snapshot) => {
        if (!snapshot) return false;
        const node = document.getElementById(this.id);
        if (node) {
            const fallbackX = node.style.getPropertyValue('--window-transform-x') || '0px';
            const fallbackY = node.style.getPropertyValue('--window-transform-y') || '0px';
            const x = snapshot.transformX ?? fallbackX;
            const y = snapshot.transformY ?? fallbackY;
            node.style.transform = `translate(${x},${y})`;
            node.style.setProperty('--window-transform-x', x);
            node.style.setProperty('--window-transform-y', y);
        }
        this.setState({
            width: snapshot.width ?? this.state.width,
            height: snapshot.height ?? this.state.height,
            snapped: snapshot.snapped ?? null,
            maximized: snapshot.maximized ?? false,
            restoreSnapshot: snapshot.previous || null,
            snapPreview: null,
            snapPosition: null,
        }, () => {
            this.resizeBoundries();
            this.checkOverlap();
        });
        return true;
    }

    unsnapWindow = () => {
        if (!this.state.snapped) return;
        const applied = this.applySnapshot(this.state.restoreSnapshot);
        if (!applied) {
            this.setState({ snapped: null }, this.resizeBoundries);
        }
    }

    snapWindow = (position) => {
        this.setWinowsPosition();
        this.focusWindow();
        const metrics = this.getViewportMetrics();
        if (!metrics.width || !metrics.height) return;
        const regions = computeSnapRegions(metrics);
        const region = regions[position];
        if (!region) return;
        const snapshot = (!this.state.snapped && !this.state.maximized)
            ? this.createRestoreSnapshot()
            : this.state.restoreSnapshot;
        const node = document.getElementById(this.id);
        if (node) {
            const translateX = region.left - metrics.offsetX;
            const translateY = region.top - metrics.offsetY;
            node.style.transform = `translate(${translateX}px, ${translateY}px)`;
            node.style.setProperty('--window-transform-x', `${translateX}px`);
            node.style.setProperty('--window-transform-y', `${translateY}px`);
        }
        this.setState({
            snapPreview: null,
            snapPosition: null,
            snapped: position,
            restoreSnapshot: snapshot,
            maximized: false,
            width: percentOf(region.width, metrics.width),
            height: percentOf(region.height, metrics.height)
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
        const node = document.getElementById(this.id);
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const metrics = this.getViewportMetrics();
        if (!metrics.width || !metrics.height) return;

        const localLeft = rect.left - metrics.offsetX;
        const localTop = rect.top - metrics.offsetY;
        const localRight = metrics.width - (localLeft + rect.width);

        const horizontalThreshold = computeEdgeThreshold(metrics.width);
        const verticalThreshold = computeEdgeThreshold(metrics.height);
        const regions = computeSnapRegions(metrics);

        let candidate = null;
        if (localTop <= verticalThreshold && regions.top.height > 0) {
            candidate = { position: 'top', preview: regions.top };
        } else if (localLeft <= horizontalThreshold && regions.left.width > 0) {
            candidate = { position: 'left', preview: regions.left };
        } else if (localRight <= horizontalThreshold && regions.right.width > 0) {
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
        if (data && data.node) {
            this.applyEdgeResistance(data.node, data);
        }
        this.checkOverlap();
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
        if (!node) return;
        const snapshot = this.state.restoreSnapshot;
        const fallbackX = node.style.getPropertyValue('--window-transform-x') || '0px';
        const fallbackY = node.style.getPropertyValue('--window-transform-y') || '0px';
        const targetX = snapshot?.transformX ?? fallbackX;
        const targetY = snapshot?.transformY ?? fallbackY;
        const startTransform = node.style.transform;
        const endTransform = `translate(${targetX},${targetY})`;
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const finalize = () => {
            node.style.transform = endTransform;
            if (snapshot) {
                this.applySnapshot(snapshot);
            } else {
                this.setDefaultWindowDimenstion();
                this.setState({ maximized: false, snapped: null, restoreSnapshot: null }, () => {
                    this.checkOverlap();
                });
            }
            if (!snapshot || !snapshot.snapped) {
                this.props.hideSideBar(this.id, false);
            }
        };

        if (prefersReducedMotion) {
            finalize();
            return;
        }

        if (this._dockAnimation) {
            this._dockAnimation.onfinish = () => {
                finalize();
                this._dockAnimation.onfinish = null;
            };
            this._dockAnimation.reverse();
        } else if (typeof node.animate === 'function') {
            const animation = node.animate(
                [{ transform: startTransform }, { transform: endTransform }],
                { duration: 300, easing: 'ease-in-out', fill: 'forwards' }
            );
            animation.onfinish = () => {
                finalize();
                animation.onfinish = null;
            };
        } else {
            finalize();
        }
    }

    maximizeWindow = () => {
        if (this.props.allowMaximize === false) return;
        if (this.state.maximized) {
            this.restoreWindow();
        }
        else {
            this.focusWindow();
            const node = document.querySelector("#" + this.id);
            if (!node) return;
            this.setWinowsPosition();
            const snapshot = this.createRestoreSnapshot();
            node.style.transform = `translate(-1pt,-2pt)`;
            node.style.setProperty('--window-transform-x', '-1pt');
            node.style.setProperty('--window-transform-y', '-2pt');
            this.setState({
                maximized: true,
                height: 96.3,
                width: 100.2,
                snapped: null,
                restoreSnapshot: snapshot,
            }, () => {
                this.resizeBoundries();
                this.props.hideSideBar(this.id, true);
            });
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
                if (this.state.maximized) {
                    this.restoreWindow();
                } else if (this.state.snapped) {
                    this.unsnapWindow();
                }
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
                this.maximizeWindow();
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
                        className={[
                            this.state.cursorType,
                            this.state.closed ? 'closed-window' : '',
                            this.state.maximized ? 'duration-300' : '',
                            this.props.minimized ? 'opacity-0 invisible duration-200' : '',
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
