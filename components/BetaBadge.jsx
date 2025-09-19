import { SHOW_BETA_BADGE } from '@/env.client';

export default function BetaBadge() {
  if (!SHOW_BETA_BADGE) return null;
  return (
    <button
      type="button"
      className="fixed bottom-4 right-4 rounded bg-yellow-500/90 px-2 py-1 text-xs font-semibold text-black"
    >
      Beta
    </button>
  );
}
