import type { ReactNode } from 'react';

export type AppLoadingStateProps = {
  title?: string;
  description?: ReactNode;
};

export type AppLoadErrorProps = {
  title?: string;
  message?: ReactNode;
  onRetry?: () => void;
};

const baseFrame =
  'flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] p-6 text-center text-[color:var(--kali-text)] shadow-sm';

export function AppLoadingState({ title = 'Loading app…', description }: AppLoadingStateProps) {
  return (
    <div className={baseFrame} role="status" aria-live="polite">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-[color:var(--kali-border)] border-t-[color:var(--color-accent)] motion-reduce:animate-none" />
      <div className="space-y-1">
        <p className="text-base font-semibold">{title}</p>
        {description ? (
          <p className="text-sm text-slate-300">{description}</p>
        ) : (
          <p className="text-sm text-slate-400">
            Initializing the experience and preloading assets.
          </p>
        )}
      </div>
    </div>
  );
}

export function AppLoadError({
  title = 'Unable to load this app',
  message = 'Something interrupted the lazy load. Please retry.',
  onRetry,
}: AppLoadErrorProps) {
  return (
    <div className={baseFrame} role="alert" aria-live="assertive">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--color-accent)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-lg text-[color:color-mix(in_srgb,var(--color-accent)_95%,white)]">
        !
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">{title}</p>
        <p className="text-sm text-slate-300">{message}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          className="rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-overlay)] px-4 py-2 text-sm font-medium text-[color:var(--kali-text)] transition hover:-translate-y-[1px] hover:border-[color:color-mix(in_srgb,var(--color-accent)_45%,transparent)] hover:text-[color:var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-panel)]"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
