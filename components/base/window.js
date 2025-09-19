"use client";

import React, { Component } from 'react';
import NextImage from 'next/image';
import Draggable from 'react-draggable';
import Settings from '../apps/settings';
import ReactGA from 'react-ga4';
import useDocPiP from '../../hooks/useDocPiP';
import WindowOutline from './window-outline';

const MIN_WIDTH_PERCENT = 20;
const MIN_HEIGHT_PERCENT = 20;
const PT_TO_PX = 96 / 72;

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
            isResizing: false,
            outlineBounds: null,
        }
        this._usageTimeout = null;
        this._uiExperiments = process.env.NEXT_PUBLIC_UI_EXPERIMENTS === 'true';
        this._menuOpener = null;
        this._resizeInfo = null;
        this._resizeFrameId = null;
        this._lastResizeFrame = null;
        this.draggableRef = null;
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
        this.removeResizeListeners();
        if (this._resizeFrameId && typeof window !== 'undefined') {
            cancelAnimationFrame(this._resizeFrameId);
            this._resizeFrameId = null;
        }
        this._resizeInfo = null;
        this._lastResizeFrame = null;
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
        this.setState({ cursorType: "cursor-move", grabbed: true })
    }

    changeCursorToDefault = () => {
        this.setState({ cursorType: "cursor-default", grabbed: false })
    }

    snapToGrid = (value) => {
        if (!this.props.snapEnabled) return value;
        return Math.round(value / 8) * 8;
    }

    setDraggableRef = (instance) => {
        this.draggableRef = instance;
    }

    removeResizeListeners = () => {
        if (typeof window === 'undefined') return;
        window.removeEventListener('pointermove', this.handleResizeMove);
        window.removeEventListener('pointerup', this.handleResizeEnd);
        window.removeEventListener('pointercancel', this.handleResizeEnd);
    }

    getCursorForHandle = (handle) => {
        if (handle === 'top' || handle === 'bottom') {
            return 'cursor-ns-resize';
        }
        if (handle === 'left' || handle === 'right') {
            return 'cursor-ew-resize';
        }
        if (handle === 'top-left' || handle === 'bottom-right') {
            return 'cursor-nwse-resize';
        }
        if (handle === 'top-right' || handle === 'bottom-left') {
            return 'cursor-nesw-resize';
        }
        return 'cursor-default';
    }

    getNodeTranslation = (node) => {
        if (typeof window === 'undefined' || !node) {
            return { x: 0, y: 0 };
        }
        const style = window.getComputedStyle(node);
        const transform = style.transform || node.style.transform;
        if (!transform || transform === 'none') {
            return { x: 0, y: 0 };
        }
        if (typeof window.DOMMatrixReadOnly === 'function') {
            try {
                const matrix = new window.DOMMatrixReadOnly(transform);
                return { x: matrix.m41, y: matrix.m42 };
            } catch (error) {
                // continue to regex parsing fallback
            }
        }
        const translateMatch = /translate(?:3d)?\(([-\d.]+)(px|pt)?[,\s]+([-\d.]+)(px|pt)?/i.exec(transform);
        if (translateMatch) {
            const [, rawX, unitX, rawY, unitY] = translateMatch;
            const convert = (value, unit) => {
                const numeric = parseFloat(value);
                if (!Number.isFinite(numeric)) return 0;
                if (unit && unit.toLowerCase() === 'pt') {
                    return numeric * PT_TO_PX;
                }
                return numeric;
            };
            return {
                x: convert(rawX, unitX),
                y: convert(rawY, unitY)
            };
        }
        const matrixMatch = /matrix\(([^)]+)\)/.exec(transform);
        if (matrixMatch) {
            const values = matrixMatch[1].split(',').map(v => v.trim());
            if (values.length >= 6) {
                const x = parseFloat(values[4]) || 0;
                const y = parseFloat(values[5]) || 0;
                return { x, y };
            }
        }
        return { x: 0, y: 0 };
    }

    applyResizeFrame = () => {
        if (!this._lastResizeFrame) return;
        const frame = this._lastResizeFrame;
        if (this.draggableRef && typeof this.draggableRef.setState === 'function') {
            this.draggableRef.setState({ x: frame.translateX, y: frame.translateY, slackX: 0, slackY: 0 });
        }
        this.setState({
            width: frame.widthPercent,
            height: frame.heightPercent,
            outlineBounds: frame.outlineBounds
        });
    }

    scheduleResizeUpdate = (frame) => {
        this._lastResizeFrame = frame;
        if (typeof window === 'undefined') {
            this.applyResizeFrame();
            return;
        }
        if (this._resizeFrameId !== null) return;
        this._resizeFrameId = window.requestAnimationFrame(() => {
            this._resizeFrameId = null;
            this.applyResizeFrame();
        });
    }

    startResize = (handle, event) => {
        if (this.props.resizable === false) return;
        if (typeof window === 'undefined') return;
        event.preventDefault();
        event.stopPropagation();

        const node = document.getElementById(this.id);
        if (!node) return;

        this.focusWindow();

        const rect = node.getBoundingClientRect();
        const translation = this.getNodeTranslation(node);
        const baseTranslateX = Number.isFinite(translation.x) ? translation.x : (this.draggableRef?.state?.x || 0);
        const baseTranslateY = Number.isFinite(translation.y) ? translation.y : (this.draggableRef?.state?.y || 0);

        this._resizeInfo = {
            handle,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startRect: rect,
            baseTranslateX,
            baseTranslateY,
            snapped: this.state.snapped,
            aspectRatio: rect.height > 0 ? rect.width / rect.height : 0,
        };

        const widthPercent = (rect.width / window.innerWidth) * 100;
        const heightPercent = (rect.height / window.innerHeight) * 100;

        this._lastResizeFrame = {
            widthPercent,
            heightPercent,
            translateX: baseTranslateX,
            translateY: baseTranslateY,
            outlineBounds: {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
            },
        };

        this.setState({
            cursorType: this.getCursorForHandle(handle),
            isResizing: true,
            outlineBounds: this._lastResizeFrame.outlineBounds,
        });

        window.addEventListener('pointermove', this.handleResizeMove);
        window.addEventListener('pointerup', this.handleResizeEnd);
        window.addEventListener('pointercancel', this.handleResizeEnd);
    }

    handleResizeMove = (event) => {
        if (!this._resizeInfo || event.pointerId !== this._resizeInfo.pointerId) return;
        if (typeof window === 'undefined') return;
        event.preventDefault();

        const info = this._resizeInfo;
        const dx = event.clientX - info.startX;
        const dy = event.clientY - info.startY;

        let left = info.startRect.left;
        let right = info.startRect.right;
        let top = info.startRect.top;
        let bottom = info.startRect.bottom;

        const minWidth = (this.props.minWidthPercent ?? MIN_WIDTH_PERCENT) / 100 * window.innerWidth;
        const minHeight = (this.props.minHeightPercent ?? MIN_HEIGHT_PERCENT) / 100 * window.innerHeight;

        if (info.handle.includes('left')) {
            const proposedLeft = left + dx;
            const maxLeft = right - minWidth;
            left = Math.min(Math.max(proposedLeft, 0), maxLeft);
        }
        if (info.handle.includes('right')) {
            const proposedRight = right + dx;
            const minRight = left + minWidth;
            right = Math.max(Math.min(proposedRight, window.innerWidth), minRight);
        }
        if (info.handle.includes('top')) {
            const proposedTop = top + dy;
            const maxTop = bottom - minHeight;
            top = Math.min(Math.max(proposedTop, 0), maxTop);
        }
        if (info.handle.includes('bottom')) {
            const proposedBottom = bottom + dy;
            const minBottom = top + minHeight;
            bottom = Math.max(Math.min(proposedBottom, window.innerHeight), minBottom);
        }

        let width = right - left;
        let height = bottom - top;

        if (info.snapped && info.aspectRatio) {
            const ratio = info.aspectRatio;
            const startWidth = info.startRect.width;
            const startHeight = info.startRect.height;
            const widthScale = startWidth === 0 ? 1 : width / startWidth;
            const heightScale = startHeight === 0 ? 1 : height / startHeight;
            const horizontalActive = info.handle.includes('left') || info.handle.includes('right');
            const verticalActive = info.handle.includes('top') || info.handle.includes('bottom');

            let scale = widthScale;
            if (!horizontalActive && verticalActive) {
                scale = heightScale;
            } else if (horizontalActive && !verticalActive) {
                scale = widthScale;
            } else if (horizontalActive && verticalActive) {
                scale = Math.abs(widthScale - 1) >= Math.abs(heightScale - 1) ? widthScale : heightScale;
            }
            if (!Number.isFinite(scale) || scale <= 0) {
                scale = 1;
            }

            let newWidth = Math.max(minWidth, startWidth * scale);
            let newHeight = Math.max(minHeight, startHeight * scale);

            if (horizontalActive && !verticalActive) {
                newHeight = Math.max(minHeight, newWidth / ratio);
            } else if (verticalActive && !horizontalActive) {
                newWidth = Math.max(minWidth, newHeight * ratio);
            } else {
                newHeight = Math.max(minHeight, newWidth / ratio);
                newWidth = Math.max(minWidth, newHeight * ratio);
            }

            if (newHeight < minHeight) {
                newHeight = minHeight;
                newWidth = Math.max(minWidth, newHeight * ratio);
            }
            if (newWidth < minWidth) {
                newWidth = minWidth;
                newHeight = Math.max(minHeight, newWidth / ratio);
            }

            const anchorLeft = info.handle.includes('right') ? info.startRect.left : null;
            const anchorRight = info.handle.includes('left') ? info.startRect.right : null;
            const anchorTop = info.handle.includes('bottom') ? info.startRect.top : null;
            const anchorBottom = info.handle.includes('top') ? info.startRect.bottom : null;

            if (anchorRight !== null) {
                right = anchorRight;
                left = right - newWidth;
            } else if (anchorLeft !== null) {
                left = anchorLeft;
                right = left + newWidth;
            } else {
                left = info.startRect.left;
                right = left + newWidth;
            }

            if (anchorBottom !== null) {
                bottom = anchorBottom;
                top = bottom - newHeight;
            } else if (anchorTop !== null) {
                top = anchorTop;
                bottom = top + newHeight;
            } else {
                top = info.startRect.top;
                bottom = top + newHeight;
            }

            if (left < 0) {
                const shift = -left;
                left = 0;
                right += shift;
            }
            if (right > window.innerWidth) {
                const shift = right - window.innerWidth;
                right = window.innerWidth;
                left -= shift;
            }
            if (top < 0) {
                const shift = -top;
                top = 0;
                bottom += shift;
            }
            if (bottom > window.innerHeight) {
                const shift = bottom - window.innerHeight;
                bottom = window.innerHeight;
                top -= shift;
            }

            width = right - left;
            height = bottom - top;
        }

        if (width < minWidth) {
            width = minWidth;
            if (info.handle.includes('left')) {
                left = right - width;
            } else {
                right = left + width;
            }
        }
        if (height < minHeight) {
            height = minHeight;
            if (info.handle.includes('top')) {
                top = bottom - height;
            } else {
                bottom = top + height;
            }
        }

        if (left < 0) {
            right -= left;
            left = 0;
        }
        if (right > window.innerWidth) {
            const overflowX = right - window.innerWidth;
            left -= overflowX;
            right = window.innerWidth;
        }
        if (top < 0) {
            bottom -= top;
            top = 0;
        }
        if (bottom > window.innerHeight) {
            const overflowY = bottom - window.innerHeight;
            top -= overflowY;
            bottom = window.innerHeight;
        }

        width = right - left;
        height = bottom - top;

        const widthPercent = (width / window.innerWidth) * 100;
        const heightPercent = (height / window.innerHeight) * 100;
        const translateX = info.baseTranslateX + (left - info.startRect.left);
        const translateY = info.baseTranslateY + (top - info.startRect.top);

        this.scheduleResizeUpdate({
            widthPercent,
            heightPercent,
            translateX,
            translateY,
            outlineBounds: { left, top, width, height }
        });
    }

    handleResizeEnd = (event) => {
        if (!this._resizeInfo) return;
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (this._resizeFrameId && typeof window !== 'undefined') {
            cancelAnimationFrame(this._resizeFrameId);
            this._resizeFrameId = null;
        }
        this.applyResizeFrame();
        this.removeResizeListeners();
        this._resizeInfo = null;
        this._lastResizeFrame = null;
        this.setState({
            isResizing: false,
            outlineBounds: null,
            cursorType: 'cursor-default'
        }, this.resizeBoundries);
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
                {this.state.snapPreview && (
                    <div
                        data-testid="snap-preview"
                        className="fixed border-2 border-dashed border-white bg-white bg-opacity-10 pointer-events-none z-40 transition-opacity"
                        style={{ left: this.state.snapPreview.left, top: this.state.snapPreview.top, width: this.state.snapPreview.width, height: this.state.snapPreview.height }}
                    />
                )}
                <WindowOutline
                    visible={this.state.isResizing && !!this.state.outlineBounds}
                    bounds={this.state.outlineBounds}
                />
                <Draggable
                    ref={this.setDraggableRef}
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
                        {this.props.resizable !== false && (
                            <>
                                <div
                                    data-testid="resize-handle-top"
                                    className="absolute left-2.5 right-2.5 top-0 h-2.5 -translate-y-1/2 cursor-ns-resize z-30"
                                    onPointerDown={(event) => this.startResize('top', event)}
                                    aria-hidden="true"
                                />
                                <div
                                    data-testid="resize-handle-right"
                                    className="absolute top-2.5 bottom-2.5 right-0 w-2.5 translate-x-1/2 cursor-ew-resize z-30"
                                    onPointerDown={(event) => this.startResize('right', event)}
                                    aria-hidden="true"
                                />
                                <div
                                    data-testid="resize-handle-bottom"
                                    className="absolute left-2.5 right-2.5 bottom-0 h-2.5 translate-y-1/2 cursor-ns-resize z-30"
                                    onPointerDown={(event) => this.startResize('bottom', event)}
                                    aria-hidden="true"
                                />
                                <div
                                    data-testid="resize-handle-left"
                                    className="absolute top-2.5 bottom-2.5 left-0 w-2.5 -translate-x-1/2 cursor-ew-resize z-30"
                                    onPointerDown={(event) => this.startResize('left', event)}
                                    aria-hidden="true"
                                />
                                <div
                                    data-testid="resize-handle-top-left"
                                    className="absolute top-0 left-0 w-3 h-3 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize z-40"
                                    onPointerDown={(event) => this.startResize('top-left', event)}
                                    aria-hidden="true"
                                />
                                <div
                                    data-testid="resize-handle-top-right"
                                    className="absolute top-0 right-0 w-3 h-3 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize z-40"
                                    onPointerDown={(event) => this.startResize('top-right', event)}
                                    aria-hidden="true"
                                />
                                <div
                                    data-testid="resize-handle-bottom-left"
                                    className="absolute bottom-0 left-0 w-3 h-3 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize z-40"
                                    onPointerDown={(event) => this.startResize('bottom-left', event)}
                                    aria-hidden="true"
                                />
                                <div
                                    data-testid="resize-handle-bottom-right"
                                    className="absolute bottom-0 right-0 w-3 h-3 translate-x-1/2 translate-y-1/2 cursor-nwse-resize z-40"
                                    onPointerDown={(event) => this.startResize('bottom-right', event)}
                                    aria-hidden="true"
                                />
                            </>
                        )}
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
