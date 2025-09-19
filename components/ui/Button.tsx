"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";

const variantStyles = {
  primary:
    "bg-ubt-blue text-white hover:bg-ubt-blue/90 focus-visible:outline-ubt-blue disabled:bg-ubt-blue/70",
  secondary:
    "bg-ub-cool-grey text-white hover:bg-ub-cool-grey/90 focus-visible:outline-ub-cool-grey disabled:bg-ub-cool-grey/70",
  ghost: "bg-transparent text-white hover:bg-white/10 focus-visible:outline-white disabled:text-white/70",
  destructive:
    "bg-ub-red text-white hover:bg-ub-red/90 focus-visible:outline-ub-red disabled:bg-ub-red/70",
} as const;

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base",
} as const;

export type ButtonVariant = keyof typeof variantStyles;
export type ButtonSize = keyof typeof sizeStyles;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      type,
      ...props
    },
    ref,
  ) => {
    const isDisabled = Boolean(disabled || loading);

    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={clsx(
          "relative inline-flex items-center justify-center rounded-md border border-transparent font-medium transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60 data-[loading=true]:cursor-wait",
          "min-h-[32px] min-w-[32px] select-none whitespace-nowrap",
          variantStyles[variant],
          sizeStyles[size],
          loading && "opacity-80",
          className,
        )}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        data-loading={loading || undefined}
        {...props}
      >
        {loading && (
          <span
            aria-hidden
            className="mr-2 inline-flex h-4 w-4 items-center justify-center"
          >
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </span>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
