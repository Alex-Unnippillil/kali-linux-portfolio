import { useState } from "react";

const maxLayouts = 4;

const shortcutHint = (index: number) => `Super+${index + 1}`;

export default function KeyboardLayouts() {
  const [useSystemDefaults, setUseSystemDefaults] = useState(true);
  const [layouts, setLayouts] = useState<string[]>(["us"]);

  const handleLayoutChange = (idx: number, value: string) => {
    setLayouts((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const addLayout = () => {
    if (layouts.length < maxLayouts) {
      setLayouts((prev) => [...prev, ""]);
    }
  };

  const removeLayout = (idx: number) => {
    setLayouts((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <main className="min-h-screen bg-ub-cool-grey text-white p-4 space-y-4">
      <h1 className="text-2xl font-bold">Keyboard Layouts</h1>
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={useSystemDefaults}
          onChange={(e) => setUseSystemDefaults(e.target.checked)}
        />
        <span>Use system defaults</span>
      </label>

      {!useSystemDefaults && (
        <div className="space-y-4">
          {layouts.map((layout, idx) => (
            <div
              key={idx}
              className="flex items-center space-x-2 bg-ub-anchorage px-2 py-1 rounded"
            >
              <input
                className="bg-transparent border-b border-gray-500 focus:outline-none flex-grow"
                placeholder="Layout code (e.g. us)"
                value={layout}
                onChange={(e) => handleLayoutChange(idx, e.target.value)}
                maxLength={10}
              />
              <span className="text-xs text-ubt-grey">
                Shortcut: {shortcutHint(idx)}
              </span>
              <button
                aria-label="remove-layout"
                className="text-red-400 px-1"
                onClick={() => removeLayout(idx)}
              >
                &times;
              </button>
            </div>
          ))}

          {layouts.length < maxLayouts && (
            <button
              onClick={addLayout}
              className="px-2 py-1 bg-ub-anchorage rounded hover:bg-ub-foxglove"
            >
              Add layout
            </button>
          )}
        </div>
      )}
    </main>
  );
}
