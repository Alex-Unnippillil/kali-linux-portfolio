export default function BetaBadge({ className = '' }) {
  if (process.env.NEXT_PUBLIC_SHOW_BETA !== '1') return null;
  return (
    <button
      type="button"
      className={`pointer-events-auto rounded bg-yellow-500/90 px-2 py-1 text-xs font-semibold text-black shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300 ${className}`}
    >
      Beta
    </button>
  );
}
