import DelayedTooltip from '../ui/DelayedTooltip';
import { useLabMode } from './LabMode';

function BetaBadgeButton({ triggerProps }) {
  return (
    <button
      type="button"
      {...(triggerProps ?? {})}
      className="fixed bottom-4 right-4 rounded bg-yellow-500/90 px-2 py-1 text-xs font-semibold text-black shadow-lg focus:outline-none focus:ring-2 focus:ring-ub-orange focus:ring-offset-2 focus:ring-offset-black"
    >
      Beta
    </button>
  );
}

export default function BetaBadge() {
  const { featureFlags } = useLabMode();

  if (!featureFlags.betaBadge) {
    return null;
  }

  if (featureFlags.betaTooltip) {
    return (
      <DelayedTooltip content={<span className="block max-w-xs text-left">{featureFlags.betaTooltip}</span>}>
        {(triggerProps) => <BetaBadgeButton triggerProps={triggerProps} />}
      </DelayedTooltip>
    );
  }

  return <BetaBadgeButton />;
}
