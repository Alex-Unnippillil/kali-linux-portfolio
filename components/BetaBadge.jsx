export default function BetaBadge() {
  if (process.env.NEXT_PUBLIC_SHOW_BETA !== '1') return null;
  return (
    <button
      type="button"
      className="beta-badge fixed rounded bg-yellow-500/90 px-2 py-1 text-xs font-semibold text-black"
    >
      Beta
    </button>
  );
}
