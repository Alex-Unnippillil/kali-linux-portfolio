import React from 'react';
import DelayedTooltip from './DelayedTooltip';

interface WindowControlsProps {
  isMaximized: boolean;
  isFullscreen: boolean;
  zoom: number;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximizeToggle: () => void;
  onFullscreenToggle: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  disableZoomIn?: boolean;
  disableZoomOut?: boolean;
  disableZoomReset?: boolean;
  closeDisabled?: boolean;
}

interface ControlButtonProps {
  ariaLabel: string;
  tooltip: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  ariaPressed?: boolean;
}

const ControlButton: React.FC<ControlButtonProps> = ({
  ariaLabel,
  tooltip,
  onClick,
  disabled,
  children,
  ariaPressed,
}) => (
  <DelayedTooltip content={tooltip}>
    {(triggerProps) => (
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-md text-white hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={ariaLabel}
        aria-pressed={ariaPressed}
        onClick={onClick}
        disabled={disabled}
        ref={(node) => triggerProps.ref(node)}
        onMouseEnter={(event) => triggerProps.onMouseEnter(event)}
        onMouseLeave={(event) => triggerProps.onMouseLeave(event)}
        onFocus={(event) => triggerProps.onFocus(event)}
        onBlur={(event) => triggerProps.onBlur(event)}
      >
        {children}
      </button>
    )}
  </DelayedTooltip>
);

const Divider: React.FC = () => <span className="mx-1 h-5 w-px bg-gray-700" aria-hidden="true" />;

const MaximizeIcon: React.FC = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="3" y="3" width="10" height="10" rx="1.5" />
  </svg>
);

const RestoreIcon: React.FC = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M6 5h7v7" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3" y="4" width="9" height="9" rx="1.5" />
  </svg>
);

const EnterFullscreenIcon: React.FC = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6V3h3" />
    <path d="M13 6V3h-3" />
    <path d="M13 10v3h-3" />
    <path d="M3 10v3h3" />
  </svg>
);

const ExitFullscreenIcon: React.FC = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 3H3v3" />
    <path d="M10 3h3v3" />
    <path d="M10 13h3v-3" />
    <path d="M6 13H3v-3" />
  </svg>
);

const ZoomInIcon: React.FC = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="9" r="5" />
    <path d="M9 7v4" />
    <path d="M7 9h4" />
    <path d="M13 13l4 4" />
  </svg>
);

const ZoomOutIcon: React.FC = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="9" r="5" />
    <path d="M7 9h4" />
    <path d="M13 13l4 4" />
  </svg>
);

const ResetZoomIcon: React.FC = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 3a7 7 0 1 1-4.95 2.05" />
    <path d="M5 3h4v4" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
  </svg>
);

const MinimizeIcon: React.FC = () => (
  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 8h8" strokeLinecap="round" />
  </svg>
);

const WindowControls: React.FC<WindowControlsProps> = ({
  isMaximized,
  isFullscreen,
  zoom,
  onClose,
  onMinimize,
  onMaximizeToggle,
  onFullscreenToggle,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  disableZoomIn,
  disableZoomOut,
  disableZoomReset,
  closeDisabled,
}) => {
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="flex items-center gap-1 text-white">
      {onMinimize && (
        <ControlButton
          ariaLabel="Minimize window"
          tooltip={
            <span>
              Minimize window
              <br />
              <span className="text-gray-300">Shortcut: Super + H</span>
            </span>
          }
          onClick={onMinimize}
        >
          <MinimizeIcon />
        </ControlButton>
      )}
      <ControlButton
        ariaLabel={isMaximized ? 'Restore window size' : 'Maximize window'}
        tooltip={
          <span>
            {isMaximized ? 'Restore window size' : 'Maximize window'}
            <br />
            <span className="text-gray-300">Shortcut: Alt + F10</span>
          </span>
        }
        onClick={onMaximizeToggle}
        ariaPressed={isMaximized}
      >
        {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
      </ControlButton>
      <ControlButton
        ariaLabel={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        tooltip={
          <span>
            {isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            <br />
            <span className="text-gray-300">
              {isFullscreen ? 'Shortcut: Esc' : 'Shortcut: F11 · Esc to exit'}
            </span>
          </span>
        }
        onClick={onFullscreenToggle}
        ariaPressed={isFullscreen}
      >
        {isFullscreen ? <ExitFullscreenIcon /> : <EnterFullscreenIcon />}
      </ControlButton>
      {onClose && (
        <ControlButton
          ariaLabel="Close window"
          tooltip={
            <span>
              Close window
              <br />
              <span className="text-gray-300">Shortcut: Ctrl + W</span>
            </span>
          }
          onClick={onClose}
          disabled={closeDisabled}
        >
          <CloseIcon />
        </ControlButton>
      )}
      <Divider />
      <ControlButton
        ariaLabel="Zoom out"
        tooltip={
          <span>
            Zoom out ({zoomPercent}%)
            <br />
            <span className="text-gray-300">Shortcut: Ctrl + -</span>
          </span>
        }
        onClick={onZoomOut}
        disabled={disableZoomOut}
      >
        <ZoomOutIcon />
      </ControlButton>
      <span className="min-w-[3ch] text-center text-xs" aria-live="polite">
        {zoomPercent}%
      </span>
      <ControlButton
        ariaLabel="Zoom in"
        tooltip={
          <span>
            Zoom in ({zoomPercent}%)
            <br />
            <span className="text-gray-300">Shortcut: Ctrl + =</span>
          </span>
        }
        onClick={onZoomIn}
        disabled={disableZoomIn}
      >
        <ZoomInIcon />
      </ControlButton>
      <ControlButton
        ariaLabel="Reset zoom"
        tooltip={
          <span>
            Reset zoom to 100%
            <br />
            <span className="text-gray-300">Shortcut: Ctrl + 0</span>
          </span>
        }
        onClick={onZoomReset}
        disabled={disableZoomReset}
      >
        <ResetZoomIcon />
      </ControlButton>
    </div>
  );
};

export default WindowControls;
