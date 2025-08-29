import React from 'react';

const escapeHtml = (str = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // eslint-disable-next-line no-useless-escape
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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
          className="flex-grow bg-ub-grey text-white px-2 py-1 rounded"
        />
        <button
          onClick={exportHits}
          className="bg-ub-orange px-2 py-1 rounded text-sm text-black"
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
            className="p-2 bg-ub-grey rounded text-sm text-left"
          >
            <div
              className="font-bold"
              dangerouslySetInnerHTML={{ __html: highlight(a.name) }}
            />
            <div className="text-gray-400">{a.type}</div>
            <div className="text-xs">
              {new Date(a.timestamp).toLocaleString()}
            </div>
            <div
              className="text-xs"
              dangerouslySetInnerHTML={{ __html: highlight(a.description) }}
            />
          </button>
        ))}
      </div>
    </>
  );
}

export default KeywordSearchPanel;

