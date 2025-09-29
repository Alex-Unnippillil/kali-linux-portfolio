import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import modulesData from '../../data/module-index.json';
import versionInfo from '../../data/module-version.json';

interface Module {
  id: string;
  name: string;
  description: string;
  tags: string[];
  stars: number;
  downloads: number;
  log: { level: string; message: string }[];
  results: { target: string; status: string }[];
  data: string;
  inputs: string[];
  lab: string;
  options: { name: string; label: string }[];
}

type SortOption = 'stars' | 'downloads';

const SESSION_CACHE_KEY = 'popular-modules-cache';
const SKELETON_COUNT = 6;

const PopularModules: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [version, setVersion] = useState<string>(versionInfo.version);
  const [updateMessage, setUpdateMessage] = useState<string>('');
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [options, setOptions] = useState<Record<string, string>>({});
  const [logFilter, setLogFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('stars');

  const filterButtonRefs = useRef<HTMLButtonElement[]>([]);
  const sortButtonRefs = useRef<HTMLButtonElement[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadModules = async () => {
      if (typeof window === 'undefined') {
        if (!isMounted) return;
        setModules(modulesData as Module[]);
        setIsLoading(false);
        return;
      }

      try {
        const cachedRaw = window.sessionStorage.getItem(SESSION_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as {
            version: string;
            modules: Module[];
          };
          if (cached.version === version) {
            if (!isMounted) return;
            setModules(cached.modules);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        window.sessionStorage.removeItem(SESSION_CACHE_KEY);
      }

      if (typeof fetch !== 'function') {
        if (!isMounted) return;
        setModules(modulesData as Module[]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch('/data/module-index.json');
        if (!response.ok) {
          throw new Error('Failed to load modules');
        }
        const payload = (await response.json()) as Module[];
        if (!isMounted) return;
        setModules(payload);
        window.sessionStorage.setItem(
          SESSION_CACHE_KEY,
          JSON.stringify({ version, modules: payload })
        );
      } catch {
        if (!isMounted) return;
        setModules(modulesData as Module[]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadModules();

    return () => {
      isMounted = false;
    };
  }, [version]);

  useEffect(() => {
    if (typeof fetch !== 'function') {
      setUpdateAvailable(false);
      return;
    }

    let isActive = true;
    fetch(`/api/modules/update?version=${version}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isActive) return;
        setUpdateAvailable(Boolean(data.needsUpdate));
      })
      .catch(() => {
        if (!isActive) return;
        setUpdateAvailable(false);
      });

    return () => {
      isActive = false;
    };
  }, [version]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return modules.find((m) => m.id === selectedId) ?? null;
  }, [modules, selectedId]);

  useEffect(() => {
    if (!selected) {
      setOptions({});
      return;
    }

    setOptions((prev) => {
      const next: Record<string, string> = {};
      for (const option of selected.options) {
        next[option.name] = prev[option.name] ?? '';
      }
      return next;
    });
  }, [selected]);

  const availableTags = useMemo(() => {
    const source = modules.length ? modules : (modulesData as Module[]);
    return Array.from(new Set(source.flatMap((m) => m.tags))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [modules]);

  const filterOptions = useMemo(() => {
    return [{ label: 'All', value: '' }, ...availableTags.map((tag) => ({ label: tag, value: tag }))];
  }, [availableTags]);

  const sortOptions = useMemo(
    () => [
      { value: 'stars' as const, label: 'Stars', description: 'Most starred first' },
      { value: 'downloads' as const, label: 'Downloads', description: 'Most downloaded first' },
    ],
    []
  );

  const filteredModules = useMemo(() => {
    if (!modules.length) {
      return [];
    }
    const normalizedSearch = search.trim().toLowerCase();

    let subset = filter
      ? modules.filter((module) => module.tags.includes(filter))
      : modules;

    if (normalizedSearch) {
      subset = subset.filter((module) => {
        const { name, description } = module;
        return (
          name.toLowerCase().includes(normalizedSearch) ||
          description.toLowerCase().includes(normalizedSearch)
        );
      });
    }

    return [...subset].sort((a, b) => b[sortBy] - a[sortBy]);
  }, [modules, filter, search, sortBy]);

  const commandPreview = useMemo(() => {
    if (!selected) return '';
    const args = Object.entries(options)
      .filter(([, value]) => value)
      .map(([key, value]) => ` --${key} ${value}`)
      .join('');
    return `${selected.id}${args}`;
  }, [options, selected]);

  const filteredLog = useMemo(() => {
    if (!selected) return [];
    const normalized = logFilter.trim().toLowerCase();
    if (!normalized) return selected.log;
    return selected.log.filter((line) =>
      line.message.toLowerCase().includes(normalized)
    );
  }, [logFilter, selected]);

  const copyLogs = () => {
    const text = filteredLog.map((line) => line.message).join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  const copyCommand = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(commandPreview);
    }
  };

  const handleSelect = (module: Module) => {
    setSelectedId(module.id);
    setOptions(
      Object.fromEntries(module.options.map((option) => [option.name, '']))
    );
    setLogFilter('');
  };

  const handleFilterKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }

    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + filterOptions.length) % filterOptions.length;
    filterButtonRefs.current[nextIndex]?.focus();
  };

  const handleSortKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }

    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + sortOptions.length) % sortOptions.length;
    sortButtonRefs.current[nextIndex]?.focus();
  };

  const showSkeleton = isLoading && !modules.length;

  return (
    <div className="p-4 space-y-4 bg-ub-cool-grey text-white min-h-screen">
      <p className="text-sm">
        All modules are simulated; no network activity occurs. This interface is
        non-operational.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={async () => {
            if (typeof fetch !== 'function') return;
            setIsLoading(true);
            setUpdateMessage('');
            try {
              const res = await fetch(`/api/modules/update?version=${version}`);
              const data = await res.json();
              if (data.needsUpdate) {
                const mods = (await fetch('/data/module-index.json').then((r) =>
                  r.json()
                )) as Module[];
                setModules(mods);
                setVersion(data.latest);
                setUpdateMessage(`Updated to v${data.latest}`);
                setUpdateAvailable(false);
                if (typeof window !== 'undefined') {
                  window.sessionStorage.setItem(
                    SESSION_CACHE_KEY,
                    JSON.stringify({ version: data.latest, modules: mods })
                  );
                }
              } else {
                setUpdateMessage('Already up to date');
                setUpdateAvailable(false);
              }
            } catch {
              setUpdateMessage('Update failed');
            } finally {
              setIsLoading(false);
            }
          }}
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
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <input
          type="text"
          placeholder="Search modules"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full md:max-w-xs p-2 text-black rounded"
          aria-label="Search modules"
        />
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Sort modules">
          {sortOptions.map((option, index) => (
            <button
              key={option.value}
              role="radio"
              aria-checked={sortBy === option.value}
              onClick={() => setSortBy(option.value)}
              onKeyDown={(event) => handleSortKeyDown(event, index)}
              ref={(element) => {
                if (element) {
                  sortButtonRefs.current[index] = element;
                }
              }}
              className={`px-3 py-1 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors ${
                sortBy === option.value ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              <span className="flex flex-col leading-tight">
                <span className="font-semibold">{option.label}</span>
                <span className="text-[11px] text-gray-200">{option.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Filter modules by tag"
      >
        {filterOptions.map((option, index) => (
          <button
            key={option.value || 'all'}
            role="radio"
            aria-checked={filter === option.value}
            onClick={() => setFilter(option.value)}
            onKeyDown={(event) => handleFilterKeyDown(event, index)}
            ref={(element) => {
              if (element) {
                filterButtonRefs.current[index] = element;
              }
            }}
            className={`px-2 py-1 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors ${
              filter === option.value ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy={isLoading}>
        {showSkeleton
          ? Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <div
                key={`skeleton-${index}`}
                className="p-3 h-40 bg-ub-grey rounded border border-gray-700 animate-pulse"
              >
                <div className="h-5 w-2/3 bg-gray-600 rounded" />
                <div className="h-3 mt-3 w-full bg-gray-700 rounded" />
                <div className="h-3 mt-2 w-5/6 bg-gray-700 rounded" />
                <div className="flex gap-2 mt-6">
                  <span className="h-5 w-16 bg-gray-700 rounded-full" />
                  <span className="h-5 w-16 bg-gray-700 rounded-full" />
                </div>
              </div>
            ))
          : filteredModules.map((module) => (
              <button
                key={module.id}
                onClick={() => handleSelect(module)}
                className="p-3 text-left bg-ub-grey rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[10rem] transition-transform hover:-translate-y-0.5"
              >
                <h3 className="font-semibold">{module.name}</h3>
                <p className="text-sm text-gray-300 line-clamp-2">
                  {module.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {module.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs rounded bg-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-200">
                  <span aria-label={`${module.stars.toLocaleString()} stars`} className="flex items-center gap-1">
                    <svg
                      className="w-4 h-4 text-yellow-300"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {module.stars.toLocaleString()}
                  </span>
                  <span
                    aria-label={`${module.downloads.toLocaleString()} downloads`}
                    className="flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4 text-blue-300"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M3 3a1 1 0 000 2h3v2H4a1 1 0 100 2h2v6H4a1 1 0 100 2h12a1 1 0 100-2h-2v-6h2a1 1 0 100-2h-2V5h3a1 1 0 100-2H3z" />
                    </svg>
                    {module.downloads.toLocaleString()}
                  </span>
                </div>
              </button>
            ))}
      </div>
      <section className="space-y-2 bg-ub-grey/60 border border-gray-700 rounded p-4 min-h-[24rem]" aria-live="polite">
        {selected ? (
          <>
            <form className="space-y-2">
              {selected.options.map((option) => (
                <label key={option.name} className="block text-sm">
                  {option.label}
                  <input
                    aria-label={option.label}
                    type="text"
                    value={options[option.name] ?? ''}
                    onChange={(event) =>
                      setOptions({
                        ...options,
                        [option.name]: event.target.value,
                      })
                    }
                    className="w-full p-1 mt-1 text-black rounded"
                  />
                </label>
              ))}
            </form>
            <div className="flex flex-col md:flex-row md:items-start gap-2">
              <pre
                data-testid="command-preview"
                className="flex-1 bg-black text-green-400 p-2 overflow-auto font-mono min-h-[5rem]"
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
                  onChange={(event) => setLogFilter(event.target.value)}
                  className="w-full p-1 mt-1 text-black rounded"
                />
              </label>
              <button
                type="button"
                onClick={copyLogs}
                className="px-2 py-1 text-sm rounded bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Copy Logs
              </button>
              <ol className="border-l-2 border-gray-700 pl-4 space-y-2 max-h-60 overflow-auto" role="log">
                {filteredLog.map((line, index) => (
                  <li key={`${line.message}-${index}`} className="flex items-center gap-2">
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
                {selected.results.map((result) => (
                  <tr key={result.target}>
                    <td className="border px-2 py-1">{result.target}</td>
                    <td className="border px-2 py-1">{result.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-sm space-y-2">
              <div>
                <h4 className="font-semibold">Data Retrieved</h4>
                <p>{selected.data}</p>
              </div>
              <div>
                <h4 className="font-semibold">Required Inputs</h4>
                <ul className="list-disc list-inside">
                  {selected.inputs.map((input) => (
                    <li key={input}>{input}</li>
                  ))}
                </ul>
              </div>
              <a
                href={selected.lab}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-300"
              >
                Practice Lab
              </a>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-200">
            Select a module to view logs and results.
          </div>
        )}
      </section>
    </div>
  );
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

export default PopularModules;
