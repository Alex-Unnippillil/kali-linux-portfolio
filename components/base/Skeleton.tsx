import type { HTMLAttributes } from 'react';

const join = (
  ...classes: Array<string | false | null | undefined>
): string => classes.filter(Boolean).join(' ');

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      {...props}
      className={join(
        'relative overflow-hidden bg-white/10 motion-safe:animate-pulse',
        className
      )}
    />
  );
}

export interface ListSkeletonProps {
  count?: number;
  className?: string;
  itemClassName?: string;
  icon?: 'circle' | 'square' | 'none';
  lines?: number;
  orientation?: 'horizontal' | 'vertical';
}

export function ListSkeleton({
  count = 5,
  className = '',
  itemClassName = '',
  icon = 'none',
  lines = 2,
  orientation = 'horizontal',
}: ListSkeletonProps) {
  const containerClasses = join('list-none space-y-2 p-0', className);
  const baseItemClass =
    orientation === 'vertical' ? 'flex flex-col gap-2' : 'flex items-start gap-3';

  return (
    <ul className={containerClasses} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <li key={index} className={join(baseItemClass, itemClassName)}>
          {icon !== 'none' ? (
            <Skeleton
              className={join(
                icon === 'circle' ? 'h-10 w-10 rounded-full' : 'h-10 w-10 rounded',
                'flex-shrink-0'
              )}
            />
          ) : null}
          <div className="flex-1 space-y-2">
            {Array.from({ length: lines }).map((__, lineIndex) => (
              <Skeleton
                key={lineIndex}
                className={join(
                  'h-3 rounded',
                  lineIndex === 0
                    ? 'w-3/4'
                    : lineIndex === lines - 1
                      ? 'w-2/3'
                      : 'w-full'
                )}
              />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface GridSkeletonProps {
  count?: number;
  className?: string;
  itemClassName?: string;
  mediaClassName?: string | null;
  lines?: number;
}

export function GridSkeleton({
  count = 6,
  className = '',
  itemClassName = '',
  mediaClassName = 'h-10 w-10 rounded',
  lines = 2,
}: GridSkeletonProps) {
  return (
    <div className={join('grid gap-4', className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={join('flex items-center justify-between gap-3', itemClassName)}>
          <div className="flex-1 space-y-2">
            {Array.from({ length: lines }).map((__, lineIndex) => (
              <Skeleton
                key={lineIndex}
                className={join(
                  'h-3 rounded',
                  lineIndex === 0
                    ? 'w-3/4'
                    : lineIndex === lines - 1
                      ? 'w-2/3'
                      : 'w-full'
                )}
              />
            ))}
          </div>
          {mediaClassName ? <Skeleton className={join(mediaClassName)} /> : null}
        </div>
      ))}
    </div>
  );
}
