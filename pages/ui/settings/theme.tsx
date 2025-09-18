"use client";

import { ChangeEvent } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import { useSettings } from '../../../hooks/useSettings';

/** Simple Adwaita-like toggle switch */
function Toggle({
  checked,
  onChange,
  direction = 'ltr',
  className = '',
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  direction?: 'ltr' | 'rtl';
  className?: string;
}) {
  const isRTL = direction === 'rtl';
  const knobTranslation = checked
    ? isRTL
      ? '-translate-x-6'
      : 'translate-x-6'
    : '';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-ubt-blue' : 'bg-ubt-grey'
      } ${className}`.trim()}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${knobTranslation}`}
        style={isRTL ? { right: '0.125rem' } : { left: '0.125rem' }}
      ></span>
    </button>
  );
}

export default function ThemeSettings() {
  const { theme, setTheme, direction, setDirection } = useSettings();
  const [panelSize, setPanelSize] = usePersistentState('app:panel-icons', 16);
  const [gridSize, setGridSize] = usePersistentState('app:grid-icons', 64);
  const isRTL = direction === 'rtl';

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value);
  };

  return (
    <div className={`flex h-full ${isRTL ? 'flex-row-reverse' : ''}`} dir={direction}>
      <nav
        className={`w-48 p-4 text-sm ${
          isRTL ? 'border-l border-ubt-cool-grey text-right' : 'border-r border-ubt-cool-grey'
        }`}
      >
        <ul className="space-y-1.5">
          <li>
            <a
              className={`flex items-center gap-2 p-2 bg-ub-cool-grey ${
                isRTL
                  ? 'flex-row-reverse rounded-r-md border-r-2 border-ubt-blue'
                  : 'rounded-l-md border-l-2 border-ubt-blue'
              }`}
            >
              <span className="w-6 h-6 bg-ubt-grey rounded"></span>
              <span>Theme</span>
            </a>
          </li>
        </ul>
      </nav>
      <div className={`flex-1 p-4 overflow-y-auto ${isRTL ? 'text-right' : ''}`}>
        <h1 className="text-xl mb-4">Theme</h1>
        <select
          value={theme}
          onChange={handleChange}
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          <option value="default">Default</option>
          <option value="dark">Dark</option>
          <option value="neon">Neon</option>
          <option value="matrix">Matrix</option>
        </select>

        <div className="mt-6">
          <h2 className="text-lg mb-2">Layout Direction</h2>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-sm text-ubt-grey">LTR</span>
            <Toggle
              checked={isRTL}
              onChange={(val) => setDirection(val ? 'rtl' : 'ltr')}
              direction={direction}
            />
            <span className="text-sm text-ubt-grey">RTL</span>
          </div>
          <p className="text-xs text-ubt-grey mt-2">
            Preview how panels, icon flows, and keyboard navigation respond when mirrored for
            right-to-left audiences.
          </p>
        </div>

        <div className="mt-6">
          <h2 className="text-lg mb-2">Panel Icons</h2>
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="w-6 h-6 bg-ubt-grey rounded"></span>
            <Toggle
              checked={panelSize === 32}
              onChange={(val) => setPanelSize(val ? 32 : 16)}
              direction={direction}
            />
            <span className="w-6 h-6 bg-ubt-grey rounded"></span>
          </div>
          <div
            className={`flex gap-2 p-2 bg-ub-cool-grey rounded ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <div
              className="bg-ubt-grey rounded"
              style={{ width: panelSize, height: panelSize }}
            ></div>
            <div
              className="bg-ubt-grey rounded"
              style={{ width: panelSize, height: panelSize }}
            ></div>
            <div
              className="bg-ubt-grey rounded"
              style={{ width: panelSize, height: panelSize }}
            ></div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg mb-2">Grid Icons</h2>
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="w-6 h-6 bg-ubt-grey rounded"></span>
            <Toggle
              checked={gridSize === 96}
              onChange={(val) => setGridSize(val ? 96 : 64)}
              direction={direction}
            />
            <span className="w-6 h-6 bg-ubt-grey rounded"></span>
          </div>
          <div
            className={`grid grid-cols-2 gap-2 p-2 bg-ub-cool-grey rounded ${
              isRTL ? 'rtl-preview' : ''
            }`}
            dir={direction}
          >
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-ubt-grey rounded"
                style={{ width: gridSize, height: gridSize }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

