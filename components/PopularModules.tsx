import React, { useEffect, useState } from 'react';
import modulesData from '../data/module-index.json';
import versionInfo from '../data/module-version.json';
import { CheckCircleIcon, InfoCircleIcon, WarningTriangleIcon, XCircleIcon } from './icons';
import type { IconProps } from './icons';

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

  const levelStyles: Record<string, { color: string; Icon: React.ComponentType<IconProps> }> = {
    info: { color: 'text-blue-300', Icon: InfoCircleIcon },
    success: { color: 'text-green-400', Icon: CheckCircleIcon },
    warning: { color: 'text-yellow-300', Icon: WarningTriangleIcon },
    error: { color: 'text-red-400', Icon: XCircleIcon },
  };

  const defaultLevelStyle = levelStyles.info;

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
              {filteredLog.map((line, idx) => {
                const { Icon: LevelIcon, color } =
                  levelStyles[line.level] || defaultLevelStyle;

                return (
                  <li key={idx} className="flex items-center gap-2">
                    <LevelIcon className={`w-6 h-6 ${color}`} aria-hidden="true" />
                    <span
                      className={`px-2 py-1 rounded-full bg-gray-700 text-sm font-mono ${color}`}
                    >
                      {line.message}
                    </span>
                  </li>
                );
              })}
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

