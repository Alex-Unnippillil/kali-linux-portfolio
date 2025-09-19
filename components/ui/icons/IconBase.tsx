import { forwardRef } from 'react';
import type { SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  /**
   * Size of the rendered icon in pixels. Defaults to 24px to maintain a shared baseline.
   */
  size?: number;
  /**
   * Shared stroke width across the system. Defaults to 1.5 to match the Kali UI styling.
   */
  strokeWidth?: number;
}

const IconBase = forwardRef<SVGSVGElement, IconProps>(function IconBase(
  { size = 24, strokeWidth = 1.5, children, className, ...rest },
  ref,
) {
  return (
    <svg
      ref={ref}
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
});

export default IconBase;
