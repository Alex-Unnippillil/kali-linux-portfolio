import dynamic from 'next/dynamic';

const OpenVASApp = dynamic(() => import('../../apps/openvas'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[color:var(--kali-bg-solid)] p-6 text-[color:var(--kali-terminal-text)]">
      <div
        className="mx-auto max-w-6xl space-y-6"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="space-y-3">
          <div className="h-8 w-2/3 rounded bg-[color:var(--kali-panel-highlight)]/60" />
          <div className="h-4 w-full max-w-lg rounded bg-[color:var(--kali-panel-highlight)]/40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`openvas-skeleton-card-${idx}`}
              className="h-24 rounded-xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)]/40"
            />
          ))}
        </div>
        <div className="space-y-3 rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)]/60 p-4">
          <div className="h-5 w-1/2 rounded bg-[color:var(--kali-panel-highlight)]/40" />
          <div className="h-40 rounded-xl bg-[color:var(--kali-panel-highlight)]/30" />
        </div>
        <div className="space-y-3 rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)]/60 p-4">
          <div className="h-5 w-32 rounded bg-[color:var(--kali-panel-highlight)]/40" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`openvas-skeleton-row-${idx}`}
                className="h-10 rounded-lg bg-[color:var(--kali-panel-highlight)]/30"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
});

export default function OpenVASPage() {
  return <OpenVASApp />;
}

