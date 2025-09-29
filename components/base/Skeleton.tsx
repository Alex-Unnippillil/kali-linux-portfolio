import React from 'react';

interface SkeletonProps {
  /**
   * Optional className to further customize the skeleton container. This keeps
   * the base styling consistent with the Kali desktop theme while allowing
   * individual apps to tweak sizing if they need to.
   */
  className?: string;
  /**
   * Accessible label announced by screen readers. Defaults to a generic
   * "Loading" message when not provided.
   */
  label?: string;
}

const baseClasses = [
  'flex h-full min-h-[120px] w-full items-center justify-center',
  'rounded-md border border-kali-border/60 bg-kali-surface/50',
  'text-kali-muted motion-safe:animate-pulse',
].join(' ');

const Skeleton: React.FC<SkeletonProps> = ({ className = '', label = 'Loading' }) => {
  const classes = className ? `${baseClasses} ${className}` : baseClasses;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={classes}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-3 w-3 rounded-full bg-kali-accent motion-safe:animate-ping" aria-hidden />
        <span className="text-sm font-medium tracking-wide uppercase text-kali-muted">
          {label}
        </span>
      </div>
      <span className="sr-only">{`${label} content`}</span>
    </div>
  );
};

export default Skeleton;
