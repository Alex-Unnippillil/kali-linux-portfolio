'use client';

import { useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';

const HighContrastToggle = () => {
  const { highContrast, setHighContrast } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.setAttribute('data-contrast', 'high');
    } else {
      root.removeAttribute('data-contrast');
    }
  }, [highContrast]);

  return (
    <button
      type="button"
      onClick={() => setHighContrast(!highContrast)}
      className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm font-medium transition-colors hover:bg-ub-dark-grey focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ubt-blue"
      aria-pressed={highContrast}
      style={{ color: 'var(--text, var(--color-text))' }}
    >
      <span>High contrast</span>
      <span
        className="ml-3 inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
        style={{
          borderColor: 'var(--panel-border, rgba(255, 255, 255, 0.2))',
          backgroundColor: highContrast
            ? 'var(--panel-border, rgba(255, 255, 255, 0.35))'
            : 'transparent',
          color: highContrast ? '#000000' : 'var(--text, var(--color-text))',
        }}
      >
        {highContrast ? 'On' : 'Off'}
      </span>
    </button>
  );
};

export default HighContrastToggle;
