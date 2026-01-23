import React, { useMemo, useState } from 'react';
import { formatAddress } from '../addressUtils';

const OverviewPanel = ({
  consoleMessages,
  strings,
  onJump,
  xrefs,
  currentAddr,
  themeTokens,
  warningPalette,
}) => {
  const [filter, setFilter] = useState('');

  const filteredStrings = useMemo(() => {
    if (!filter) return strings;
    const term = filter.toLowerCase();
    return strings.filter(
      (item) =>
        item.text.toLowerCase().includes(term) ||
        item.addr.toLowerCase().includes(term),
    );
  }, [filter, strings]);

  const copyText = async (text) => {
    if (!text) return;
    try {
      if (!navigator?.clipboard?.writeText) return;
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore copy errors */
    }
  };

  const normalizedStrings = strings.map((item) => ({
    ...item,
    addr: formatAddress(item.addr) || item.addr,
  }));

  const normalizedFilteredStrings = filteredStrings.map((item) => ({
    ...item,
    addr: formatAddress(item.addr) || item.addr,
  }));

  const xrefItems = currentAddr ? xrefs[currentAddr] || [] : [];

  return (
    <div id="tab-panel-overview" role="tabpanel" className="space-y-4">
      <section
        className="rounded-xl border p-4 space-y-3"
        style={{
          backgroundColor: themeTokens.panel,
          border: `1px solid ${themeTokens.border}`,
        }}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Console Output
          </h2>
          <span className="text-[10px] uppercase" style={{ color: themeTokens.muted }}>
            Simulated
          </span>
        </header>
        <ul className="space-y-2 text-sm">
          {consoleMessages.map((message) => {
            const isWarning = message.type === 'warn';
            const isActive = message.type === 'active';
            const isMuted = message.type === 'muted';
            return (
              <li
                key={message.id}
                className={`rounded-lg border px-3 py-2 ${
                  isActive ? 'font-semibold' : ''
                }`}
                style={{
                  borderColor: isActive
                    ? themeTokens.accent
                    : isWarning
                    ? warningPalette.border
                    : 'transparent',
                  backgroundColor: isActive
                    ? themeTokens.accent
                    : isWarning
                    ? warningPalette.surface
                    : isMuted
                    ? `color-mix(in srgb, ${themeTokens.muted} 45%, transparent)`
                    : themeTokens.highlight,
                  color: isActive
                    ? themeTokens.accentForeground
                    : themeTokens.text,
                }}
              >
                {message.label}
              </li>
            );
          })}
        </ul>
      </section>

      <section
        className="rounded-xl border p-4 space-y-3"
        style={{
          backgroundColor: themeTokens.panel,
          border: `1px solid ${themeTokens.border}`,
        }}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Strings
          </h2>
          <span className="text-xs" style={{ color: themeTokens.muted }}>
            {normalizedStrings.length} found
          </span>
        </header>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter strings"
          className="px-2 py-1 rounded w-full"
          style={{
            backgroundColor: themeTokens.panel,
            color: themeTokens.text,
            border: `1px solid ${themeTokens.border}`,
          }}
        />
        {normalizedFilteredStrings.length === 0 ? (
          <p className="text-sm opacity-70">No strings match this filter.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {normalizedFilteredStrings.map((item) => (
              <li
                key={`${item.addr}-${item.text}`}
                className="flex flex-wrap items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => onJump(item.addr)}
                  className="underline font-mono"
                >
                  {item.addr}
                </button>
                <span>{item.text}</span>
                <button
                  type="button"
                  onClick={() => copyText(item.text)}
                  className="text-xs underline"
                >
                  Copy
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="rounded-xl border p-4 space-y-3"
        style={{
          backgroundColor: themeTokens.panel,
          border: `1px solid ${themeTokens.border}`,
        }}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Xrefs
          </h2>
          <span className="text-xs font-mono">
            {currentAddr || 'No selection'}
          </span>
        </header>
        {xrefItems.length === 0 ? (
          <p className="text-sm opacity-70">No cross-references for this address.</p>
        ) : (
          <div className="flex flex-wrap gap-2 text-sm">
            {xrefItems.map((xref) => {
              const formatted = formatAddress(xref) || xref;
              return (
                <button
                  key={xref}
                  type="button"
                  onClick={() => onJump(formatted)}
                  className="px-2 py-1 rounded-full font-mono"
                  style={{
                    backgroundColor: themeTokens.highlight,
                    border: `1px solid ${themeTokens.border}`,
                  }}
                >
                  {formatted}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default OverviewPanel;
