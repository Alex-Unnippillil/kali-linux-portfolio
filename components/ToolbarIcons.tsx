import Image from 'next/image';

export function CloseIcon() {
  return (
    <Image
      src="/themes/Yaru/window/window-close-symbolic.svg"
      alt="Close"
      width={16}
      height={16}
    />
  );
}

export function MinimizeIcon() {
  return (
    <Image
      src="/themes/Yaru/window/window-minimize-symbolic.svg"
      alt="Minimize"
      width={16}
      height={16}
    />
  );
}

export function MaximizeIcon() {
  return (
    <Image
      src="/themes/Yaru/window/window-maximize-symbolic.svg"
      alt="Maximize"
      width={16}
      height={16}
    />
  );
}

export function RestoreIcon() {
  return (
    <Image
      src="/themes/Yaru/window/window-restore-symbolic.svg"
      alt="Restore"
      width={16}
      height={16}
    />
  );
}

export function PinIcon() {
  return (
    <Image
      src="/themes/Yaru/window/window-pin-symbolic.svg"
      alt="Pin"
      width={16}
      height={16}
    />
  );
}
