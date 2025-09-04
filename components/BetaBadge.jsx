import { useEffect, useState } from "react";

export default function BetaBadge() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("betaBadgeDismissed");
      if (stored === "1") setDismissed(true);
    } catch {
      // localStorage might be unavailable; ignore
    }
  }, []);

  if (process.env.NEXT_PUBLIC_SHOW_BETA !== "1" || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem("betaBadgeDismissed", "1");
    } catch {
      // localStorage might be unavailable; ignore
    }
  };

  return (
    <div className="fixed bottom-[var(--space-4)] right-[var(--space-4)] flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] bg-ubt-gedit-orange px-[var(--space-2)] py-[var(--space-1)] text-xs font-semibold text-ubt-cool-grey">
      <span role="status" aria-live="polite">
        Beta
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss beta badge"
        className="rounded-[var(--radius-sm)] p-[var(--space-1)] focus:outline-none focus:ring-2 focus:ring-ubt-blue"
      >
        ×
      </button>
    </div>
  );
}
