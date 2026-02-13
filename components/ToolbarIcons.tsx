import Image from 'next/image';

export function CloseIcon() {
  return (
    <Image
      src="/themes/Yaru/window/window-close-symbolic.svg"
      alt="Close"
      width={24}
      height={24}
    />
  );
}

export function MinimizeIcon() {
  return (
    <Image
      src="/themes/Yaru/window/window-minimize-symbolic.svg"
      alt="Minimize"
      width={24}
      height={24}
    />
  );
}

export function MaximizeIcon() {
  return (
    <Image
      src="/themes/Yaru/window/window-maximize-symbolic.svg"
      alt="Maximize"
      width={24}
      height={24}
    />
  );
}

export function RestoreIcon() {
  return (
    <Image
      src="/themes/Yaru/window/window-restore-symbolic.svg"
      alt="Restore"
      width={24}
      height={24}
    />
  );
}

export function PinIcon() {
  return (
    <Image
      src="/themes/Yaru/window/window-pin-symbolic.svg"
      alt="Pin"
      width={24}
      height={24}
    />
  );
}
