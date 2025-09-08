import type { HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {}

export default function Badge({ className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-block rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-xs font-semibold text-[var(--color-inverse)] ${className}`}
      {...props}
    />
  );
}
