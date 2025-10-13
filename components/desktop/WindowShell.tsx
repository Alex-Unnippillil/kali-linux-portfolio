'use client';

import React, {
  useEffect,
  useImperativeHandle,
  useRef,
  useSyncExternalStore,
} from 'react';
import clsx from 'clsx';

import type WindowManager from './WindowManager';
import styles from '../base/window.module.css';

type WindowShellProps = React.HTMLAttributes<HTMLDivElement> & {
  manager: WindowManager;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  bodyClassName?: string;
  dragHandle?: React.ReactNode;
  resizeHandle?: React.ReactNode;
  children?: React.ReactNode;
};

const isFiniteNumber = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const WindowShell = React.forwardRef<HTMLDivElement, WindowShellProps>(
  (
    {
      manager,
      header,
      footer,
      bodyClassName,
      dragHandle,
      resizeHandle,
      className,
      style,
      children,
      ...rest
    },
    forwardedRef,
  ) => {
    const snapshot = useSyncExternalStore(
      manager.subscribe,
      manager.getSnapshot,
      manager.getSnapshot,
    );

    const isMaximized = snapshot.visibility === 'maximized';
    const isMinimized = snapshot.visibility === 'minimized';

    const innerRef = useRef<HTMLDivElement | null>(null);
    useImperativeHandle(forwardedRef, () => innerRef.current as HTMLDivElement | null);

    useEffect(() => {
      if (typeof window === 'undefined') return undefined;
      if (!innerRef.current) return undefined;
      if (snapshot.visibility !== 'normal') return undefined;

      const node = innerRef.current;

      const updateBounds = () => {
        const rect = node.getBoundingClientRect();
        manager.setBounds({
          width: rect.width,
          height: rect.height,
          left: rect.left,
          top: rect.top,
        });
      };

      updateBounds();

      if (typeof ResizeObserver === 'function') {
        const observer = new ResizeObserver(() => {
          if (manager.getSnapshot().visibility !== 'normal') return;
          updateBounds();
        });
        observer.observe(node);
        return () => observer.disconnect();
      }

      return undefined;
    }, [manager, snapshot.visibility]);

    const combinedClassName = clsx(
      styles.windowShellRoot,
      styles.windowFrame,
      isMaximized && styles.windowFrameMaximized,
      isMinimized && styles.windowFrameMinimized,
      isMaximized && styles.windowShellExpanded,
      className,
    );

    const computedStyle: (React.CSSProperties & { [key: string]: string | number | undefined }) = {
      ...style,
    };

    if (isMaximized) {
      computedStyle.width = undefined;
      computedStyle.height = undefined;
      computedStyle.transform = undefined;
      computedStyle['--window-shell-top'] = `${snapshot.viewportInsets.top}px`;
      computedStyle['--window-shell-bottom'] = `${snapshot.viewportInsets.bottom}px`;
      computedStyle['--window-shell-left'] = `${snapshot.viewportInsets.left}px`;
      computedStyle['--window-shell-right'] = `${snapshot.viewportInsets.right}px`;
    } else {
      if (isFiniteNumber(snapshot.bounds.width) && snapshot.bounds.width > 0) {
        computedStyle.width = `${Math.round(snapshot.bounds.width)}px`;
      }
      if (isFiniteNumber(snapshot.bounds.height) && snapshot.bounds.height > 0) {
        computedStyle.height = `${Math.round(snapshot.bounds.height)}px`;
      }
      computedStyle.transform = undefined;
      computedStyle['--window-shell-top'] = undefined;
      computedStyle['--window-shell-bottom'] = undefined;
      computedStyle['--window-shell-left'] = undefined;
      computedStyle['--window-shell-right'] = undefined;
    }

    return (
      <div
        {...rest}
        ref={innerRef}
        className={combinedClassName}
        style={computedStyle}
        data-window-state={snapshot.visibility}
      >
        {!isMaximized && dragHandle}
        {header}
        <div className={clsx('flex min-h-0 flex-1 flex-col', bodyClassName)}>{children}</div>
        {footer}
        {!isMaximized && resizeHandle}
      </div>
    );
  },
);

WindowShell.displayName = 'WindowShell';

export default WindowShell;
