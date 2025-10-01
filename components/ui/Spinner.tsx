import React from 'react';
import clsx from 'clsx';
import { useBusyParent } from './useBusyIndicator';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  active?: boolean;
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, children, label = 'Loading', active = true, ...props }, ref) => {
    const attachRef = useBusyParent<HTMLDivElement>(active, ref);

    if (!active) return null;

    return (
      <div
        {...props}
        ref={attachRef}
        role="status"
        aria-live="polite"
        className={clsx('inline-flex items-center gap-2 text-sm text-white/80', className)}
      >
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
        {children}
        <span className="sr-only">{label}</span>
      </div>
    );
  },
);

Spinner.displayName = 'Spinner';

export default Spinner;
