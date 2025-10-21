import React from 'react';
import clsx from 'clsx';

export interface SectionPanelProps extends React.HTMLAttributes<HTMLElement> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  leadingIcon?: React.ReactNode;
  spacing?: 'sm' | 'md' | 'lg';
  as?: 'section' | 'div';
}

const spacingMap: Record<NonNullable<SectionPanelProps['spacing']>, string> = {
  sm: 'px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6',
  md: 'px-5 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8',
  lg: 'px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12',
};

const SectionPanel = React.forwardRef<HTMLElement, SectionPanelProps>(
  (
    {
      title,
      subtitle,
      leadingIcon,
      className,
      children,
      spacing = 'md',
      as: Component = 'section',
      ...rest
    },
    ref,
  ) => {
    return (
      <Component
        ref={ref}
        className={clsx(
          'relative isolate rounded-2xl border border-kali-border/40 bg-kali-panel-dark/80 text-white shadow-kali-panel backdrop-blur-xl',
          'transition-transform duration-200 ease-out hover:shadow-black/50',
          spacingMap[spacing],
          className,
        )}
        {...rest}
      >
        {(title || subtitle || leadingIcon) && (
          <header className="mb-4 flex flex-wrap items-center gap-3">
            {leadingIcon && (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-kali-panel-dark/70 text-ubt-blue shadow-inner">
                {leadingIcon}
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-1">
              {title && <h2 className="kali-heading-lg break-words">{title}</h2>}
              {subtitle && <p className="kali-body-muted break-words">{subtitle}</p>}
            </div>
          </header>
        )}
        <div className="space-y-4 text-left">{children}</div>
      </Component>
    );
  },
);

SectionPanel.displayName = 'SectionPanel';

export default SectionPanel;
