import React, { useState } from 'react';

const InspectorSidebar = ({
  file,
  selectedAddress,
  selectedLine,
  bookmarkCount,
  patchCount,
  activeFilter,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');

  const copyText = async (label, text) => {
    if (!text) return;
    try {
      if (!navigator?.clipboard?.writeText) {
        setLiveMessage('Clipboard unavailable');
        return;
      }
      await navigator.clipboard.writeText(text);
      setLiveMessage(`${label} copied`);
    } catch {
      setLiveMessage(`Unable to copy ${label.toLowerCase()}`);
    }
  };

  return (
    <aside
      className="w-full lg:w-72 shrink-0"
      aria-label="Inspector sidebar"
    >
      <div
        className="rounded-xl border p-4 space-y-4 transition-shadow sticky top-4"
        style={{
          backgroundColor: 'var(--r2-surface)',
          border: '1px solid var(--r2-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Inspector
          </h2>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="text-xs underline"
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
        {!collapsed && (
          <>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-xs uppercase opacity-70">File</dt>
                <dd data-testid="process-name" className="font-mono">
                  {file}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-xs uppercase opacity-70">Bookmarks</dt>
                <dd data-testid="bookmark-count" className="font-semibold">
                  {bookmarkCount}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-xs uppercase opacity-70">Patches</dt>
                <dd data-testid="patch-count" className="font-semibold">
                  {patchCount}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-xs uppercase opacity-70">Active Filter</dt>
                <dd data-testid="active-filter" className="text-right">
                  {activeFilter}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-xs uppercase opacity-70">Selected Addr</dt>
                <dd className="font-mono">{selectedAddress || '--'}</dd>
              </div>
            </dl>
            <div className="space-y-2">
              <p className="text-xs uppercase opacity-70">Quick copy</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => copyText('Address', selectedAddress)}
                  disabled={!selectedAddress}
                  className="px-2 py-1 rounded text-xs disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--r2-surface)',
                    border: '1px solid var(--r2-border)',
                  }}
                >
                  Copy address
                </button>
                <button
                  type="button"
                  onClick={() =>
                    copyText('Instruction', selectedLine?.text || '')
                  }
                  disabled={!selectedLine?.text}
                  className="px-2 py-1 rounded text-xs disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--r2-surface)',
                    border: '1px solid var(--r2-border)',
                  }}
                >
                  Copy instruction
                </button>
              </div>
            </div>
          </>
        )}
        <div aria-live="polite" className="sr-only">
          {liveMessage}
        </div>
      </div>
    </aside>
  );
};

export default InspectorSidebar;
