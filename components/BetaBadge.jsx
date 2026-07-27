export default function BetaBadge() {
  if (process.env.NEXT_PUBLIC_SHOW_BETA !== '1') return null;
  return (
    <button
      type="button"
      aria-label="Beta"
      className="fixed bottom-4 right-4 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-lg backdrop-blur-sm"
      style={{
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 6px 18px color-mix(in srgb, var(--color-inverse), transparent 82%)',
      }}
    >
      Beta
    </button>
  );
}
