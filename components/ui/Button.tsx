import clsx from 'clsx';
import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link';

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-kali-dark disabled:pointer-events-none disabled:opacity-60 px-3 py-2';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-ub-orange text-black border-transparent shadow-sm hover:bg-[#ffb347] focus-visible:ring-offset-ub-dark-grey disabled:bg-ub-orange/70 disabled:text-black/70',
  secondary:
    'bg-ub-cool-grey text-white border border-white/10 hover:bg-ub-grey focus-visible:ring-offset-ub-dark-grey disabled:bg-ub-cool-grey/70 disabled:text-white/80',
  ghost:
    'bg-transparent text-inherit border-transparent hover:bg-white/10 focus-visible:ring-offset-transparent disabled:text-ubt-grey/70',
  destructive:
    'bg-red-600 text-white border-transparent shadow-sm hover:bg-red-500 focus-visible:ring-offset-ub-dark-grey disabled:bg-red-700/60 disabled:text-white/80',
  link:
    'bg-transparent border-transparent px-0 py-0 text-ubb-orange underline underline-offset-4 hover:text-orange-200 hover:underline focus-visible:ring-offset-0 focus-visible:ring-offset-transparent disabled:no-underline disabled:text-ubt-grey disabled:hover:text-ubt-grey',
};

export const buttonClasses = (variant: ButtonVariant, className?: string) =>
  clsx(baseClasses, variantClasses[variant], className);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', type = 'button', className, ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClasses(variant, className)} {...props} />
  ),
);

Button.displayName = 'Button';

export default Button;
