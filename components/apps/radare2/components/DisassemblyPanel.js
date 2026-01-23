import React, { useEffect, useMemo, useState } from 'react';
import { parseAddress } from '../addressUtils';

const DisassemblyPanel = ({
  filteredDisasm,
  currentAddr,
  selectedLine,
  onSelectAddr,
  onSelectLine,
  bookmarks,
  toggleBookmark,
  activeHeuristic,
  setActiveHeuristic,
  heuristicMatches,
  lineWarnings,
  warningPalette,
  themeTokens,
  lineIndexByAddr,
  onScrollToAddr,
  lineIdForAddr,
}) => {
  const [seekInput, setSeekInput] = useState('');
  const [seekError, setSeekError] = useState('');
  const [findTerm, setFindTerm] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);

  const matches = useMemo(() => {
    if (!findTerm) return [];
    const term = findTerm.toLowerCase();
    return filteredDisasm
      .map((line, index) => ({
        line,
        index,
        matches:
          line.text.toLowerCase().includes(term) ||
          line.addr.toLowerCase() === term,
      }))
      .filter((match) => match.matches);
  }, [filteredDisasm, findTerm]);

  const matchesSet = useMemo(() => {
    return new Set(matches.map((match) => match.line.addr));
  }, [matches]);

  useEffect(() => {
    setMatchIndex(0);
  }, [matches.length, findTerm]);

  const goToMatch = (direction) => {
    if (!matches.length) return;
    const nextIndex =
      (matchIndex + direction + matches.length) % matches.length;
    setMatchIndex(nextIndex);
    onScrollToAddr(matches[nextIndex].line.addr);
  };

  const handleFindKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      goToMatch(event.shiftKey ? -1 : 1);
    }
  };

  const handleSeek = () => {
    const parsed = parseAddress(seekInput);
    if (parsed === null) {
      setSeekError('Enter a hex address (0x or raw).');
      return;
    }
    const formatted = `0x${parsed.toString(16)}`;
    if (!lineIndexByAddr.has(formatted.toLowerCase())) {
      setSeekError('Address not found in this view.');
      return;
    }
    setSeekError('');
    onScrollToAddr(formatted);
  };

  const handleSeekKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSeek();
    }
  };

  const copyText = async (text) => {
    if (!text) return;
    try {
      if (!navigator?.clipboard?.writeText) return;
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore copy errors */
    }
  };

  return (
    <div className="space-y-4" id="tab-panel-disassembly" role="tabpanel">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <label className="text-xs uppercase" htmlFor="seek-input">
            Seek
          </label>
          <input
            id="seek-input"
            value={seekInput}
            onChange={(e) => setSeekInput(e.target.value)}
            onKeyDown={handleSeekKeyDown}
            placeholder="0x1000"
            className="px-2 py-1 rounded"
            aria-label="Seek to address"
            style={{
              backgroundColor: themeTokens.panel,
              color: themeTokens.text,
              border: `1px solid ${themeTokens.border}`,
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleSeek}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: themeTokens.panel,
            color: themeTokens.text,
            border: `1px solid ${themeTokens.border}`,
          }}
        >
          Seek
        </button>
        <div className="space-y-1">
          <label className="text-xs uppercase" htmlFor="find-input">
            Find
          </label>
          <input
            id="find-input"
            value={findTerm}
            onChange={(e) => setFindTerm(e.target.value)}
            onKeyDown={handleFindKeyDown}
            placeholder="mov"
            className="px-2 py-1 rounded"
            aria-label="Find instruction"
            style={{
              backgroundColor: themeTokens.panel,
              color: themeTokens.text,
              border: `1px solid ${themeTokens.border}`,
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => goToMatch(-1)}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: themeTokens.panel,
            color: themeTokens.text,
            border: `1px solid ${themeTokens.border}`,
          }}
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => goToMatch(1)}
          className="px-3 py-1 rounded"
          style={{
            backgroundColor: themeTokens.panel,
            color: themeTokens.text,
            border: `1px solid ${themeTokens.border}`,
          }}
        >
          Next
        </button>
        <span className="text-xs opacity-70">
          {matches.length ? `${matchIndex + 1} / ${matches.length}` : '0 / 0'}
        </span>
        <button
          type="button"
          onClick={() => copyText(currentAddr)}
          className="px-2 py-1 rounded text-xs"
          style={{
            backgroundColor: themeTokens.panel,
            color: themeTokens.text,
            border: `1px solid ${themeTokens.border}`,
          }}
          disabled={!currentAddr}
        >
          Copy address
        </button>
        <button
          type="button"
          onClick={() => copyText(selectedLine?.text)}
          className="px-2 py-1 rounded text-xs"
          style={{
            backgroundColor: themeTokens.panel,
            color: themeTokens.text,
            border: `1px solid ${themeTokens.border}`,
          }}
          disabled={!selectedLine?.text}
        >
          Copy line
        </button>
      </div>
      {seekError && (
        <p className="text-xs text-red-300" role="status">
          {seekError}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {heuristicMatches.map((heuristic) => {
          const isActive = activeHeuristic === heuristic.id;
          const hasMatches = heuristic.matches.length > 0;
          return (
            <button
              key={heuristic.id}
              type="button"
              className={`px-2 py-1 text-xs rounded border transition-colors focus:outline-none focus-visible:ring ${
                isActive ? 'font-semibold' : ''
              } ${hasMatches ? 'shadow-sm' : ''}`}
              style={{
                borderColor: themeTokens.border,
                backgroundColor: isActive
                  ? themeTokens.accent
                  : hasMatches
                  ? warningPalette.surface
                  : themeTokens.panel,
                color: isActive ? themeTokens.accentForeground : themeTokens.text,
              }}
              aria-pressed={isActive}
              title={`${heuristic.label} – ${heuristic.description}`}
              onClick={() =>
                setActiveHeuristic((current) =>
                  current === heuristic.id ? null : heuristic.id,
                )
              }
            >
              {heuristic.label} ({heuristic.matches.length})
            </button>
          );
        })}
      </div>
      <div
        className="overflow-auto rounded-lg border"
        style={{
          borderColor: themeTokens.border,
          backgroundColor: themeTokens.highlight,
          maxHeight: '20rem',
        }}
      >
        <ul
          className="text-sm space-y-1 p-2 font-mono"
          role="listbox"
          aria-label="Disassembly listing"
        >
          {filteredDisasm.map((line) => {
            const isSelected = currentAddr === line.addr;
            const isBookmarked = bookmarks.includes(line.addr);
            const heuristicsForLine = lineWarnings.get(line.addr) || [];
            const hasWarning = heuristicsForLine.length > 0;
            const isMatch = matchesSet.has(line.addr);
            const isActiveMatch =
              matches.length && matches[matchIndex]?.line.addr === line.addr;
            return (
              <li
                key={line.addr}
                id={lineIdForAddr(line.addr)}
                data-testid="disasm-item"
                className="cursor-pointer rounded-md border px-2 py-1 transition-colors"
                role="option"
                style={{
                  borderColor: isSelected
                    ? themeTokens.border
                    : isActiveMatch
                    ? themeTokens.accent
                    : hasWarning
                    ? warningPalette.border
                    : 'transparent',
                  backgroundColor: isSelected
                    ? themeTokens.accent
                    : isActiveMatch
                    ? `color-mix(in srgb, ${themeTokens.accent} 20%, transparent)`
                    : isMatch
                    ? `color-mix(in srgb, ${themeTokens.accent} 10%, transparent)`
                    : hasWarning
                    ? warningPalette.overlay
                    : 'transparent',
                  color: isSelected
                    ? themeTokens.accentForeground
                    : themeTokens.text,
                }}
                onClick={() => {
                  onSelectAddr(line.addr);
                  onSelectLine(line);
                }}
                aria-selected={isSelected}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(line.addr);
                      }}
                      className="mr-1"
                      aria-label={`${
                        isBookmarked
                          ? 'Remove bookmark'
                          : 'Bookmark address'
                      } ${line.addr}`}
                      title={
                        isBookmarked
                          ? `Remove bookmark for ${line.addr}`
                          : `Bookmark ${line.addr}`
                      }
                    >
                      {isBookmarked ? '★' : '☆'}
                    </button>
                    <span>{line.addr}: </span>
                    <span>{line.text}</span>
                  </div>
                  {hasWarning && (
                    <div className="flex flex-wrap gap-1 text-[10px] uppercase">
                      {heuristicsForLine.map((heuristic) => (
                        <span
                          key={`${line.addr}-${heuristic.id}`}
                          className="px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: warningPalette.badge,
                            color: themeTokens.text,
                          }}
                        >
                          {heuristic.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          {filteredDisasm.length === 0 && (
            <li className="text-xs italic" data-testid="disasm-empty">
              No instructions match the selected heuristic.
            </li>
          )}
        </ul>
      </div>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide">
          Bookmarks
        </h3>
        {bookmarks.length === 0 ? (
          <p className="text-sm opacity-70">No bookmarks saved yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {bookmarks.map((addr) => (
              <li
                key={addr}
                className="flex items-center justify-between gap-2 rounded px-2 py-1"
                style={{
                  backgroundColor: themeTokens.panel,
                  border: `1px solid ${themeTokens.border}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => onScrollToAddr(addr)}
                  className="font-mono underline"
                >
                  {addr}
                </button>
                <button
                  type="button"
                  onClick={() => toggleBookmark(addr)}
                  className="text-xs underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default DisassemblyPanel;
