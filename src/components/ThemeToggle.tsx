"use client";

import { useSettings } from '../../hooks/useSettings';

/** Segmented theme toggle with labeled options */
export default function ThemeToggle() {
  const { theme, setTheme } = useSettings();
  const options = [
    { label: 'Light', value: 'default' },
    { label: 'Dark', value: 'dark' },
  ];

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex rounded-md border border-ubt-cool-grey overflow-hidden"
    >
      {options.map((opt, idx) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={theme === opt.value}
          onClick={() => setTheme(opt.value)}
          className={`min-w-[44px] min-h-[44px] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
            theme === opt.value
              ? 'bg-ubt-grey text-white'
              : 'bg-ub-cool-grey text-ubt-grey'
          } ${idx > 0 ? 'border-l border-ubt-cool-grey' : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

