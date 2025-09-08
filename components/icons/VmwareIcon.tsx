import Image from 'next/image';

export function VmwareIcon({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/icons/platforms/vmware.svg"
      alt="VMware"
      width={size}
      height={size}
    />
  );
}
