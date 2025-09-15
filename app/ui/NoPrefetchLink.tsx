'use client';

import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';
import { forwardRef } from 'react';

type NoPrefetchLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, 'prefetch'>;

const NoPrefetchLink = forwardRef<HTMLAnchorElement, NoPrefetchLinkProps>(
  ({ children, ...props }, ref) => (
    <Link ref={ref} {...props} prefetch={false}>
      {children}
    </Link>
  ),
);

NoPrefetchLink.displayName = 'NoPrefetchLink';

export default NoPrefetchLink;
