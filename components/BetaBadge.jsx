import { isBetaEnabled } from '../utils/showBeta';

export default function BetaBadge() {
  if (!isBetaEnabled()) return null;
  return (
    <button
      type="button"
      className="fixed bottom-4 right-4 rounded bg-yellow-500/90 px-2 py-1 text-xs font-semibold text-black"
    >
      Beta
    </button>
  );
}
