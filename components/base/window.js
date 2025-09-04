"use client";

import React, {
  useState,
  useEffect,
  useReducer,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle
} from 'react';
import NextImage from 'next/image';
import Draggable from 'react-draggable';
import ReactGA from 'react-ga4';
import useDocPiP from '../../hooks/useDocPiP';

// Window component converted to functional style
export const Window = forwardRef(function Window(props, ref) {
  // local id and focus management
  const [mounted, setMounted] = useState(false);
  const idRef = useRef(props.id);
  const dialogRef = useRef(null);
  const usageTimeout = useRef(null);
  const menuOpener = useRef(null);
  const prevFocused = useRef(null);

  // initial dimensions
  const startX = props.initialX ?? 60;
  const startY = props.initialY ?? 10;

  // reducer to manage various bits of state
  const initialState = {
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
    grabbed: false
  };

  function reducer(state, action) {
    switch (action.type) {
      case 'set':
        return { ...state, ...action.payload };
      default:
        return state;
    }
  }

  const [state, dispatch] = useReducer(reducer, initialState);

  // ------- helpers -----------------------------------------------------

  const resizeBoundries = useCallback(() => {
    dispatch({
      type: 'set',
      payload: {
        parentSize: {
          height:
            window.innerHeight -
            window.innerHeight * (state.height / 100.0) -
            28,
          width:
            window.innerWidth -
            window.innerWidth * (state.width / 100.0)
        }
      }
    });
  }, [state.height, state.width]);

  const setDefaultWindowDimension = useCallback(() => {
    if (props.defaultHeight && props.defaultWidth) {
      dispatch({
        type: 'set',
        payload: { height: props.defaultHeight, width: props.defaultWidth }
      });
    } else if (window.innerWidth < 640) {
      dispatch({ type: 'set', payload: { height: 60, width: 85 } });
    } else {
      dispatch({ type: 'set', payload: { height: 85, width: 60 } });
    }
  }, [props.defaultHeight, props.defaultWidth]);

  useEffect(() => {
    resizeBoundries();
  }, [state.height, state.width, resizeBoundries]);

  const getOverlayRoot = useCallback(() => {
    if (props.overlayRoot) {
      if (typeof props.overlayRoot === 'string') {
        return document.getElementById(props.overlayRoot);
      }
      return props.overlayRoot;
    }
    return document.getElementById('__next');
  }, [props.overlayRoot]);

  const activateOverlay = useCallback(() => {
    const root = getOverlayRoot();
    if (root) root.setAttribute('inert', '');
    menuOpener.current = document.activeElement;
  }, [getOverlayRoot]);

  const deactivateOverlay = useCallback(() => {
    const root = getOverlayRoot();
    if (root) root.removeAttribute('inert');
    if (menuOpener.current && typeof menuOpener.current.focus === 'function') {
      menuOpener.current.focus();
    }
    menuOpener.current = null;
  }, [getOverlayRoot]);

  const changeCursorToMove = useCallback(() => {
    focusWindow();
    if (state.maximized) {
      restoreWindow();
    }
    if (state.snapped) {
      unsnapWindow();
    }
    dispatch({
      type: 'set',
      payload: { cursorType: 'cursor-move', grabbed: true }
    });
  }, [state.maximized, state.snapped]);

  const changeCursorToDefault = useCallback(() => {
    dispatch({
      type: 'set',
      payload: { cursorType: 'cursor-default', grabbed: false }
    });
  }, []);

  const handleVerticleResize = useCallback(() => {
    if (props.resizable === false) return;
    dispatch({ type: 'set', payload: { height: state.height + 0.1 } });
  }, [props.resizable, state.height]);

  const handleHorizontalResize = useCallback(() => {
    if (props.resizable === false) return;
    dispatch({ type: 'set', payload: { width: state.width + 0.1 } });
  }, [props.resizable, state.width]);

  const setWinowsPosition = useCallback(() => {
    const r = document.querySelector('#' + idRef.current);
    if (!r) return;
    const rect = r.getBoundingClientRect();
    const x = rect.x;
    const y = rect.y - 32;
    r.style.setProperty('--window-transform-x', x.toFixed(1) + 'px');
    r.style.setProperty('--window-transform-y', y.toFixed(1) + 'px');
    if (props.onPositionChange) {
      props.onPositionChange(x, y);
    }
  }, [props.onPositionChange]);

  const unsnapWindow = useCallback(() => {
    if (!state.snapped) return;
    const r = document.querySelector('#' + idRef.current);
    if (r) {
      const x = r.style.getPropertyValue('--window-transform-x');
      const y = r.style.getPropertyValue('--window-transform-y');
      if (x && y) {
        r.style.transform = `translate(${x},${y})`;
      }
    }
    if (state.lastSize) {
      dispatch({
        type: 'set',
        payload: {
          width: state.lastSize.width,
          height: state.lastSize.height,
          snapped: null
        }
      });
    } else {
      dispatch({ type: 'set', payload: { snapped: null } });
    }
  }, [state.snapped, state.lastSize]);

  const checkOverlap = useCallback(() => {
    const r = document.querySelector('#' + idRef.current);
    if (!r) return;
    const rect = r.getBoundingClientRect();
    if (rect.x.toFixed(1) < 50) {
      props.hideSideBar(idRef.current, true);
    } else {
      props.hideSideBar(idRef.current, false);
    }
  }, [props.hideSideBar]);

  const setInertBackground = useCallback(() => {
    const root = document.getElementById(idRef.current);
    if (root) {
      root.setAttribute('inert', '');
    }
  }, []);

  const removeInertBackground = useCallback(() => {
    const root = document.getElementById(idRef.current);
    if (root) {
      root.removeAttribute('inert');
    }
  }, []);

  const checkSnapPreview = useCallback(() => {
    const r = document.querySelector('#' + idRef.current);
    if (!r) return;
    const rect = r.getBoundingClientRect();
    const threshold = 30;
    let snap = null;
    if (rect.left <= threshold) {
      snap = { left: '0', top: '0', width: '50%', height: '100%' };
      dispatch({
        type: 'set',
        payload: { snapPreview: snap, snapPosition: 'left' }
      });
    } else if (rect.right >= window.innerWidth - threshold) {
      snap = { left: '50%', top: '0', width: '50%', height: '100%' };
      dispatch({
        type: 'set',
        payload: { snapPreview: snap, snapPosition: 'right' }
      });
    } else if (rect.top <= threshold) {
      snap = { left: '0', top: '0', width: '100%', height: '50%' };
      dispatch({
        type: 'set',
        payload: { snapPreview: snap, snapPosition: 'top' }
      });
    } else {
      if (state.snapPreview)
        dispatch({ type: 'set', payload: { snapPreview: null, snapPosition: null } });
    }
  }, [state.snapPreview]);

  const handleDrag = useCallback(() => {
    checkOverlap();
    checkSnapPreview();
  }, [checkOverlap, checkSnapPreview]);

  const handleStop = useCallback(() => {
    changeCursorToDefault();
    const snapPos = state.snapPosition;
    if (snapPos) {
      setWinowsPosition();
      const { width, height } = state;
      let newWidth = width,
        newHeight = height,
        transform = '';
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
      const r = document.querySelector('#' + idRef.current);
      if (r && transform) {
        r.style.transform = transform;
      }
      dispatch({
        type: 'set',
        payload: {
          snapPreview: null,
          snapPosition: null,
          snapped: snapPos,
          lastSize: { width, height },
          width: newWidth,
          height: newHeight
        }
      });
    } else {
      dispatch({ type: 'set', payload: { snapPreview: null, snapPosition: null } });
    }
  }, [changeCursorToDefault, setWinowsPosition, state.snapPosition, state.width, state.height]);

  const focusWindow = useCallback(() => {
    props.focus(idRef.current);
  }, [props.focus]);

  const minimizeWindow = useCallback(() => {
    let posx = -310;
    if (state.maximized) {
      posx = -510;
    }
    setWinowsPosition();
    const r = document.querySelector('#sidebar-' + idRef.current);
    const sidebBarApp = r.getBoundingClientRect();

    const node = document.querySelector('#' + idRef.current);
    const endTransform = `translate(${posx}px,${sidebBarApp.y.toFixed(1) - 240}px) scale(0.2)`;
    const prefersReducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      node.style.transform = endTransform;
      props.hasMinimised(idRef.current);
      return;
    }

    const startTransform = node.style.transform;
    const animation = node.animate(
      [{ transform: startTransform }, { transform: endTransform }],
      { duration: 300, easing: 'ease-in-out', fill: 'forwards' }
    );
    animation.onfinish = () => {
      node.style.transform = endTransform;
      props.hasMinimised(idRef.current);
    };
  }, [props.hasMinimised, setWinowsPosition, state.maximized]);

  const restoreWindow = useCallback(() => {
    const node = document.querySelector('#' + idRef.current);
    setDefaultWindowDimension();
    let posx = node.style.getPropertyValue('--window-transform-x');
    let posy = node.style.getPropertyValue('--window-transform-y');
    const startTransform = node.style.transform;
    const endTransform = `translate(${posx},${posy})`;
    const prefersReducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      node.style.transform = endTransform;
      dispatch({ type: 'set', payload: { maximized: false } });
      checkOverlap();
      return;
    }

    const animation = node.animate(
      [{ transform: startTransform }, { transform: endTransform }],
      { duration: 300, easing: 'ease-in-out', fill: 'forwards' }
    );
    animation.onfinish = () => {
      node.style.transform = endTransform;
      dispatch({ type: 'set', payload: { maximized: false } });
      checkOverlap();
    };
  }, [setDefaultWindowDimension, checkOverlap]);

  const maximizeWindow = useCallback(() => {
    if (props.allowMaximize === false) return;
    if (state.maximized) {
      restoreWindow();
    } else {
      focusWindow();
      const r = document.querySelector('#' + idRef.current);
      setWinowsPosition();
      r.style.transform = `translate(-1pt,-2pt)`;
      dispatch({
        type: 'set',
        payload: { maximized: true, height: 96.3, width: 100.2 }
      });
      props.hideSideBar(idRef.current, true);
    }
  }, [props.allowMaximize, state.maximized, restoreWindow, focusWindow, setWinowsPosition, props.hideSideBar]);

  const closeWindow = useCallback(() => {
    setWinowsPosition();
    dispatch({ type: 'set', payload: { closed: true } });
    deactivateOverlay();
    props.hideSideBar(idRef.current, false);
    setTimeout(() => {
      props.closed(idRef.current);
    }, 300);
  }, [setWinowsPosition, deactivateOverlay, props.hideSideBar, props.closed]);

  const handleTitleBarKeyDown = useCallback(
    (e) => {
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
        let dx = 0,
          dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        else if (e.key === 'ArrowRight') dx = step;
        else if (e.key === 'ArrowUp') dy = -step;
        else if (e.key === 'ArrowDown') dy = step;
        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          e.stopPropagation();
          const node = document.getElementById(idRef.current);
          if (node) {
            const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(
              node.style.transform
            );
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
    },
    [state.grabbed, handleStop, changeCursorToMove, checkOverlap, checkSnapPreview, setWinowsPosition]
  );

  const releaseGrab = useCallback(() => {
    if (state.grabbed) {
      handleStop();
    }
  }, [state.grabbed, handleStop]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        closeWindow();
      } else if (e.key === 'Tab') {
        focusWindow();
      } else if (e.key === 'ArrowDown' && e.altKey) {
        unsnapWindow();
      }
    },
    [closeWindow, focusWindow, unsnapWindow]
  );

  // -------- lifecycle ---------------------------------------------------

  useEffect(() => {
    setMounted(true);
    setDefaultWindowDimension();

    ReactGA.send({ hitType: 'pageview', page: `/${props.id}`, title: 'Custom Title' });

    window.addEventListener('resize', resizeBoundries);
    window.addEventListener('context-menu-open', setInertBackground);
    window.addEventListener('context-menu-close', removeInertBackground);

    return () => {
      ReactGA.send({ hitType: 'pageview', page: '/desktop', title: 'Custom Title' });
      window.removeEventListener('resize', resizeBoundries);
      window.removeEventListener('context-menu-open', setInertBackground);
      window.removeEventListener('context-menu-close', removeInertBackground);
      if (usageTimeout.current) {
        clearTimeout(usageTimeout.current);
      }
    };
  }, [props.id, resizeBoundries, setDefaultWindowDimension, setInertBackground, removeInertBackground]);

  // focus trap and keyboard shortcuts
  useEffect(() => {
    if (!mounted) return;
    const node = dialogRef.current;
    if (!node) return;
    prevFocused.current = document.activeElement;
    node.focus();

    const handleKey = (e) => {
      if (e.key === 'Tab') {
        const focusable = node.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key === 'Escape') {
        closeWindow();
      }
    };
    node.addEventListener('keydown', handleKey);
    return () => {
      node.removeEventListener('keydown', handleKey);
      if (
        prevFocused.current &&
        typeof prevFocused.current.focus === 'function'
      ) {
        prevFocused.current.focus();
      }
    };
  }, [mounted, closeWindow]);

  // --------- render -----------------------------------------------------

  useImperativeHandle(ref, () => ({
    handleDrag,
    handleStop,
    changeCursorToMove,
    handleKeyDown,
    activateOverlay,
    closeWindow,
    get state() {
      return state;
    }
  }));

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
            height: state.snapPreview.height
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
        defaultPosition={{ x: startX, y: startY }}
        bounds={{
          left: 0,
          top: 0,
          right: state.parentSize.width,
          bottom: state.parentSize.height
        }}
      >
        <div
          ref={dialogRef}
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
          aria-modal="true"
          aria-label={props.title}
          tabIndex={-1}
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
            allowMaximize={props.allowMaximize}
            isMaximised={state.maximized}
            pip={props.pip}
            id={props.id}
          />
          {props.children}
        </div>
      </Draggable>
    </>
  );
});

export default Window;

// -------------------- sub components -----------------------------------

export function WindowTopBar({ title, onKeyDown, onBlur, grabbed }) {
  return (
    <div
      className={
        ' relative bg-ub-window-title border-t-2 border-white border-opacity-5 py-1.5 px-3 text-white w-full select-none rounded-b-none'
      }
      tabIndex={0}
      role="button"
      aria-grabbed={grabbed}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <div className="flex justify-center text-sm font-bold">{title}</div>
    </div>
  );
}

export class WindowYBorder extends React.Component {
  componentDidMount() {
    this.trpImg = new window.Image(0, 0);
    this.trpImg.src =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    this.trpImg.style.opacity = 0;
  }
  render() {
    return (
      <div
        className=" window-y-border border-transparent border-1 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        onDragStart={(e) => {
          e.dataTransfer.setDragImage(this.trpImg, 0, 0);
        }}
        onDrag={this.props.resize}
      ></div>
    );
  }
}

export class WindowXBorder extends React.Component {
  componentDidMount() {
    this.trpImg = new window.Image(0, 0);
    this.trpImg.src =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    this.trpImg.style.opacity = 0;
  }
  render() {
    return (
      <div
        className=" window-x-border border-transparent border-1 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        onDragStart={(e) => {
          e.dataTransfer.setDragImage(this.trpImg, 0, 0);
        }}
        onDrag={this.props.resize}
      ></div>
    );
  }
}

export function WindowEditButtons(props) {
  const { togglePin } = useDocPiP(props.pip || (() => null));
  const pipSupported =
    typeof window !== 'undefined' && !!window.documentPictureInPicture;
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
      {props.allowMaximize &&
        (props.isMaximised ? (
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
        ))}
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

export class WindowMainScreen extends React.Component {
  constructor() {
    super();
    this.state = {
      setDarkBg: false
    };
  }
  componentDidMount() {
    setTimeout(() => {
      this.setState({ setDarkBg: true });
    }, 3000);
  }
  render() {
    return (
      <div
        className={
          'w-full flex-grow z-20 max-h-full overflow-y-auto windowMainScreen' +
          (this.state.setDarkBg ? ' bg-ub-drk-abrgn ' : ' bg-ub-cool-grey')
        }
      >
        {this.props.screen(this.props.addFolder, this.props.openApp)}
      </div>
    );
  }
}

