import React from 'react';
import { useTheme } from '../../../hooks/useTheme';

const AppearancePanel: React.FC = () => {
  const { theme, setTheme, themes } = useTheme();

  return (
    <section aria-labelledby="appearance-heading" className="w-full px-6 mb-6">
      <div className="mb-4 text-ubt-grey">
        <h2 id="appearance-heading" className="text-lg font-semibold">
          Themes
        </h2>
        <p className="text-sm text-ubt-warm-grey">
          Switch between curated palettes. Changes apply instantly across the desktop.
        </p>
      </div>
      <div
        role="radiogroup"
        aria-label="Theme selection"
        className="grid gap-4 sm:grid-cols-2"
      >
        {themes.map((definition) => {
          const selected = definition.id === theme;
          const { background, surface, accent, text, border } = definition.tokens;
          return (
            <button
              key={definition.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(definition.id)}
              className={`rounded-lg border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                selected
                  ? 'border-ubt-blue ring-2 ring-ubt-blue ring-offset-gray-900'
                  : 'border-gray-700 hover:border-ubt-blue/70'
              }`}
              style={{
                backgroundColor: 'rgba(26, 31, 38, 0.6)',
                color: '#f5f5f5',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium">{definition.label}</p>
                  <p className="mt-1 text-xs text-ubt-warm-grey">{definition.description}</p>
                </div>
                {selected && (
                  <span className="text-xs uppercase tracking-wide text-ubt-blue">
                    Active
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 rounded-md border" style={{ borderColor: border }}>
                  <div className="h-10 w-full rounded-t-md" style={{ backgroundColor: background }} />
                  <div
                    className="h-10 w-full rounded-b-md border-t"
                    style={{
                      backgroundColor: surface,
                      borderColor: border,
                    }}
                  />
                </div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full border"
                  style={{
                    backgroundColor: accent,
                    borderColor: border,
                    color: text,
                  }}
                  aria-hidden="true"
                >
                  Aa
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default AppearancePanel;
