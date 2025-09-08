'use client';

import { useSettings } from '@/hooks/useSettings';

export default function HighContrastToggle() {
  const { highContrast, setHighContrast } = useSettings();
  return (
    <button
      type="button"
      onClick={() => setHighContrast(!highContrast)}
      className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:right-0 focus:z-50 focus:p-2 focus:bg-white focus:text-black"
    >
      {highContrast ? 'Disable high contrast' : 'Enable high contrast'}
    </button>
  );
}
