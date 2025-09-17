import { forwardRef } from 'react';
import type { ReactNode, SVGProps } from 'react';

const ICON_SIZE_VALUES = [16, 20, 24] as const;
export type IconSize = (typeof ICON_SIZE_VALUES)[number];
export const ICON_SIZES: readonly IconSize[] = ICON_SIZE_VALUES;

const isIconSize = (value: number): value is IconSize =>
  ICON_SIZE_VALUES.some((allowed) => allowed === value);

const normalizeIconSize = (size?: IconSize | number): IconSize => {
  if (typeof size === 'number' && isIconSize(size)) {
    return size;
  }

  return 20;
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  size?: IconSize;
  title?: string;
}

export interface IconBaseProps extends IconProps {
  children: ReactNode;
}

export const IconBase = forwardRef<SVGSVGElement, IconBaseProps>(
  ({ size, title, children, className, role, ...rest }, ref) => {
    const dimension = normalizeIconSize(size);
    const computedRole = role ?? (title ? 'img' : 'presentation');

    return (
      <svg
        ref={ref}
        width={dimension}
        height={dimension}
        viewBox="0 0 24 24"
        className={className}
        aria-hidden={title ? undefined : true}
        focusable="false"
        role={computedRole}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        shapeRendering="geometricPrecision"
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        {children}
      </svg>
    );
  }
);

IconBase.displayName = 'IconBase';
