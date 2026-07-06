import React from 'react';

export interface EmptyStateProps {
  /**
   * Optional icon displayed above the message. Use decorative icons with `aria-hidden` when possible.
   */
  icon?: React.ReactNode;
  /**
   * Accessible label announced for the icon. When omitted, the icon is treated as decorative.
   */
  iconLabel?: string;
  /**
   * Primary heading for the empty state message.
   */
  title?: React.ReactNode;
  /**
   * Helper copy displayed under the title. Can contain links or inline emphasis.
   */
  helperText?: React.ReactNode;
  /**
   * Action element, typically a button or link, rendered beneath the message.
   */
  action?: React.ReactNode;
  /**
   * Additional class names to merge with the default layout.
   */
  className?: string;
  /**
   * Optional additional content placed between the title and helper text.
   */
  children?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  iconLabel,
  title,
  helperText,
  action,
  className = '',
  children,
}) => {
  return (
    <section
      role="status"
      aria-live="polite"
      className={`flex w-full max-w-xl flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-12 text-center shadow-[0_25px_60px_rgba(0,0,0,0.35)] transition-colors ${className}`.trim()}
    >
      {icon ? (
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] text-3xl text-[var(--color-accent)]"
          aria-hidden={iconLabel ? undefined : true}
          role={iconLabel ? 'img' : undefined}
          aria-label={iconLabel}
        >
          {icon}
        </div>
      ) : null}
      <div className="space-y-2">
        {title ? (
          <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
        ) : null}
        {children}
        {helperText ? (
          <p className="mx-auto max-w-md text-sm text-[var(--color-text)] opacity-80">{helperText}</p>
        ) : null}
      </div>
      {action ? (
        <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>
      ) : null}
    </section>
  );
};

export default EmptyState;
