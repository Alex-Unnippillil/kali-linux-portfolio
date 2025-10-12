import React from 'react';

const escapeHtml = (str = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Map common artifact types to simple emoji icons so the case browser cards
// give a quick visual cue about the evidence type. These are intentionally
// lightweight to avoid adding extra image assets.
const typeIcons = {
  Document: '📄',
  Image: '🖼️',
  Log: '📜',
  File: '📁',
  Registry: '🗃️',
};

function KeywordSearchPanel({ keyword, setKeyword, artifacts, onSelect }) {
  const highlight = (text = '') => {
    const safe = escapeHtml(text);
    if (!keyword) return safe;
    const re = new RegExp(
      `(${keyword.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')})`,
      'gi'
    );
    return safe.replace(re, '<mark>$1</mark>');
  };

  const exportHits = () => {
    const data = JSON.stringify(artifacts, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'autopsy-hits.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex space-x-2">
        <input
          aria-label="Keyword search"
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Keyword search"
          className="flex-grow rounded border border-white/10 bg-kali-surface/80 px-2 py-1 text-sm text-white/90 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
        />
        <button
          onClick={exportHits}
          className="rounded bg-kali-primary px-2 py-1 text-sm font-semibold text-slate-900 shadow transition hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
        >
          Export Hits
        </button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {artifacts.map((a, idx) => (
          <button
            type="button"
            key={`${a.name}-${idx}`}
            onClick={() => onSelect(a)}
            className="flex flex-col rounded-lg border border-white/10 bg-kali-surface/90 p-3 text-left text-sm text-white/85 transition hover:border-kali-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
          >
            <div className="flex items-center font-bold">
              <span className="mr-1" aria-hidden="true">
                {typeIcons[a.type] || '📁'}
              </span>
              <span
                dangerouslySetInnerHTML={{ __html: highlight(a.name) }}
              />
            </div>
            <div className="text-xs uppercase tracking-wide text-kali-primary/80">
              {a.type}
            </div>
            <div className="text-xs text-white/70">
              {new Date(a.timestamp).toLocaleString()}
            </div>
            {a.user && (
              <div
                className="text-xs text-white/70"
                dangerouslySetInnerHTML={{ __html: `User: ${highlight(a.user)}` }}
              />
            )}
            <div
              className="text-xs text-white/80"
              dangerouslySetInnerHTML={{ __html: highlight(a.description) }}
            />
          </button>
        ))}
      </div>
    </>
  );
}

export default KeywordSearchPanel;

