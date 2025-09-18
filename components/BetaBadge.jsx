export default function BetaBadge() {
  if (process.env.NEXT_PUBLIC_SHOW_BETA !== '1') return null;
  return (
    <button
      type="button"
      className="btn btn--warning btn--dense fixed bottom-4 right-4 text-xs font-semibold"
    >
      Beta
    </button>
  );
}
