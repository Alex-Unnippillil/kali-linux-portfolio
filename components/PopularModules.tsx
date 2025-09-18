import React, { useEffect, useState } from 'react';
import modulesData from '../data/module-index.json';
import versionInfo from '../data/module-version.json';

interface Module {
  id: string;
  name: string;
  description: string;
  tags: string[];
  log: { level: string; message: string }[];
  results: { target: string; status: string }[];
  data: string;
  inputs: string[];
  lab: string;
  options: { name: string; label: string }[];
}

const PopularModules: React.FC = () => {
  const [modules, setModules] = useState<Module[]>(modulesData as Module[]);
  const [version, setVersion] = useState<string>(versionInfo.version);
  const [updateMessage, setUpdateMessage] = useState<string>('');
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selected, setSelected] = useState<Module | null>(null);
  const [options, setOptions] = useState<Record<string, string>>({});
  const [logFilter, setLogFilter] = useState<string>('');

  const tags = Array.from(new Set(modules.flatMap((m) => m.tags)));
  let listed = filter ? modules.filter((m) => m.tags.includes(filter)) : modules;
  listed = search
    ? listed.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.description.toLowerCase().includes(search.toLowerCase())
      )
    : listed;

  const handleSelect = (m: Module) => {
    setSelected(m);
    setOptions(Object.fromEntries(m.options.map((o) => [o.name, ''])));
    setLogFilter('');
  };

  const commandPreview = selected
    ? `${selected.id}${Object.entries(options)
        .filter(([, v]) => v)
        .map(([k, v]) => ` --${k} ${v}`)
        .join('')}`
    : '';

  const filteredLog = selected
    ? selected.log.filter((l) =>
        l.message.toLowerCase().includes(logFilter.toLowerCase())
      )
    : [];
  const filterButtonBase =
    'px-sm py-2xs text-sm rounded-md border border-border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-secondary transition-colors duration-fast hover:bg-surface-elevated';
  const neutralButtonClass =
    'px-sm py-2xs text-sm rounded-md bg-surface-muted text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-secondary transition-colors duration-fast';
  const copyLogs = () => {
    const text = filteredLog.map((l) => l.message).join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  const copyCommand = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(commandPreview);
    }
  };

  useEffect(() => {
    fetch(`/api/modules/update?version=${version}`)
      .then((res) => res.json())
      .then((data) => setUpdateAvailable(data.needsUpdate))
      .catch(() => setUpdateAvailable(false));
  }, [version]);

  const handleUpdate = async () => {
    try {
      const res = await fetch(`/api/modules/update?version=${version}`);
      const data = await res.json();
      if (data.needsUpdate) {
        const mods = await fetch('/data/module-index.json').then((r) => r.json());
        setModules(mods);
        setVersion(data.latest);
        setUpdateMessage(`Updated to v${data.latest}`);
        setUpdateAvailable(false);
      } else {
        setUpdateMessage('Already up to date');
        setUpdateAvailable(false);
      }
    } catch {
      setUpdateMessage('Update failed');
    }
  };

  const levelClass: Record<string, string> = {
    info: 'text-status-info',
    success: 'text-status-success',
    error: 'text-status-danger',
    warning: 'text-status-warning',
  };

  const levelIcon: Record<string, React.ReactElement> = {
    info: (
      <svg
        className="w-6 h-6 text-status-info"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
        />
      </svg>
    ),
    success: (
      <svg
        className="w-6 h-6 text-status-success"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        />
      </svg>
    ),
    warning: (
      <svg
        className="w-6 h-6 text-status-warning"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M4.93 19h14.14c1.2 0 1.94-1.3 1.34-2.33L13.34 4.67c-.6-1.04-2.08-1.04-2.68 0L3.59 16.67c-.6 1.03-.15 2.33 1.34 2.33z"
        />
      </svg>
    ),
    error: (
      <svg
        className="w-6 h-6 text-status-danger"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 2a10 10 0 100 20 10 10 0 000-20z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 9l-6 6m0-6l6 6"
        />
      </svg>
    ),
  };

  return (
    <div className="min-h-screen space-y-lg bg-surface-panel p-xl text-text-primary">
      <p className="text-sm text-text-secondary">
        All modules are simulated; no network activity occurs. This interface is
        non-operational.
      </p>
      <div className="flex items-center gap-sm">
        <button
          onClick={handleUpdate}
          className="px-sm py-2xs text-sm rounded-md bg-brand-primary text-text-inverse shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary transition-colors duration-fast hover:bg-brand-secondary"
        >
          Update Modules
        </button>
        <span className="text-xs text-text-muted">v{version}</span>
        {updateAvailable && (
          <span className="text-xs text-status-warning">Update available</span>
        )}
      </div>
      {updateMessage && <p className="text-sm text-text-secondary">{updateMessage}</p>}
        <input
          aria-label="Search modules"
          type="text"
          placeholder="Search modules"
          value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-border-subtle bg-surface-elevated px-sm py-2xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary"
      />
      <div className="flex flex-wrap gap-sm">
        <button
          onClick={() => setFilter('')}
          className={`${filterButtonBase} ${
            filter === ''
              ? 'bg-brand-primary text-text-inverse border-brand-primary shadow-sm hover:bg-brand-primary'
              : 'bg-surface-muted'
          }`}
        >
          All
        </button>
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`${filterButtonBase} ${
              filter === t
                ? 'bg-brand-primary text-text-inverse border-brand-primary shadow-sm hover:bg-brand-primary'
                : 'bg-surface-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
        {listed.map((m) => (
          <button
            key={m.id}
            onClick={() => handleSelect(m)}
            className="rounded-lg border border-border-subtle bg-surface-elevated p-md text-left focus:outline-none focus:ring-2 focus:ring-brand-secondary transition-colors duration-fast hover:border-brand-secondary"
          >
            <h3 className="font-semibold">{m.name}</h3>
            <p className="text-sm text-text-secondary">{m.description}</p>
            <div className="mt-sm flex flex-wrap gap-2xs">
              {m.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface-muted px-sm py-3xs text-xs text-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="space-y-md">
          <form className="space-y-sm">
            {selected.options.map((o) => {
              const inputId = `module-option-${o.name}`;
              return (
                <label key={o.name} htmlFor={inputId} className="block text-sm text-text-secondary">
                  {o.label}
                  <input
                    id={inputId}
                    aria-label={o.label}
                    type="text"
                    value={options[o.name]}
                    onChange={(e) =>
                      setOptions({ ...options, [o.name]: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-border-subtle bg-surface-elevated px-sm py-2xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                  />
                </label>
              );
            })}
          </form>
          <div className="flex items-start gap-sm">
            <pre
              data-testid="command-preview"
              className="flex-1 overflow-auto rounded-md border border-border-strong bg-surface-ground px-sm py-2xs font-mono text-status-success shadow-inner"
            >
              {commandPreview}
            </pre>
            <button
              type="button"
              onClick={copyCommand}
              className={`${neutralButtonClass} hover:bg-surface-elevated`}
            >
              Copy
            </button>
          </div>
          <div className="space-y-sm">
            <label htmlFor="log-filter" className="block text-sm text-text-secondary">
              Filter logs
                <input
                  id="log-filter"
                  aria-label="Filter logs"
                  placeholder="Filter logs"
                  type="text"
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="mt-1 w-full rounded-md border border-border-subtle bg-surface-elevated px-sm py-2xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              />
            </label>
            <button
              type="button"
              onClick={copyLogs}
              className={`${neutralButtonClass} hover:bg-surface-elevated`}
            >
              Copy Logs
            </button>
            <ol className="space-y-sm border-l-2 border-border-subtle pl-md" role="log">
              {filteredLog.map((line, idx) => (
                <li key={idx} className="flex items-center gap-sm">
                  {levelIcon[line.level] || levelIcon.info}
                  <span
                    className={`rounded-full bg-surface-muted px-sm py-2xs text-sm font-mono ${
                      levelClass[line.level] || levelClass.info
                    }`}
                  >
                    {line.message}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <table className="min-w-full overflow-hidden rounded-md border border-border-subtle text-sm">
            <thead>
              <tr>
                <th className="border border-border-subtle bg-surface-muted px-sm py-2xs text-left">Target</th>
                <th className="border border-border-subtle bg-surface-muted px-sm py-2xs text-left">Result</th>
              </tr>
            </thead>
            <tbody>
              {selected.results.map((r) => (
                <tr key={r.target}>
                  <td className="border border-border-subtle px-sm py-2xs text-text-secondary">{r.target}</td>
                  <td className="border border-border-subtle px-sm py-2xs text-text-primary">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-sm text-sm text-text-secondary">
            <h4 className="mt-sm font-semibold text-text-primary">Data Retrieved</h4>
            <p>{selected.data}</p>
            <h4 className="mt-sm font-semibold text-text-primary">Required Inputs</h4>
            <ul className="list-disc list-inside">
              {selected.inputs.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <a
              href={selected.lab}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-secondary underline hover:text-brand-highlight"
            >
              Practice Lab
            </a>
          </div>
        </div>
      ) : (
        <p className="text-text-muted">Select a module to view logs and results.</p>
      )}
    </div>
  );
};

export default PopularModules;

