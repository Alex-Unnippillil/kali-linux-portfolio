import React, { useEffect, useMemo, useRef, useState } from 'react';

const EMPTY_LINES = [];

const formatOffset = (offset) => offset.toString(16).padStart(8, '0');

const assignViewerRef = (viewerRef, node) => {
  if (!viewerRef) return;
  if (typeof viewerRef === 'function') {
    viewerRef(node);
  } else if (viewerRef && 'current' in viewerRef) {
    viewerRef.current = node;
  }
};

export default function HexViewer({
  data,
  caret,
  onAnchorChange,
  loading,
  viewerRef,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [matchIndex, setMatchIndex] = useState(null);
  const rowRefs = useRef(new Map());
  const lastMatchOffsetRef = useRef(null);

  const lines = data?.lines ?? EMPTY_LINES;

  const matches = useMemo(() => {
    if (!searchTerm) return [];
    const query = searchTerm.toLowerCase();
    return lines
      .map((line, idx) => ({ line, idx }))
      .filter(
        ({ line }) =>
          line.ascii.toLowerCase().includes(query) ||
          line.hex.toLowerCase().includes(query)
      );
  }, [lines, searchTerm]);

  useEffect(() => {
    if (!searchTerm) {
      setMatchIndex(null);
      return;
    }

    if (matches.length === 0) {
      setMatchIndex(null);
      return;
    }

    setMatchIndex((prev) => {
      const nextIndex = prev === null ? 0 : Math.min(prev, matches.length - 1);
      const target = matches[nextIndex];
      if (target && lastMatchOffsetRef.current !== target.line.offset) {
        lastMatchOffsetRef.current = target.line.offset;
        onAnchorChange({
          line: target.line.sourceLine,
          offset: target.line.offset,
        });
      }
      return nextIndex;
    });
  }, [matches, onAnchorChange, searchTerm]);

  useEffect(() => {
    if (!caret || caret.offset == null) return;
    lastMatchOffsetRef.current = caret.offset;
    const node = rowRefs.current.get(caret.offset);
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest' });
    }
  }, [caret]);

  useEffect(() => () => rowRefs.current.clear(), []);

  const handleRowClick = (line) => {
    lastMatchOffsetRef.current = line.offset;
    onAnchorChange({ line: line.sourceLine, offset: line.offset });
  };

  const jumpToMatch = (nextIndex) => {
    if (matches.length === 0) return;
    const normalized = ((nextIndex % matches.length) + matches.length) % matches.length;
    const target = matches[normalized];
    setMatchIndex(normalized);
    if (target) {
      lastMatchOffsetRef.current = target.line.offset;
      onAnchorChange({ line: target.line.sourceLine, offset: target.line.offset });
    }
  };

  const handleNext = () => {
    if (matchIndex === null) {
      jumpToMatch(0);
    } else {
      jumpToMatch(matchIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (matchIndex === null) {
      jumpToMatch(matches.length - 1);
    } else {
      jumpToMatch(matchIndex - 1);
    }
  };

  const currentMatchPosition =
    matchIndex === null || matches.length === 0 ? 0 : matchIndex + 1;

  return (
    <div className="flex h-full flex-col bg-gray-900 text-gray-100">
      <div className="flex items-center gap-2 border-b border-gray-700 p-2 text-sm">
        <label htmlFor="ghidra-hex-search" className="sr-only">
          Find in hex view
        </label>
        <input
          id="ghidra-hex-search"
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Find (hex or ASCII)"
          aria-label="Find in hex view"
          className="w-full rounded border border-gray-600 bg-gray-800 p-1 text-xs text-gray-100 placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={handlePrevious}
          disabled={matches.length === 0}
          className="rounded bg-gray-700 px-2 py-1 text-xs disabled:opacity-40"
          aria-label="Find previous"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={matches.length === 0}
          className="rounded bg-gray-700 px-2 py-1 text-xs disabled:opacity-40"
          aria-label="Find next"
        >
          Next
        </button>
        <span className="text-xs text-gray-400" aria-live="polite">
          {matches.length === 0 && searchTerm
            ? '0 / 0'
            : `${currentMatchPosition} / ${matches.length || 0}`}
        </span>
      </div>
      <div
        ref={(node) => assignViewerRef(viewerRef, node)}
        className="flex-1 overflow-auto bg-gray-900"
        aria-label="Hex viewer"
      >
        {loading && lines.length === 0 ? (
          <div className="p-4 text-xs text-gray-400">Loading hex data…</div>
        ) : lines.length === 0 ? (
          <div className="p-4 text-xs text-gray-400">No hex data</div>
        ) : (
          <table className="w-full table-fixed border-collapse text-left font-mono text-xs">
            <thead className="sticky top-0 bg-gray-800 text-gray-300">
              <tr>
                <th className="w-24 px-2 py-1">Offset</th>
                <th className="px-2 py-1">Hex</th>
                <th className="w-40 px-2 py-1">ASCII</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const isActive = caret && caret.offset === line.offset;
                return (
                  <tr
                    key={line.offset}
                    ref={(node) => {
                      if (node) {
                        rowRefs.current.set(line.offset, node);
                      } else {
                        rowRefs.current.delete(line.offset);
                      }
                    }}
                    onClick={() => handleRowClick(line)}
                    className={`cursor-pointer border-b border-gray-800 ${
                      isActive ? 'bg-yellow-800 text-black' : 'hover:bg-gray-800'
                    }`}
                  >
                    <td className="px-2 py-1 text-gray-400">
                      {formatOffset(line.offset)}
                    </td>
                    <td className="px-2 py-1 text-gray-100">{line.hex}</td>
                    <td className="px-2 py-1 text-gray-100">{line.ascii}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
