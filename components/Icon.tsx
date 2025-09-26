'use client';

import Image from 'next/image';
import type { ComponentProps } from 'react';
import { getIconDefinition } from '../lib/icon-registry';

type ImageLikeProps = Pick<
  ComponentProps<typeof Image>,
  'className' | 'priority' | 'style' | 'onLoadingComplete' | 'quality'
> & {
  'aria-hidden'?: boolean;
};

export type IconProps = ImageLikeProps & {
  name: string;
  size?: number;
  alt?: string;
};

export function Icon({ name, size = 14, alt, className, ...rest }: IconProps) {
  const definition = getIconDefinition(name);

  if (!definition) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Icon \"${name}\" not found in registry.`);
    }
    return null;
  }

  const resolvedAlt = alt ?? definition.alt ?? name;

  return (
    <Image
      src={definition.src}
      alt={resolvedAlt}
      width={size}
      height={size}
      className={className}
      {...rest}
    />
  );
}
