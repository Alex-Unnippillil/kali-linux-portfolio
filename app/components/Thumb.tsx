import Image from 'next/image';
import type { ComponentPropsWithoutRef } from 'react';

const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTYwIDEyMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCIgeDI9IjEiIHkxPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjMWYyOTMzIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMTExODI3Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjE2MCIgaGVpZ2h0PSIxMjAiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=';

type ThumbProps = Omit<
  ComponentPropsWithoutRef<typeof Image>,
  'width' | 'height' | 'placeholder' | 'blurDataURL'
>;

export default function Thumb(props: ThumbProps) {
  return (
    <Image
      width={160}
      height={120}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      {...props}
    />
  );
}
