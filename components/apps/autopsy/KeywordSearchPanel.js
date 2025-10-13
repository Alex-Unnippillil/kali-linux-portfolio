import React from 'react';

import { trustedHtml } from '../../../utils/security/trusted-types';

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
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Keyword search"
          className="flex-grow rounded border border-kali-border/60 bg-kali-dark px-2 py-1 text-kali-text focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus/80"
          aria-label="Keyword search"
        />
        <button
          onClick={exportHits}
          className="rounded border border-kali-accent/80 bg-kali-accent px-2 py-1 text-sm font-semibold text-kali-text transition hover:bg-kali-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
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
            className="flex flex-col gap-1 rounded border border-kali-border/60 bg-kali-dark/80 p-2 text-left text-sm text-kali-text transition hover:border-kali-accent/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus/80"
          >
            <div className="flex items-center font-bold">
              <span className="mr-1" aria-hidden="true">
                {typeIcons[a.type] || '📁'}
              </span>
              <span dangerouslySetInnerHTML={trustedHtml(highlight(a.name))} />
            </div>
            <div className="text-kali-text/60">{a.type}</div>
            <div className="text-xs">
              {new Date(a.timestamp).toLocaleString()}
            </div>
            {a.user && (
              <div
                className="text-xs"
                dangerouslySetInnerHTML={trustedHtml(`User: ${highlight(a.user)}`)}
              />
            )}
            <div
              className="text-xs"
              dangerouslySetInnerHTML={trustedHtml(highlight(a.description))}
            />
          </button>
        ))}
      </div>
    </>
  );
}

export default KeywordSearchPanel;

