import Image from 'next/image';
import { DEFAULT_BLUR_DATA_URL } from '@/utils/imagePlaceholder';

export function CloseIcon() {
  return (
    <Image
      src="/themes/Yaru/window/window-close-symbolic.svg"
      alt="Close"
      width={16}
      height={16}
      placeholder="blur"
      blurDataURL={DEFAULT_BLUR_DATA_URL}
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
      placeholder="blur"
      blurDataURL={DEFAULT_BLUR_DATA_URL}
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
      placeholder="blur"
      blurDataURL={DEFAULT_BLUR_DATA_URL}
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
      placeholder="blur"
      blurDataURL={DEFAULT_BLUR_DATA_URL}
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
      placeholder="blur"
      blurDataURL={DEFAULT_BLUR_DATA_URL}
    />
  );
}
