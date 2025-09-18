import React from 'react';

type ContextMenuItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Indent content when an icon placeholder is present */
  inset?: boolean;
};

const ContextMenuItem = React.forwardRef<HTMLButtonElement, ContextMenuItemProps>(
  ({ className = '', children, disabled, inset, type = 'button', ...props }, ref) => {
    const classes = [
      'interactive-surface',
      'w-full',
      'text-left',
      'cursor-default',
      'px-3',
      'py-1',
      'rounded',
      'text-sm',
      'mb-1.5',
      inset ? 'pl-8' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        {...props}
        ref={ref}
        type={type}
        role={props.role ?? 'menuitem'}
        disabled={disabled}
        aria-disabled={disabled || props['aria-disabled'] ? true : undefined}
        data-disabled={disabled ? 'true' : undefined}
        className={classes}
      >
        {children}
      </button>
    );
  },
);

ContextMenuItem.displayName = 'ContextMenuItem';

export default ContextMenuItem;
