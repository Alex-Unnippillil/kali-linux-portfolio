import dynamic from 'next/dynamic';

const VSCode = dynamic(() => import('../../apps/vscode'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[480px] w-full items-center justify-center rounded-xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] text-[color:var(--color-text)] shadow-kali-panel">
      <div className="flex w-full max-w-xl flex-col gap-4 px-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium tracking-tight">Launching StackBlitz workspace…</span>
          <span className="h-3 w-3 animate-pulse rounded-full bg-[color:var(--color-primary)]" />
        </div>
        <div className="flex flex-col gap-2 text-xs leading-relaxed opacity-80">
          <span>Loading VS Code shell</span>
          <span className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--kali-panel-border)]">
            <span className="block h-full w-1/3 animate-pulse rounded-full bg-[color:var(--color-primary)]" />
          </span>
        </div>
      </div>
    </div>
  ),
});

export default function VSCodePage() {
  return (
    <div className="flex h-full min-h-screen w-full items-center justify-center bg-[var(--desktop-background,#0f172a)] px-3 py-6">
      <div className="flex h-[min(90vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
        <VSCode />
      </div>
    </div>
  );
}
