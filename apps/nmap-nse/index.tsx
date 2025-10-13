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

  const severityTone = (tag: string) => {
    switch (tag) {
      case 'vuln':
        return {
          chip: 'border-kali-severity-high/70 bg-kali-severity-high/15 text-kali-severity-high',
          section: 'border-kali-severity-high/70',
          halo: 'shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-severity-high)_65%,transparent)]',
        };
      case 'safe':
        return {
          chip: 'border-kali-severity-low/70 bg-kali-severity-low/15 text-kali-severity-low',
          section: 'border-kali-severity-low/70',
          halo: 'shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-severity-low)_65%,transparent)]',
        };
      default:
        return {
          chip:
            'border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--color-accent)_18%,var(--kali-panel))] text-[color:var(--color-text)]',
          section: 'border-[color:var(--kali-border)]',
          halo: 'shadow-[0_0_0_1px_var(--color-accent)]',
        };
    }
  };

  const timelineSteps = useMemo(() => {
    const states: Array<'queued' | 'running' | 'complete'> = [
      'queued',
      'running',
      'complete',
    ];
    const currentState: 'queued' | 'running' | 'complete' = result
      ? 'complete'
      : selected
        ? 'running'
        : 'queued';
    const currentIndex = states.indexOf(currentState);

    return states.map((state, index) => {
      const status =
        currentState === 'complete'
          ? index <= currentIndex
            ? 'done'
            : 'upcoming'
          : index < currentIndex
            ? 'done'
            : index === currentIndex
              ? 'active'
              : 'upcoming';

      const labelMap: Record<typeof state, string> = {
        queued: 'Queued',
        running: 'Running',
        complete: 'Completed',
      };

      const descriptionMap: Record<typeof state, string> = {
        queued:
          'Staged for the scheduler. Select a script to preview host metadata before execution.',
        running:
          'Simulated scan in progress. Review live metadata while logs stream in.',
        complete:
          lastRun && lastRun.script === selected?.name
            ? `Finished at ${new Date(lastRun.timestamp).toLocaleTimeString()}.`:
            lastRun
              ? `Last completed: ${new Date(lastRun.timestamp).toLocaleString()}.`
              : 'Awaiting the first run of this script.',
      };

      return {
        id: state,
        label: labelMap[state],
        description: descriptionMap[state],
        status,
      };
    });
  }, [lastRun, result, selected]);

  const CollapsibleSection: React.FC<{
    title: string;
    tag?: string;
    children: React.ReactNode;
  }> = ({ title, tag, children }) => {
    const [open, setOpen] = useState(true);
    return (
      <div
        className={`relative mb-4 overflow-hidden rounded-lg border ${
          severityTone(tag || '').section
        } bg-[var(--kali-panel)] shadow-lg shadow-black/30`}
      >
        <button
          className="flex w-full items-center justify-between gap-4 bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,var(--kali-overlay))] px-4 py-2 text-left font-semibold tracking-wide text-[color:var(--color-text)]"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="text-xs uppercase text-[color:var(--color-muted)]">{title}</span>
          <span className="text-xl leading-none text-[color:var(--color-muted)]">{open ? '−' : '+'}</span>
        </button>
        {open && (
          <div className="p-4 text-sm text-[color:var(--color-text)]">{children}</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-screen flex-col bg-[var(--kali-panel)] text-[color:var(--color-text)]">
      <header className="flex items-center gap-2 border-b border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-4 py-3">
        <img
          src="/themes/Yaru/apps/radar-symbolic.svg"
          alt="Radar"
          className="w-5 h-5"
        />
        <h1 className="font-mono text-lg tracking-wide">Nmap NSE</h1>
      </header>
      <section className="border-b border-[color:var(--kali-border)] bg-[var(--kali-panel)]">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-6 text-sm md:grid-cols-3">
          <div className="rounded-lg border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-4 shadow-kali-panel">
            <p className="text-xs uppercase tracking-wide text-[color:var(--color-muted)]">Categories</p>
            <p className="mt-2 font-mono text-sm text-[color:var(--color-text)]">
              {tags.length ? tags.join(', ') : 'Loading…'}
            </p>
          </div>
          <nav
            aria-label="Script breadcrumb"
            className="rounded-lg border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-4 text-center shadow-kali-panel md:text-left"
          >
            <p className="text-xs uppercase tracking-wide text-[color:var(--color-muted)]">Breadcrumb</p>
            {selected ? (
              <p
                className="mt-2 font-mono text-sm text-[color:var(--color-text)]"
                data-testid="nmap-breadcrumb"
              >
                <span className="capitalize text-kali-accent">{selected.tag}</span>{' '}
                <span aria-hidden="true" className="text-[color:var(--color-muted)]">
                  ›
                </span>{' '}
                <span className="text-[color:var(--color-text)]">{selected.name}</span>
              </p>
            ) : (
              <p className="mt-2 text-[color:var(--color-muted)]">Select a script to see the path.</p>
            )}
          </nav>
          <div className="rounded-lg border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-4 shadow-kali-panel md:text-right">
            <p className="text-xs uppercase tracking-wide text-[color:var(--color-muted)]">Last run</p>
            {lastRun ? (
              <div className="mt-2 space-y-1 font-mono text-sm text-[color:var(--color-text)]">
                <p>
                  {lastRun.tag} <span aria-hidden="true">›</span> {lastRun.script}
                </p>
                <p className="text-xs text-[color:var(--color-muted)]">
                  {new Date(lastRun.timestamp).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-[color:var(--color-muted)]">No runs yet</p>
            )}
          </div>
        </div>
      </section>
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* script browser */}
        <aside className="border-b border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-4 py-5 shadow-inner shadow-black/40 lg:w-80 lg:border-b-0 lg:border-r lg:px-5">
          <div className="sticky top-20 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold capitalize tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)] ${
                    activeTag === tag
                      ? `${severityTone(tag).chip} ${severityTone(tag).halo}`
                      : 'border-[color:var(--kali-border)] bg-[var(--kali-panel)] text-[color:var(--color-text)] hover:border-kali-accent/60 hover:text-kali-accent'
                  }`}
                  onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
                >
                  {tag}
                </button>
              ))}
              <label
                htmlFor="nmap-nse-search"
                className="sr-only"
                id="nmap-nse-search-label"
              >
                Search scripts
              </label>
              <input
                id="nmap-nse-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter scripts"
                className="h-9 flex-1 rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-3 font-mono text-sm text-[color:var(--color-text)] placeholder:text-[color:var(--color-muted)] focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent"
                aria-labelledby="nmap-nse-search-label"
              />
            </div>
            <button
              className="inline-flex items-center justify-center rounded-md border border-kali-accent/70 bg-kali-accent/20 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-kali-accent/30 disabled:border-[color:var(--kali-border)] disabled:bg-[var(--kali-panel)] disabled:text-[color:var(--color-muted)]"
              onClick={run}
              disabled={!selected}
            >
              Run scan
            </button>
            <div className="rounded-lg border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-3 shadow-inner shadow-black/20">
              <p className="text-xs uppercase tracking-wide text-[color:var(--color-muted)]">Script catalog</p>
              <div className="mt-3 grid max-h-[50vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:max-h-none lg:grid-cols-1">
                {scripts.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => setSelected(s)}
                    aria-label={s.name}
                    className={`w-full rounded-md border px-3 py-2 text-left font-mono text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)] ${
                      selected?.name === s.name
                        ? 'border-kali-accent/70 bg-kali-accent/20 text-white shadow-[0_0_0_1px_var(--color-accent)]'
                        : 'border-[color:var(--kali-border)] bg-[var(--kali-panel)] text-[color:var(--color-text)] hover:border-kali-accent/50 hover:text-kali-accent'
                    }`}
                  >
                    <span className="block text-xs uppercase tracking-wide text-kali-accent">
                      {s.tag}
                    </span>
                    <span className="mt-1 block text-sm">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* details */}
        <main className="flex-1 overflow-y-auto px-4 py-6">
          {selected ? (
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
              <section className="rounded-lg border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-6 shadow-lg shadow-black/30">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="font-mono text-2xl tracking-tight text-[color:var(--color-text)]">
                      {selected.name}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm text-[color:var(--color-muted)]">
                      {selected.description}
                    </p>
                  </div>
                  <dl className="grid gap-3 text-sm text-[color:var(--color-muted)]">
                    <div className="rounded-md border border-kali-accent/60 bg-kali-accent/10 px-3 py-2 text-right">
                      <dt className="text-xs uppercase tracking-wide text-kali-accent">
                        Script Tag
                      </dt>
                      <dd className="font-mono text-sm text-white">
                        {selected.tag}
                      </dd>
                    </div>
                    {lastRun && lastRun.script === selected.name && (
                      <div className="rounded-md border border-kali-severity-low/60 bg-kali-severity-low/10 px-3 py-2 text-right text-white">
                        <dt className="text-xs uppercase tracking-wide text-kali-severity-low">
                          Last Completed
                        </dt>
                        <dd className="font-mono text-xs text-white/90">
                          {new Date(lastRun.timestamp).toLocaleString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="rounded-lg border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-5 shadow-inner shadow-black/30">
                  <h2 className="text-xs uppercase tracking-wide text-[color:var(--color-muted)]">
                    Scan lifecycle
                  </h2>
                  <ol className="mt-4 space-y-3">
                    {timelineSteps.map((step) => {
                      const tone =
                        step.status === 'done'
                          ? 'border-kali-severity-low/60 bg-kali-severity-low/15 text-white'
                          : step.status === 'active'
                            ? 'border-kali-accent/70 bg-kali-accent/20 text-white shadow-[0_0_0_1px_var(--color-accent)]'
                            : 'border-[color:var(--kali-border)] bg-[var(--kali-panel)] text-[color:var(--color-muted)]';
                      return (
                        <li
                          key={step.id}
                          className={`rounded-md border px-3 py-2 text-sm transition ${tone}`}
                        >
                          <p className="font-semibold uppercase tracking-wide">
                            {step.label}
                          </p>
                          <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                            {step.description}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                </aside>

                <div className="flex flex-col gap-4">
                  <CollapsibleSection title="Sample Output" tag={selected.tag}>
                    <p className="mb-3 text-sm text-[color:var(--color-muted)]">
                      This is a reference snippet from the script documentation to
                      help you understand what a successful run reports.
                    </p>
                    <pre className="max-h-72 overflow-auto rounded-md border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] p-4 font-mono text-xs leading-relaxed text-green-400">
                      {selected.example}
                    </pre>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      <button
                        className="rounded border border-kali-accent/60 bg-kali-accent/15 px-3 py-1 font-semibold uppercase tracking-wide text-white transition hover:bg-kali-accent/25"
                        onClick={() => copyToClipboard(selected.example, 'sample')}
                        type="button"
                      >
                        Copy sample output
                      </button>
                      {copyFeedback?.context === 'sample' && (
                        <span
                          role="status"
                          className="text-xs text-[color:var(--color-muted)]"
                          aria-live="polite"
                        >
                          {copyFeedback.message}
                        </span>
                      )}
                    </div>
                  </CollapsibleSection>
                  {result && (
                    <CollapsibleSection title="Result" tag={selected.tag}>
                      <p className="mb-3 text-sm text-[color:var(--color-muted)]">
                        Output captured from the simulated run initiated above.
                        Use it to compare with real-world scans in a safe
                        environment.
                      </p>
                      <pre className="max-h-72 overflow-auto rounded-md border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] p-4 font-mono text-xs leading-relaxed text-green-400">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs">
                        <button
                          className="rounded border border-kali-accent/70 bg-kali-accent/20 px-3 py-1 font-semibold uppercase tracking-wide text-white transition hover:bg-kali-accent/30"
                          onClick={download}
                          type="button"
                        >
                          Download JSON
                        </button>
                        <button
                          className="rounded border border-kali-accent/60 bg-kali-accent/15 px-3 py-1 font-semibold uppercase tracking-wide text-white transition hover:bg-kali-accent/25"
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
                            className="rounded border border-kali-accent/70 bg-kali-accent/20 px-3 py-1 font-semibold uppercase tracking-wide text-white transition hover:bg-kali-accent/30"
                            onClick={shareResult}
                            type="button"
                          >
                            Share
                          </button>
                        )}
                        {copyFeedback?.context === 'result' && (
                          <span
                            role="status"
                            className="self-center text-xs text-[color:var(--color-muted)]"
                            aria-live="polite"
                          >
                            {copyFeedback.message}
                          </span>
                        )}
                      </div>
                    </CollapsibleSection>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-center rounded-lg border border-dashed border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_80%,var(--kali-overlay))] p-12 text-center text-sm text-[color:var(--color-muted)]">
              Select a script to view host metadata and simulated log output.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default NmapNSE;

