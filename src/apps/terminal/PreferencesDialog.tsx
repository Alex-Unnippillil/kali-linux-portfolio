import React, { useState } from 'react';

export interface PreferencesDialogProps {
  open: boolean;
  onClose: () => void;
  colors: { background: string; foreground: string };
  onColorsChange: (c: { background: string; foreground: string }) => void;
}

const tabs = [
  'General',
  'Appearance',
  'Colors',
  'Compatibility',
  'Advanced',
  'Shortcuts',
];

export default function PreferencesDialog({
  open,
  onClose,
  colors,
  onColorsChange,
}: PreferencesDialogProps) {
  const [active, setActive] = useState('General');
  if (!open) return null;
  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
      <div className="bg-gray-900 p-4 rounded w-96">
        <div className="flex border-b mb-4 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t}
              className={`px-2 py-1 text-sm whitespace-nowrap ${
                active === t ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'
              }`}
              onClick={() => setActive(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {active === 'Colors' && (
          <div className="space-y-4">
            <label className="flex items-center justify-between text-sm">
              <span>Background</span>
              <input
                type="color"
                value={colors.background}
                onChange={(e) =>
                  onColorsChange({ ...colors, background: e.target.value })
                }
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Text</span>
              <input
                type="color"
                value={colors.foreground}
                onChange={(e) =>
                  onColorsChange({ ...colors, foreground: e.target.value })
                }
              />
            </label>
          </div>
        )}
        {active !== 'Colors' && (
          <p className="text-gray-400 text-sm">No settings available.</p>
        )}
        <div className="flex justify-end mt-4">
          <button
            className="px-2 py-1 bg-blue-600 rounded"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
