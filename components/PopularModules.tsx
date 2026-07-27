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
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
      return;
    }

    let cancelled = false;

    const checkForUpdate = async () => {
      try {
        const res = await fetch(`/api/modules/update?version=${version}`);
        const data = await res.json();
        if (!cancelled) {
          setUpdateAvailable(Boolean(data.needsUpdate));
        }
      } catch {
        if (!cancelled) {
          setUpdateAvailable(false);
        }
      }
    };

    void checkForUpdate();

    return () => {
      cancelled = true;
    };
  }, [version]);

  const handleUpdate = async () => {
    try {
      const updateResponse = await fetch(`/api/modules/update?version=${version}`);
      if (!updateResponse.ok) {
        throw new Error('Failed to check for updates');
      }

      const updateData = await updateResponse.json();

      if (updateData.needsUpdate) {
        const modulesResponse = await fetch('/api/modules/index');
        if (!modulesResponse.ok) {
          throw new Error('Failed to load modules');
        }

        const mods = await modulesResponse.json();
        setModules(mods);
        setVersion(updateData.latest);
        setUpdateMessage(`Updated to v${updateData.latest}`);
      } else {
        setUpdateMessage('Already up to date');
      }

      setUpdateAvailable(false);
    } catch {
      setUpdateMessage('Update failed');
      setUpdateAvailable(false);
    }
  };

  const levelClass: Record<string, string> = {
    info: 'text-blue-300',
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-300',
  };

  const levelIcon: Record<string, React.ReactElement> = {
    info: (
      <svg
        className="w-6 h-6 text-blue-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
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
        className="w-6 h-6 text-green-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
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
        className="w-6 h-6 text-yellow-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
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
        className="w-6 h-6 text-red-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
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
    <div className="p-4 space-y-4 bg-ub-cool-grey text-white min-h-screen">
      <p className="text-sm">
        All modules are simulated; no network activity occurs. This interface is
        non-operational.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={handleUpdate}
          className="px-2 py-1 text-sm rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Update Modules
        </button>
        <span className="text-xs">v{version}</span>
        {updateAvailable && (
          <span className="text-xs text-yellow-300">Update available</span>
        )}
      </div>
      {updateMessage && <p className="text-sm">{updateMessage}</p>}
        <input
          type="text"
          placeholder="Search modules"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 text-black rounded"
          aria-label="Search modules"
        />
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('')}
          className={`px-2 py-1 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            filter === '' ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          All
        </button>
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-2 py-1 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              filter === t ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listed.map((m) => (
          <button
            key={m.id}
            onClick={() => handleSelect(m)}
            className="p-3 text-left bg-ub-grey rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <h3 className="font-semibold">{m.name}</h3>
            <p className="text-sm text-gray-300">{m.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {m.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded bg-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="space-y-2">
          <form className="space-y-2">
            {selected.options.map((o) => (
              <label key={o.name} className="block text-sm">
                {o.label}
                <input
                  aria-label={o.label}
                  type="text"
                  value={options[o.name]}
                  onChange={(e) =>
                    setOptions({ ...options, [o.name]: e.target.value })
                  }
                  className="w-full p-1 mt-1 text-black rounded"
                />
              </label>
            ))}
          </form>
          <div className="flex items-start gap-2">
            <pre
              data-testid="command-preview"
              className="flex-1 bg-black text-green-400 p-2 overflow-auto font-mono"
            >
              {commandPreview}
            </pre>
            <button
              type="button"
              onClick={copyCommand}
              className="px-2 py-1 text-sm rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Copy
            </button>
          </div>
          <div className="space-y-1">
            <label className="block text-sm">
              Filter logs
                <input
                  placeholder="Filter logs"
                  type="text"
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="w-full p-1 mt-1 text-black rounded"
                  aria-label="Filter logs"
                />
            </label>
            <button
              type="button"
              onClick={copyLogs}
              className="px-2 py-1 text-sm rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Copy Logs
            </button>
            <ol className="border-l-2 border-gray-700 pl-4 space-y-2" role="log">
              {filteredLog.map((line, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  {levelIcon[line.level] || levelIcon.info}
                  <span
                    className={`px-2 py-1 rounded-full bg-gray-700 text-sm font-mono ${
                      levelClass[line.level] || levelClass.info
                    }`}
                  >
                    {line.message}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">Target</th>
                <th className="border px-2 py-1">Result</th>
              </tr>
            </thead>
            <tbody>
              {selected.results.map((r) => (
                <tr key={r.target}>
                  <td className="border px-2 py-1">{r.target}</td>
                  <td className="border px-2 py-1">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-sm">
            <h4 className="font-semibold mt-2">Data Retrieved</h4>
            <p>{selected.data}</p>
            <h4 className="font-semibold mt-2">Required Inputs</h4>
            <ul className="list-disc list-inside">
              {selected.inputs.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <a
              href={selected.lab}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-300"
            >
              Practice Lab
            </a>
          </div>
        </div>
      ) : (
        <p>Select a module to view logs and results.</p>
      )}
    </div>
  );
};

export default PopularModules;

