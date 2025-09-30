import { forwardRef } from 'react';
import NextImage, { type ImageProps as NextImageProps } from 'next/image';

const MOBILE_MAX_WIDTH = 640;
const TABLET_MAX_WIDTH = 1024;
const DEFAULT_RESPONSIVE_SIZES = `(max-width: ${MOBILE_MAX_WIDTH}px) 100vw, (max-width: ${TABLET_MAX_WIDTH}px) 50vw, 640px`;
const DEFAULT_FILL_SIZES = `(max-width: ${MOBILE_MAX_WIDTH}px) 100vw, 100vw`;

function resolveSizes({
  sizes,
  width,
  fill,
}: Pick<NextImageProps, 'sizes' | 'width' | 'fill'>): NextImageProps['sizes'] {
  if (sizes) return sizes;
  if (fill) return DEFAULT_FILL_SIZES;

  if (typeof width === 'number') {
    if (width <= 256) {
      return `${width}px`;
    }

    return `(max-width: ${MOBILE_MAX_WIDTH}px) 100vw, ${width}px`;
  }

  return DEFAULT_RESPONSIVE_SIZES;
}

export type ImageProps = NextImageProps;

const Image = forwardRef<HTMLImageElement, NextImageProps>(function Image(
  { priority, loading, sizes, width, fill, ...rest },
  ref,
) {
  const computedSizes = resolveSizes({ sizes, width, fill });
  const computedLoading = priority ? undefined : loading ?? 'lazy';

  return (
    <NextImage
      ref={ref}
      priority={priority}
      loading={computedLoading}
      sizes={computedSizes}
      width={width}
      fill={fill}
      {...rest}
    />
  );
});

export default Image;
