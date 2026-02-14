'use client';

import Link from 'next/link';
import { forwardRef, type ComponentProps, type MouseEvent } from 'react';

import { withViewTransition } from './withViewTransition';

export type VTLinkProps = ComponentProps<typeof Link>;

const isModifiedEvent = (event: MouseEvent<HTMLAnchorElement>): boolean => {
  const target = event.currentTarget.getAttribute('target');

  return (
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    (target !== null && target !== '_self') ||
    event.currentTarget.hasAttribute('download')
  );
};

const VTLink = forwardRef<HTMLAnchorElement, VTLinkProps>(
  ({ onClick, ...props }, ref) => {
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);

      if (event.defaultPrevented || isModifiedEvent(event)) {
        return;
      }

      void withViewTransition();
    };

    return <Link ref={ref} {...props} onClick={handleClick} />;
  }
);

VTLink.displayName = 'VTLink';

export default VTLink;
