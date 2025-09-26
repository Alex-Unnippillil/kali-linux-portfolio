import React, { forwardRef } from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-kali-primary text-kali-inverse shadow-sm hover:bg-kali-primary/90',
  secondary:
    'bg-kali-secondary text-kali-text border border-[color:var(--color-border)] hover:bg-kali-secondary/80',
  ghost:
    'bg-transparent text-kali-text hover:bg-kali-primary/10 border border-transparent focus-visible:bg-kali-primary/10',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className, variant = 'primary', loading = false, disabled, type = 'button', ...props },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        'inline-flex min-h-[var(--hit-area)] min-w-[var(--hit-area)] items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 py-2 font-medium transition-colors duration-[var(--motion-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-variant={variant}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      <span className={clsx('whitespace-nowrap', loading && 'opacity-90')}>{children}</span>
    </button>
  );
});

export default Button;
