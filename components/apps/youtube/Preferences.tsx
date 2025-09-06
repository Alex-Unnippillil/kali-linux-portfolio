import React, { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const TABS = ['Video', 'Audio', 'Subtitles', 'Plugins'] as const;

type Tab = typeof TABS[number];

export default function Preferences({ open, onClose }: Props) {
  const [active, setActive] = useState<Tab>('Video');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-96 rounded bg-ub-cool-grey p-4 text-ubt-grey shadow-lg">
        <div className="mb-4 flex border-b border-ubt-cool-grey">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`flex-1 p-2 text-sm ${active === tab ? 'border-b-2 border-ubt-green text-ubt-green' : ''}`}
              onClick={() => setActive(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="text-sm">
          Preferences for {active} coming soon.
        </div>
        <div className="mt-4 text-right">
          <button
            onClick={onClose}
            className="rounded border border-ubt-cool-grey px-2 py-1 hover:text-ubt-green"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
