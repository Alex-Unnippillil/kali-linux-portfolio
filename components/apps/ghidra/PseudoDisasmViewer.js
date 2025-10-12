import React, { useEffect, useState } from 'react';

const DEFAULT_SNIPPET = [
  { pseudo: 'int square(int x) {', asm: 'square:' },
  { pseudo: '  return x * x;', asm: '  imul eax, edi, edi' },
  { pseudo: '}', asm: '  ret' },
];

export default function PseudoDisasmViewer() {
  const [hover, setHover] = useState(null);
  const [snippet, setSnippet] = useState(DEFAULT_SNIPPET);

  useEffect(() => {
    fetch('/demo-data/ghidra/pseudocode.json')
      .then((r) => r.json())
      .then((data) => {
        if (data.snippet) setSnippet(data.snippet);
      })
      .catch(() => {});
  }, []);

  const handleCopy = (text) => {
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  const renderColumn = (key, label, descId) => (
    <pre
      aria-label={label}
      aria-describedby={descId}
      className="flex-1 overflow-auto whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed"
    >
      {snippet.map((line, idx) => (
        <button
          key={`${key}-${idx}`}
          type="button"
          onMouseEnter={() => setHover(idx)}
          onMouseLeave={() => setHover(null)}
          onFocus={() => setHover(idx)}
          onBlur={() => setHover(null)}
          onClick={() => handleCopy(line[key])}
          className={`w-full rounded-md px-3 py-1 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
            hover === idx
              ? 'bg-orange-500/20 text-orange-100 shadow-[0_0_0_1px_rgba(251,191,36,0.45)]'
              : 'text-slate-100 hover:bg-slate-800/70'
          }`}
        >
          {line[key]}
        </button>
      ))}
    </pre>
  );

  return (
    <section className="flex h-56 w-full flex-col overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/80 text-sm text-slate-100 shadow-[0_18px_38px_rgba(2,6,23,0.45)]">
      <div className="border-b border-slate-800/70 bg-slate-950/70 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          Pseudocode &amp; Assembly
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Hover or focus to cross-highlight. Click to copy a line.
        </p>
      </div>
      <div className="flex flex-1 divide-x divide-slate-800/70">
        <p id="pseudo-desc" className="sr-only">
          Pseudocode pane. Lines highlight with matching assembly and copy on click.
        </p>
        <p id="asm-desc" className="sr-only">
          Disassembly pane. Lines highlight with matching pseudocode and copy on click.
        </p>
        {renderColumn('pseudo', 'Pseudocode', 'pseudo-desc')}
        {renderColumn('asm', 'Disassembly', 'asm-desc')}
      </div>
    </section>
  );
}

