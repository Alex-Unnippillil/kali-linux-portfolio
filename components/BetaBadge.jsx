export default function BetaBadge() {
  if (process.env.NEXT_PUBLIC_SHOW_BETA !== '1') return null;
  return (
    <button
      type="button"
      aria-label="Beta program indicator"
      title="Beta"
      className="fixed bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded bg-yellow-500/90 text-xs font-semibold text-black shadow-sm transition-transform sm:w-auto sm:px-2 sm:py-1"
    >
      <span aria-hidden="true" className="text-base leading-none sm:hidden">
        β
      </span>
      <span className="hidden sm:inline">Beta</span>
    </button>
  );
}
