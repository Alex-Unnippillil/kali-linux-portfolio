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
    measureSnapBottomInset,
    measureWindowTopOffset,
} from '../../utils/windowLayout';
import styles from './window.module.css';
import { DESKTOP_TOP_PADDING, WINDOW_TOP_INSET } from '../../utils/uiConstants';

const EDGE_THRESHOLD_MIN = 48;
const EDGE_THRESHOLD_MAX = 160;
const EDGE_THRESHOLD_RATIO = 0.05;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const computeEdgeThreshold = (size) => clamp(size * EDGE_THRESHOLD_RATIO, EDGE_THRESHOLD_MIN, EDGE_THRESHOLD_MAX);

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
    topInset = DEFAULT_WINDOW_TOP_OFFSET,
    bottomInset,
) => {
    const normalizedTopInset = typeof topInset === 'number'
        ? Math.max(topInset, DESKTOP_TOP_PADDING)
        : DEFAULT_WINDOW_TOP_OFFSET;
    const safeBottom = Math.max(0, measureSafeAreaInset('bottom'));
    const snapBottomInset = typeof bottomInset === 'number' && Number.isFinite(bottomInset)
        ? Math.max(bottomInset, 0)
        : measureSnapBottomInset();
    const availableHeight = Math.max(0, viewportHeight - normalizedTopInset - snapBottomInset - safeBottom);
    const halfWidth = Math.max(viewportWidth / 2, 0);
    const halfHeight = Math.max(availableHeight / 2, 0);
    const rightStart = Math.max(viewportWidth - halfWidth, 0);
    const bottomStart = normalizedTopInset + halfHeight;

    return {
        left: { left: 0, top: normalizedTopInset, width: halfWidth, height: availableHeight },
        right: { left: rightStart, top: normalizedTopInset, width: halfWidth, height: availableHeight },
        top: { left: 0, top: normalizedTopInset, width: viewportWidth, height: availableHeight },
        'top-left': { left: 0, top: normalizedTopInset, width: halfWidth, height: halfHeight },
        'top-right': { left: rightStart, top: normalizedTopInset, width: halfWidth, height: halfHeight },
        'bottom-left': { left: 0, top: bottomStart, width: halfWidth, height: halfHeight },
        'bottom-right': { left: rightStart, top: bottomStart, width: halfWidth, height: halfHeight },

    };
};

const RESIZE_HANDLE_CONFIG = {
    n: {
        cursor: 'cursor-[ns-resize]',
        style: {
            top: '-6px',
            left: '50%',
            width: 'calc(100% - 16px)',
            height: '12px',
            transform: 'translate(-50%, 0)',
        },
    },
    s: {
        cursor: 'cursor-[ns-resize]',
        style: {
            bottom: '-6px',
            left: '50%',
            width: 'calc(100% - 16px)',
            height: '12px',
            transform: 'translate(-50%, 0)',
        },
    },
    e: {
        cursor: 'cursor-[ew-resize]',
        style: {
            right: '-6px',
            top: '50%',
            width: '12px',
            height: 'calc(100% - 16px)',
            transform: 'translate(0, -50%)',
        },
    },
    w: {
        cursor: 'cursor-[ew-resize]',
        style: {
            left: '-6px',
            top: '50%',
            width: '12px',
            height: 'calc(100% - 16px)',
            transform: 'translate(0, -50%)',
        },
    },
    ne: {
        cursor: 'cursor-[nesw-resize]',
        style: {
            top: '-6px',
            right: '-6px',
            width: '12px',
            height: '12px',
        },
    },
    nw: {
        cursor: 'cursor-[nwse-resize]',
        style: {
            top: '-6px',
            left: '-6px',
            width: '12px',
            height: '12px',
        },
    },
    se: {
        cursor: 'cursor-[nwse-resize]',
        style: {
            bottom: '-6px',
            right: '-6px',
            width: '12px',
            height: '12px',
        },
    },
    sw: {
        cursor: 'cursor-[nesw-resize]',
        style: {
            bottom: '-6px',
            left: '-6px',
            width: '12px',
            height: '12px',
        },
    },
};

const RESIZE_HANDLE_DIRS = Object.keys(RESIZE_HANDLE_CONFIG);

export class Window extends Component {
    static defaultProps = {
        snapGrid: [8, 8],
    };

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
            preMaximizeSize: null,
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
                { height: this.props.defaultHeight, width: this.props.defaultWidth, preMaximizeSize: null },
                () => {
                    this.resizeBoundries();
                    this.notifySizeChange();
                }
            );
            return;
        }

        const isPortrait = window.innerHeight > window.innerWidth;
        if (isPortrait) {
            this.startX = window.innerWidth * 0.05;
            this.setState({ height: 85, width: 90, preMaximizeSize: null }, () => {
                this.resizeBoundries();
                this.notifySizeChange();
            });
        } else if (window.innerWidth < 640) {
            this.setState({ height: 60, width: 85, preMaximizeSize: null }, () => {
                this.resizeBoundries();
                this.notifySizeChange();
            });
        } else {
            this.setState({ height: 85, width: 60, preMaximizeSize: null }, () => {
                this.resizeBoundries();
                this.notifySizeChange();
            });
        }
    }

    resizeBoundries = () => {
        const hasWindow = typeof window !== 'undefined';
        const visualViewport = hasWindow && window.visualViewport ? window.visualViewport : null;
        const viewportHeight = hasWindow
            ? (visualViewport?.height ?? window.innerHeight)
            : 0;
        const viewportWidth = hasWindow
            ? (visualViewport?.width ?? window.innerWidth)
            : 0;
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
                height: Math.max(prev.height - 1, 20),
                preMaximizeSize: null,
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

    handleVerticleResize = (nextHeightPx) => {
        if (this.props.resizable === false) return;
        if (typeof window === 'undefined') return;
        const viewportHeight = window.innerHeight || 0;
        if (!viewportHeight) return;
        const rawHeight = typeof nextHeightPx === 'number'
            ? clamp(nextHeightPx, 0, viewportHeight)
            : (this.state.height / 100) * viewportHeight;
        const snapped = this.snapToGrid(rawHeight, 'y');
        const minPercent = 20;
        const maxPercent = 100;
        const heightPercent = clamp(snapped / viewportHeight * 100, minPercent, maxPercent);
        this.setState({ height: heightPercent, preMaximizeSize: null }, () => {
            this.resizeBoundries();
            this.notifySizeChange();
        });
    }

    handleHorizontalResize = (nextWidthPx) => {
        if (this.props.resizable === false) return;
        if (typeof window === 'undefined') return;
        const viewportWidth = window.innerWidth || 0;
        if (!viewportWidth) return;
        const rawWidth = typeof nextWidthPx === 'number'
            ? clamp(nextWidthPx, 0, viewportWidth)
            : (this.state.width / 100) * viewportWidth;
        const snapped = this.snapToGrid(rawWidth, 'x');
        const minPercent = 20;
        const maxPercent = 100;
        const widthPercent = clamp(snapped / viewportWidth * 100, minPercent, maxPercent);
        this.setState({ width: widthPercent, preMaximizeSize: null }, () => {
            this.resizeBoundries();
            this.notifySizeChange();
        });
    }

    handleResizeStart = (dir) => {
        if (this.props.resizable === false) return null;
        if (this.state.maximized) return null;
        const node = this.getWindowNode();
        if (!node) return null;
        this.focusWindow();
        const rect = node.getBoundingClientRect();
        if (this.state.snapped) {
            this.setState({ snapped: null, snapPreview: null, snapPosition: null });
        }
        return rect;
    }

    handleResizeMove = (dir, { deltaX, deltaY, startRect }) => {
        if (this.props.resizable === false) return;
        if (typeof window === 'undefined') return;
        const node = this.getWindowNode();
        if (!node) return;
        const viewportWidth = window.innerWidth || 0;
        const viewportHeight = window.innerHeight || 0;
        if (!viewportWidth || !viewportHeight) return;

        const safeAreaTop = this.state.safeAreaTop ?? DEFAULT_WINDOW_TOP_OFFSET;
        const safeAreaBottom = Math.max(0, measureSafeAreaInset('bottom'));
        const snapBottomInset = measureSnapBottomInset();
        const bottomLimit = Math.max(safeAreaTop + 1, viewportHeight - snapBottomInset - safeAreaBottom);

        const baseRect = startRect || node.getBoundingClientRect();
        const startLeft = baseRect.left;
        const startTop = baseRect.top;
        const startWidth = baseRect.width;
        const startHeight = baseRect.height;
        const startRight = startLeft + startWidth;
        const startBottom = startTop + startHeight;

        const minWidthPercent = 20;
        const minHeightPercent = 20;
        const minWidthPx = viewportWidth * (minWidthPercent / 100);
        const minHeightPx = viewportHeight * (minHeightPercent / 100);

        let newLeft = startLeft;
        let newTop = startTop;
        let newWidth = startWidth;
        let newHeight = startHeight;

        if (dir.includes('w')) {
            const maxLeft = Math.min(startRight - minWidthPx, viewportWidth - minWidthPx);
            newLeft = clamp(startLeft + deltaX, 0, Math.max(maxLeft, 0));
            newWidth = startRight - newLeft;
        } else if (dir.includes('e')) {
            const maxWidth = Math.max(viewportWidth - startLeft, minWidthPx);
            newWidth = clamp(startWidth + deltaX, minWidthPx, maxWidth);
        }

        if (dir.includes('n')) {
            const maxTop = Math.min(startBottom - minHeightPx, bottomLimit - minHeightPx);
            newTop = clamp(startTop + deltaY, safeAreaTop, Math.max(maxTop, safeAreaTop));
            newHeight = startBottom - newTop;
        } else if (dir.includes('s')) {
            const maxHeight = Math.max(bottomLimit - startTop, minHeightPx);
            newHeight = clamp(startHeight + deltaY, minHeightPx, maxHeight);
        }

        if (!dir.includes('w')) {
            const maxWidth = Math.max(viewportWidth - newLeft, minWidthPx);
            newWidth = clamp(newWidth, minWidthPx, maxWidth);
        }
        if (!dir.includes('n')) {
            const maxHeight = Math.max(bottomLimit - newTop, minHeightPx);
            newHeight = clamp(newHeight, minHeightPx, maxHeight);
        }

        newLeft = clamp(newLeft, 0, Math.max(viewportWidth - newWidth, 0));
        newTop = clamp(newTop, safeAreaTop, Math.max(bottomLimit - newHeight, safeAreaTop));

        node.style.transform = `translate(${newLeft}px, ${newTop}px)`;

        if (dir.includes('e') || dir.includes('w')) {
            this.handleHorizontalResize(newWidth);
        }
        if (dir.includes('n') || dir.includes('s')) {
            this.handleVerticleResize(newHeight);
        }
    }

    handleResizeEnd = () => {
        this.setWinowsPosition();
    }

    setWinowsPosition = () => {
        const node = this.getWindowNode();
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const topInset = this.state.safeAreaTop ?? DEFAULT_WINDOW_TOP_OFFSET;
        const snappedX = this.snapToGrid(rect.x, 'x');
        const relativeY = rect.y - topInset;
        const snappedRelativeY = this.snapToGrid(relativeY, 'y');
        const absoluteY = clampWindowTopPosition(snappedRelativeY + topInset, topInset);
        node.style.setProperty('--window-transform-x', `${snappedX.toFixed(1)}px`);
        node.style.setProperty('--window-transform-y', `${absoluteY.toFixed(1)}px`);

        if (this.props.onPositionChange) {
            this.props.onPositionChange(snappedX, absoluteY);
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
            this.setState({
                width: this.state.lastSize.width,
                height: this.state.lastSize.height,
                snapped: null,
                preMaximizeSize: null,
            }, () => {
                this.resizeBoundries();
                this.notifySizeChange();
            });
        } else {
            this.setState({ snapped: null, preMaximizeSize: null }, () => {
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
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
        const topInset = this.state.safeAreaTop ?? DEFAULT_WINDOW_TOP_OFFSET;
        if (!viewportWidth || !viewportHeight) return;
        const snapBottomInset = measureSnapBottomInset();
        const regions = computeSnapRegions(viewportWidth, viewportHeight, topInset, snapBottomInset);
        const region = regions[resolvedPosition];
        if (!region) return;
        const { width, height } = this.state;
        const node = this.getWindowNode();
        if (node) {
            this.setTransformMotionPreset(node, 'snap');
            node.style.transform = `translate(${region.left}px, ${region.top}px)`;
        }
        this.setState({
            snapPreview: null,
            snapPosition: null,
            snapped: resolvedPosition,
            lastSize: { width, height },
            width: percentOf(region.width, viewportWidth),
            height: percentOf(region.height, viewportHeight),
            preMaximizeSize: null,
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
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
        if (!viewportWidth || !viewportHeight) return;

        const horizontalThreshold = computeEdgeThreshold(viewportWidth);
        const verticalThreshold = computeEdgeThreshold(viewportHeight);
        const topInset = this.state.safeAreaTop ?? DEFAULT_WINDOW_TOP_OFFSET;
        const snapBottomInset = measureSnapBottomInset();
        const regions = computeSnapRegions(viewportWidth, viewportHeight, topInset, snapBottomInset);

        const nearTop = rect.top <= topInset + verticalThreshold;
        const nearBottom = viewportHeight - rect.bottom <= verticalThreshold;
        const nearLeft = rect.left <= horizontalThreshold;
        const nearRight = viewportWidth - rect.right <= horizontalThreshold;

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
        const storedSize = this.state.preMaximizeSize;
        const hasStoredSize = storedSize && typeof storedSize.width === 'number' && typeof storedSize.height === 'number';

        if (hasStoredSize) {
            this.setState({
                width: storedSize.width,
                height: storedSize.height,
                maximized: false,
                preMaximizeSize: null,
            }, () => {
                this.resizeBoundries();
                this.notifySizeChange();
            });
        } else {
            this.setDefaultWindowDimenstion();
            this.setState({ maximized: false, preMaximizeSize: null });
        }
        // get previous position
        const posx = node.style.getPropertyValue("--window-transform-x") || `${this.startX}px`;
        const posy = node.style.getPropertyValue("--window-transform-y") || `${this.startY}px`;
        const endTransform = `translate(${posx},${posy})`;
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.setTransformMotionPreset(node, 'restore');
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
            const viewportHeight = window.innerHeight;
            const topOffset = measureWindowTopOffset();
            const snapBottomInset = measureSnapBottomInset();
            const availableHeight = Math.max(
                0,
                viewportHeight - topOffset - snapBottomInset - Math.max(0, measureSafeAreaInset('bottom')),
            );
            const heightPercent = percentOf(availableHeight, viewportHeight);
            const currentSize = { width: this.state.width, height: this.state.height };
            if (node) {
                this.setTransformMotionPreset(node, 'maximize');
                const translateYOffset = topOffset - DESKTOP_TOP_PADDING;
                node.style.transform = `translate(-1pt, ${translateYOffset}px)`;
            }
            this.setState({ maximized: true, height: heightPercent, width: 100.2, preMaximizeSize: currentSize }, () => {
                this.notifySizeChange();
            });
        }
    }

    closeWindow = () => {
        this.setWinowsPosition();
        this.setState({ closed: true, preMaximizeSize: null }, () => {
            this.deactivateOverlay();
            setTimeout(() => {
                const targetId = this.id ?? this.props.id;
                if (typeof this.props.closed === 'function' && targetId) {
                    this.props.closed(targetId);
                }
            }, 300); // after 300ms this window will be unmounted from parent (Desktop)
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
                this.setState(prev => ({ width: Math.max(prev.width - step, 20), preMaximizeSize: null }), this.resizeBoundries);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                this.setState(prev => ({ width: Math.min(prev.width + step, 100), preMaximizeSize: null }), this.resizeBoundries);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                this.setState(prev => ({ height: Math.max(prev.height - step, 20), preMaximizeSize: null }), this.resizeBoundries);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                this.setState(prev => ({ height: Math.min(prev.height + step, 100), preMaximizeSize: null }), this.resizeBoundries);
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
                    handle=".bg-ub-window-title"
                    grid={this.props.snapEnabled ? snapGrid : [1, 1]}
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
                        style={{ position: 'absolute', width: `${this.state.width}%`, height: `${this.state.height}%`, zIndex: computedZIndex }}
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
                        {this.props.resizable !== false && RESIZE_HANDLE_DIRS.map((dir) => (
                            <ResizeHandle
                                key={dir}
                                dir={dir}
                                windowRef={this.windowRef}
                                onResizeStart={this.handleResizeStart}
                                onResizeMove={this.handleResizeMove}
                                onResizeEnd={this.handleResizeEnd}
                            />
                        ))}
                        <WindowTopBar
                            title={this.props.title}
                            onKeyDown={this.handleTitleBarKeyDown}
                            onBlur={this.releaseGrab}
                            grabbed={this.state.grabbed}
                            onPointerDown={this.focusWindow}
                            onDoubleClick={this.handleTitleBarDoubleClick}
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

export function ResizeHandle({ dir, windowRef, onResizeStart, onResizeMove, onResizeEnd }) {
    const pointerIdRef = React.useRef(null);
    const startPointRef = React.useRef({ x: 0, y: 0 });
    const startRectRef = React.useRef(null);

    const handlePointerDown = React.useCallback((event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (!windowRef?.current) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = typeof onResizeStart === 'function' ? onResizeStart(dir, event) : null;
        if (!rect) return;
        pointerIdRef.current = event.pointerId;
        startPointRef.current = { x: event.clientX, y: event.clientY };
        startRectRef.current = rect;
        event.currentTarget.setPointerCapture(event.pointerId);
    }, [dir, onResizeStart, windowRef]);

    const handlePointerMove = React.useCallback((event) => {
        if (pointerIdRef.current !== event.pointerId) return;
        if (!startRectRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        if (typeof onResizeMove === 'function') {
            onResizeMove(dir, {
                deltaX: event.clientX - startPointRef.current.x,
                deltaY: event.clientY - startPointRef.current.y,
                startRect: startRectRef.current,
                event,
            });
        }
    }, [dir, onResizeMove]);

    const endPointerInteraction = React.useCallback((event) => {
        if (pointerIdRef.current !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        pointerIdRef.current = null;
        startPointRef.current = { x: 0, y: 0 };
        startRectRef.current = null;
        if (typeof onResizeEnd === 'function') {
            onResizeEnd(dir);
        }
    }, [dir, onResizeEnd]);

    const config = RESIZE_HANDLE_CONFIG[dir] || { cursor: '', style: {} };
    const style = {
        ...config.style,
        touchAction: 'none',
    };

    return (
        <div
            role="presentation"
            data-resize-handle={dir}
            className={`${styles.resizeHandle} ${config.cursor}`.trim()}
            style={style}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointerInteraction}
            onPointerCancel={endPointerInteraction}
        />
    );
}

// Window's title bar
export function WindowTopBar({ title, onKeyDown, onBlur, grabbed, onPointerDown, onDoubleClick }) {
    return (
        <div
            className={`${styles.windowTitlebar} relative bg-ub-window-title px-3 text-white w-full select-none flex items-center`}
            tabIndex={0}
            role="button"
            aria-grabbed={grabbed}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            onPointerDown={onPointerDown}
            onDoubleClick={onDoubleClick}
        >
            <div className="flex justify-center w-full text-sm font-bold">{title}</div>
        </div>
    )
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
                    className={`${styles.windowControlButton} mx-1 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-6 w-6`}
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
                className={`${styles.windowControlButton} mx-1 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-6 w-6`}
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
                            className={`${styles.windowControlButton} mx-1 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-6 w-6`}
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
                            className={`${styles.windowControlButton} mx-1 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-6 w-6`}
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
                className={`${styles.windowControlButton} mx-1 cursor-default bg-ub-cool-grey bg-opacity-90 hover:bg-opacity-100 rounded-full flex justify-center items-center h-6 w-6`}
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
