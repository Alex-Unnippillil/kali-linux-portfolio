"use client";

import React, { Component, useState, useEffect, useRef, useImperativeHandle } from 'react';
import NextImage from 'next/image';
import Draggable from 'react-draggable';
import Settings from '../apps/settings';
import ReactGA from 'react-ga4';
import useDocPiP from '../../hooks/useDocPiP';

/**
 * @typedef {Object} WindowProps
 * @property {string} id
 * @property {string} title
 * @property {(addFolder?: any, openApp?: any) => React.ReactNode} screen
 * @property {Function} focus
 * @property {Function} hasMinimised
 * @property {Function} closed
 * @property {Function} hideSideBar
 * @property {Function} openApp
 * @property {boolean} [resizable]
 * @property {boolean} [allowMaximize]
 * @property {boolean} [minimized]
 * @property {boolean} [isFocused]
 * @property {number} [defaultWidth]
 * @property {number} [defaultHeight]
 * @property {number} [initialX]
 * @property {number} [initialY]
 * @property {any} [overlayRoot]
 * @property {(x:number,y:number)=>void} [onPositionChange]
 * @property {any} [addFolder]
 */

/**
 * @typedef {Object} WindowState
 * @property {string} cursorType
 * @property {number} width
 * @property {number} height
 * @property {boolean} closed
 * @property {boolean} maximized
 * @property {{height:number,width:number}} parentSize
 * @property {{left:string,top:string,width:string,height:string}|null} snapPreview
 * @property {"left"|"right"|"top"|null} snapPosition
 * @property {"left"|"right"|"top"|null} snapped
 * @property {{width:number,height:number}|null} lastSize
 * @property {boolean} grabbed
 */

const Window = React.forwardRef(function Window(props, ref) {
    const idRef = useRef(props.id);
    const startX = props.initialX ?? 60;
    const startY = props.initialY ?? 10;
    const uiExperiments = process.env.NEXT_PUBLIC_UI_EXPERIMENTS === 'true';
    const usageTimeout = useRef(null);
    const menuOpener = useRef(null);
    const dockAnimation = useRef(null);

    /** @type {[WindowState, Function]} */
    const [state, setState] = useState({
        cursorType: "cursor-default",
        width: props.defaultWidth || 60,
        height: props.defaultHeight || 85,
        closed: false,
        maximized: false,
        parentSize: { height: 100, width: 100 },
        snapPreview: null,
        snapPosition: null,
        snapped: null,
        lastSize: null,
        grabbed: false,
    });

    const updateState = (update) => {
        setState(prev => ({ ...prev, ...(typeof update === 'function' ? update(prev) : update) }));
    };

    const resizeBoundries = (h = state.height, w = state.width) => {
        updateState({
            parentSize: {
                height: window.innerHeight - (window.innerHeight * (h / 100.0)) - 28,
                width: window.innerWidth - (window.innerWidth * (w / 100.0))
            }
        });
        if (uiExperiments) {
            scheduleUsageCheck();
        }
    };

    const setDefaultWindowDimenstion = () => {
        let h = state.height, w = state.width;
        if (props.defaultHeight && props.defaultWidth) {
            h = props.defaultHeight;
            w = props.defaultWidth;
        } else if (window.innerWidth < 640) {
            h = 60; w = 85;
        } else {
            h = 85; w = 60;
        }
        updateState({ height: h, width: w });
        resizeBoundries(h, w);
    };

    const computeContentUsage = () => {
        const root = document.getElementById(idRef.current);
        if (!root) return 100;
        const container = root.querySelector('.windowMainScreen');
        if (!container) return 100;
        const inner = container.firstElementChild || container;
        const innerRect = inner.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const area = containerRect.width * containerRect.height;
        if (area === 0) return 100;
        return (innerRect.width * innerRect.height) / area * 100;
    };

    const scheduleUsageCheck = () => {
        if (usageTimeout.current) {
            clearTimeout(usageTimeout.current);
        }
        usageTimeout.current = setTimeout(() => {
            const usage = computeContentUsage();
            if (usage < 65) {
                optimizeWindow();
            }
        }, 200);
    };

    const optimizeWindow = () => {
        const root = document.getElementById(idRef.current);
        if (!root) return;
        const container = root.querySelector('.windowMainScreen');
        if (!container) return;
        container.style.padding = '0px';
        const shrink = () => {
            const usage = computeContentUsage();
            if (usage >= 80) return;
            updateState(prev => ({
                width: Math.max(prev.width - 1, 20),
                height: Math.max(prev.height - 1, 20)
            }));
            if (computeContentUsage() < 80) {
                setTimeout(shrink, 50);
            }
        };
        shrink();
    };

    const getOverlayRoot = () => {
        if (props.overlayRoot) {
            if (typeof props.overlayRoot === 'string') {
                return document.getElementById(props.overlayRoot);
            }
            return props.overlayRoot;
        }
        return document.getElementById('__next');
    };

    const activateOverlay = () => {
        const root = getOverlayRoot();
        if (root) {
            root.setAttribute('inert', '');
        }
        menuOpener.current = document.activeElement;
    };

    const deactivateOverlay = () => {
        const root = getOverlayRoot();
        if (root) {
            root.removeAttribute('inert');
        }
        if (menuOpener.current && typeof menuOpener.current.focus === 'function') {
            menuOpener.current.focus();
        }
        menuOpener.current = null;
    };

    const changeCursorToMove = () => {
        focusWindow();
        if (state.maximized) {
            restoreWindow();
        }
        if (state.snapped) {
            unsnapWindow();
        }
        updateState({ cursorType: "cursor-move", grabbed: true });
    };

    const changeCursorToDefault = () => {
        updateState({ cursorType: "cursor-default", grabbed: false });
    };

    const handleVerticleResize = () => {
        if (props.resizable === false) return;
        const h = state.height + 0.1;
        updateState({ height: h });
        resizeBoundries(h, state.width);
    };

    const handleHorizontalResize = () => {
        if (props.resizable === false) return;
        const w = state.width + 0.1;
        updateState({ width: w });
        resizeBoundries(state.height, w);
    };

    const setWinowsPosition = () => {
        const r = document.querySelector("#" + idRef.current);
        if (!r) return;
        const rect = r.getBoundingClientRect();
        const x = rect.x;
        const y = rect.y - 32;
        r.style.setProperty('--window-transform-x', x.toFixed(1).toString() + "px");
        r.style.setProperty('--window-transform-y', y.toFixed(1).toString() + "px");
        if (props.onPositionChange) {
            props.onPositionChange(x, y);
        }
    };

    const unsnapWindow = () => {
        if (!state.snapped) return;
        const r = document.querySelector("#" + idRef.current);
        if (r) {
            const x = r.style.getPropertyValue('--window-transform-x');
            const y = r.style.getPropertyValue('--window-transform-y');
            if (x && y) {
                r.style.transform = `translate(${x},${y})`;
            }
        }
        if (state.lastSize) {
            updateState({
                width: state.lastSize.width,
                height: state.lastSize.height,
                snapped: null
            });
            resizeBoundries(state.lastSize.height, state.lastSize.width);
        } else {
            updateState({ snapped: null });
            resizeBoundries();
        }
    };

    const checkOverlap = () => {
        const r = document.querySelector("#" + idRef.current);
        const rect = r.getBoundingClientRect();
        if (rect.x.toFixed(1) < 50) {
            props.hideSideBar(idRef.current, true);
        }
        else {
            props.hideSideBar(idRef.current, false);
        }
    };

    const setInertBackground = () => {
        const root = document.getElementById(idRef.current);
        if (root) {
            root.setAttribute('inert', '');
        }
    };

    const removeInertBackground = () => {
        const root = document.getElementById(idRef.current);
        if (root) {
            root.removeAttribute('inert');
        }
    };

    const checkSnapPreview = () => {
        const r = document.querySelector("#" + idRef.current);
        if (!r) return;
        const rect = r.getBoundingClientRect();
        const threshold = 30;
        let snap = null;
        if (rect.left <= threshold) {
            snap = { left: '0', top: '0', width: '50%', height: '100%' };
            updateState({ snapPreview: snap, snapPosition: 'left' });
        }
        else if (rect.right >= window.innerWidth - threshold) {
            snap = { left: '50%', top: '0', width: '50%', height: '100%' };
            updateState({ snapPreview: snap, snapPosition: 'right' });
        }
        else if (rect.top <= threshold) {
            snap = { left: '0', top: '0', width: '100%', height: '50%' };
            updateState({ snapPreview: snap, snapPosition: 'top' });
        }
        else {
            if (state.snapPreview) updateState({ snapPreview: null, snapPosition: null });
        }
    };

    const handleDrag = () => {
        checkOverlap();
        checkSnapPreview();
    };

    const handleStop = () => {
        changeCursorToDefault();
        const snapPos = state.snapPosition;
        if (snapPos) {
            setWinowsPosition();
            const { width, height } = state;
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
            const r = document.querySelector("#" + idRef.current);
            if (r && transform) {
                r.style.transform = transform;
            }
            updateState({
                snapPreview: null,
                snapPosition: null,
                snapped: snapPos,
                lastSize: { width, height },
                width: newWidth,
                height: newHeight
            });
            resizeBoundries(newHeight, newWidth);
        }
        else {
            updateState({ snapPreview: null, snapPosition: null });
        }
    };

    const focusWindow = () => {
        props.focus(idRef.current);
    };

    const minimizeWindow = () => {
        let posx = -310;
        if (state.maximized) {
            posx = -510;
        }
        setWinowsPosition();
        const r = document.querySelector("#sidebar-" + idRef.current);
        const sidebBarApp = r.getBoundingClientRect();

        const node = document.querySelector("#" + idRef.current);
        const endTransform = `translate(${posx}px,${sidebBarApp.y.toFixed(1) - 240}px) scale(0.2)`;
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            node.style.transform = endTransform;
            props.hasMinimised(idRef.current);
            return;
        }

        const startTransform = node.style.transform;
        dockAnimation.current = node.animate(
            [{ transform: startTransform }, { transform: endTransform }],
            { duration: 300, easing: 'ease-in-out', fill: 'forwards' }
        );
        dockAnimation.current.onfinish = () => {
            node.style.transform = endTransform;
            props.hasMinimised(idRef.current);
            dockAnimation.current.onfinish = null;
        };
    };

    const restoreWindow = () => {
        const node = document.querySelector("#" + idRef.current);
        setDefaultWindowDimenstion();
        let posx = node.style.getPropertyValue("--window-transform-x");
        let posy = node.style.getPropertyValue("--window-transform-y");
        const startTransform = node.style.transform;
        const endTransform = `translate(${posx},${posy})`;
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            node.style.transform = endTransform;
            updateState({ maximized: false });
            checkOverlap();
            return;
        }

        if (dockAnimation.current) {
            dockAnimation.current.onfinish = () => {
                node.style.transform = endTransform;
                updateState({ maximized: false });
                checkOverlap();
                dockAnimation.current.onfinish = null;
            };
            dockAnimation.current.reverse();
        } else {
            dockAnimation.current = node.animate(
                [{ transform: startTransform }, { transform: endTransform }],
                { duration: 300, easing: 'ease-in-out', fill: 'forwards' }
            );
            dockAnimation.current.onfinish = () => {
                node.style.transform = endTransform;
                updateState({ maximized: false });
                checkOverlap();
                dockAnimation.current.onfinish = null;
            };
        }
    };

    const maximizeWindow = () => {
        if (props.allowMaximize === false) return;
        if (state.maximized) {
            restoreWindow();
        }
        else {
            focusWindow();
            const r = document.querySelector("#" + idRef.current);
            setWinowsPosition();
            r.style.transform = `translate(-1pt,-2pt)`;
            updateState({ maximized: true, height: 96.3, width: 100.2 });
            props.hideSideBar(idRef.current, true);
        }
    };

    const closeWindow = () => {
        setWinowsPosition();
        updateState({ closed: true });
        deactivateOverlay();
        props.hideSideBar(idRef.current, false);
        setTimeout(() => {
            props.closed(idRef.current);
        }, 300);
    };

    const handleTitleBarKeyDown = (e) => {
        if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (state.grabbed) {
                handleStop();
            } else {
                changeCursorToMove();
            }
        } else if (state.grabbed) {
            const step = 10;
            let dx = 0, dy = 0;
            if (e.key === 'ArrowLeft') dx = -step;
            else if (e.key === 'ArrowRight') dx = step;
            else if (e.key === 'ArrowUp') dy = -step;
            else if (e.key === 'ArrowDown') dy = step;
            if (dx !== 0 || dy !== 0) {
                e.preventDefault();
                e.stopPropagation();
                const node = document.getElementById(idRef.current);
                if (node) {
                    const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(node.style.transform);
                    let x = match ? parseFloat(match[1]) : 0;
                    let y = match ? parseFloat(match[2]) : 0;
                    x += dx;
                    y += dy;
                    node.style.transform = `translate(${x}px, ${y}px)`;
                    checkOverlap();
                    checkSnapPreview();
                    setWinowsPosition();
                }
            }
        }
    };

    const releaseGrab = () => {
        if (state.grabbed) {
            handleStop();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeWindow();
        } else if (e.key === 'Tab') {
            focusWindow();
        } else if (e.key === 'ArrowDown' && e.altKey) {
            unsnapWindow();
        }
    };

    useEffect(() => {
        idRef.current = props.id;
        setDefaultWindowDimenstion();
        ReactGA.send({ hitType: "pageview", page: `/${idRef.current}`, title: "Custom Title" });
        const resizeListener = () => resizeBoundries();
        const contextOpen = () => setInertBackground();
        const contextClose = () => removeInertBackground();
        window.addEventListener('resize', resizeListener);
        window.addEventListener('context-menu-open', contextOpen);
        window.addEventListener('context-menu-close', contextClose);
        if (uiExperiments) {
            scheduleUsageCheck();
        }
        return () => {
            ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });
            window.removeEventListener('resize', resizeListener);
            window.removeEventListener('context-menu-open', contextOpen);
            window.removeEventListener('context-menu-close', contextClose);
            if (usageTimeout.current) {
                clearTimeout(usageTimeout.current);
            }
        };
    }, []);

    useImperativeHandle(ref, () => ({
        handleDrag,
        handleStop,
        changeCursorToMove,
        handleKeyDown,
        activateOverlay,
        closeWindow,
        state
    }), [state]);

    return (
        <>
            {state.snapPreview && (
                <div
                    data-testid="snap-preview"
                    className="fixed border-2 border-dashed border-white pointer-events-none z-40"
                    style={{ left: state.snapPreview.left, top: state.snapPreview.top, width: state.snapPreview.width, height: state.snapPreview.height }}
                />
            )}
            <Draggable
                axis="both"
                handle=".bg-ub-window-title"
                grid={[1, 1]}
                scale={1}
                onStart={changeCursorToMove}
                onStop={handleStop}
                onDrag={handleDrag}
                allowAnyClick={false}
                defaultPosition={{ x: startX, y: startY }}
                bounds={{ left: 0, top: 0, right: state.parentSize.width, bottom: state.parentSize.height }}
            >
                <div
                    style={{ width: `${state.width}%`, height: `${state.height}%` }}
                    className={state.cursorType + " " + (state.closed ? " closed-window " : "") + (state.maximized ? " duration-300 rounded-none" : " rounded-lg rounded-b-none") + (props.minimized ? " opacity-0 invisible duration-200 " : "") + (state.grabbed ? " opacity-70 " : "") + (props.isFocused ? " z-30 " : " z-20 notFocused") + " opened-window overflow-hidden min-w-1/4 min-h-1/4 main-window absolute window-shadow border-black border-opacity-40 border border-t-0 flex flex-col"}
                    id={idRef.current}
                    role="dialog"
                    aria-label={props.title}
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                >
                    {props.resizable !== false && <WindowYBorder resize={handleHorizontalResize} />}
                    {props.resizable !== false && <WindowXBorder resize={handleVerticleResize} />}
                    <WindowTopBar
                        title={props.title}
                        onKeyDown={handleTitleBarKeyDown}
                        onBlur={releaseGrab}
                        grabbed={state.grabbed}
                    />
                    <WindowEditButtons
                        minimize={minimizeWindow}
                        maximize={maximizeWindow}
                        isMaximised={state.maximized}
                        close={closeWindow}
                        id={idRef.current}
                        allowMaximize={props.allowMaximize !== false}
                        pip={() => props.screen(props.addFolder, props.openApp)}
                    />
                    {(idRef.current === "settings"
                        ? <Settings />
                        : <WindowMainScreen screen={props.screen} title={props.title}
                            addFolder={props.id === "terminal" ? props.addFolder : null}
                            openApp={props.openApp} />)}
                </div>
            </Draggable >
        </>
    );
});

export default Window;

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
    const { togglePin } = useDocPiP(props.pip || (() => null));
    const pipSupported = typeof window !== 'undefined' && !!window.documentPictureInPicture;
    return (
        <div className="absolute select-none right-0 top-0 mt-1 mr-1 flex justify-center items-center">
            {pipSupported && props.pip && (
                <button
                    type="button"
                    aria-label="Window pin"
                    className="mx-1.5 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-11 w-11"
                    onClick={togglePin}
                >
                    <NextImage
                        src="/themes/Yaru/window/window-pin-symbolic.svg"
                        alt="Kali window pin"
                        className="h-5 w-5 inline"
                        width={20}
                        height={20}
                        sizes="20px"
                    />
                </button>
            )}
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
