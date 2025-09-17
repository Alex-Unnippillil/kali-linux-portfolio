import { useId } from 'react';
import type { SVGProps } from 'react';

export type SpriteIconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  /**
   * Symbol identifier inside the shared sprite sheet.
   */
  symbol: string;
  /**
   * Accessible label for assistive technology. When omitted the icon will be marked as decorative.
   */
  label?: string;
  /**
   * Convenience size applied to both width and height when explicit values are not provided.
   */
  size?: number;
  /**
   * ViewBox matching the symbol definition inside the sprite.
   */
  viewBox: string;
};

export function SpriteIcon({
  symbol,
  label,
  size = 16,
  className,
  width,
  height,
  role,
  focusable,
  viewBox,
  ...svgProps
}: SpriteIconProps) {
  const titleId = useId();
  const labelledBy = svgProps['aria-labelledby'] ?? (label ? titleId : undefined);
  const ariaHidden = svgProps['aria-hidden'] ?? (label ? undefined : true);
  const finalRole = role ?? (label ? 'img' : undefined);

  return (
    <svg
      {...svgProps}
      className={className}
      width={width ?? size}
      height={height ?? size}
      viewBox={viewBox}
      role={finalRole}
      aria-hidden={ariaHidden}
      aria-labelledby={labelledBy}
      focusable={focusable ?? false}
    >
      {label ? <title id={titleId}>{label}</title> : null}
      <use href={`/sprite.svg#${symbol}`} />
    </svg>
  );
}
