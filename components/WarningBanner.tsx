import { type CSSProperties, type ReactNode } from 'react';

type WarningVariant = 'info' | 'success' | 'warning' | 'danger';

interface WarningBannerProps {
  children: ReactNode;
  /**
   * Determines the tone of the banner. Defaults to `warning` for legacy usage.
   */
  variant?: WarningVariant;
}

const VARIANT_STYLES: Record<WarningVariant, {
  icon: string;
  background: string;
  border: string;
  accent: string;
  text: string;
}> = {
  info: {
    icon: 'ℹ️',
    background: 'color-mix(in srgb, var(--color-primary) 18%, var(--color-secondary))',
    border: 'color-mix(in srgb, var(--color-primary) 45%, transparent)',
    accent: 'var(--color-primary)',
    text: 'var(--color-text)',
  },
  success: {
    icon: '✅',
    background: 'color-mix(in srgb, var(--game-color-success) 22%, var(--color-secondary))',
    border: 'color-mix(in srgb, var(--game-color-success) 48%, transparent)',
    accent: 'var(--game-color-success)',
    text: 'var(--color-text)',
  },
  warning: {
    icon: '⚠️',
    background: 'color-mix(in srgb, var(--game-color-warning) 24%, var(--color-secondary))',
    border: 'color-mix(in srgb, var(--game-color-warning) 52%, transparent)',
    accent: 'var(--game-color-warning)',
    text: 'var(--color-text)',
  },
  danger: {
    icon: '⛔',
    background: 'color-mix(in srgb, var(--game-color-danger) 28%, var(--color-secondary))',
    border: 'color-mix(in srgb, var(--game-color-danger) 56%, transparent)',
    accent: 'var(--game-color-danger)',
    text: 'var(--color-text)',
  },
};

export default function WarningBanner({ children, variant = 'warning' }: WarningBannerProps) {
  const styles = VARIANT_STYLES[variant];
  const role = variant === 'warning' || variant === 'danger' ? 'alert' : 'status';
  const live = role === 'alert' ? 'assertive' : 'polite';

  return (
    <div
      role={role}
      aria-live={live}
      className="flex items-start gap-3 rounded-md border border-[var(--banner-border)] border-l-4 border-l-[var(--banner-accent)] bg-[var(--banner-bg)] px-3 py-2 text-sm leading-snug text-[var(--banner-text)] shadow-[0_1px_4px_rgba(0,0,0,0.35)]"
      style={{
        '--banner-bg': styles.background,
        '--banner-border': styles.border,
        '--banner-accent': styles.accent,
        '--banner-text': styles.text,
        '--banner-icon': styles.accent,
      } as CSSProperties}
      data-variant={variant}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 text-base leading-none text-[var(--banner-icon)]"
      >
        {styles.icon}
      </span>
      <span className="flex-1">{children}</span>
    </div>
  );
}
