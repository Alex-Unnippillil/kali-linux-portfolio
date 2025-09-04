"use client";

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import NextImage from 'next/image';
import Draggable from 'react-draggable';
import Settings from '../apps/settings';
import ReactGA from 'react-ga4';
import useDocPiP from '../../hooks/useDocPiP';

interface WindowProps {
  id: string;
  title: string;
  screen: (addFolder: any, openApp: any) => React.ReactNode;
  addFolder?: any;
  openApp?: any;
  closed: (id: string) => void;
  focus: (id: string) => void;
  hideSideBar: (id: string, hide: boolean) => void;
  hasMinimised: (id: string) => void;
  isFocused?: boolean;
  minimized?: boolean;
  resizable?: boolean;
  allowMaximize?: boolean;
  defaultWidth?: number;
  defaultHeight?: number;
  initialX?: number;
  initialY?: number;
  onPositionChange?: (x: number, y: number) => void;
  overlayRoot?: string | HTMLElement;
  pip?: () => React.ReactNode;
}

interface Size {
  width: number;
  height: number;
}

interface SnapPreview {
  left: string;
  top: string;
  width: string;
  height: string;
}

interface WindowState {
  cursorType: string;
  width: number;
  height: number;
  closed: boolean;
  maximized: boolean;
  parentSize: Size;
  snapPreview: SnapPreview | null;
  snapPosition: 'left' | 'right' | 'top' | null;
  snapped: 'left' | 'right' | 'top' | null;
  lastSize: Size | null;
  grabbed: boolean;
}

export interface WindowHandle {
  handleDrag: () => void;
  handleStop: () => void;
  changeCursorToMove: () => void;
  handleKeyDown: (e: any) => void;
  activateOverlay: () => void;
  closeWindow: () => void;
  state: WindowState;
}

const Window = forwardRef<WindowHandle, WindowProps>((props, ref) => {
  const startX = useRef(props.initialX ?? 60);
  const startY = useRef(props.initialY ?? 10);
  const usageTimeout = useRef<NodeJS.Timeout | null>(null);
  const menuOpener = useRef<HTMLElement | null>(null);
  const dockAnimation = useRef<Animation | null>(null);
  const uiExperiments = process.env.NEXT_PUBLIC_UI_EXPERIMENTS === 'true';
  const stateRef = useRef<WindowState | null>(null);

  const [state, setState] = useState<WindowState>({
    cursorType: 'cursor-default',
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

  stateRef.current = state;

  const resizeBoundries = (width?: number, height?: number) => {
    const w = width ?? stateRef.current!.width;
    const h = height ?? stateRef.current!.height;
    setState((prev) => ({
      ...prev,
      parentSize: {
        height: window.innerHeight - (window.innerHeight * (h / 100.0)) - 28,
        width: window.innerWidth - (window.innerWidth * (w / 100.0)),
      },
    }));
    if (uiExperiments) {
      scheduleUsageCheck();
    }
  };

  const setDefaultWindowDimenstion = () => {
    let w: number;
    let h: number;
    if (props.defaultHeight && props.defaultWidth) {
      h = props.defaultHeight;
      w = props.defaultWidth;
    } else if (window.innerWidth < 640) {
      h = 60;
      w = 85;
    } else {
      h = 85;
      w = 60;
    }
    setState((prev) => ({ ...prev, height: h, width: w }));
    resizeBoundries(w, h);
  };

  const computeContentUsage = () => {
    const root = document.getElementById(props.id);
    if (!root) return 100;
    const container = root.querySelector('.windowMainScreen') as HTMLElement | null;
    if (!container) return 100;
    const inner = (container.firstElementChild as HTMLElement) || container;
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
    const root = document.getElementById(props.id);
    if (!root) return;
    const container = root.querySelector('.windowMainScreen') as HTMLElement | null;
    if (!container) return;

    container.style.padding = '0px';

    const shrink = () => {
      const usage = computeContentUsage();
      if (usage >= 80) return;
      setState((prev) => {
        const newWidth = Math.max(prev.width - 1, 20);
        const newHeight = Math.max(prev.height - 1, 20);
        return { ...prev, width: newWidth, height: newHeight };
      });
      resizeBoundries();
      if (computeContentUsage() < 80) {
        setTimeout(shrink, 50);
      }
    };
    shrink();
  };

  const getOverlayRoot = (): HTMLElement | null => {
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
    menuOpener.current = document.activeElement as HTMLElement;
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
    if (stateRef.current!.maximized) {
      restoreWindow();
    }
    if (stateRef.current!.snapped) {
      unsnapWindow();
    }
    setState((prev) => ({ ...prev, cursorType: 'cursor-move', grabbed: true }));
  };

  const changeCursorToDefault = () => {
    setState((prev) => ({ ...prev, cursorType: 'cursor-default', grabbed: false }));
  };

  const handleVerticleResize = () => {
    if (props.resizable === false) return;
    const newHeight = stateRef.current!.height + 0.1;
    setState((prev) => ({ ...prev, height: newHeight }));
    resizeBoundries(undefined, newHeight);
  };

  const handleHorizontalResize = () => {
    if (props.resizable === false) return;
    const newWidth = stateRef.current!.width + 0.1;
    setState((prev) => ({ ...prev, width: newWidth }));
    resizeBoundries(newWidth);
  };

  const setWinowsPosition = () => {
    const r = document.querySelector(`#${props.id}`) as HTMLElement | null;
    if (!r) return;
    const rect = r.getBoundingClientRect();
    const x = rect.x;
    const y = rect.y - 32;
    r.style.setProperty('--window-transform-x', x.toFixed(1).toString() + 'px');
    r.style.setProperty('--window-transform-y', y.toFixed(1).toString() + 'px');
    if (props.onPositionChange) {
      props.onPositionChange(x, y);
    }
  };

  const unsnapWindow = () => {
    if (!stateRef.current!.snapped) return;
    const r = document.querySelector(`#${props.id}`) as HTMLElement | null;
    if (r) {
      const x = r.style.getPropertyValue('--window-transform-x');
      const y = r.style.getPropertyValue('--window-transform-y');
      if (x && y) {
        r.style.transform = `translate(${x},${y})`;
      }
    }
    if (stateRef.current!.lastSize) {
      const { width, height } = stateRef.current!.lastSize!;
      setState((prev) => ({
        ...prev,
        width,
        height,
        snapped: null,
        lastSize: null,
      }));
      resizeBoundries(width, height);
    } else {
      setState((prev) => ({ ...prev, snapped: null }));
      resizeBoundries();
    }
  };

  const checkOverlap = () => {
    const r = document.querySelector(`#${props.id}`) as HTMLElement | null;
    if (!r) return;
    const rect = r.getBoundingClientRect();
    if (rect.x.toFixed(1) < 50) {
      props.hideSideBar(props.id, true);
    } else {
      props.hideSideBar(props.id, false);
    }
  };

  const setInertBackground = () => {
    const root = document.getElementById(props.id);
    if (root) {
      root.setAttribute('inert', '');
    }
  };

  const removeInertBackground = () => {
    const root = document.getElementById(props.id);
    if (root) {
      root.removeAttribute('inert');
    }
  };

  const checkSnapPreview = () => {
    const r = document.querySelector(`#${props.id}`) as HTMLElement | null;
    if (!r) return;
    const rect = r.getBoundingClientRect();
    const threshold = 30;
    let snap: SnapPreview | null = null;
    if (rect.left <= threshold) {
      snap = { left: '0', top: '0', width: '50%', height: '100%' };
      setState((prev) => ({ ...prev, snapPreview: snap, snapPosition: 'left' }));
    } else if (rect.right >= window.innerWidth - threshold) {
      snap = { left: '50%', top: '0', width: '50%', height: '100%' };
      setState((prev) => ({ ...prev, snapPreview: snap, snapPosition: 'right' }));
    } else if (rect.top <= threshold) {
      snap = { left: '0', top: '0', width: '100%', height: '50%' };
      setState((prev) => ({ ...prev, snapPreview: snap, snapPosition: 'top' }));
    } else {
      if (stateRef.current!.snapPreview) setState((prev) => ({ ...prev, snapPreview: null, snapPosition: null }));
    }
  };

  const handleDrag = () => {
    checkOverlap();
    checkSnapPreview();
  };

  const handleStop = () => {
    changeCursorToDefault();
    const snapPos = stateRef.current!.snapPosition;
    if (snapPos) {
      setWinowsPosition();
      const { width, height } = stateRef.current!;
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
      const r = document.querySelector(`#${props.id}`) as HTMLElement | null;
      if (r && transform) {
        r.style.transform = transform;
      }
      setState((prev) => ({
        ...prev,
        snapPreview: null,
        snapPosition: null,
        snapped: snapPos,
        lastSize: { width, height },
        width: newWidth,
        height: newHeight,
      }));
      resizeBoundries(newWidth, newHeight);
    } else {
      setState((prev) => ({ ...prev, snapPreview: null, snapPosition: null }));
    }
  };

  const focusWindow = () => {
    props.focus(props.id);
  };

  const minimizeWindow = () => {
    let posx = -310;
    if (stateRef.current!.maximized) {
      posx = -510;
    }
    setWinowsPosition();
    const r = document.querySelector(`#sidebar-${props.id}`) as HTMLElement | null;
    const sidebBarApp = r ? r.getBoundingClientRect() : { y: 0 };
    const node = document.querySelector(`#${props.id}`) as HTMLElement;
    const endTransform = `translate(${posx}px,${sidebBarApp.y.toFixed(1) - 240}px) scale(0.2)`;
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      node.style.transform = endTransform;
      props.hasMinimised(props.id);
      return;
    }
    const startTransform = node.style.transform;
    dockAnimation.current = node.animate(
      [{ transform: startTransform }, { transform: endTransform }],
      { duration: 300, easing: 'ease-in-out', fill: 'forwards' }
    );
    dockAnimation.current.onfinish = () => {
      node.style.transform = endTransform;
      props.hasMinimised(props.id);
      if (dockAnimation.current) dockAnimation.current.onfinish = null;
    };
  };

  const restoreWindow = () => {
    const node = document.querySelector(`#${props.id}`) as HTMLElement;
    setDefaultWindowDimenstion();
    const posx = node.style.getPropertyValue('--window-transform-x');
    const posy = node.style.getPropertyValue('--window-transform-y');
    const startTransform = node.style.transform;
    const endTransform = `translate(${posx},${posy})`;
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const finish = () => {
      node.style.transform = endTransform;
      setState((prev) => ({ ...prev, maximized: false }));
      checkOverlap();
      if (dockAnimation.current) dockAnimation.current.onfinish = null;
    };

    if (prefersReducedMotion) {
      finish();
      return;
    }

    if (dockAnimation.current) {
      dockAnimation.current.onfinish = finish;
      dockAnimation.current.reverse();
    } else {
      dockAnimation.current = node.animate(
        [{ transform: startTransform }, { transform: endTransform }],
        { duration: 300, easing: 'ease-in-out', fill: 'forwards' }
      );
      dockAnimation.current.onfinish = finish;
    }
  };

  const maximizeWindow = () => {
    if (props.allowMaximize === false) return;
    if (stateRef.current!.maximized) {
      restoreWindow();
    } else {
      focusWindow();
      const r = document.querySelector(`#${props.id}`) as HTMLElement;
      setWinowsPosition();
      r.style.transform = `translate(-1pt,-2pt)`;
      setState((prev) => ({ ...prev, maximized: true, height: 96.3, width: 100.2 }));
      resizeBoundries(100.2, 96.3);
      props.hideSideBar(props.id, true);
    }
  };

  const closeWindow = () => {
    setWinowsPosition();
    setState((prev) => ({ ...prev, closed: true }));
    deactivateOverlay();
    props.hideSideBar(props.id, false);
    setTimeout(() => {
      props.closed(props.id);
    }, 300);
  };

  const handleTitleBarKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (stateRef.current!.grabbed) {
        handleStop();
      } else {
        changeCursorToMove();
      }
    } else if (stateRef.current!.grabbed) {
      const step = 10;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        e.stopPropagation();
        const node = document.getElementById(props.id);
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
    if (stateRef.current!.grabbed) {
      handleStop();
    }
  };

  const handleKeyDown = (e: any) => {
    if (e.key === 'Escape') {
      closeWindow();
    } else if (e.key === 'Tab') {
      focusWindow();
    } else if (e.key === 'ArrowDown' && e.altKey) {
      unsnapWindow();
    }
  };

  useImperativeHandle(ref, () => ({
    handleDrag,
    handleStop,
    changeCursorToMove,
    handleKeyDown,
    activateOverlay,
    closeWindow,
    state,
  }));

  useEffect(() => {
    setDefaultWindowDimenstion();
    ReactGA.send({ hitType: 'pageview', page: `/${props.id}`, title: 'Custom Title' });
    window.addEventListener('resize', resizeBoundries);
    window.addEventListener('context-menu-open', setInertBackground as any);
    window.addEventListener('context-menu-close', removeInertBackground as any);
    if (uiExperiments) {
      scheduleUsageCheck();
    }
    return () => {
      ReactGA.send({ hitType: 'pageview', page: '/desktop', title: 'Custom Title' });
      window.removeEventListener('resize', resizeBoundries);
      window.removeEventListener('context-menu-open', setInertBackground as any);
      window.removeEventListener('context-menu-close', removeInertBackground as any);
      if (usageTimeout.current) {
        clearTimeout(usageTimeout.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {state.snapPreview && (
        <div
          data-testid="snap-preview"
          className="fixed border-2 border-dashed border-white pointer-events-none z-40"
          style={{
            left: state.snapPreview.left,
            top: state.snapPreview.top,
            width: state.snapPreview.width,
            height: state.snapPreview.height,
          }}
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
        defaultPosition={{ x: startX.current, y: startY.current }}
        bounds={{ left: 0, top: 0, right: state.parentSize.width, bottom: state.parentSize.height }}
      >
        <div
          style={{ width: `${state.width}%`, height: `${state.height}%` }}
          className={
            state.cursorType +
            ' ' +
            (state.closed ? ' closed-window ' : '') +
            (state.maximized ? ' duration-300 rounded-none' : ' rounded-lg rounded-b-none') +
            (props.minimized ? ' opacity-0 invisible duration-200 ' : '') +
            (state.grabbed ? ' opacity-70 ' : '') +
            (props.isFocused ? ' z-30 ' : ' z-20 notFocused') +
            ' opened-window overflow-hidden min-w-1/4 min-h-1/4 main-window absolute window-shadow border-black border-opacity-40 border border-t-0 flex flex-col'
          }
          id={props.id}
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
            close={closeWindow}
            isMaximised={state.maximized}
            allowMaximize={props.allowMaximize}
            id={props.id}
            pip={props.pip}
          />
          <WindowMainScreen
            screen={props.screen}
            title={props.title}
            addFolder={props.addFolder}
            openApp={props.openApp}
          />
          <Settings />
        </div>
      </Draggable>
    </>
  );
});

export default Window;

// Window's Vertical Resizer
export class WindowYBorder extends React.Component<{ resize: () => void }> {
  render() {
    return (
      <div
        onMouseDown={this.props.resize}
        className="window-resizer window-resizer-y absolute right-0 bottom-0 bg-transparent w-4 cursor-nse-resize h-full z-30"
      />
    );
  }
}

// Window's Horizontal Resizer
export class WindowXBorder extends React.Component<{ resize: () => void }> {
  render() {
    return (
      <div
        onMouseDown={this.props.resize}
        className="window-resizer window-resizer-x absolute right-0 bottom-0 bg-transparent h-4 cursor-e-resize w-full z-30"
      />
    );
  }
}

// Window's Top Bar
export class WindowTopBar extends React.Component<{
  title: string;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
  grabbed: boolean;
}> {
  render() {
    return (
      <div
        className="bg-ub-window-title cursor-default select-none h-10 w-full z-40 flex"
        onKeyDown={this.props.onKeyDown}
        onBlur={this.props.onBlur}
        tabIndex={0}
        aria-grabbed={this.props.grabbed}
      >
        <div className="inline-flex flex-grow items-center pl-4 text-sm font-bold text-white whitespace-nowrap overflow-hidden overflow-ellipsis">
          {this.props.title}
        </div>
      </div>
    );
  }
}

// Window's Edit Buttons (unchanged)
export function WindowEditButtons(props: any) {
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
        props.isMaximised ? (
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
  );
}

// Window's Main Screen
export class WindowMainScreen extends React.Component<{
  screen: any;
  title: string;
  addFolder: any;
  openApp: any;
}> {
  state = { setDarkBg: false };

  componentDidMount() {
    setTimeout(() => {
      this.setState({ setDarkBg: true });
    }, 3000);
  }

  render() {
    return (
      <div className={
        'w-full flex-grow z-20 max-h-full overflow-y-auto windowMainScreen' +
        (this.state.setDarkBg ? ' bg-ub-drk-abrgn ' : ' bg-ub-cool-grey')
      }>
        {this.props.screen(this.props.addFolder, this.props.openApp)}
      </div>
    );
  }
}

