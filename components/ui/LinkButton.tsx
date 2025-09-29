import Link, { LinkProps } from 'next/link';
import React from 'react';

import { ButtonVariant, buttonClasses } from './Button';

export interface LinkButtonProps
  extends LinkProps,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  variant?: ButtonVariant;
}

const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ variant = 'primary', className, children, ...props }, ref) => (
    <Link ref={ref} className={buttonClasses(variant, className)} {...props}>
      {children}
    </Link>
  ),
);

LinkButton.displayName = 'LinkButton';

export default LinkButton;
