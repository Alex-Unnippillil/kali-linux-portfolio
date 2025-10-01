import React from 'react';
import clsx from 'clsx';
import { useBusyParent } from './useBusyIndicator';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    const attachRef = useBusyParent<HTMLDivElement>(true, ref);
    return (
      <div
        {...props}
        ref={attachRef}
        role="img"
        aria-hidden="true"
        className={clsx('animate-pulse rounded bg-white/10', className)}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';

export default Skeleton;
