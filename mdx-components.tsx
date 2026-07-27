import type { ComponentProps, ComponentType } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const FALLBACK_IMAGE_DIMENSIONS = {
  width: 1200,
  height: 630,
} as const;

type MDXComponentMap = Record<string, ComponentType<unknown>>;

type AnchorProps = ComponentProps<'a'>;
type ImageProps = ComponentProps<'img'>;

function parseDimension(value?: number | string): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function useMDXComponents(
  components: MDXComponentMap = {},
): MDXComponentMap {
  return {
    ...components,
    a: ({ href, ...props }: AnchorProps) => (
      <Link href={href ?? '#'} prefetch={false} {...props} />
    ),
    img: ({
      alt,
      src,
      width,
      height,
      style,
      ...props
    }: ImageProps) => {
      if (!src) {
        return null;
      }

      const resolvedWidth = parseDimension(width);
      const resolvedHeight = parseDimension(height);

      if (resolvedWidth && resolvedHeight) {
        return (
          <Image
            src={src}
            alt={alt ?? ''}
            width={resolvedWidth}
            height={resolvedHeight}
            style={style ?? undefined}
            {...props}
          />
        );
      }

      return (
        <Image
          src={src}
          alt={alt ?? ''}
          width={FALLBACK_IMAGE_DIMENSIONS.width}
          height={FALLBACK_IMAGE_DIMENSIONS.height}
          style={{ width: '100%', height: 'auto', ...(style ?? {}) }}
          {...props}
        />
      );
    },
  };
}
