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
import { safeLocalStorage } from '../../utils/safeStorage';

const EDGE_THRESHOLD_MIN = 48;
const EDGE_THRESHOLD_MAX = 160;
const EDGE_THRESHOLD_RATIO = 0.05;
const HINT_AUTO_HIDE_MS = 9000;
const SNAP_HINT_STORAGE_KEY = 'window-hint:snap';
const RESIZE_HINT_STORAGE_KEY = 'window-hint:resize';

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

const WindowHint = ({ id, text, visible, className }) => (
    <>
        <span id={id} className="sr-only">
            {text}
        </span>
        {visible ? (
            <div
                aria-hidden="true"
                className={`pointer-events-none absolute z-50 max-w-[18rem] rounded-md border border-slate-500/70 bg-slate-900/95 px-3 py-2 text-xs leading-snug text-slate-100 shadow-xl ${className}`}
            >
                {text}
            </div>
        ) : null}
    </>
);

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
            showSnapHint: false,
            showResizeHint: false,
        }
        this.windowRef = React.createRef();
        this._usageTimeout = null;
        this._uiExperiments = process.env.NEXT_PUBLIC_UI_EXPERIMENTS === 'true';
        this._menuOpener = null;
        this._snapHintTimeout = null;
        this._resizeHintTimeout = null;
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
        this.initializeFirstUseHints();
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
        this.clearHintTimers();
    }

    initializeFirstUseHints = () => {
        if (typeof window === 'undefined') return;

        const snapSeen = safeLocalStorage?.getItem(SNAP_HINT_STORAGE_KEY) === 'true';
        const resizeSeen = safeLocalStorage?.getItem(RESIZE_HINT_STORAGE_KEY) === 'true';
        const updates = {};

        if (!snapSeen) {
            updates.showSnapHint = true;
        }

        if (this.props.resizable !== false && !resizeSeen) {
            updates.showResizeHint = true;
        }

        const hasUpdates = Object.keys(updates).length > 0;

        if (hasUpdates) {
            this.setState(updates, () => {
                this.scheduleHintAutoHide();
            });
        }

        try {
            if (!snapSeen) {
                safeLocalStorage?.setItem(SNAP_HINT_STORAGE_KEY, 'true');
            }
            if (this.props.resizable !== false && !resizeSeen) {
                safeLocalStorage?.setItem(RESIZE_HINT_STORAGE_KEY, 'true');
            }
        } catch (error) {
            // Ignore storage failures in restricted environments.
        }
    }

    scheduleHintAutoHide = () => {
        if (typeof window === 'undefined') return;

        if (this.state.showSnapHint && !this._snapHintTimeout) {
            this._snapHintTimeout = window.setTimeout(() => {
                this._snapHintTimeout = null;
                this.setState({ showSnapHint: false });
            }, HINT_AUTO_HIDE_MS);
        }

        if (this.state.showResizeHint && !this._resizeHintTimeout) {
            this._resizeHintTimeout = window.setTimeout(() => {
                this._resizeHintTimeout = null;
                this.setState({ showResizeHint: false });
            }, HINT_AUTO_HIDE_MS);
        }
    }

    clearHintTimers = () => {
        if (this._snapHintTimeout) {
            clearTimeout(this._snapHintTimeout);
            this._snapHintTimeout = null;
        }
        if (this._resizeHintTimeout) {
            clearTimeout(this._resizeHintTimeout);
            this._resizeHintTimeout = null;
        }
    }

    dismissSnapHint = () => {
        if (this._snapHintTimeout) {
            clearTimeout(this._snapHintTimeout);
            this._snapHintTimeout = null;
        }
        if (this.state.showSnapHint) {
            this.setState({ showSnapHint: false });
        }
    }

    dismissResizeHint = () => {
        if (this._resizeHintTimeout) {
            clearTimeout(this._resizeHintTimeout);
            this._resizeHintTimeout = null;
        }
        if (this.state.showResizeHint) {
            this.setState({ showResizeHint: false });
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
        this.dismissSnapHint();
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

    handleTitleBarPointerDown = () => {
        this.dismissSnapHint();
        this.focusWindow();
    }

    handleTitleBarFocus = () => {
        this.dismissSnapHint();
        this.focusWindow();
    }

    handleResizeHandlePointerDown = () => {
        this.dismissResizeHint();
        this.focusWindow();
    }

    handleResizeHandleFocus = () => {
        this.dismissResizeHint();
        this.focusWindow();
    }

    handleWindowPointerDown = () => {
        this.dismissSnapHint();
        this.dismissResizeHint();
        this.focusWindow();
    }

    handleWindowFocus = () => {
        this.dismissSnapHint();
        this.dismissResizeHint();
        this.focusWindow();
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

    handleVerticleResize = () => {
        if (this.props.resizable === false) return;
        this.dismissResizeHint();
        const px = (this.state.height / 100) * window.innerHeight + 1;
        const snapped = this.snapToGrid(px, 'y');
        const heightPercent = snapped / window.innerHeight * 100;
        this.setState({ height: heightPercent, preMaximizeSize: null }, () => {
            this.resizeBoundries();
            this.notifySizeChange();
        });
    }

    handleHorizontalResize = () => {
        if (this.props.resizable === false) return;
        this.dismissResizeHint();
        const px = (this.state.width / 100) * window.innerWidth + 1;
        const snapped = this.snapToGrid(px, 'x');
        const widthPercent = snapped / window.innerWidth * 100;
        this.setState({ width: widthPercent, preMaximizeSize: null }, () => {
            this.resizeBoundries();
            this.notifySizeChange();
        });
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
        this.dismissSnapHint();
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
            this.dismissSnapHint();
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
            this.dismissResizeHint();
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
        this.dismissSnapHint();
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

        const windowId = this.id || this.props.id || 'window';
        const snapHintId = `${windowId}-snap-hint`;
        const canResize = this.props.resizable !== false;
        const resizeHintId = canResize ? `${windowId}-resize-hint` : undefined;
        const snapHintText = 'Drag the title bar to move the window. Press Alt plus the Arrow keys to snap it to screen edges.';
        const resizeHintText = 'Drag the window edges to resize. Press Shift plus the Arrow keys to resize with the keyboard.';

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
                        id={windowId}
                        role="dialog"
                        data-window-state={windowState}
                        aria-hidden={this.props.minimized ? true : false}
                        aria-label={this.props.title}
                        tabIndex={0}
                        onKeyDown={this.handleKeyDown}
                        onPointerDown={this.handleWindowPointerDown}
                        onFocus={this.handleWindowFocus}
                    >
                        <WindowHint
                            id={snapHintId}
                            text={snapHintText}
                            visible={this.state.showSnapHint}
                            className="left-1/2 top-9 -translate-x-1/2"
                        />
                        {canResize ? (
                            <WindowHint
                                id={resizeHintId}
                                text={resizeHintText}
                                visible={this.state.showResizeHint}
                                className="bottom-6 right-4"
                            />
                        ) : null}
                        {canResize && (
                            <WindowYBorder
                                resize={this.handleHorizontalResize}
                                describedBy={resizeHintId}
                                onPointerDown={this.handleResizeHandlePointerDown}
                                onFocus={this.handleResizeHandleFocus}
                                onKeyDown={this.handleKeyDown}
                            />
                        )}
                        {canResize && (
                            <WindowXBorder
                                resize={this.handleVerticleResize}
                                describedBy={resizeHintId}
                                onPointerDown={this.handleResizeHandlePointerDown}
                                onFocus={this.handleResizeHandleFocus}
                                onKeyDown={this.handleKeyDown}
                            />
                        )}
                        <WindowTopBar
                            title={this.props.title}
                            onKeyDown={this.handleTitleBarKeyDown}
                            onBlur={this.releaseGrab}
                            grabbed={this.state.grabbed}
                            onPointerDown={this.handleTitleBarPointerDown}
                            onFocus={this.handleTitleBarFocus}
                            onDoubleClick={this.handleTitleBarDoubleClick}
                            describedBy={snapHintId}
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
export function WindowTopBar({ title, onKeyDown, onBlur, grabbed, onPointerDown, onDoubleClick, onFocus, describedBy }) {
    return (
        <div
            className={`${styles.windowTitlebar} relative bg-ub-window-title px-3 text-white w-full select-none flex items-center`}
            tabIndex={0}
            role="button"
            aria-grabbed={grabbed}
            aria-describedby={describedBy}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            onPointerDown={onPointerDown}
            onFocus={onFocus}
            onDoubleClick={onDoubleClick}
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
                    draggable
                    role="separator"
                    aria-orientation="vertical"
                    tabIndex={0}
                    aria-label="Resize window width"
                    aria-describedby={this.props.describedBy}
                    onPointerDown={this.props.onPointerDown}
                    onFocus={this.props.onFocus}
                    onKeyDown={this.props.onKeyDown}
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
                    draggable
                    role="separator"
                    aria-orientation="horizontal"
                    tabIndex={0}
                    aria-label="Resize window height"
                    aria-describedby={this.props.describedBy}
                    onPointerDown={this.props.onPointerDown}
                    onFocus={this.props.onFocus}
                    onKeyDown={this.props.onKeyDown}
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
