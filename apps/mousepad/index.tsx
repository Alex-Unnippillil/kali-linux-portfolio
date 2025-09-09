'use client';

import { useState } from 'react';
import Tabs from '../../components/Tabs';
import ToggleSwitch from '../../components/ToggleSwitch';

export default function MousepadPreferences() {
  const tabs = [
    { id: 'view', label: 'View' },
    { id: 'editor', label: 'Editor' },
    { id: 'fonts', label: 'Fonts & Colors' },
    { id: 'encodings', label: 'Encodings' },
    { id: 'session', label: 'Session' },
  ] as const;
  type TabId = (typeof tabs)[number]['id'];
  const [activeTab, setActiveTab] = useState<TabId>('view');

  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [tabWidth, setTabWidth] = useState(2);
  const [fontFamily, setFontFamily] = useState('monospace');
  const [encoding, setEncoding] = useState('utf-8');
  const [reopenLastFiles, setReopenLastFiles] = useState(false);

  return (
    <div className="flex flex-col h-full w-full bg-ub-cool-grey text-white">
      <div className="flex justify-center border-b border-gray-900">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>
      {activeTab === 'view' && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-ubt-grey">Show line numbers:</span>
            <ToggleSwitch
              checked={showLineNumbers}
              onChange={setShowLineNumbers}
              ariaLabel="Show line numbers"
            />
          </div>
        </div>
      )}
      {activeTab === 'editor' && (
        <div className="p-4 space-y-4">
            <label className="flex items-center gap-2">
              <span className="text-ubt-grey">Tab width:</span>
              <input
                type="number"
                min={1}
                max={8}
                value={tabWidth}
                onChange={(e) => setTabWidth(parseInt(e.target.value, 10))}
                className="w-16 text-black rounded px-1 py-0.5"
                aria-label="Tab width"
              />
            </label>
        </div>
      )}
      {activeTab === 'fonts' && (
        <div className="p-4 space-y-4">
          <label className="flex items-center gap-2">
            <span className="text-ubt-grey">Font:</span>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="text-black px-2 py-1 rounded"
            >
              <option value="monospace">Monospace</option>
              <option value="serif">Serif</option>
              <option value="sans-serif">Sans-serif</option>
            </select>
          </label>
        </div>
      )}
      {activeTab === 'encodings' && (
        <div className="p-4 space-y-4">
          <label className="flex items-center gap-2">
            <span className="text-ubt-grey">Default encoding:</span>
            <select
              value={encoding}
              onChange={(e) => setEncoding(e.target.value)}
              className="text-black px-2 py-1 rounded"
            >
              <option value="utf-8">UTF-8</option>
              <option value="iso-8859-1">ISO-8859-1</option>
              <option value="windows-1252">Windows-1252</option>
            </select>
          </label>
        </div>
      )}
      {activeTab === 'session' && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-ubt-grey">Reopen last files:</span>
            <ToggleSwitch
              checked={reopenLastFiles}
              onChange={setReopenLastFiles}
              ariaLabel="Reopen last files"
            />
          </div>
        </div>
      )}
    </div>
  );
}

