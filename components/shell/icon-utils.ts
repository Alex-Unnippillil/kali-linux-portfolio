import type { SVGProps } from 'react';

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  title?: string;
};

export function svgA11yProps(
  title: string | undefined,
  role?: IconProps['role'],
  ariaHidden?: IconProps['aria-hidden'],
) {
  const computedRole = role ?? (title ? 'img' : undefined);
  const computedAriaHidden = ariaHidden ?? (title ? undefined : 'true');

  return {
    role: computedRole,
    'aria-hidden': computedAriaHidden,
  } as const;
}
