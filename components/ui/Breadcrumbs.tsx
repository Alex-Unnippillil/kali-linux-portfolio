import React from 'react';

export interface BreadcrumbSegment {
  name: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbsProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  path: BreadcrumbSegment[];
  onNavigate?: (index: number) => void;
  separator?: React.ReactNode;
  ariaLabel?: string;
}

const DEFAULT_SEPARATOR = '/';

const DEFAULT_STYLE: React.CSSProperties = {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- CSS custom properties
  ['--breadcrumb-fg' as string]: 'rgba(255, 255, 255, 0.92)',
  // eslint-disable-next-line @typescript-eslint/naming-convention -- CSS custom properties
  ['--breadcrumb-muted' as string]: 'rgba(255, 255, 255, 0.55)',
  // eslint-disable-next-line @typescript-eslint/naming-convention -- CSS custom properties
  ['--breadcrumb-hover-bg' as string]: 'rgba(255, 255, 255, 0.12)',
  // eslint-disable-next-line @typescript-eslint/naming-convention -- CSS custom properties
  ['--breadcrumb-active-bg' as string]: 'rgba(255, 255, 255, 0.18)',
};

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  path,
  onNavigate,
  separator = DEFAULT_SEPARATOR,
  className = '',
  ariaLabel,
  style,
  ...rest
}) => {
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  React.useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, path.length);
  }, [path.length]);

  const focusAt = React.useCallback((index: number) => {
    const node = itemRefs.current[index];
    if (node) {
      node.focus();
    }
  }, []);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (!onNavigate) return;

      const { key } = event;
      if (key === 'ArrowRight' || key === 'ArrowDown') {
        event.preventDefault();
        if (index < path.length - 1) focusAt(index + 1);
      } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
        event.preventDefault();
        if (index > 0) focusAt(index - 1);
      } else if (key === 'Home') {
        event.preventDefault();
        focusAt(0);
      } else if (key === 'End') {
        event.preventDefault();
        focusAt(path.length - 1);
      }
    },
    [focusAt, onNavigate, path.length]
  );

  if (!path.length) {
    return null;
  }

  const mergedStyle = React.useMemo(() => ({ ...DEFAULT_STYLE, ...style }), [style]);
  const ariaFromRest = (rest as { 'aria-label'?: string })['aria-label'];
  const navAriaLabel = ariaLabel ?? ariaFromRest ?? 'Breadcrumb';

  return (
    <nav
      {...rest}
      aria-label={navAriaLabel}
      className={`inline-flex min-w-0 items-center ${className}`}
      style={mergedStyle}
    >
      <ol
        className="flex min-w-0 items-center gap-1 text-xs text-[color:var(--breadcrumb-fg)] sm:text-sm"
        role="list"
      >
        {path.map((segment, index) => {
          const label = segment.name || '/';
          const isCurrent = index === path.length - 1;
          const interactive = typeof onNavigate === 'function';
          const separatorNode = index < path.length - 1 ? (
            <span
              key={`separator-${index}`}
              className="text-[color:var(--breadcrumb-muted)]"
              aria-hidden="true"
            >
              {separator}
            </span>
          ) : null;

          const commonContent = (
            <>
              {segment.icon && <span className="mr-1 flex-shrink-0">{segment.icon}</span>}
              <span className="truncate">{label}</span>
            </>
          );

          return (
            <li key={`${label}-${index}`} className="flex min-w-0 items-center gap-1">
              {interactive ? (
                <button
                  type="button"
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  onClick={() => onNavigate(index)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  className={`inline-flex max-w-[10rem] items-center gap-1 rounded px-2 py-1 text-left font-medium text-[color:var(--breadcrumb-fg)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    isCurrent
                      ? 'bg-[color:var(--breadcrumb-active-bg)] shadow-inner'
                      : 'hover:bg-[color:var(--breadcrumb-hover-bg)] focus-visible:bg-[color:var(--breadcrumb-hover-bg)]'
                  }`}
                  aria-current={isCurrent ? 'page' : undefined}
                  title={label}
                >
                  {commonContent}
                </button>
              ) : (
                <span
                  className={`inline-flex max-w-[10rem] items-center gap-1 rounded px-2 py-1 text-left font-medium ${
                    isCurrent
                      ? 'bg-[color:var(--breadcrumb-active-bg)] text-[color:var(--breadcrumb-fg)]'
                      : 'text-[color:var(--breadcrumb-muted)]'
                  }`}
                  title={label}
                >
                  {commonContent}
                </span>
              )}
              {separatorNode}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
