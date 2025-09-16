import type { ReactNode, SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;

interface IconBaseProps extends IconProps {
  children: ReactNode;
}

export function IconBase({
  children,
  strokeWidth = 1.5,
  role = 'img',
  focusable,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  ...rest
}: IconBaseProps) {
  const computedAriaHidden = ariaLabel ? ariaHidden ?? undefined : ariaHidden ?? true;
  const computedFocusable = ariaLabel ? focusable : focusable ?? false;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      role={role}
      focusable={computedFocusable}
      aria-label={ariaLabel}
      aria-hidden={computedAriaHidden}
      {...rest}
    >
      {children}
    </svg>
  );
}
