'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

const baseClasses =
  'inline-flex items-center justify-center font-medium rounded transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 min-h-[44px] min-w-[44px] px-4 py-2';

const variantClasses: Record<string, string> = {
  primary:
    'bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:shadow-[0_0_8px_var(--color-accent)]',
  secondary:
    'border border-[var(--color-accent)] text-[var(--color-accent)] hover:shadow-[0_0_8px_var(--color-accent)]',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', ...props }, ref) => {
    const classes = `${baseClasses} ${variantClasses[variant]} ${className}`.trim();
    return <button ref={ref} className={classes} {...props} />;
  }
);

Button.displayName = 'Button';

export default Button;
