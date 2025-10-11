'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import LabMode from '../../components/LabMode';
import CommandBuilder from '../../components/CommandBuilder';
import ScriptPlayground from './components/ScriptPlayground';
import ReportView, { Report } from './components/ReportView';
import share, { canShare } from '../../utils/share';
import scriptCatalog from '../../public/demo-data/nmap/scripts.json';
import outputFixture from '../../public/demo/nmap-nse.json';
import resultsFixture from '../../public/demo/nmap-results.json';

interface RawScript {
  name: string;
  description: string;
  example?: string;
  categories?: string[];
  phases?: string[];
}

type ScriptData = Record<string, RawScript[]>;

interface Script {
  name: string;
  description: string;
  example: string;
  categories: string[];
  phases: string[];
}

const FALLBACK_PHASES: Record<string, string[]> = {
  discovery: ['portrule'],
  vuln: ['hostrule'],
  safe: ['portrule'],
};

const PORT_PRESETS = [
  { label: 'Default', flag: '' },
  { label: 'Common', flag: '-F' },
  { label: 'Full', flag: '-p-' },
];

const buildLibrary = (data: ScriptData): Script[] =>
  Object.entries(data).flatMap(([tag, scripts]) =>
    scripts.map((script) => ({
      name: script.name,
      description: script.description,
      example: script.example || '',
      categories: script.categories || [tag],
      phases: script.phases || FALLBACK_PHASES[tag] || ['hostrule'],
    }))
  );

const initialScripts = buildLibrary(scriptCatalog as ScriptData);

const initialExamples = initialScripts.reduce<Record<string, string>>((acc, script) => {
  if (script.example) {
    acc[script.name] = script.example;
  }
  return acc;
}, { ...outputFixture } as Record<string, string>);

const NmapNSE: React.FC = () => {
  const [scripts, setScripts] = useState<Script[]>(initialScripts);
  const [examples, setExamples] = useState<Record<string, string>>(initialExamples);
  const [report, setReport] = useState<Report>(resultsFixture as Report);
  const [activeTag, setActiveTag] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Script | null>(initialScripts[0] || null);
  const [result, setResult] = useState<{ script: string; output: string } | null>(null);
  const [target, setTarget] = useState('scanme.nmap.org');
  const [portFlag, setPortFlag] = useState('');
  const [command, setCommand] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch('/demo-data/nmap/scripts.json', {
          signal: controller.signal,
        });
        if (res.ok) {
          const json: ScriptData = await res.json();
          const next = buildLibrary(json);
          if (next.length) {
            setScripts(next);
            if (!selected || !next.find((s) => s.name === selected.name)) {
              setSelected(next[0]);
            }
            setExamples((prev) => {
              const merged = { ...prev };
              next.forEach((script) => {
                if (script.example) {
                  merged[script.name] = script.example;
                }
              });
              return merged;
            });
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          // ignore
        }
      }

      try {
        const res = await fetch('/demo/nmap-nse.json', {
          signal: controller.signal,
        });
        if (res.ok) {
          const json: Record<string, string> = await res.json();
          setExamples((prev) => ({ ...prev, ...json }));
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          // ignore
        }
      }

      try {
        const res = await fetch('/demo/nmap-results.json', {
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.hosts) {
            setReport(json);
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          // ignore
        }
      }
    };

    load();

    return () => controller.abort();
  }, []);

  const tags = useMemo(() => {
    const set = new Set<string>();
    scripts.forEach((script) => {
      script.categories.forEach((category) => set.add(category));
    });
    return Array.from(set).sort();
  }, [scripts]);

  const filtered = useMemo(
    () =>
      scripts.filter(
        (script) =>
          (!activeTag || script.categories.includes(activeTag)) &&
          script.name.toLowerCase().includes(search.toLowerCase())
      ),
    [activeTag, scripts, search]
  );

  const run = () => {
    if (!selected) return;
    const output = examples[selected.name] || selected.example;
    setResult({ script: selected.name, output });
  };

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

  const buildCommand = useCallback(
    (params: Record<string, string>) => {
      const resolvedTarget = (params.target || target || '').trim() || 'scanme.nmap.org';
      const extra = (params.opts || '').trim();
      const scriptFlag = selected ? `--script ${selected.name}` : '';
      const segments = ['nmap'];
      if (portFlag) segments.push(portFlag);
      if (extra) segments.push(extra);
      if (scriptFlag) segments.push(scriptFlag);
      segments.push(resolvedTarget);
      return segments.join(' ').replace(/\s+/g, ' ').trim();
    },
    [portFlag, selected, target]
  );

  const handleBuild = useCallback((value: string) => {
    setCommand(value);
  }, []);

  const datasetSummary = useMemo(() => {
    const total = scripts.length;
    const categories = tags.join(', ');
    return { total, categories };
  }, [scripts.length, tags]);

  return (
    <LabMode>
      <div className="flex min-h-screen flex-col gap-4 bg-gray-900 p-4 text-white">
        <header className="flex flex-wrap items-center gap-2">
          <img
            src="/themes/Yaru/apps/radar-symbolic.svg"
            alt="Radar"
            className="h-5 w-5"
          />
          <h1 className="font-mono text-lg">Nmap NSE</h1>
          <p className="text-xs text-yellow-200">
            Simulated lab with canned NSE outputs and safe command building.
          </p>
        </header>
        <div className="flex flex-col gap-4 lg:flex-row">
          <section className="flex-1 space-y-4">
            <div className="rounded border border-white/10 bg-black/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
                    className={`rounded-full px-3 py-1 text-xs capitalize transition ${
                      activeTag === tag ? 'bg-blue-600' : 'bg-gray-700'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                <label htmlFor="nmap-nse-search" className="sr-only">
                  Search scripts
                </label>
                <input
                  id="nmap-nse-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="ml-auto flex-1 rounded bg-white px-3 py-1 text-sm text-black"
                />
              </div>
              <div className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
                {filtered.map((script) => (
                  <button
                    key={script.name}
                    onClick={() => setSelected(script)}
                    className={`rounded px-2 py-1 text-left text-sm font-mono transition ${
                      selected?.name === script.name ? 'bg-gray-800' : 'bg-gray-700'
                    }`}
                  >
                    {script.name}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="col-span-2 text-xs text-gray-300">
                    No scripts match that filter.
                  </p>
                )}
              </div>
            </div>
            <div className="rounded border border-white/10 bg-black/40 p-4">
              {selected ? (
                <>
                  <h2 className="font-mono text-xl">{selected.name}</h2>
                  <p className="mt-2 text-sm">{selected.description}</p>
                  <p className="mt-1 text-xs text-gray-300">
                    Categories: {selected.categories.join(', ')}
                  </p>
                  <p className="mt-1 text-xs text-gray-300">
                    Phases: {selected.phases.join(' → ')}
                  </p>
                  <div className="mt-4 space-y-2">
                    <h3 className="text-sm font-semibold">Sample output</h3>
                    <pre className="max-h-64 overflow-auto rounded bg-black p-2 font-mono text-xs leading-[1.2] text-green-300">
                      {examples[selected.name] || 'No fixture available.'}
                    </pre>
                    <div className="flex gap-2">
                      <button
                        className="rounded bg-green-700 px-3 py-1 text-xs font-semibold"
                        onClick={run}
                        type="button"
                      >
                        Run
                      </button>
                      <button
                        className="rounded bg-blue-700 px-3 py-1 text-xs font-semibold"
                        onClick={() => setTarget('scanme.nmap.org')}
                        type="button"
                      >
                        Reset Target
                      </button>
                    </div>
                  </div>
                  {result && result.script === selected.name && (
                    <div className="mt-4 space-y-2">
                      <h3 className="text-sm font-semibold">Result</h3>
                      <pre className="max-h-48 overflow-auto rounded bg-black p-2 font-mono text-xs leading-[1.2] text-green-300">
                        {result.output}
                      </pre>
                      <div className="flex gap-2">
                        <button
                          className="rounded bg-blue-700 px-2 py-1 text-xs"
                          onClick={download}
                          type="button"
                        >
                          Download JSON
                        </button>
                        {canShare() && (
                          <button
                            className="rounded bg-purple-700 px-2 py-1 text-xs"
                            onClick={shareResult}
                            type="button"
                          >
                            Share
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p>Select a script to view details.</p>
              )}
            </div>
            <div className="rounded border border-white/10 bg-black/40 p-4">
              <h3 className="text-sm font-semibold">Parsed report</h3>
              <p className="mb-2 text-xs text-gray-300">
                Fixture sourced from <code>public/demo/nmap-results.json</code>.
              </p>
              <ReportView report={report} />
            </div>
          </section>
          <aside className="w-full space-y-4 lg:w-80">
            <div className="rounded border border-white/10 bg-black/40 p-4 space-y-2">
              <label className="block text-xs font-semibold" htmlFor="nmap-target-input">
                Target host or range
              </label>
              <input
                id="nmap-target-input"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full rounded bg-white px-2 py-1 text-sm text-black"
                placeholder="scanme.nmap.org"
              />
              <div className="mt-2 flex gap-2">
                {PORT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setPortFlag(preset.flag)}
                    className={`rounded px-2 py-1 text-xs font-semibold transition ${
                      portFlag === preset.flag ? 'bg-ub-yellow text-black' : 'bg-gray-700'
                    }`}
                    type="button"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <CommandBuilder
                doc="Build an NSE command for the selected script. No traffic is sent."
                build={buildCommand}
                onBuild={handleBuild}
              />
              <div className="flex justify-end text-[11px] text-gray-400">
                {command}
              </div>
            </div>
            <div className="rounded border border-white/10 bg-black/40 p-4 text-xs leading-relaxed text-gray-200">
              <h3 className="text-sm font-semibold text-white">Fixture catalog</h3>
              <p className="mt-2">
                {datasetSummary.total} scripts loaded from{' '}
                <code>public/demo-data/nmap/scripts.json</code> with categories{' '}
                {datasetSummary.categories || 'n/a'}.
              </p>
              <p className="mt-2">
                Output fixtures originate from <code>public/demo/nmap-nse.json</code> and
                the parsed topology uses <code>public/demo/nmap-results.json</code>.
              </p>
            </div>
            <div className="rounded border border-white/10 bg-black/40">
              <ScriptPlayground />
            </div>
          </aside>
        </div>
      </div>
    </LabMode>
  );
};

export default NmapNSE;
