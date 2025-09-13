import Image from 'next/image';

export function CloseIcon() {
  return (
    <Image
      src="/themes/Kali/window/window-close-symbolic.svg"
      alt="Close"
      width={16}
      height={16}
    />
  );
}

export function MinimizeIcon() {
  return (
    <Image
      src="/themes/Kali/window/window-minimize-symbolic.svg"
      alt="Minimize"
      width={16}
      height={16}
    />
  );
}

export function MaximizeIcon() {
  return (
    <Image
      src="/themes/Kali/window/window-maximize-symbolic.svg"
      alt="Maximize"
      width={16}
      height={16}
    />
  );
}

export function RestoreIcon() {
  return (
    <Image
      src="/themes/Kali/window/window-restore-symbolic.svg"
      alt="Restore"
      width={16}
      height={16}
    />
  );
}

export function PinIcon() {
  return (
    <Image
      src="/themes/Kali/window/window-pin-symbolic.svg"
      alt="Pin"
      width={16}
      height={16}
    />
  );
}
