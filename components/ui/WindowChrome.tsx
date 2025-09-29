'use client';

import clsx from 'clsx';
import type {
  FocusEventHandler,
  KeyboardEventHandler,
  PointerEventHandler,
  ReactNode,
} from 'react';

import useDocPiP from '../../hooks/useDocPiP';
import {
  WINDOW_CHROME_HEIGHT,
  WINDOW_CONTROL_CLASSES,
  WINDOW_CONTROL_ICON_CLASS,
  WINDOW_CONTROL_SIZE,
} from '../../styles/theme';
import {
  CloseIcon,
  MaximizeIcon,
  MinimizeIcon,
  PinIcon,
  RestoreIcon,
  WINDOW_CONTROL_TOOLTIPS,
} from '../ToolbarIcons';
import windowStyles from '../base/window.module.css';

export const WINDOW_CHROME_HANDLE_CLASS = 'window-chrome-handle';

export type WindowChromeProps = {
  windowId: string;
  title: string;
  grabbed?: boolean;
  isMaximized: boolean;
  allowMaximize?: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  pipRenderer?: () => ReactNode;
  onTitleKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  onTitleBlur?: FocusEventHandler<HTMLDivElement>;
  onTitlePointerDown?: PointerEventHandler<HTMLDivElement>;
};

const buttonDimensions = {
  width: WINDOW_CONTROL_SIZE,
  height: WINDOW_CONTROL_SIZE,
  minWidth: WINDOW_CONTROL_SIZE,
  minHeight: WINDOW_CONTROL_SIZE,
} as const;

export function WindowChrome({
  windowId,
  title,
  grabbed,
  isMaximized,
  allowMaximize = true,
  onMinimize,
  onMaximize,
  onClose,
  pipRenderer,
  onTitleKeyDown,
  onTitleBlur,
  onTitlePointerDown,
}: WindowChromeProps) {
  const { togglePin, isPinned } = useDocPiP(pipRenderer ?? (() => null));
  const pipSupported =
    typeof window !== 'undefined' && 'documentPictureInPicture' in window;
  const showPin = pipSupported && Boolean(pipRenderer);

  const baseButtonClass = WINDOW_CONTROL_CLASSES.base;
  const destructiveButtonClass = clsx(baseButtonClass, WINDOW_CONTROL_CLASSES.destructiveState);
  const defaultButtonClass = clsx(baseButtonClass, WINDOW_CONTROL_CLASSES.defaultState);
  const pinnedButtonClass = clsx(
    baseButtonClass,
    isPinned ? WINDOW_CONTROL_CLASSES.pinnedState : WINDOW_CONTROL_CLASSES.defaultState,
  );

  const maximizeLabel = isMaximized
    ? WINDOW_CONTROL_TOOLTIPS.restore
    : WINDOW_CONTROL_TOOLTIPS.maximize;

  return (
    <div
      className={clsx(
        windowStyles.windowTitlebar,
        'flex items-center justify-between bg-ub-window-title px-3 text-white',
      )}
      style={{ height: WINDOW_CHROME_HEIGHT }}
    >
      <div
        className={clsx(
          WINDOW_CHROME_HANDLE_CLASS,
          'flex flex-1 select-none items-center justify-center text-sm font-bold',
        )}
        role="button"
        aria-grabbed={grabbed}
        tabIndex={0}
        onKeyDown={onTitleKeyDown}
        onBlur={onTitleBlur}
        onPointerDown={onTitlePointerDown}
      >
        <span className="pointer-events-none text-center" title={title}>
          {title}
        </span>
      </div>
      <div className="flex items-center gap-2 pl-3">
        {showPin && (
          <button
            type="button"
            aria-label={WINDOW_CONTROL_TOOLTIPS.pin}
            title={WINDOW_CONTROL_TOOLTIPS.pin}
            aria-pressed={isPinned}
            className={pinnedButtonClass}
            style={buttonDimensions}
            onClick={togglePin}
          >
            <PinIcon className={WINDOW_CONTROL_ICON_CLASS} />
          </button>
        )}
        <button
          type="button"
          aria-label={WINDOW_CONTROL_TOOLTIPS.minimize}
          title={WINDOW_CONTROL_TOOLTIPS.minimize}
          className={defaultButtonClass}
          style={buttonDimensions}
          onClick={onMinimize}
        >
          <MinimizeIcon className={WINDOW_CONTROL_ICON_CLASS} />
        </button>
        {allowMaximize && (
          <button
            type="button"
            aria-label={maximizeLabel}
            title={maximizeLabel}
            className={defaultButtonClass}
            style={buttonDimensions}
            onClick={onMaximize}
          >
            {isMaximized ? (
              <RestoreIcon className={WINDOW_CONTROL_ICON_CLASS} />
            ) : (
              <MaximizeIcon className={WINDOW_CONTROL_ICON_CLASS} />
            )}
          </button>
        )}
        <button
          type="button"
          aria-label={WINDOW_CONTROL_TOOLTIPS.close}
          title={WINDOW_CONTROL_TOOLTIPS.close}
          className={destructiveButtonClass}
          style={buttonDimensions}
          onClick={onClose}
          id={`close-${windowId}`}
        >
          <CloseIcon className={WINDOW_CONTROL_ICON_CLASS} />
        </button>
      </div>
    </div>
  );
}
