import dynamic from 'next/dynamic';

const LoadingState = () => (
  <div className="flex h-full w-full items-center justify-center bg-[var(--kali-bg)] text-[color:var(--kali-text)]">
    <div className="rounded-2xl border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-6 py-5 text-center shadow-inner">
      <p className="text-sm font-semibold uppercase tracking-wide">Preparing John simulator</p>
      <p className="mt-2 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
        Loading offline lab assets…
      </p>
    </div>
  </div>
);

const John = dynamic(() => import('../../apps/john'), {
  ssr: false,
  loading: LoadingState,
});

export default function JohnPage() {
  return <John />;
}
