"use client";

import { useSettings } from '../../hooks/useSettings';

export default function PseudoLocalizationBanner() {
  const { pseudoLocale } = useSettings();

  if (!pseudoLocale) return null;

  return (
    <div
      data-pseudo-exempt
      className="pointer-events-none fixed bottom-4 right-4 z-[9999] rounded-md bg-ub-cool-grey/90 px-4 py-2 text-xs text-white shadow-lg"
      role="status"
      aria-live="polite"
    >
      Pseudo localization is active. UI copy is intentionally expanded to expose layout regressions.
    </div>
  );
}
