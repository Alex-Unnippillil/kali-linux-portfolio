import type { MDXComponents } from 'mdx/types';
import type { AnchorHTMLAttributes, ComponentProps } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const DEFAULT_IMAGE_WIDTH = 800;
const DEFAULT_IMAGE_HEIGHT = 600;

type NextImageProps = ComponentProps<typeof Image>;
type MDXImageProps = {
  src?: NextImageProps['src'];
  alt?: string;
  width?: NextImageProps['width'] | string;
  height?: NextImageProps['height'] | string;
} & Omit<NextImageProps, 'src' | 'alt' | 'width' | 'height'>;

const resolveDimension = (
  value: MDXImageProps['width'] | MDXImageProps['height'],
  fallback: number,
): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => {
      if (!href) {
        return (
          <a href={href} {...props}>
            {children}
          </a>
        );
      }

      return (
        <Link href={href} prefetch={false} {...props}>
          {children}
        </Link>
      );
    },
    img: ({ src, alt = '', width, height, ...props }: MDXImageProps) => {
      if (!src) {
        return <></>;
      }

      const defaultWidth =
        typeof src === 'object' && 'width' in src && typeof src.width === 'number'
          ? src.width
          : DEFAULT_IMAGE_WIDTH;

      const defaultHeight =
        typeof src === 'object' && 'height' in src && typeof src.height === 'number'
          ? src.height
          : DEFAULT_IMAGE_HEIGHT;

      const resolvedWidth = resolveDimension(width, defaultWidth);
      const resolvedHeight = resolveDimension(height, defaultHeight);

      return (
        <Image
          src={src}
          alt={alt}
          width={resolvedWidth}
          height={resolvedHeight}
          {...props}
        />
      );
    },
    ...components,
  };
}
