import React from 'react';

export interface IconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /**
   * Convenience prop to set both width and height simultaneously. If provided,
   * it will be used when explicit width/height props are not supplied.
   */
  size?: number;
}

/**
 * Generic icon component that ensures width/height attributes are provided to
 * prevent layout shift.
 */
export default function Icon({ size, width, height, alt = '', ...rest }: IconProps) {
  const resolvedWidth = width ?? size ?? 16;
  const resolvedHeight = height ?? size ?? 16;

  return <img alt={alt} width={resolvedWidth} height={resolvedHeight} {...rest} />;
}
