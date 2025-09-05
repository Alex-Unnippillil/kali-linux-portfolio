import Image from 'next/image';
import { useSettings } from '../hooks/useSettings';

const iconPath = (theme: string, name: string) =>
  theme === 'undercover'
    ? `/themes/Undercover/window/${name}.svg`
    : `/themes/Yaru/window/${name}-symbolic.svg`;

export function CloseIcon() {
  const { theme } = useSettings();
  return (
    <Image
      src={iconPath(theme, 'window-close')}
      alt="Close"
      width={16}
      height={16}
    />
  );
}

export function MinimizeIcon() {
  const { theme } = useSettings();
  return (
    <Image
      src={iconPath(theme, 'window-minimize')}
      alt="Minimize"
      width={16}
      height={16}
    />
  );
}

export function MaximizeIcon() {
  const { theme } = useSettings();
  return (
    <Image
      src={iconPath(theme, 'window-maximize')}
      alt="Maximize"
      width={16}
      height={16}
    />
  );
}

export function RestoreIcon() {
  const { theme } = useSettings();
  return (
    <Image
      src={iconPath(theme, 'window-restore')}
      alt="Restore"
      width={16}
      height={16}
    />
  );
}

export function PinIcon() {
  const { theme } = useSettings();
  return (
    <Image
      src={iconPath(theme, 'window-pin')}
      alt="Pin"
      width={16}
      height={16}
    />
  );
}
