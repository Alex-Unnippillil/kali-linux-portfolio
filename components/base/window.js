"use client";

import React, { Component } from 'react';
import NextImage from 'next/image';
import Draggable from 'react-draggable';
import Settings from '../apps/settings';
import ReactGA from 'react-ga4';
import useDocPiP from '../../hooks/useDocPiP';
import styles from './window.module.css';

const FOCUSABLE_SELECTORS = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]'
].join(',');

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
        const root = document.getElementById(this.id);
        root?.addEventListener('super-arrow', this.handleSuperArrow);
        if (this._uiExperiments) {
            this.scheduleUsageCheck();
        }
    }

    componentDidUpdate(prevProps) {
        if (!prevProps.isFocused && this.props.isFocused) {
            const node = this.getWindowElement();
            if (
                typeof document !== 'undefined' &&
                node &&
                typeof node.focus === 'function' &&
                (!document.activeElement || !node.contains(document.activeElement))
            ) {
                node.focus({ preventScroll: true });
            }
        }
    }

    getWindowElement = () => {
        if (this.windowRef.current) {
            return this.windowRef.current;
        }
        return typeof document !== 'undefined' ? document.getElementById(this.id) : null;
    }

    getFocusableElements = (root = this.getWindowElement()) => {
        if (!root) return [];
        const focusable = Array.from(root.querySelectorAll(FOCUSABLE_SELECTORS));
        return focusable.filter((el) => {
            if (!(el instanceof HTMLElement)) return false;
            if (el.hasAttribute('disabled')) return false;
            if (el.getAttribute('aria-hidden') === 'true') return false;
            if (el.hasAttribute('data-focus-trap-exclude')) return false;
            const rects = el.getClientRects();
            return rects.length > 0;
        });
    }

    handleTabNavigation = (event) => {
        if (!event) return;
        const container = this.getWindowElement();
        if (!container) return;
        const focusable = this.getFocusableElements(container);
        const stopEvent = () => {
            if (typeof event.preventDefault === 'function') event.preventDefault();
            if (typeof event.stopPropagation === 'function') event.stopPropagation();
        };

        if (focusable.length === 0) {
            stopEvent();
            container.focus({ preventScroll: true });
            return;
        }
        const activeElement = typeof document !== 'undefined' ? document.activeElement : null;
        const currentIndex = focusable.indexOf(activeElement);
        let nextIndex = 0;
        if (event.shiftKey) {
            if (currentIndex <= 0) {
                nextIndex = focusable.length - 1;
            } else {
                nextIndex = currentIndex - 1;
            }
        } else {
            if (currentIndex === -1 || currentIndex === focusable.length - 1) {
                nextIndex = 0;
            } else {
                nextIndex = currentIndex + 1;
            }
        }
        stopEvent();
        const nextElement = focusable[nextIndex];
        if (nextElement && typeof nextElement.focus === 'function') {
            nextElement.focus({ preventScroll: true });
        }
        this.focusWindow();
    }

    handleArrowSnap = (key) => {
        const { snapped } = this.state;
        if (key === 'ArrowLeft') {
            const map = {
                right: 'left',
                top: 'top-left',
                bottom: 'bottom-left',
                'top-right': 'top-left',
                'bottom-right': 'bottom-left',
                'top-left': 'top-left',
                'bottom-left': 'bottom-left'
            };
            const next = map[snapped] || 'left';
            this.snapWindow(next);
            return true;
        }
        if (key === 'ArrowRight') {
            const map = {
                left: 'right',
                top: 'top-right',
                bottom: 'bottom-right',
                'top-left': 'top-right',
                'bottom-left': 'bottom-right',
                'top-right': 'top-right',
                'bottom-right': 'bottom-right'
            };
            const next = map[snapped] || 'right';
            this.snapWindow(next);
            return true;
        }
        if (key === 'ArrowUp') {
            const map = {
                bottom: 'top',
                left: 'top-left',
                right: 'top-right',
                'bottom-left': 'top-left',
                'bottom-right': 'top-right',
                'top-left': 'top-left',
                'top-right': 'top-right'
            };
            const next = map[snapped] || 'top';
            this.snapWindow(next);
            return true;
        }
        if (key === 'ArrowDown') {
            const map = {
                top: 'bottom',
                left: 'bottom-left',
                right: 'bottom-right',
                'top-left': 'bottom-left',
                'top-right': 'bottom-right',
                'bottom-left': 'bottom-left',
                'bottom-right': 'bottom-right'
            };
            const next = map[snapped] || 'bottom';
            this.snapWindow(next);
            return true;
        }
        return false;
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
                snapped: null,
                lastSize: null
            }, this.resizeBoundries);
        } else {
            this.setState({ snapped: null, lastSize: null }, this.resizeBoundries);
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
        else if (rect.bottom >= window.innerHeight - threshold) {
            snap = { left: '0', top: '50%', width: '100%', height: '50%' };
            this.setState({ snapPreview: snap, snapPosition: 'bottom' });
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
        if (!e) return;
        const stopEvent = () => {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
        };
        if (e.key === 'Escape') {
            if (this.props.isFocused) {
                stopEvent();
                this.closeWindow();
            }
            return;
        }

        if (e.key === 'Tab') {
            this.handleTabNavigation(e);
            return;
        }

        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            return;
        }

        const container = this.getWindowElement();
        const currentTarget = e.currentTarget instanceof HTMLElement ? e.currentTarget : container;
        const targetElement = e.target instanceof HTMLElement ? e.target : currentTarget;
        const isChromeTarget = !!currentTarget && !!targetElement && (
            targetElement === currentTarget ||
            (!!targetElement.closest && targetElement.closest('[data-window-chrome="true"]'))
        );

        if (e.altKey) {
            if (!isChromeTarget) return;
            if (e.key === 'ArrowDown') {
                stopEvent();
                this.unsnapWindow();
            } else if (e.key === 'ArrowLeft') {
                stopEvent();
                this.snapWindow('left');
            } else if (e.key === 'ArrowRight') {
                stopEvent();
                this.snapWindow('right');
            } else if (e.key === 'ArrowUp') {
                stopEvent();
                this.snapWindow('top');
            }
            this.focusWindow();
            return;
        }

        if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
            if (!isChromeTarget) return;
            const step = 1;
            if (e.key === 'ArrowLeft') {
                stopEvent();
                this.setState(prev => ({ width: Math.max(prev.width - step, 20) }), this.resizeBoundries);
            } else if (e.key === 'ArrowRight') {
                stopEvent();
                this.setState(prev => ({ width: Math.min(prev.width + step, 100) }), this.resizeBoundries);
            } else if (e.key === 'ArrowUp') {
                stopEvent();
                this.setState(prev => ({ height: Math.max(prev.height - step, 20) }), this.resizeBoundries);
            } else if (e.key === 'ArrowDown') {
                stopEvent();
                this.setState(prev => ({ height: Math.min(prev.height + step, 100) }), this.resizeBoundries);
            }
            this.focusWindow();
            return;
        }

        if (isChromeTarget && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
            const handled = this.handleArrowSnap(e.key);
            if (handled) {
                stopEvent();
                this.focusWindow();
            }
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
        if (typeof window === 'undefined') return;
        const node = this.getWindowElement();
        if (!node) return;
        this.focusWindow();
        this.setWinowsPosition();
        const { width, height } = this.state;
        const halfWidth = window.innerWidth / 2;
        const halfHeight = window.innerHeight / 2;
        const bottomOffset = `${Math.max(halfHeight - 2, 0)}px`;
        let newWidth = width;
        let newHeight = height;
        let transform = '';
        switch (pos) {
            case 'left':
                newWidth = 50;
                newHeight = 96.3;
                transform = 'translate(-1pt,-2pt)';
                break;
            case 'right':
                newWidth = 50;
                newHeight = 96.3;
                transform = `translate(${halfWidth}px,-2pt)`;
                break;
            case 'top':
                newWidth = 100.2;
                newHeight = 50;
                transform = 'translate(-1pt,-2pt)';
                break;
            case 'bottom':
                newWidth = 100.2;
                newHeight = 50;
                transform = `translate(-1pt, ${bottomOffset})`;
                break;
            case 'top-left':
                newWidth = 50;
                newHeight = 50;
                transform = 'translate(-1pt,-2pt)';
                break;
            case 'top-right':
                newWidth = 50;
                newHeight = 50;
                transform = `translate(${halfWidth}px,-2pt)`;
                break;
            case 'bottom-left':
                newWidth = 50;
                newHeight = 50;
                transform = `translate(-1pt, ${bottomOffset})`;
                break;
            case 'bottom-right':
                newWidth = 50;
                newHeight = 50;
                transform = `translate(${halfWidth}px, ${bottomOffset})`;
                break;
            default:
                break;
        }
        if (!transform) return;
        node.style.transform = transform;
        const lastSize = this.state.snapped && this.state.lastSize
            ? this.state.lastSize
            : { width, height };
        this.setState({
            snapPreview: null,
            snapPosition: null,
            snapped: pos,
            lastSize,
            width: newWidth,
            height: newHeight
        }, () => {
            this.resizeBoundries();
            if (this.props.hideSideBar) {
                const shouldHide = ['left', 'top-left', 'bottom-left'].includes(pos);
                this.props.hideSideBar(this.id, shouldHide);
            }
        });
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
                        ref={this.windowRef}
                        data-testid="desktop-window"
                        data-focused={this.props.isFocused ? 'true' : 'false'}
                        onKeyDown={this.handleKeyDown}
                        onFocusCapture={this.focusWindow}
                    >
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
                        {this.props.resizable !== false && <WindowYBorder resize={this.handleHorizontalResize} />}
                        {this.props.resizable !== false && <WindowXBorder resize={this.handleVerticleResize} />}
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
    const label = typeof title === 'string' ? `${title} window title bar` : 'Window title bar';
    return (
        <div
            className={" relative bg-ub-window-title border-t-2 border-white border-opacity-5 px-3 text-white w-full select-none rounded-b-none flex items-center h-11"}
            tabIndex={0}
            role="button"
            aria-grabbed={grabbed}
            aria-label={label}
            data-testid="window-title-bar"
            data-window-chrome="true"
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
                    role="button"
                    tabIndex={0}
                    aria-label="Resize window horizontally"
                    data-testid="window-resize-handle-horizontal"
                    data-window-chrome="true"
                    onKeyDown={(event) => {
                        if ((event.key === 'Enter' || event.key === ' ' || event.key === 'Space') && typeof this.props.resize === 'function') {
                            event.preventDefault();
                            this.props.resize();
                        }
                    }}
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
                    role="button"
                    tabIndex={0}
                    aria-label="Resize window vertically"
                    data-testid="window-resize-handle-vertical"
                    data-window-chrome="true"
                    onKeyDown={(event) => {
                        if ((event.key === 'Enter' || event.key === ' ' || event.key === 'Space') && typeof this.props.resize === 'function') {
                            event.preventDefault();
                            this.props.resize();
                        }
                    }}
                ></div>
            )
        }
    }

// Window's Edit Buttons
export function WindowEditButtons(props) {
    const { togglePin } = useDocPiP(props.pip || (() => null));
    const pipSupported = typeof window !== 'undefined' && !!window.documentPictureInPicture;
    return (
        <div
            className="absolute select-none right-0 top-0 mt-1 mr-1 flex justify-center items-center h-11 min-w-[8.25rem]"
            data-testid="window-control-strip"
            data-window-chrome="true"
        >
            {pipSupported && props.pip && (
                <button
                    type="button"
                    role="button"
                    aria-label="Window pin"
                    data-testid="window-pin-button"
                    data-window-chrome="true"
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
                role="button"
                aria-label="Window minimize"
                data-testid="window-minimize-button"
                data-window-chrome="true"
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
                            role="button"
                            aria-label="Window restore"
                            data-testid="window-restore-button"
                            data-window-chrome="true"
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
                            role="button"
                            aria-label="Window maximize"
                            data-testid="window-maximize-button"
                            data-window-chrome="true"
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
                role="button"
                aria-label="Window close"
                data-testid="window-close-button"
                data-window-chrome="true"
                className="mx-1 cursor-default bg-ub-cool-grey bg-opacity-90 hover:bg-opacity-100 rounded-full flex justify-center items-center h-6 w-6"
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
