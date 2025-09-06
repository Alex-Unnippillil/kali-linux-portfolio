import Image from 'next/image';
import { useSettings } from '../hooks/useSettings';

const useIconBase = () => {
  const { theme } = useSettings();
  return theme === 'undercover' ? '/themes/Windows/window' : '/themes/Yaru/window';
};

export function CloseIcon() {
  const base = useIconBase();
  return (
    <Image
      src={`${base}/window-close-symbolic.svg`}
      alt="Close"
      width={16}
      height={16}
    />
  );
}

export function MinimizeIcon() {
  const base = useIconBase();
  return (
    <Image
      src={`${base}/window-minimize-symbolic.svg`}
      alt="Minimize"
      width={16}
      height={16}
    />
  );
}

export function MaximizeIcon() {
  const base = useIconBase();
  return (
    <Image
      src={`${base}/window-maximize-symbolic.svg`}
      alt="Maximize"
      width={16}
      height={16}
    />
  );
}

export function RestoreIcon() {
  const base = useIconBase();
  return (
    <Image
      src={`${base}/window-restore-symbolic.svg`}
      alt="Restore"
      width={16}
      height={16}
    />
  );
}

export function PinIcon() {
  const base = useIconBase();
  return (
    <Image
      src={`${base}/window-pin-symbolic.svg`}
      alt="Pin"
      width={16}
      height={16}
    />
  );
}
