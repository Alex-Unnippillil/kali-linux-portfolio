"use client";

import React, { Component, useCallback, useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import Settings from '../apps/settings';
import ReactGA from 'react-ga4';
import {
    clampWindowPositionWithinViewport,
    clampWindowTopPosition,
    DEFAULT_WINDOW_TOP_OFFSET,
    measureSafeAreaInset,
    measureSnapBottomInset,
    measureWindowTopOffset,
} from '../../utils/windowLayout';
import styles from './window.module.css';
import { DESKTOP_TOP_PADDING, WINDOW_TOP_INSET, WINDOW_TOP_MARGIN } from '../../utils/uiConstants';

const EDGE_THRESHOLD_MIN = 48;
const EDGE_THRESHOLD_MAX = 160;
const EDGE_THRESHOLD_RATIO = 0.05;
const DRAG_BOUNDS_PADDING = 96;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const DEFAULT_MIN_WIDTH = 20;
const DEFAULT_MIN_HEIGHT = 20;

const parsePxValue = (value) => {
    if (typeof value !== 'string') return null;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizePercentageDimension = (value, fallback) => {
    if (typeof value !== 'number') return fallback;
    if (!Number.isFinite(value)) return fallback;
    if (value <= 0) return fallback;
    return value;
};

const computeEdgeThreshold = (size) => clamp(size * EDGE_THRESHOLD_RATIO, EDGE_THRESHOLD_MIN, EDGE_THRESHOLD_MAX);

const getViewportMetrics = () => {
    if (typeof window === 'undefined') {
        return { width: 0, height: 0, left: 0, top: 0 };
    }

    const fallbackWidth = typeof window.innerWidth === 'number' ? window.innerWidth : 0;
    const fallbackHeight = typeof window.innerHeight === 'number' ? window.innerHeight : 0;
    const visualViewport = window.visualViewport;

    if (visualViewport) {
        const width = Number.isFinite(visualViewport.width) ? visualViewport.width : fallbackWidth;
        const height = Number.isFinite(visualViewport.height) ? visualViewport.height : fallbackHeight;
        const left = Number.isFinite(visualViewport.offsetLeft) ? visualViewport.offsetLeft : 0;
        const top = Number.isFinite(visualViewport.offsetTop) ? visualViewport.offsetTop : 0;
        return {
            width: width || fallbackWidth,
            height: height || fallbackHeight,
            left,
            top,
        };
    }

    return { width: fallbackWidth, height: fallbackHeight, left: 0, top: 0 };
};

const percentOf = (value, total) => {
    if (!total) return 0;
    return (value / total) * 100;
};

const SNAP_LABELS = {
    left: 'Snap left half',
    right: 'Snap right half',
    top: 'Snap full screen',
    'top-left': 'Snap top-left quarter',
    'top-right': 'Snap top-right quarter',
    'bottom-left': 'Snap bottom-left quarter',
    'bottom-right': 'Snap bottom-right quarter',
};

const getSnapLabel = (position) => {
    if (!position) return 'Snap window';
    return SNAP_LABELS[position] || 'Snap window';
};

const normalizeRightCornerSnap = (candidate, regions) => {
    if (!candidate) return null;
    const { position } = candidate;
    if (position === 'top-right' || position === 'bottom-right') {
        const rightRegion = regions?.right;
        if (rightRegion && rightRegion.width > 0 && rightRegion.height > 0) {
            return { position: 'right', preview: rightRegion };
        }
    }
    return candidate;
};

const computeSnapRegions = (
    viewportWidth,
    viewportHeight,
    viewportLeft = 0,
    viewportTop = 0,
    topInset = DEFAULT_WINDOW_TOP_OFFSET,
    bottomInset,
) => {
    const normalizedTopInset = typeof topInset === 'number' && Number.isFinite(topInset)
        ? Math.max(topInset, WINDOW_TOP_INSET + WINDOW_TOP_MARGIN)
        : DEFAULT_WINDOW_TOP_OFFSET;
    const safeBottom = Math.max(0, measureSafeAreaInset('bottom'));
    const snapBottomInset = typeof bottomInset === 'number' && Number.isFinite(bottomInset)
        ? Math.max(bottomInset, 0)
        : measureSnapBottomInset();
    const availableHeight = Math.max(0, viewportHeight - normalizedTopInset - snapBottomInset - safeBottom);
    const halfWidth = Math.max(viewportWidth / 2, 0);
    const halfHeight = Math.max(availableHeight / 2, 0);
    const leftEdge = viewportLeft;
    const topEdge = viewportTop + normalizedTopInset;
    const rightStart = viewportLeft + Math.max(viewportWidth - halfWidth, 0);
    const bottomStart = topEdge + halfHeight;

    return {
        left: { left: leftEdge, top: topEdge, width: halfWidth, height: availableHeight },
        right: { left: rightStart, top: topEdge, width: halfWidth, height: availableHeight },
        top: { left: leftEdge, top: topEdge, width: viewportWidth, height: availableHeight },
        'top-left': { left: leftEdge, top: topEdge, width: halfWidth, height: halfHeight },
        'top-right': { left: rightStart, top: topEdge, width: halfWidth, height: halfHeight },
        'bottom-left': { left: leftEdge, top: bottomStart, width: halfWidth, height: halfHeight },
        'bottom-right': { left: rightStart, top: bottomStart, width: halfWidth, height: halfHeight },

    };
};

const parseDurationToMs = (value, fallback) => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const number = parseFloat(trimmed);
    if (!Number.isFinite(number)) return fallback;
    if (trimmed.endsWith('ms')) {
        return number;
    }
    if (trimmed.endsWith('s')) {
        return number * 1000;
    }
    return number;
};

const readMotionDuration = (customProperty, fallback) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return fallback;
    }
    const root = document.documentElement;
    if (!root || typeof window.getComputedStyle !== 'function') {
        return fallback;
    }
    const computed = window.getComputedStyle(root).getPropertyValue(customProperty);
    if (!computed) {
        return fallback;
    }
    const first = computed.split(',')[0];
    return parseDurationToMs(first, fallback);
};

const scheduleTimeout = (callback, delay) => {
    if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
        return window.setTimeout(callback, delay);
    }
    return setTimeout(callback, delay);
};

const clearScheduledTimeout = (handle) => {
    if (handle == null) return;
    if (typeof window !== 'undefined' && typeof window.clearTimeout === 'function') {
        window.clearTimeout(handle);
    } else {
        clearTimeout(handle);
    }
};

export class Window extends Component {
    static defaultProps = {
        snapGrid: [8, 8],
        minWidth: DEFAULT_MIN_WIDTH,
        minHeight: DEFAULT_MIN_HEIGHT,
    };

    constructor(props) {
        super(props);
        this.id = null;
        const { width: viewportWidth, height: viewportHeight, left: viewportLeft, top: viewportTop } = getViewportMetrics();
        const isPortrait = viewportHeight > viewportWidth;
        const initialTopInset = typeof window !== 'undefined'
            ? measureWindowTopOffset()
            : DEFAULT_WINDOW_TOP_OFFSET;
        const minWidth = normalizePercentageDimension(props.minWidth, DEFAULT_MIN_WIDTH);
        const minHeight = normalizePercentageDimension(props.minHeight, DEFAULT_MIN_HEIGHT);
        const requestedWidth = typeof props.defaultWidth === 'number'
            ? props.defaultWidth
            : (isPortrait ? 90 : 60);
        const requestedHeight = typeof props.defaultHeight === 'number'
            ? props.defaultHeight
            : 85;
        this.startX =
            props.initialX ??
            (isPortrait ? window.innerWidth * 0.05 : 60);
        this.startY = clampWindowTopPosition(props.initialY, initialTopInset);

        this.state = {
            cursorType: "cursor-default",
            width: Math.max(requestedWidth, minWidth),
            height: Math.max(requestedHeight, minHeight),
            closed: false,
            maximized: false,
            preMaximizeBounds: null,
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
            minWidth,
            minHeight,
            resizing: null,
        };
        this.windowRef = React.createRef();
        this._usageTimeout = null;
        this._uiExperiments = process.env.NEXT_PUBLIC_UI_EXPERIMENTS === 'true';
        this._menuOpener = null;
        this._closeTimeout = null;
        this._resizeSession = null;
    }

    notifySizeChange = () => {
        if (typeof this.props.onSizeChange === 'function') {
            const { width, height } = this.state;
            this.props.onSizeChange(width, height);
        }
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
        if (this.props.isFocused) {
            this.focusWindow();
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.minWidth === this.props.minWidth && prevProps.minHeight === this.props.minHeight) {
            return;
        }

        const minWidth = normalizePercentageDimension(this.props.minWidth, DEFAULT_MIN_WIDTH);
        const minHeight = normalizePercentageDimension(this.props.minHeight, DEFAULT_MIN_HEIGHT);

        const minWidthChanged = this.state.minWidth !== minWidth;
        const minHeightChanged = this.state.minHeight !== minHeight;
        const widthNeedsUpdate = this.state.width < minWidth;
        const heightNeedsUpdate = this.state.height < minHeight;
        const lastSizeNeedsUpdate = this.state.lastSize
            ? (this.state.lastSize.width < minWidth || this.state.lastSize.height < minHeight)
            : false;
        const preBoundsNeedsUpdate = this.state.preMaximizeBounds
            ? (this.state.preMaximizeBounds.width < minWidth || this.state.preMaximizeBounds.height < minHeight)
            : false;

        if (!minWidthChanged && !minHeightChanged && !widthNeedsUpdate && !heightNeedsUpdate && !lastSizeNeedsUpdate && !preBoundsNeedsUpdate) {
            return;
        }

        this.setState((prevState) => {
            const updates = {};
            if (minWidthChanged) {
                updates.minWidth = minWidth;
            }
            if (minHeightChanged) {
                updates.minHeight = minHeight;
            }
            if (widthNeedsUpdate) {
                updates.width = Math.max(prevState.width, minWidth);
            }
            if (heightNeedsUpdate) {
                updates.height = Math.max(prevState.height, minHeight);
            }
            if (lastSizeNeedsUpdate && prevState.lastSize) {
                updates.lastSize = {
                    width: Math.max(prevState.lastSize.width, minWidth),
                    height: Math.max(prevState.lastSize.height, minHeight),
                };
            }
            if (preBoundsNeedsUpdate && prevState.preMaximizeBounds) {
                updates.preMaximizeBounds = {
                    ...prevState.preMaximizeBounds,
                    width: Math.max(prevState.preMaximizeBounds.width, minWidth),
                    height: Math.max(prevState.preMaximizeBounds.height, minHeight),
                };
            }
            return updates;
        }, () => {
            this.resizeBoundries();
            if (widthNeedsUpdate || heightNeedsUpdate) {
                this.notifySizeChange();
            }
        });
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
        if (this._closeTimeout) {
            clearScheduledTimeout(this._closeTimeout);
            this._closeTimeout = null;
        }
        this.cancelResizeSession();
        this._resizeSession = null;
    }

    setDefaultWindowDimenstion = () => {
        if (typeof this.props.defaultHeight === 'number' && typeof this.props.defaultWidth === 'number') {
            const width = Math.max(this.props.defaultWidth, this.state.minWidth);
            const height = Math.max(this.props.defaultHeight, this.state.minHeight);
            this.setState(
                { height, width, preMaximizeBounds: null },
                () => {
                    this.resizeBoundries();
                    this.notifySizeChange();
                }
            );
            return;
        }

        const { width: viewportWidth, height: viewportHeight, left: viewportLeft } = getViewportMetrics();
        const isPortrait = viewportHeight > viewportWidth;
        if (isPortrait) {
            this.startX = window.innerWidth * 0.05;
            this.setState({
                height: Math.max(85, this.state.minHeight),
                width: Math.max(90, this.state.minWidth),
                preMaximizeBounds: null,
            }, () => {
                this.resizeBoundries();
                this.notifySizeChange();
            });
        } else if (window.innerWidth < 640) {
            this.setState({
                height: Math.max(60, this.state.minHeight),
                width: Math.max(85, this.state.minWidth),
                preMaximizeBounds: null,
            }, () => {
                this.resizeBoundries();
                this.notifySizeChange();
            });
        } else {
            this.setState({
                height: Math.max(85, this.state.minHeight),
                width: Math.max(60, this.state.minWidth),
                preMaximizeBounds: null,
            }, () => {
                this.resizeBoundries();
                this.notifySizeChange();
            });
        }
    }

    resizeBoundries = () => {
        const hasWindow = typeof window !== 'undefined';
        const { width: viewportWidth, height: viewportHeight, left: viewportLeft, top: viewportTop } = getViewportMetrics();
        const topInset = hasWindow
            ? measureWindowTopOffset()
            : DEFAULT_WINDOW_TOP_OFFSET;
        const windowHeightPx = viewportHeight * (this.state.height / 100.0);
        const windowWidthPx = viewportWidth * (this.state.width / 100.0);
        const safeAreaBottom = Math.max(0, measureSafeAreaInset('bottom'));
        const snapBottomInset = measureSnapBottomInset();
        const availableVertical = Math.max(viewportHeight - topInset - snapBottomInset - safeAreaBottom, 0);
        const availableHorizontal = Math.max(viewportWidth - windowWidthPx, 0);
        const maxTop = Math.max(availableVertical - windowHeightPx, 0);

        this.setState({
            parentSize: {
                height: maxTop,
                width: availableHorizontal,
            },
            safeAreaTop: topInset,
            viewportOffset: { left: viewportLeft, top: viewportTop },

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
                width: Math.max(prev.width - 1, prev.minWidth),
                height: Math.max(prev.height - 1, prev.minHeight),
                preMaximizeBounds: null,
            }), () => {
                this.notifySizeChange();
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

    getCurrentBounds = () => {
        const node = this.getWindowNode();
        let x = typeof this.startX === 'number' ? this.startX : 0;
        let y = typeof this.startY === 'number' ? this.startY : 0;

        if (node) {
            const style = node.style;
            if (style && typeof style.getPropertyValue === 'function') {
                const storedX = parsePxValue(style.getPropertyValue('--window-transform-x'));
                const storedY = parsePxValue(style.getPropertyValue('--window-transform-y'));
                if (storedX !== null) {
                    x = storedX;
                }
                if (storedY !== null) {
                    y = storedY;
                }
                if (storedX === null || storedY === null) {
                    const rect = typeof node.getBoundingClientRect === 'function'
                        ? node.getBoundingClientRect()
                        : null;
                    if (rect) {
                        if (storedX === null) {
                            x = rect.left;
                        }
                        if (storedY === null) {
                            y = rect.top;
                        }
                    }
                }
            } else if (typeof node.getBoundingClientRect === 'function') {
                const rect = node.getBoundingClientRect();
                x = rect.left;
                y = rect.top;
            }
        }

        return {
            width: Math.max(this.state.width, this.state.minWidth),
            height: Math.max(this.state.height, this.state.minHeight),
            x,
            y,
        };
    }

    setTransformMotionPreset = (node, preset) => {
        if (!node) return;
        const durationVars = {
            maximize: '--window-motion-duration-maximize',
            restore: '--window-motion-duration-restore',
            snap: '--window-motion-duration-snap',
        };
        const easingVars = {
            maximize: '--window-motion-ease-maximize',
            restore: '--window-motion-ease-restore',
            snap: '--window-motion-ease-snap',
        };
        const duration = durationVars[preset] || durationVars.restore;
        const easing = easingVars[preset] || easingVars.restore;
        node.style.setProperty('--window-motion-transform-duration', `var(${duration})`);
        node.style.setProperty('--window-motion-transform-easing', `var(${easing})`);
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

    getSnapGrid = () => {
        const fallback = [8, 8];
        if (!Array.isArray(this.props.snapGrid)) {
            return fallback;
        }

        const [gridX, gridY] = this.props.snapGrid;
        const normalize = (size, fallbackSize) => {
            if (typeof size !== 'number') return fallbackSize;
            if (!Number.isFinite(size)) return fallbackSize;
            if (size <= 0) return fallbackSize;
            return size;
        };

        const normalizedX = normalize(gridX, fallback[0]);
        const normalizedY = normalize(gridY, fallback[1]);
        return [normalizedX, normalizedY];
    }

    snapToGrid = (value, axis = 'x') => {
        if (!this.props.snapEnabled) return value;
        const [gridX, gridY] = this.getSnapGrid();
        const size = axis === 'y' ? gridY : gridX;
        if (!size) return value;
        return Math.round(value / size) * size;
    }

    setWinowsPosition = () => {
        const node = this.getWindowNode();
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const topInset = this.state.safeAreaTop ?? DEFAULT_WINDOW_TOP_OFFSET;
        const viewportLeft = this.state.viewportOffset?.left ?? 0;
        const viewportTop = this.state.viewportOffset?.top ?? 0;
        const relativeX = rect.x - viewportLeft;
        const snappedRelativeX = this.snapToGrid(relativeX, 'x');
        const minX = viewportLeft;
        const maxX = viewportLeft + this.state.parentSize.width;
        const absoluteX = Math.min(Math.max(snappedRelativeX + viewportLeft, minX), maxX);
        const relativeY = rect.y - (viewportTop + topInset);
        const snappedRelativeY = this.snapToGrid(relativeY, 'y');
        const minY = viewportTop + topInset;
        const maxY = minY + this.state.parentSize.height;
        const baseY = snappedRelativeY + minY;
        const absoluteY = Math.min(Math.max(clampWindowTopPosition(baseY, minY), minY), maxY);
        node.style.setProperty('--window-transform-x', `${absoluteX.toFixed(1)}px`);
        node.style.setProperty('--window-transform-y', `${absoluteY.toFixed(1)}px`);

        if (this.props.onPositionChange) {
            this.props.onPositionChange(absoluteX, absoluteY);
        }

        this.notifySizeChange();
    }

    unsnapWindow = () => {
        if (!this.state.snapped) return;
        const node = this.getWindowNode();
        if (node) {
            this.setTransformMotionPreset(node, 'snap');
            const x = node.style.getPropertyValue('--window-transform-x');
            const y = node.style.getPropertyValue('--window-transform-y');
            if (x && y) {
                node.style.transform = `translate(${x},${y})`;
            }
        }
        if (this.state.lastSize) {
            const lastWidth = Math.max(this.state.lastSize.width, this.state.minWidth);
            const lastHeight = Math.max(this.state.lastSize.height, this.state.minHeight);
            this.setState({
                width: lastWidth,
                height: lastHeight,
                snapped: null,
                preMaximizeBounds: null,
            }, () => {
                this.resizeBoundries();
                this.notifySizeChange();
            });
        } else {
            this.setState({ snapped: null, preMaximizeBounds: null }, () => {
                this.resizeBoundries();
                this.notifySizeChange();
            });
        }
    }

    snapWindow = (position) => {
        const resolvedPosition = (position === 'top-right' || position === 'bottom-right')
            ? 'right'
            : position;
        this.setWinowsPosition();
        this.focusWindow();
        const { width: viewportWidth, height: viewportHeight, left: viewportLeft, top: viewportTop } = getViewportMetrics();
        const topInset = this.state.safeAreaTop ?? DEFAULT_WINDOW_TOP_OFFSET;
        if (!viewportWidth || !viewportHeight) return;
        const snapBottomInset = measureSnapBottomInset();
        const safeAreaBottom = Math.max(0, measureSafeAreaInset('bottom'));
        const regions = computeSnapRegions(viewportWidth, viewportHeight, viewportLeft, viewportTop, topInset, snapBottomInset);
        const region = regions[resolvedPosition];
        if (!region) return;
        const previousWidth = Math.max(this.state.width, this.state.minWidth);
        const previousHeight = Math.max(this.state.height, this.state.minHeight);
        const node = this.getWindowNode();
        const clampedPosition = clampWindowPositionWithinViewport(
            { x: region.left, y: region.top },
            { width: region.width, height: region.height },
            {
                viewportWidth,
                viewportHeight,
                viewportLeft,
                viewportTop,
                topOffset: topInset,
                bottomInset: safeAreaBottom,
                snapBottomInset,
            },
        ) || { x: region.left, y: region.top };

        let translateX = clampedPosition.x;
        let translateY = clampedPosition.y;
        let containerWidth = viewportWidth;
        let containerHeight = viewportHeight;
        let parentRect = null;

        if (node) {
            const offsetParent = node.offsetParent;
            if (offsetParent && typeof offsetParent.getBoundingClientRect === 'function') {
                parentRect = offsetParent.getBoundingClientRect();
            }
        }

        const parentLeft = parentRect && Number.isFinite(parentRect.left) ? parentRect.left : 0;
        const parentTop = parentRect && Number.isFinite(parentRect.top) ? parentRect.top : 0;
        const parentWidth = parentRect && Number.isFinite(parentRect.width) && parentRect.width > 0
            ? parentRect.width
            : null;
        const parentHeight = parentRect && Number.isFinite(parentRect.height) && parentRect.height > 0
            ? parentRect.height
            : null;

        translateX -= parentLeft;
        translateY -= parentTop;

        if (parentWidth) {
            containerWidth = parentWidth;
        }
        if (parentHeight) {
            containerHeight = parentHeight;
        }

        const minTranslateX = viewportLeft - parentLeft;
        const maxTranslateX = minTranslateX + Math.max(viewportWidth - region.width, 0);
        const minTranslateY = viewportTop + topInset - parentTop;
        const availableVertical = Math.max(viewportHeight - topInset - snapBottomInset - safeAreaBottom, 0);
        const maxTranslateY = minTranslateY + Math.max(availableVertical - region.height, 0);

        translateX = clamp(translateX, minTranslateX, maxTranslateX);
        translateY = clamp(translateY, minTranslateY, maxTranslateY);

        if (node) {
            this.setTransformMotionPreset(node, 'snap');
            node.style.transform = `translate(${translateX}px, ${translateY}px)`;
        }

        const widthBase = containerWidth || viewportWidth || region.width || 1;
        const heightBase = containerHeight || viewportHeight || region.height || 1;
        const snappedWidthPercent = Math.max(percentOf(region.width, widthBase), this.state.minWidth);
        const snappedHeightPercent = Math.max(percentOf(region.height, heightBase), this.state.minHeight);
        this.setState({
            snapPreview: null,
            snapPosition: null,
            snapped: resolvedPosition,
            lastSize: { width: previousWidth, height: previousHeight },
            width: snappedWidthPercent,
            height: snappedHeightPercent,
            preMaximizeBounds: null,
        }, () => {
            this.resizeBoundries();
            this.notifySizeChange();
        });
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
        const { width: viewportWidth, height: viewportHeight, left: viewportLeft, top: viewportTop } = getViewportMetrics();
        if (!viewportWidth || !viewportHeight) return;

        const horizontalThreshold = computeEdgeThreshold(viewportWidth);
        const verticalThreshold = computeEdgeThreshold(viewportHeight);
        const topInset = this.state.safeAreaTop ?? DEFAULT_WINDOW_TOP_OFFSET;
        const snapBottomInset = measureSnapBottomInset();
        const regions = computeSnapRegions(viewportWidth, viewportHeight, viewportLeft, viewportTop, topInset, snapBottomInset);

        const topEdge = viewportTop + topInset;
        const bottomEdge = viewportTop + viewportHeight;
        const leftEdge = viewportLeft;
        const rightEdge = viewportLeft + viewportWidth;

        const nearTop = rect.top <= topEdge + verticalThreshold;
        const nearBottom = bottomEdge - rect.bottom <= verticalThreshold;
        const nearLeft = rect.left - leftEdge <= horizontalThreshold;
        const nearRight = rightEdge - rect.right <= horizontalThreshold;

        let candidate = null;
        if (nearTop && nearLeft && regions['top-left'].width > 0 && regions['top-left'].height > 0) {
            candidate = { position: 'top-left', preview: regions['top-left'] };
        } else if (nearTop && nearRight && regions['top-right'].width > 0 && regions['top-right'].height > 0) {
            candidate = { position: 'top-right', preview: regions['top-right'] };
        } else if (nearBottom && nearLeft && regions['bottom-left'].width > 0 && regions['bottom-left'].height > 0) {
            candidate = { position: 'bottom-left', preview: regions['bottom-left'] };
        } else if (nearBottom && nearRight && regions['bottom-right'].width > 0 && regions['bottom-right'].height > 0) {
            candidate = { position: 'bottom-right', preview: regions['bottom-right'] };
        } else if (nearTop && regions.top.height > 0) {
            candidate = { position: 'top', preview: regions.top };
        } else if (nearLeft && regions.left.width > 0) {
            candidate = { position: 'left', preview: regions.left };
        } else if (nearRight && regions.right.width > 0) {
            candidate = { position: 'right', preview: regions.right };
        }

        const resolvedCandidate = normalizeRightCornerSnap(candidate, regions);
        if (resolvedCandidate) {
            const { position, preview } = resolvedCandidate;
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
        const viewportLeft = this.state.viewportOffset?.left ?? 0;
        const viewportTop = this.state.viewportOffset?.top ?? 0;
        const topBound = viewportTop + (this.state.safeAreaTop ?? 0);
        const maxX = viewportLeft + this.state.parentSize.width;
        const maxY = topBound + this.state.parentSize.height;

        const resist = (pos, min, max) => {
            if (max <= min) return min;
            if (pos < min) return min;
            if (pos < min + threshold) return min + (pos - min) * resistance;
            if (pos > max) return max;
            if (pos > max - threshold) return max - (max - pos) * resistance;
            return pos;
        }

        x = resist(x, viewportLeft, maxX);
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

    beginResize = (direction, event) => {
        if (this.props.resizable === false) return;
        if (this.state.maximized) return;
        if (!event || (typeof event.button === 'number' && event.button !== 0)) {
            return;
        }

        const node = this.getWindowNode();
        if (!node) return;

        const { width: viewportWidth, height: viewportHeight, left: viewportLeft, top: viewportTop } = getViewportMetrics();
        if (!viewportWidth || !viewportHeight) {
            return;
        }

        const rect = node.getBoundingClientRect();
        const storedX = parsePxValue(node.style?.getPropertyValue?.('--window-transform-x'));
        const storedY = parsePxValue(node.style?.getPropertyValue?.('--window-transform-y'));
        const baseX = storedX !== null ? storedX : rect.left;
        const baseY = storedY !== null ? storedY : rect.top;

        this.focusWindow();
        this.setState({
            resizing: direction,
            snapPreview: null,
            snapPosition: null,
            snapped: null,
            preMaximizeBounds: null,
        });

        this._resizeSession = {
            direction,
            pointerId: event.pointerId,
            startPointerX: event.clientX,
            startPointerY: event.clientY,
            startWidth: rect.width,
            startHeight: rect.height,
            startX: baseX,
            startY: baseY,
            currentX: baseX,
            currentY: baseY,
            viewportWidth,
            viewportHeight,
            viewportLeft,
            viewportTop,
            handle: event.currentTarget,
            didResize: false,
        };

        if (typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        if (typeof event.stopPropagation === 'function') {
            event.stopPropagation();
        }

        if (typeof event.currentTarget?.setPointerCapture === 'function' && typeof event.pointerId === 'number') {
            try {
                event.currentTarget.setPointerCapture(event.pointerId);
            } catch (error) {
                // Ignore pointer capture errors in unsupported environments
            }
        }

        window.addEventListener('pointermove', this.handleResizePointerMove, { passive: false });
        window.addEventListener('pointerup', this.handleResizePointerUp, true);
        window.addEventListener('pointercancel', this.handleResizePointerUp, true);
    }

    cancelResizeSession = () => {
        if (!this._resizeSession) return;
        window.removeEventListener('pointermove', this.handleResizePointerMove);
        window.removeEventListener('pointerup', this.handleResizePointerUp, true);
        window.removeEventListener('pointercancel', this.handleResizePointerUp, true);
        const handle = this._resizeSession.handle;
        if (handle && typeof handle.releasePointerCapture === 'function' && typeof this._resizeSession.pointerId === 'number') {
            try {
                handle.releasePointerCapture(this._resizeSession.pointerId);
            } catch (error) {
                // Ignore errors if pointer capture was not set
            }
        }
    }

    handleResizePointerMove = (event) => {
        if (!this._resizeSession) return;
        if (typeof this._resizeSession.pointerId === 'number' && event.pointerId !== this._resizeSession.pointerId) {
            return;
        }
        if (typeof event.preventDefault === 'function') {
            event.preventDefault();
        }

        const {
            direction,
            startPointerX,
            startPointerY,
            startWidth,
            startHeight,
            startX,
            startY,
            viewportWidth,
            viewportHeight,
            viewportLeft,
            viewportTop,
        } = this._resizeSession;

        if (!viewportWidth || !viewportHeight) {
            return;
        }

        const deltaX = event.clientX - startPointerX;
        const deltaY = event.clientY - startPointerY;

        const previousWidthPercent = this._resizeSession.currentWidth;
        const previousHeightPercent = this._resizeSession.currentHeight;
        const previousX = this._resizeSession.currentX;
        const previousY = this._resizeSession.currentY;

        const minWidthPx = Math.max((this.state.minWidth / 100) * viewportWidth, 1);
        const minHeightPx = Math.max((this.state.minHeight / 100) * viewportHeight, 1);

        let widthPx = startWidth;
        let heightPx = startHeight;
        let translateX = startX;
        let translateY = startY;

        if (direction.includes('e')) {
            widthPx = startWidth + deltaX;
        }
        if (direction.includes('s')) {
            heightPx = startHeight + deltaY;
        }
        if (direction.includes('w')) {
            widthPx = startWidth - deltaX;
            translateX = startX + deltaX;
        }
        if (direction.includes('n')) {
            heightPx = startHeight - deltaY;
            translateY = startY + deltaY;
        }

        widthPx = Math.max(widthPx, minWidthPx);
        heightPx = Math.max(heightPx, minHeightPx);

        if (direction.includes('w')) {
            translateX = startX + (startWidth - widthPx);
        }
        if (direction.includes('n')) {
            translateY = startY + (startHeight - heightPx);
        }

        const topOffset = this.state.safeAreaTop ?? DEFAULT_WINDOW_TOP_OFFSET;
        const bottomInset = Math.max(0, measureSafeAreaInset('bottom'));
        const snapBottomInset = measureSnapBottomInset();

        const clampedPosition = clampWindowPositionWithinViewport(
            { x: translateX, y: translateY },
            { width: widthPx, height: heightPx },
            {
                viewportWidth,
                viewportHeight,
                viewportLeft,
                viewportTop,
                topOffset,
                bottomInset,
                snapBottomInset,
            },
        );

        if (clampedPosition) {
            translateX = clampedPosition.x;
            translateY = clampedPosition.y;
        }

        const node = this.getWindowNode();
        if (node) {
            node.style.transform = `translate(${translateX}px, ${translateY}px)`;
            node.style.setProperty('--window-transform-x', `${translateX}px`);
            node.style.setProperty('--window-transform-y', `${translateY}px`);
        }

        const horizontalPercent = viewportWidth ? (widthPx / viewportWidth) * 100 : this.state.width;
        const verticalPercent = viewportHeight ? (heightPx / viewportHeight) * 100 : this.state.height;

        const clampedWidthPercent = Math.min(100, Math.max(horizontalPercent, this.state.minWidth));
        const clampedHeightPercent = Math.min(100, Math.max(verticalPercent, this.state.minHeight));

        this._resizeSession.currentX = translateX;
        this._resizeSession.currentY = translateY;
        this._resizeSession.currentWidth = clampedWidthPercent;
        this._resizeSession.currentHeight = clampedHeightPercent;

        const widthChanged = (direction.includes('e') || direction.includes('w'))
            ? (typeof previousWidthPercent === 'number'
                ? Math.abs(previousWidthPercent - clampedWidthPercent) > 0.05
                : true)
            : false;
        const heightChanged = (direction.includes('n') || direction.includes('s'))
            ? (typeof previousHeightPercent === 'number'
                ? Math.abs(previousHeightPercent - clampedHeightPercent) > 0.05
                : true)
            : false;
        const positionChanged = (typeof previousX === 'number' && typeof previousY === 'number')
            ? (Math.abs(previousX - translateX) > 0.5 || Math.abs(previousY - translateY) > 0.5)
            : true;

        if (!this._resizeSession.didResize) {
            this._resizeSession.didResize = widthChanged || heightChanged || positionChanged;
        }

        this.setState((prevState) => {
            const updates = { resizing: prevState.resizing ?? direction };
            let changed = false;
            if (direction.includes('e') || direction.includes('w')) {
                if (Math.abs(prevState.width - clampedWidthPercent) > 0.05) {
                    updates.width = clampedWidthPercent;
                    changed = true;
                }
            }
            if (direction.includes('n') || direction.includes('s')) {
                if (Math.abs(prevState.height - clampedHeightPercent) > 0.05) {
                    updates.height = clampedHeightPercent;
                    changed = true;
                }
            }
            if (!changed) {
                return null;
            }
            updates.preMaximizeBounds = null;
            return updates;
        });
    }

    handleResizePointerUp = (event) => {
        if (!this._resizeSession) return;
        if (typeof this._resizeSession.pointerId === 'number' && event.pointerId !== this._resizeSession.pointerId) {
            return;
        }

        const session = this._resizeSession;
        const didResize = session?.didResize;
        this.cancelResizeSession();
        this._resizeSession = null;

        this.setState({ resizing: null }, () => {
            if (didResize) {
                this.resizeBoundries();
                this.notifySizeChange();
            }
        });
    }

    focusWindow = () => {
        this.props.focus(this.id);
        const node = this.getWindowNode();
        if (!node || typeof node.focus !== 'function') return;
        const alreadyFocused = typeof document !== 'undefined' && document.activeElement === node;
        if (!alreadyFocused) {
            node.focus();
        }
    }

    handleTitleBarDoubleClick = (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (this.props.allowMaximize === false) return;
        if (this.state.maximized) {
            this.restoreWindow();
        } else {
            this.maximizeWindow();
        }
    }

    minimizeWindow = () => {
        this.setWinowsPosition();
        this.props.hasMinimised(this.id);
    }

    restoreWindow = () => {
        const node = this.getWindowNode();
        if (!node) return;
        const storedBounds = this.state.preMaximizeBounds;
        const hasStoredBounds = storedBounds
            && typeof storedBounds.width === 'number'
            && typeof storedBounds.height === 'number';

        const style = node.style;
        const fallbackX = style && typeof style.getPropertyValue === 'function'
            ? parsePxValue(style.getPropertyValue('--window-transform-x'))
            : null;
        const fallbackY = style && typeof style.getPropertyValue === 'function'
            ? parsePxValue(style.getPropertyValue('--window-transform-y'))
            : null;
        const safeTop = this.state.safeAreaTop ?? DEFAULT_WINDOW_TOP_OFFSET;
        const targetX = hasStoredBounds && Number.isFinite(storedBounds.x)
            ? storedBounds.x
            : (fallbackX !== null ? fallbackX : this.startX);
        const targetYRaw = hasStoredBounds && Number.isFinite(storedBounds.y)
            ? storedBounds.y
            : (fallbackY !== null ? fallbackY : this.startY);
        const targetY = clampWindowTopPosition(targetYRaw, safeTop);

        if (hasStoredBounds) {
            const width = Math.max(storedBounds.width, this.state.minWidth);
            const height = Math.max(storedBounds.height, this.state.minHeight);
            this.setState({
                width,
                height,
                maximized: false,
                preMaximizeBounds: null,
            }, () => {
                this.resizeBoundries();
                this.notifySizeChange();
            });
        } else {
            this.setDefaultWindowDimenstion();
            this.setState({ maximized: false, preMaximizeBounds: null });
        }

        const endTransform = `translate(${targetX}px,${targetY}px)`;
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.setTransformMotionPreset(node, 'restore');
        if (style && typeof style.setProperty === 'function') {
            style.setProperty('--window-transform-x', `${targetX}px`);
            style.setProperty('--window-transform-y', `${targetY}px`);
        } else if (style) {
            style['--window-transform-x'] = `${targetX}px`;
            style['--window-transform-y'] = `${targetY}px`;
        }
        if (prefersReducedMotion) {
            node.style.transform = endTransform;
            return;
        }

        node.style.transform = endTransform;
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
            const { height: viewportHeight, top: viewportTop } = getViewportMetrics();
            const measuredTopOffset = measureWindowTopOffset();
            const snapBottomInset = measureSnapBottomInset();
            const safeAreaBottom = Math.max(0, measureSafeAreaInset('bottom'));
            let containerTopOffset = measuredTopOffset;
            let translateBase = viewportTop + DESKTOP_TOP_PADDING;
            const offsetParent = node && node.offsetParent && typeof node.offsetParent.getBoundingClientRect === 'function'
                ? node.offsetParent
                : null;
            const parentRect = offsetParent?.getBoundingClientRect();
            if (parentRect) {
                const parentTopOffset = Math.max(parentRect.top - viewportTop, 0);
                containerTopOffset = Math.max(containerTopOffset, parentTopOffset);
                translateBase = parentRect.top;
            }
            const availableHeight = Math.max(
                0,
                viewportHeight - containerTopOffset - snapBottomInset - safeAreaBottom,
            );
            const heightPercent = percentOf(availableHeight, viewportHeight);
            const preBounds = this.getCurrentBounds();
            if (node) {
                this.setTransformMotionPreset(node, 'maximize');
                const translateYOffset = Math.max(0, (viewportTop + containerTopOffset) - translateBase);
                const transformValue = `translate(-1pt, ${translateYOffset}px)`;
                node.style.transform = transformValue;
                const { style } = node;
                if (style && typeof style.setProperty === 'function') {
                    style.setProperty('--window-transform-x', '-1pt');
                    style.setProperty('--window-transform-y', `${translateYOffset}px`);
                } else if (style) {
                    style['--window-transform-x'] = '-1pt';
                    style['--window-transform-y'] = `${translateYOffset}px`;
                }
            }
            this.setState({ maximized: true, height: heightPercent, width: 100.2, preMaximizeBounds: preBounds }, () => {
                this.notifySizeChange();
            });
        }
    }

    closeWindow = () => {
        this.setWinowsPosition();
        this.setState({ closed: true, preMaximizeBounds: null }, () => {
            this.deactivateOverlay();
            const prefersReducedMotion = typeof window !== 'undefined'
                && typeof window.matchMedia === 'function'
                && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const duration = readMotionDuration('--window-motion-duration-close', 180);
            const delay = prefersReducedMotion ? 0 : Math.max(0, Math.round(duration));
            if (this._closeTimeout) {
                clearScheduledTimeout(this._closeTimeout);
            }
            this._closeTimeout = scheduleTimeout(() => {
                const targetId = this.id ?? this.props.id;
                if (typeof this.props.closed === 'function' && targetId) {
                    this.props.closed(targetId);
                }
                this._closeTimeout = null;
            }, delay);
        });
    }

    handleTitleBarKeyDown = (e) => {
        const target = e.target;
        if (typeof Element !== 'undefined' && target instanceof Element) {
            if (target.closest('[data-window-controls]')) {
                return;
            }
        }
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
                this.setState(prev => ({
                    width: Math.max(prev.width - step, prev.minWidth),
                    preMaximizeBounds: null,
                }), () => {
                    this.resizeBoundries();
                    this.notifySizeChange();
                });
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                this.setState(prev => ({
                    width: Math.min(prev.width + step, 100),
                    preMaximizeBounds: null,
                }), () => {
                    this.resizeBoundries();
                    this.notifySizeChange();
                });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                this.setState(prev => ({
                    height: Math.max(prev.height - step, prev.minHeight),
                    preMaximizeBounds: null,
                }), () => {
                    this.resizeBoundries();
                    this.notifySizeChange();
                });
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                this.setState(prev => ({
                    height: Math.min(prev.height + step, 100),
                    preMaximizeBounds: null,
                }), () => {
                    this.resizeBoundries();
                    this.notifySizeChange();
                });
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
        const computedZIndex = typeof this.props.zIndex === 'number'
            ? this.props.zIndex
            : (this.props.isFocused ? 30 : 20);

        const snapGrid = this.getSnapGrid();

        const viewportLeft = this.state.viewportOffset?.left ?? 0;
        const viewportTop = this.state.viewportOffset?.top ?? 0;
        const boundsTop = viewportTop + this.state.safeAreaTop;
        const boundsRight = viewportLeft + this.state.parentSize.width;
        const boundsBottom = boundsTop + this.state.parentSize.height;

        const windowState = this.props.minimized
            ? 'minimized'
            : (this.state.maximized
                ? 'maximized'
                : (this.state.snapped
                    ? `snapped-${this.state.snapped}`
                    : 'active'));

        return (
            <>
                {this.state.snapPreview && (
                    <div
                        data-testid="snap-preview"
                        className={`fixed pointer-events-none z-40 transition-opacity ${styles.snapPreview} ${styles.snapPreviewGlass}`}
                        style={{
                            left: `${this.state.snapPreview.left}px`,
                            top: `${this.state.snapPreview.top}px`,
                            width: `${this.state.snapPreview.width}px`,
                            height: `${this.state.snapPreview.height}px`,
                            backdropFilter: 'brightness(1.1) saturate(1.2)',
                            WebkitBackdropFilter: 'brightness(1.1) saturate(1.2)'

                        }}
                        aria-live="polite"
                        aria-label={getSnapLabel(this.state.snapPosition)}
                        role="status"
                    >
                        <span className={styles.snapPreviewLabel} aria-hidden="true">
                            {getSnapLabel(this.state.snapPosition)}
                        </span>
                    </div>
                )}
                <Draggable
                    nodeRef={this.windowRef}
                    axis="both"
                    handle="[data-window-drag-handle]"
                    cancel={`.${styles.windowControls}`}
                    grid={this.props.snapEnabled ? snapGrid : [1, 1]}
                    scale={1}
                    onStart={this.changeCursorToMove}
                    onStop={this.handleStop}
                    onDrag={this.handleDrag}
                    allowAnyClick={false}
                    defaultPosition={{ x: this.startX, y: this.startY }}
                    bounds={{
                        left: viewportLeft - DRAG_BOUNDS_PADDING,
                        top: boundsTop - DRAG_BOUNDS_PADDING,
                        right: boundsRight + DRAG_BOUNDS_PADDING,
                        bottom: boundsBottom + DRAG_BOUNDS_PADDING,
                    }}
                >
                    <div
                        ref={this.windowRef}
                        style={{
                            position: 'absolute',
                            width: `${this.state.width}%`,
                            height: `${this.state.height}%`,
                            minWidth: `${this.state.minWidth}%`,
                            minHeight: `${this.state.minHeight}%`,
                            zIndex: computedZIndex,
                        }}
                        className={[
                            this.state.cursorType,
                            this.state.closed ? 'closed-window' : '',
                            this.props.minimized ? styles.windowFrameMinimized : '',
                            this.state.grabbed ? 'opacity-70' : '',
                            this.state.snapPreview ? 'ring-2 ring-blue-400' : '',
                            'opened-window overflow-hidden min-w-1/4 min-h-1/4 main-window absolute flex flex-col window-shadow',
                            styles.windowFrame,
                            this.props.isFocused ? styles.windowFrameActive : styles.windowFrameInactive,
                            this.state.maximized ? styles.windowFrameMaximized : '',
                            this.state.resizing ? styles.windowFrameResizing : '',
                        ].filter(Boolean).join(' ')}
                        id={this.id}
                        role="dialog"
                        data-window-state={windowState}
                        aria-hidden={this.props.minimized ? true : false}
                        aria-label={this.props.title}
                        tabIndex={0}
                        onKeyDown={this.handleKeyDown}
                        onPointerDown={this.focusWindow}
                        onFocus={this.focusWindow}
                    >
                        {this.props.resizable !== false && !this.state.maximized && (
                            <>
                                <WindowEdgeHandle direction="n" onResizeStart={this.beginResize} active={this.state.resizing === 'n'} />
                                <WindowEdgeHandle direction="s" onResizeStart={this.beginResize} active={this.state.resizing === 's'} />
                                <WindowEdgeHandle direction="e" onResizeStart={this.beginResize} active={this.state.resizing === 'e'} />
                                <WindowEdgeHandle direction="w" onResizeStart={this.beginResize} active={this.state.resizing === 'w'} />
                                <WindowCornerHandle direction="nw" onResizeStart={this.beginResize} active={this.state.resizing === 'nw'} />
                                <WindowCornerHandle direction="ne" onResizeStart={this.beginResize} active={this.state.resizing === 'ne'} />
                                <WindowCornerHandle direction="se" onResizeStart={this.beginResize} active={this.state.resizing === 'se'} />
                                <WindowCornerHandle direction="sw" onResizeStart={this.beginResize} active={this.state.resizing === 'sw'} />
                            </>
                        )}
                        <WindowTopBar
                            title={this.props.title}
                            onKeyDown={this.handleTitleBarKeyDown}
                            onBlur={this.releaseGrab}
                            grabbed={this.state.grabbed}
                            onPointerDown={this.focusWindow}
                            onDoubleClick={this.handleTitleBarDoubleClick}
                            controls={(
                                <WindowEditButtons
                                    minimize={this.minimizeWindow}
                                    maximize={this.maximizeWindow}
                                    isMaximised={this.state.maximized}
                                    close={this.closeWindow}
                                    id={this.id}
                                    allowMaximize={this.props.allowMaximize !== false}
                                />
                            )}
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
export function WindowTopBar({ title, onKeyDown, onBlur, grabbed, onPointerDown, onDoubleClick, controls }) {
    return (
        <div
            className={`${styles.windowTitlebar} bg-ub-window-title text-white select-none`}
            tabIndex={0}
            role="button"
            aria-grabbed={grabbed}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            onPointerDown={onPointerDown}
            onDoubleClick={onDoubleClick}
            data-window-titlebar=""
            data-window-drag-handle=""
        >
            <span className={styles.windowTitleBalancer} aria-hidden="true" />
            <div className={`${styles.windowTitle} text-sm font-bold`} title={title}>
                {title}
            </div>
            {controls}
        </div>
    )
}

// Window resize handles
const edgeDirectionClassMap = {
    n: styles.windowResizeHandleNorth,
    s: styles.windowResizeHandleSouth,
    e: styles.windowResizeHandleEast,
    w: styles.windowResizeHandleWest,
};

const cornerDirectionClassMap = {
    nw: styles.windowResizeHandleCornerNorthWest,
    ne: styles.windowResizeHandleCornerNorthEast,
    se: styles.windowResizeHandleCornerSouthEast,
    sw: styles.windowResizeHandleCornerSouthWest,
};

export function WindowEdgeHandle({ direction, onResizeStart, active }) {
    const handlePointerDown = useCallback((event) => {
        if (typeof onResizeStart === 'function') {
            onResizeStart(direction, event);
        }
    }, [direction, onResizeStart]);

    const classes = [
        styles.windowResizeHandle,
        styles.windowResizeHandleEdge,
        edgeDirectionClassMap[direction] || '',
        active ? styles.windowResizeHandleActive : '',
    ].filter(Boolean).join(' ');

    return (
        <div
            role="presentation"
            aria-hidden="true"
            tabIndex={-1}
            className={classes}
            data-resize-handle="edge"
            data-resize-direction={direction}
            onPointerDown={handlePointerDown}
        />
    );
}

export function WindowCornerHandle({ direction, onResizeStart, active }) {
    const handlePointerDown = useCallback((event) => {
        if (typeof onResizeStart === 'function') {
            onResizeStart(direction, event);
        }
    }, [direction, onResizeStart]);

    const classes = [
        styles.windowResizeHandle,
        styles.windowResizeHandleCorner,
        cornerDirectionClassMap[direction] || '',
        active ? styles.windowResizeHandleActive : '',
    ].filter(Boolean).join(' ');

    return (
        <div
            role="presentation"
            aria-hidden="true"
            tabIndex={-1}
            className={classes}
            data-resize-handle="corner"
            data-resize-direction={direction}
            onPointerDown={handlePointerDown}
        />
    );
}

// Window's Edit Buttons
export function WindowEditButtons(props) {
    const allowMaximize = props.allowMaximize !== false;
    const isMaximized = Boolean(props.isMaximised);
    const minimizeAriaLabel = 'Window minimize';
    const maximizeAriaLabel = isMaximized ? 'Restore window size' : 'Window maximize';
    const closeAriaLabel = 'Window close';
    const controlsRef = useRef(null);
    const [pressedControl, setPressedControl] = useState(null);
    const pointerActiveRef = useRef(null);

    useEffect(() => {
        const node = controlsRef.current;
        if (typeof window === 'undefined' || !node) {
            return undefined;
        }

        const titlebar = node.closest('[data-window-titlebar]');
        if (!titlebar) {
            return undefined;
        }

        const setWidth = () => {
            titlebar.style.setProperty('--window-controls-width', `${node.offsetWidth}px`);
        };

        setWidth();

        if (typeof ResizeObserver === 'function') {
            const observer = new ResizeObserver(() => setWidth());
            observer.observe(node);
            return () => {
                observer.disconnect();
                titlebar.style.removeProperty('--window-controls-width');
            };
        }

        const handleResize = () => setWidth();
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            titlebar.style.removeProperty('--window-controls-width');
        };
    }, []);

    const iconProps = {
        className: styles.windowControlIcon,
        viewBox: '0 0 16 16',
        'aria-hidden': true,
        focusable: 'false',
    };

    const MinimizeIcon = () => (
        <svg {...iconProps}>
            <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );

    const MaximizeIcon = () => (
        <svg {...iconProps}>
            <rect
                x="3"
                y="3"
                width="10"
                height="10"
                rx="1.6"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
            />
        </svg>
    );

    const RestoreIcon = () => (
        <svg {...iconProps}>
            <rect
                x="5"
                y="3"
                width="8"
                height="6.5"
                rx="1.4"
                stroke="currentColor"
                strokeWidth="1.2"
                fill="none"
            />
            <rect
                x="3"
                y="6.5"
                width="8"
                height="6.5"
                rx="1.4"
                stroke="currentColor"
                strokeWidth="1.2"
                fill="none"
            />
        </svg>
    );

    const CloseIcon = () => (
        <svg {...iconProps}>
            <line x1="4" y1="4" x2="12" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="12" y1="4" x2="4" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );

    const resetPressedControl = useCallback(() => {
        pointerActiveRef.current = null;
        setPressedControl(null);
    }, []);

    const handleMaximize = (event) => {
        if (!allowMaximize) {
            event?.preventDefault?.();
            return;
        }
        if (typeof props.maximize === 'function') {
            props.maximize(event);
        }
    };

    const handlePointerDown = useCallback((control) => (event) => {
        event.stopPropagation();
        pointerActiveRef.current = 'pointer';
        if (typeof event.pointerId === 'number' && typeof event.currentTarget?.setPointerCapture === 'function') {
            event.currentTarget.setPointerCapture(event.pointerId);
        }
        setPressedControl(control);
    }, []);

    const handlePointerUp = useCallback((control, handler) => (event) => {
        event.stopPropagation();
        if (typeof event.pointerId === 'number'
            && typeof event.currentTarget?.releasePointerCapture === 'function'
            && (!event.currentTarget.hasPointerCapture
                || event.currentTarget.hasPointerCapture(event.pointerId))) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        setPressedControl((current) => (current === control ? null : current));
        pointerActiveRef.current = 'pointer-handled';
        if (typeof handler === 'function') {
            handler(event);
        }
    }, []);

    const handleButtonClick = useCallback((handler) => (event) => {
        if (pointerActiveRef.current === 'pointer' || pointerActiveRef.current === 'pointer-handled') {
            pointerActiveRef.current = null;
            event.stopPropagation();
            event.preventDefault();
            return;
        }
        if (typeof handler === 'function') {
            handler(event);
        }
    }, []);

    return (
        <div
            ref={controlsRef}
            className={styles.windowControls}
            role="group"
            aria-label="Window controls"
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            data-window-controls=""
        >
            <button
                type="button"
                aria-label={minimizeAriaLabel}
                title="Minimize"
                className={`${styles.windowControlButton} ${pressedControl === 'minimize' ? styles.windowControlButtonPressed : ''}`.trim()}
                onPointerDown={handlePointerDown('minimize')}
                onPointerUp={handlePointerUp('minimize', props.minimize)}
                onPointerLeave={resetPressedControl}
                onPointerCancel={resetPressedControl}
                onBlur={resetPressedControl}
                onClick={handleButtonClick(props.minimize)}
            >
                <MinimizeIcon />
            </button>
            <button
                type="button"
                aria-label={maximizeAriaLabel}
                title={isMaximized ? 'Restore' : 'Maximize'}
                className={[
                    styles.windowControlButton,
                    allowMaximize ? '' : styles.windowControlButtonDisabled,
                    pressedControl === 'maximize' ? styles.windowControlButtonPressed : '',
                ].filter(Boolean).join(' ')}
                onClick={handleButtonClick(handleMaximize)}
                disabled={!allowMaximize}
                aria-disabled={!allowMaximize}
                onPointerDown={allowMaximize ? handlePointerDown('maximize') : undefined}
                onPointerUp={allowMaximize ? handlePointerUp('maximize', handleMaximize) : undefined}
                onPointerLeave={resetPressedControl}
                onPointerCancel={resetPressedControl}
                onBlur={resetPressedControl}
            >
                {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
            </button>
            <button
                type="button"
                id={`close-${props.id}`}
                aria-label={closeAriaLabel}
                title="Close"
                className={[styles.windowControlButton, styles.windowControlButtonClose, pressedControl === 'close' ? styles.windowControlButtonPressed : ''].filter(Boolean).join(' ')}
                onPointerDown={handlePointerDown('close')}
                onPointerUp={handlePointerUp('close', props.close)}
                onPointerLeave={resetPressedControl}
                onPointerCancel={resetPressedControl}
                onBlur={resetPressedControl}
                onClick={handleButtonClick(props.close)}
            >
                <CloseIcon />
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
