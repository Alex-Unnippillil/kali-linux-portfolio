import Image from 'next/image';

export function UsbIcon({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/icons/platforms/usb.svg"
      alt="USB"
      width={size}
      height={size}
    />
  );
}
