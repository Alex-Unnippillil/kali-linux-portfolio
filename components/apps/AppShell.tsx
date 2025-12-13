import React from 'react';
import clsx from 'clsx';

interface AppShellProps {
  title: string;
  description?: string;
  helpLink?: string;
  helpLabel?: string;
  status?: React.ReactNode;
  children: React.ReactNode;
}

const headerTextClass = 'text-sm font-semibold uppercase tracking-wide text-kali-accent';

export default function AppShell({
  title,
  description,
  helpLink,
  helpLabel = 'Help',
  status,
  children,
}: AppShellProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-kali-border/70 bg-[color:var(--kali-surface)] shadow-kali-panel">
      <div className="flex flex-col gap-4 border-b border-kali-border/60 bg-[color:var(--color-surface-muted)] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 text-[color:var(--kali-text)]">
          <p className={headerTextClass}>{title}</p>
          {description && (
            <p className="text-sm text-[color:color-mix(in_srgb,var(--kali-text)_80%,transparent)]">
              {description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {status && (
            <div className="rounded-lg border border-kali-border/60 bg-[color:var(--kali-dark)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_86%,transparent)] shadow-sm">
              {status}
            </div>
          )}
          {helpLink && (
            <a
              href={helpLink}
              target="_blank"
              rel="noreferrer"
              className={clsx(
                'inline-flex items-center justify-center rounded-lg border border-kali-border/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition',
                'text-[color:var(--color-accent)] hover:bg-[color:color-mix(in_srgb,var(--color-accent)_12%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus',
              )}
            >
              {helpLabel}
            </a>
          )}
        </div>
      </div>
      <div className="p-5 text-[color:var(--kali-text)]">{children}</div>
    </section>
  );
}
