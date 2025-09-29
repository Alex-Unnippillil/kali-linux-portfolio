import Image from 'next/image';

import {
  WINDOW_CONTROL_ICON_CLASS,
  WINDOW_CONTROL_ICON_SIZE,
  WINDOW_CONTROL_SIZE,
} from '../styles/theme';

type ToolbarIconProps = {
  className?: string;
};

export const WINDOW_CONTROL_TOOLTIPS = {
  minimize: 'Minimize window',
  maximize: 'Maximize window',
  restore: 'Restore window',
  close: 'Close window',
  pin: 'Pin window',
} as const;

export const WINDOW_CONTROL_HIT_TARGET = WINDOW_CONTROL_SIZE;

function ToolbarIcon({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={WINDOW_CONTROL_ICON_SIZE}
      height={WINDOW_CONTROL_ICON_SIZE}
      sizes={`${WINDOW_CONTROL_ICON_SIZE}px`}
      className={className ?? WINDOW_CONTROL_ICON_CLASS}
    />
  );
}

export function CloseIcon({ className }: ToolbarIconProps) {
  return (
    <ToolbarIcon
      src="/themes/Yaru/window/window-close-symbolic.svg"
      alt={WINDOW_CONTROL_TOOLTIPS.close}
      className={className}
    />
  );
}

export function MinimizeIcon({ className }: ToolbarIconProps) {
  return (
    <ToolbarIcon
      src="/themes/Yaru/window/window-minimize-symbolic.svg"
      alt={WINDOW_CONTROL_TOOLTIPS.minimize}
      className={className}
    />
  );
}

export function MaximizeIcon({ className }: ToolbarIconProps) {
  return (
    <ToolbarIcon
      src="/themes/Yaru/window/window-maximize-symbolic.svg"
      alt={WINDOW_CONTROL_TOOLTIPS.maximize}
      className={className}
    />
  );
}

export function RestoreIcon({ className }: ToolbarIconProps) {
  return (
    <ToolbarIcon
      src="/themes/Yaru/window/window-restore-symbolic.svg"
      alt={WINDOW_CONTROL_TOOLTIPS.restore}
      className={className}
    />
  );
}

export function PinIcon({ className }: ToolbarIconProps) {
  return (
    <ToolbarIcon
      src="/themes/Yaru/window/window-pin-symbolic.svg"
      alt={WINDOW_CONTROL_TOOLTIPS.pin}
      className={className}
    />
  );
}
