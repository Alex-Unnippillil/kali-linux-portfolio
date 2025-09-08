import Image from 'next/image';

export function CloudIcon({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/icons/platforms/cloud.svg"
      alt="Cloud"
      width={size}
      height={size}
    />
  );
}
