'use client';

import React, { useEffect, useMemo, useState } from 'react';
import share, { canShare } from '../../utils/share';

interface Script {
  name: string;
  description: string;
  example: string;
  tag: string;
}

type ScriptData = Record<string, Omit<Script, 'tag'>[]>;

/**
 * Nmap NSE playground with a script browser on the left and
 * script details/output on the right. Data is static and meant
 * purely for learning/demo purposes.
 */
const NmapNSE: React.FC = () => {
  const [data, setData] = useState<Script[]>([]);
  const [activeTag, setActiveTag] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Script | null>(null);
  const [result, setResult] = useState<{ script: string; output: string } | null>(
    null
  );
  const [lastRun, setLastRun] = useState<{
    script: string;
    tag: string;
    timestamp: number;
  } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<{
    context: 'sample' | 'result';
    message: string;
  } | null>(null);

  // load static script metadata
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/demo-data/nmap/scripts.json');
        const json: ScriptData = await res.json();
        const flat = Object.entries(json).flatMap(([tag, scripts]) =>
          scripts.map((s) => ({ ...s, tag }))
        );
        setData(flat);
      } catch {
        /* ignore */
      }
    };
    load();
  }, []);

  const tags = useMemo(() => Array.from(new Set(data.map((s) => s.tag))), [
    data,
  ]);

  const scripts = useMemo(
    () =>
      data.filter(
        (s) =>
          (!activeTag || s.tag === activeTag) &&
          s.name.toLowerCase().includes(search.toLowerCase())
      ),
    [activeTag, data, search]
  );

  const run = () => {
    if (!selected) return;
    setResult({ script: selected.name, output: selected.example });
    setLastRun({
      script: selected.name,
      tag: selected.tag,
      timestamp: Date.now(),
    });
  };

  const copyToClipboard = async (
    value: string,
    context: 'sample' | 'result'
  ) => {
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(value);
      } else if (typeof window !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopyFeedback({ context, message: 'Copied to clipboard' });
    } catch (error) {
      setCopyFeedback({ context, message: 'Copy failed' });
    }
  };

  useEffect(() => {
    if (!copyFeedback) return;
    const timer = setTimeout(() => setCopyFeedback(null), 2000);
    return () => clearTimeout(timer);
  }, [copyFeedback]);

  const download = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.script}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareResult = () => {
    if (!result) return;
    share(JSON.stringify(result, null, 2), 'Nmap NSE Result');
  };

  const severityColor = (tag: string) => {
    switch (tag) {
      case 'vuln':
        return 'border-red-500';
      case 'safe':
        return 'border-green-500';
      default:
        return 'border-blue-500';
    }
  };

  const CollapsibleSection: React.FC<{
    title: string;
    tag?: string;
    children: React.ReactNode;
  }> = ({ title, tag, children }) => {
    const [open, setOpen] = useState(true);
    return (
      <div className={`mb-4 border-l-4 ${severityColor(tag || '')}`}>
        <button
          className="w-full flex justify-between items-center bg-gray-800 px-2 py-1.5"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span>{title}</span>
          <span className="text-xl leading-none">{open ? '−' : '+'}</span>
        </button>
        {open && <div className="p-1.5">{children}</div>}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-900 text-white">
      <header className="flex items-center gap-2 p-2 bg-gray-800">
        <img
          src="/themes/Yaru/apps/radar-symbolic.svg"
          alt="Radar"
          className="w-5 h-5"
        />
        <h1 className="font-mono">Nmap NSE</h1>
      </header>
      <section className="border-b border-gray-800 bg-gray-900 p-4 grid grid-cols-1 gap-4 md:grid-cols-3 text-sm">
        <div>
          <p className="text-xs uppercase text-gray-400 tracking-wide">Categories</p>
          <p className="font-mono text-sm text-gray-200">
            {tags.length ? tags.join(', ') : 'Loading…'}
          </p>
        </div>
        <nav aria-label="Script breadcrumb" className="md:text-center">
          <p className="text-xs uppercase text-gray-400 tracking-wide">Breadcrumb</p>
          {selected ? (
            <p className="font-mono text-sm text-gray-200" data-testid="nmap-breadcrumb">
              <span>{selected.tag}</span> <span aria-hidden="true">›</span> {selected.name}
            </p>
          ) : (
            <p className="text-gray-500">Select a script to see the path.</p>
          )}
        </nav>
        <div className="md:text-right">
          <p className="text-xs uppercase text-gray-400 tracking-wide">Last run</p>
          {lastRun ? (
            <div className="font-mono text-sm text-gray-200">
              <p>
                {lastRun.tag} <span aria-hidden="true">›</span> {lastRun.script}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(lastRun.timestamp).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="text-gray-500">No runs yet</p>
          )}
        </div>
      </section>
      <div className="flex flex-1">
        {/* script browser */}
        <aside className="w-1/3 border-r border-gray-700 flex flex-col">
          <div className="sticky top-0 p-2 bg-gray-900 z-10 flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                className={`h-6 px-2 rounded-full text-xs capitalize bg-gray-700 hover:bg-gray-600 flex items-center ${
                  activeTag === tag ? 'bg-blue-600' : ''
                }`}
                onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
              >
                {tag}
              </button>
            ))}
              <label htmlFor="nmap-nse-search" className="sr-only" id="nmap-nse-search-label">
                Search scripts
              </label>
              <input
                id="nmap-nse-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="h-6 px-2 rounded text-black font-mono flex-1"
                aria-labelledby="nmap-nse-search-label"
              />
            <button
              className="ml-auto px-3 py-1 bg-green-700 rounded disabled:opacity-50"
              onClick={run}
              disabled={!selected}
            >
              Run
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {scripts.map((s) => (
              <button
                key={s.name}
                onClick={() => setSelected(s)}
                className={`w-full text-left px-2 py-1 rounded font-mono text-sm hover:bg-gray-800 ${
                  selected?.name === s.name ? 'bg-gray-800' : 'bg-gray-700'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </aside>

        {/* details */}
        <main className="flex-1 p-4 overflow-y-auto">
          {selected ? (
            <div>
              <h1 className="text-2xl mb-2 font-mono">{selected.name}</h1>
              <p className="mb-4">{selected.description}</p>
              <p className="mb-2 text-sm">Tag: {selected.tag}</p>
              <CollapsibleSection title="Sample Output" tag={selected.tag}>
                <p className="text-sm text-gray-300 mb-2">
                  This is a reference snippet from the script documentation to
                  help you understand what a successful run reports.
                </p>
                <pre className="bg-black text-green-400 rounded overflow-auto font-mono leading-[1.2]">
                  {selected.example}
                </pre>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                    onClick={() => copyToClipboard(selected.example, 'sample')}
                    type="button"
                  >
                    Copy sample output
                  </button>
                  {copyFeedback?.context === 'sample' && (
                    <span
                      role="status"
                      className="text-xs text-gray-300"
                      aria-live="polite"
                    >
                      {copyFeedback.message}
                    </span>
                  )}
                </div>
              </CollapsibleSection>
              {result && (
                <CollapsibleSection title="Result" tag={selected.tag}>
                  <p className="text-sm text-gray-300 mb-2">
                    Output captured from the simulated run initiated above.
                    Use it to compare with real-world scans in a safe
                    environment.
                  </p>
                  <pre className="bg-black text-green-400 rounded overflow-auto font-mono leading-[1.2]">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="px-2 py-1 bg-blue-700 rounded"
                      onClick={download}
                      type="button"
                    >
                      Download JSON
                    </button>
                    <button
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(result, null, 2),
                          'result'
                        )
                      }
                      type="button"
                    >
                      Copy result JSON
                    </button>
                    {canShare() && (
                      <button
                        className="px-2 py-1 bg-purple-700 rounded"
                        onClick={shareResult}
                        type="button"
                      >
                        Share
                      </button>
                    )}
                    {copyFeedback?.context === 'result' && (
                      <span
                        role="status"
                        className="text-xs text-gray-300 self-center"
                        aria-live="polite"
                      >
                        {copyFeedback.message}
                      </span>
                    )}
                  </div>
                </CollapsibleSection>
              )}
            </div>
          ) : (
            <p>Select a script to view details.</p>
          )}
        </main>
      </div>
    </div>
  );
};

export default NmapNSE;

