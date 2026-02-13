import { useEffect, useMemo, useState } from 'react';
import modules from '../../components/apps/metasploit/modules.json';

const severityPalette = {
  critical: 'bg-rose-600/90 text-white border border-rose-400/70',
  high: 'bg-orange-500/90 text-slate-900 border border-orange-300/80',
  medium: 'bg-amber-300/80 text-slate-900 border border-amber-200/80',
  low: 'bg-emerald-300/80 text-slate-900 border border-emerald-200/80',
};

const typePalette = {
  exploit: 'bg-rose-700/80 text-white',
  auxiliary: 'bg-sky-600/70 text-white',
  post: 'bg-emerald-600/70 text-white',
};

const severityOrder = ['critical', 'high', 'medium', 'low'];

const commandSequences = (module) => {
  const moduleTag = module?.tags?.[0] || module?.name?.split('/').pop();
  const baseName = module?.name || 'module';
  let counter = 0;
  const withId = (line) => ({ ...line, id: `${baseName}-${counter++}` });

  const transcriptLines = (module?.transcript || '')
    .split('\n')
    .filter(Boolean)
    .map((line) => withId({ type: 'output', text: line }));

  return [
    withId({
      type: 'comment',
      text: '# Sample lab-only execution transcript',
    }),
    withId({
      type: 'command',
      text: `msf6 > search ${moduleTag}`,
    }),
    withId({
      type: 'output',
      text: `[+] Located ${module?.name}`,
    }),
    withId({
      type: 'command',
      text: `msf6 > use ${module?.name}`,
    }),
    ...transcriptLines,
    withId({
      type: 'command',
      text: `msf6 ${module?.type || 'module'}(${module?.name}) > info`,
    }),
    withId({
      type: 'output',
      text: '       This simulated output is sourced from the offline module dataset.',
    }),
    withId({
      type: 'command',
      text: 'msf6 > sessions -i 1',
    }),
    withId({
      type: 'output',
      text: '[*] Demo session pinned in read-only mode',
    }),
  ];
};

const usePrefersReducedMotion = () => {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefers(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);
  return prefers;
};

const FauxConsolePanel = ({ activeModule, labModeEnabled }) => {
  const [visibleLines, setVisibleLines] = useState([]);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const lines = commandSequences(activeModule);
    if (!labModeEnabled) {
      setVisibleLines([
        {
          id: 'lab-mode-disabled',
          type: 'comment',
          text: '# Enable lab mode to replay the simulated session.',
        },
      ]);
      return;
    }

    if (reducedMotion) {
      setVisibleLines(lines);
      return;
    }

    setVisibleLines([]);

    const timer = setInterval(() => {
      setVisibleLines((prev) => {
        const nextIndex = prev.length + 1;
        if (nextIndex > lines.length) {
          clearInterval(timer);
          return prev;
        }
        return lines.slice(0, nextIndex);
      });
    }, 650);

    return () => clearInterval(timer);
  }, [activeModule, labModeEnabled, reducedMotion]);

  return (
    <section
      className="flex flex-col overflow-hidden rounded-xl border border-slate-800/80 bg-black/90 shadow-lg shadow-black/40"
      aria-labelledby="metasploit-console-heading"
    >
      <header className="flex items-center justify-between border-b border-slate-800/70 px-4 py-3">
        <div>
          <h3 id="metasploit-console-heading" className="text-sm font-semibold uppercase tracking-wide text-slate-200">
            Faux Console Session
          </h3>
          <p className="text-xs text-slate-400">
            Replay of a single module run with syntax-highlighted commands.
          </p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
          {activeModule ? activeModule.name : 'No module selected'}
        </span>
      </header>
      <div
        className="scrollbar-thin scrollbar-track-slate-900/80 scrollbar-thumb-slate-700/70 h-64 overflow-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4"
        role="log"
        aria-live="polite"
      >
        <pre className="font-mono text-xs leading-6 text-emerald-300">
          {visibleLines.map((line) => (
            <code
              key={line.id}
              className={
                line.type === 'command'
                  ? 'block text-sky-300'
                  : line.type === 'comment'
                    ? 'block text-slate-500'
                    : 'block text-emerald-300'
              }
            >
              {line.type === 'command' ? `$ ${line.text}` : line.text}
            </code>
          ))}
        </pre>
      </div>
    </section>
  );
};

export default function MetasploitPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [labMode, setLabMode] = useState(false);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(modules.map((module) => module.type))).sort()],
    []
  );
  const tags = useMemo(
    () => ['all', ...Array.from(new Set(modules.flatMap((module) => module.tags || []))).sort()],
    []
  );
  const severities = useMemo(() => ['all', ...severityOrder.filter((level) => modules.some((m) => m.severity === level))], []);

  const filteredModules = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();
    const rank = (severity) => {
      const index = severityOrder.indexOf(severity);
      return index === -1 ? severityOrder.length : index;
    };

    return modules
      .filter((module) => {
        const matchesCategory = selectedCategory === 'all' || module.type === selectedCategory;
        const matchesSeverity = selectedSeverity === 'all' || module.severity === selectedSeverity;
        const matchesTag = selectedTag === 'all' || (module.tags || []).includes(selectedTag);
        const matchesSearch =
          !lowerSearch ||
          module.name.toLowerCase().includes(lowerSearch) ||
          module.description.toLowerCase().includes(lowerSearch) ||
          (module.cve || []).some((entry) => entry.toLowerCase().includes(lowerSearch));
        return matchesCategory && matchesSeverity && matchesTag && matchesSearch;
      })
      .sort((a, b) => rank(a.severity) - rank(b.severity));
  }, [searchTerm, selectedCategory, selectedSeverity, selectedTag]);

  const [highlightedModule, setHighlightedModule] = useState(filteredModules[0] || null);

  useEffect(() => {
    setHighlightedModule((prev) => {
      if (prev && filteredModules.some((module) => module.name === prev.name)) {
        return prev;
      }
      return filteredModules[0] || null;
    });
  }, [filteredModules]);

  return (
    <div className="flex h-full flex-col bg-slate-950/95 text-slate-100">
      <header className="border-b border-slate-800/70 bg-slate-950/80 px-6 py-4 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Metasploit Knowledge Lab</h1>
            <p className="text-sm text-slate-400">
              Explore the offline module catalog, review mitigations, and replay simulated command output safely.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLabMode((value) => !value)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:ring-offset-2 focus:ring-offset-slate-950 ${
              labMode
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
            }`}
            aria-pressed={labMode}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${labMode ? 'bg-emerald-400 shadow-[0_0_0.5rem_0.05rem_rgba(16,185,129,0.75)]' : 'bg-slate-500'}`}
              aria-hidden="true"
            />
            {labMode ? 'Lab Mode Enabled' : 'Enable Lab Mode'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-hidden p-6 lg:flex-row">
        <aside className="w-full space-y-6 rounded-2xl border border-slate-800/70 bg-slate-950/70 p-5 shadow-inner shadow-black/20 lg:w-72 lg:flex-shrink-0">
          <section aria-labelledby="metasploit-warning" className="space-y-3">
            <h2 id="metasploit-warning" className="text-sm font-semibold uppercase tracking-wide text-rose-300">
              Exploitation Warnings
            </h2>
            <p className="rounded-lg border border-rose-500/60 bg-rose-500/10 p-3 text-xs text-rose-100">
              Offensive operations are disabled. These modules are demonstrations only—use them for training scenarios in
              isolated lab networks. Any actual exploitation must be authorised and compliant with local laws.
            </p>
          </section>

          <section aria-labelledby="metasploit-filter-heading" className="space-y-4">
            <h2 id="metasploit-filter-heading" className="text-sm font-semibold uppercase tracking-wide text-slate-200">
              Module Filters
            </h2>
            <label htmlFor="metasploit-search" className="sr-only">
              Search modules
            </label>
              <input
                id="metasploit-search"
                type="search"
                placeholder="Search by name, CVE, or description"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                aria-label="Search modules"
              />

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Category</span>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                      selectedCategory === category
                        ? 'bg-sky-600 text-white shadow'
                        : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                    }`}
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={selectedCategory === category}
                  >
                    {category === 'all' ? 'All' : category}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="metasploit-severity" className="text-xs uppercase tracking-wide text-slate-400">
                Severity
              </label>
              <select
                id="metasploit-severity"
                value={selectedSeverity}
                onChange={(event) => setSelectedSeverity(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              >
                {severities.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity === 'all' ? 'All severities' : severity}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="metasploit-tags" className="text-xs uppercase tracking-wide text-slate-400">
                Tag
              </label>
              <select
                id="metasploit-tags"
                value={selectedTag}
                onChange={(event) => setSelectedTag(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              >
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag === 'all' ? 'All tags' : tag}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section aria-labelledby="metasploit-resources" className="space-y-3">
            <h2 id="metasploit-resources" className="text-sm font-semibold uppercase tracking-wide text-slate-200">
              Learning Resources
            </h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <a
                  href="https://docs.rapid7.com/metasploit/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-between rounded-lg border border-slate-800/70 bg-slate-900/60 px-3 py-2 transition hover:border-sky-500 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  Rapid7 Metasploit Docs
                  <span aria-hidden="true" className="text-sky-400">
                    ↗
                  </span>
                </a>
              </li>
              <li>
                <a
                  href="https://attack.mitre.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-between rounded-lg border border-slate-800/70 bg-slate-900/60 px-3 py-2 transition hover:border-sky-500 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  MITRE ATT&CK Techniques
                  <span aria-hidden="true" className="text-sky-400">
                    ↗
                  </span>
                </a>
              </li>
              <li>
                <a
                  href="https://owasp.org/www-project-top-ten/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-between rounded-lg border border-slate-800/70 bg-slate-900/60 px-3 py-2 transition hover:border-sky-500 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  OWASP Top Ten Overview
                  <span aria-hidden="true" className="text-sky-400">
                    ↗
                  </span>
                </a>
              </li>
            </ul>
          </section>

          <section aria-labelledby="metasploit-dataset" className="space-y-2">
            <h2 id="metasploit-dataset" className="text-sm font-semibold uppercase tracking-wide text-slate-200">
              Offline Dataset
            </h2>
            <p className="text-xs text-slate-400">
              All module metadata is bundled locally from <code className="font-mono text-[0.65rem]">modules.json</code> to ensure the
              experience remains available without external network access.
            </p>
          </section>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-hidden">
          <section aria-labelledby="metasploit-catalog" className="flex-1 overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/70 p-5 shadow-inner shadow-black/30">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="metasploit-catalog" className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                  Module Catalog
                </h2>
                <p className="text-xs text-slate-400">{filteredModules.length} results filtered by current selections.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                {selectedSeverity !== 'all' && (
                  <span className={`rounded-full px-3 py-1 font-semibold capitalize ${severityPalette[selectedSeverity] || ''}`}>
                    {selectedSeverity} severity
                  </span>
                )}
                {selectedCategory !== 'all' && (
                  <span className="rounded-full bg-slate-800/80 px-3 py-1 font-semibold capitalize text-slate-200">
                    {selectedCategory}
                  </span>
                )}
                {selectedTag !== 'all' && (
                  <span className="rounded-full bg-slate-800/80 px-3 py-1 font-semibold text-slate-200">#{selectedTag}</span>
                )}
              </div>
            </div>

            <div className="scrollbar-thin scrollbar-track-slate-900/40 scrollbar-thumb-slate-700/60 h-full overflow-auto">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredModules.map((module) => (
                  <button
                    type="button"
                    key={module.name}
                    onClick={() => setHighlightedModule(module)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setHighlightedModule(module);
                      }
                    }}
                    aria-pressed={highlightedModule?.name === module.name}
                    className={`group relative flex h-full flex-col rounded-xl border px-4 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                      highlightedModule?.name === module.name
                        ? 'border-sky-500/80 bg-slate-900/80 shadow-lg shadow-sky-900/40'
                        : 'border-slate-800/60 bg-slate-900/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 pr-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">{module.type}</p>
                        <h3 className="text-sm font-semibold text-white" title={module.name}>
                          {module.name}
                        </h3>
                      </div>
                      {module.severity ? (
                        <span
                          className={`rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide ${severityPalette[module.severity] || ''}`}
                        >
                          {module.severity}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 line-clamp-4 text-xs text-slate-300">{module.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-[0.65rem]">
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium capitalize ${typePalette[module.type] || 'bg-slate-700/80 text-white'}`}
                      >
                        {module.type}
                      </span>
                      {(module.cve || []).slice(0, 2).map((cve) => (
                        <span key={cve} className="rounded-full bg-slate-800/80 px-2 py-0.5 font-mono">
                          {cve}
                        </span>
                      ))}
                      {(module.tags || []).slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-800/60 px-2 py-0.5 text-slate-200">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <span className="sr-only">Select module {module.name}</span>
                  </button>
                ))}
                {filteredModules.length === 0 && (
                  <p className="col-span-full rounded-lg border border-slate-800/60 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
                    No modules found. Try adjusting your filters.
                  </p>
                )}
              </div>
            </div>
          </section>

          <FauxConsolePanel activeModule={highlightedModule} labModeEnabled={labMode} />
        </div>
      </div>
    </div>
  );
}
