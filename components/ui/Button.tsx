import type { ButtonHTMLAttributes, CSSProperties } from "react";

export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "tertiary"
  | "ghost"
  | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  default: {
    "--btn-bg": "var(--color-muted)",
    "--btn-text": "var(--color-text)",
  },
  primary: {
    "--btn-bg": "var(--color-primary)",
    "--btn-text": "var(--color-inverse)",
  },
  secondary: {
    "--btn-bg": "var(--color-secondary)",
    "--btn-text": "var(--color-text)",
  },
  tertiary: {
    "--btn-bg": "var(--color-tertiary)",
    "--btn-text": "var(--color-text)",
  },
  ghost: {
    "--btn-bg": "transparent",
    "--btn-text": "var(--color-primary)",
    border: "1px solid transparent",
  },
  danger: {
    "--btn-bg": "var(--game-color-danger)",
    "--btn-text": "var(--color-text)",
  },
};

export default function Button({
  variant = "default",
  className = "",
  style,
  ...props
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  return (
    <button
      className={`btn focus-outline ${className}`}
      style={{ ...variantStyle, ...style }}
      {...props}
    />
  );
}
