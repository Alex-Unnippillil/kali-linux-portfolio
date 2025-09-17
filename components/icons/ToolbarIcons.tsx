import { SpriteIcon } from './SpriteIcon';
import type { SpriteIconProps } from './SpriteIcon';

type WindowIconProps = Omit<SpriteIconProps, 'symbol' | 'viewBox'>;

export function CloseIcon({ label = 'Close window', ...props }: WindowIconProps) {
  return (
    <SpriteIcon
      symbol="window-close"
      viewBox="0 0 16 16"
      label={label}
      {...props}
    />
  );
}

export function MinimizeIcon({ label = 'Minimize window', ...props }: WindowIconProps) {
  return (
    <SpriteIcon
      symbol="window-minimize"
      viewBox="0 0 16 16"
      label={label}
      {...props}
    />
  );
}

export function MaximizeIcon({ label = 'Maximize window', ...props }: WindowIconProps) {
  return (
    <SpriteIcon
      symbol="window-maximize"
      viewBox="0 0 16 16"
      label={label}
      {...props}
    />
  );
}

export function RestoreIcon({ label = 'Restore window', ...props }: WindowIconProps) {
  return (
    <SpriteIcon
      symbol="window-restore"
      viewBox="0 0 16 16"
      label={label}
      {...props}
    />
  );
}

export function PinIcon({ label = 'Pin window', size = 16, ...props }: WindowIconProps) {
  return (
    <SpriteIcon
      symbol="window-pin"
      viewBox="0 0 24 24"
      label={label}
      size={size}
      {...props}
    />
  );
}
