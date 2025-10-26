import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type StorageTab = 'cookies' | 'local' | 'session';
type FilterMode = 'key' | 'value' | 'both';

type StorageEntry = {
  key: string;
  value: string;
};

type FormState =
  | { mode: 'idle' }
  | { mode: 'add'; key: string; value: string }
  | { mode: 'edit'; key: string; value: string; originalKey: string };

type CookieFormState =
  | { mode: 'idle' }
  | {
      mode: 'add' | 'edit';
      key: string;
      value: string;
      originalKey?: string;
      path: string;
      persistent: boolean;
      maxAgeDays: number;
    };

const FILTER_LABELS: Record<FilterMode, string> = {
  both: 'Key & value',
  key: 'Key only',
  value: 'Value only',
};

const TAB_LABELS: Record<StorageTab, string> = {
  cookies: 'Cookies',
  local: 'localStorage',
  session: 'sessionStorage',
};

const ONE_DAY_SECONDS = 24 * 60 * 60;

const parseCookies = (): StorageEntry[] => {
  if (typeof document === 'undefined') {
    return [];
  }
  try {
    return document.cookie
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separatorIndex = cookie.indexOf('=');
        if (separatorIndex === -1) {
          return { key: decodeURIComponent(cookie), value: '' };
        }
        const name = cookie.slice(0, separatorIndex);
        const value = cookie.slice(separatorIndex + 1);
        return {
          key: decodeURIComponent(name),
          value: decodeURIComponent(value),
        };
      });
  } catch {
    return [];
  }
};

const parseWebStorage = (storage: Storage | undefined): StorageEntry[] => {
  if (!storage) {
    return [];
  }
  const entries: StorageEntry[] = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) {
        continue;
      }
      const value = storage.getItem(key);
      entries.push({ key, value: value ?? '' });
    }
  } catch {
    return [];
  }
  return entries.sort((a, b) => a.key.localeCompare(b.key));
};

const filterEntries = (entries: StorageEntry[], term: string, mode: FilterMode): StorageEntry[] => {
  if (!term.trim()) {
    return entries;
  }
  const loweredTerm = term.toLowerCase();
  return entries.filter((entry) => {
    if (mode === 'key') {
      return entry.key.toLowerCase().includes(loweredTerm);
    }
    if (mode === 'value') {
      return entry.value.toLowerCase().includes(loweredTerm);
    }
    return (
      entry.key.toLowerCase().includes(loweredTerm) || entry.value.toLowerCase().includes(loweredTerm)
    );
  });
};

const Storage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StorageTab>('cookies');
  const [cookies, setCookies] = useState<StorageEntry[]>([]);
  const [localEntries, setLocalEntries] = useState<StorageEntry[]>([]);
  const [sessionEntries, setSessionEntries] = useState<StorageEntry[]>([]);
  const [filters, setFilters] = useState<Record<StorageTab, string>>({
    cookies: '',
    local: '',
    session: '',
  });
  const [filterModes, setFilterModes] = useState<Record<StorageTab, FilterMode>>({
    cookies: 'both',
    local: 'both',
    session: 'both',
  });
  const [formStates, setFormStates] = useState<Record<'local' | 'session', FormState>>({
    local: { mode: 'idle' },
    session: { mode: 'idle' },
  });
  const [cookieForm, setCookieForm] = useState<CookieFormState>({
    mode: 'idle',
  });
  const [confirming, setConfirming] = useState<StorageTab | null>(null);

  const refreshCookies = useCallback(() => {
    setCookies(parseCookies());
  }, []);

  const refreshLocal = useCallback(() => {
    if (typeof window === 'undefined') {
      setLocalEntries([]);
      return;
    }
    setLocalEntries(parseWebStorage(window.localStorage));
  }, []);

  const refreshSession = useCallback(() => {
    if (typeof window === 'undefined') {
      setSessionEntries([]);
      return;
    }
    setSessionEntries(parseWebStorage(window.sessionStorage));
  }, []);

  useEffect(() => {
    refreshCookies();
    refreshLocal();
    refreshSession();
  }, [refreshCookies, refreshLocal, refreshSession]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleStorage = () => {
      refreshLocal();
      refreshSession();
    };
    window.addEventListener('storage', handleStorage);
    const interval = window.setInterval(() => {
      refreshCookies();
      refreshSession();
    }, 1500);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(interval);
    };
  }, [refreshCookies, refreshLocal, refreshSession]);

  const entries = useMemo(() => {
    switch (activeTab) {
      case 'local':
        return localEntries;
      case 'session':
        return sessionEntries;
      default:
        return cookies;
    }
  }, [activeTab, cookies, localEntries, sessionEntries]);

  const filteredEntries = useMemo(
    () => filterEntries(entries, filters[activeTab], filterModes[activeTab]),
    [entries, filters, filterModes, activeTab]
  );

  const currentFormState = activeTab === 'cookies' ? cookieForm : formStates[activeTab];

  const filterScopeId = `firefox-storage-filter-scope-${activeTab}`;
  const filterValueId = `firefox-storage-filter-value-${activeTab}`;
  const formKeyId = `firefox-storage-form-key-${activeTab}`;
  const formValueId = `firefox-storage-form-value-${activeTab}`;
  const cookiePathId = 'firefox-storage-cookie-path';
  const cookiePersistentId = 'firefox-storage-cookie-persistent';
  const cookieMaxAgeId = 'firefox-storage-cookie-max-age';

  const updateFilter = (tab: StorageTab, value: string) => {
    setFilters((prev) => ({ ...prev, [tab]: value }));
  };

  const updateFilterMode = (tab: StorageTab, mode: FilterMode) => {
    setFilterModes((prev) => ({ ...prev, [tab]: mode }));
  };

  const startAdd = (tab: StorageTab) => {
    if (tab === 'cookies') {
      setCookieForm({ mode: 'add', key: '', value: '', path: '/', persistent: true, maxAgeDays: 30 });
    } else {
      setFormStates((prev) => ({ ...prev, [tab]: { mode: 'add', key: '', value: '' } }));
    }
  };

  const startEdit = (tab: StorageTab, entry: StorageEntry) => {
    if (tab === 'cookies') {
      setCookieForm({
        mode: 'edit',
        key: entry.key,
        value: entry.value,
        originalKey: entry.key,
        path: '/',
        persistent: true,
        maxAgeDays: 30,
      });
    } else {
      setFormStates((prev) => ({
        ...prev,
        [tab]: { mode: 'edit', key: entry.key, value: entry.value, originalKey: entry.key },
      }));
    }
  };

  const cancelForm = (tab: StorageTab) => {
    if (tab === 'cookies') {
      setCookieForm({ mode: 'idle' });
    } else {
      setFormStates((prev) => ({ ...prev, [tab]: { mode: 'idle' } }));
    }
  };

  const removeEntry = (tab: StorageTab, key: string) => {
    if (tab === 'cookies') {
      if (typeof document === 'undefined') {
        return;
      }
      try {
        document.cookie = `${encodeURIComponent(key)}=; expires=${new Date(0).toUTCString()}; path=/`;
      } catch {
        /* noop */
      }
      refreshCookies();
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }
    try {
      const storage = tab === 'local' ? window.localStorage : window.sessionStorage;
      storage.removeItem(key);
    } catch {
      /* noop */
    }
    if (tab === 'local') {
      refreshLocal();
    } else {
      refreshSession();
    }
  };

  const submitForm = (tab: StorageTab, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (tab === 'cookies') {
      if (cookieForm.mode === 'idle') {
        return;
      }
      if (typeof document === 'undefined') {
        return;
      }
      const trimmedKey = cookieForm.key.trim();
      if (!trimmedKey) {
        return;
      }
      try {
        if (cookieForm.originalKey && cookieForm.originalKey !== trimmedKey) {
          document.cookie = `${encodeURIComponent(cookieForm.originalKey)}=; expires=${new Date(0).toUTCString()}; path=/`;
        }
        const attributes = [`path=${cookieForm.path || '/'}`];
        if (cookieForm.persistent) {
          const maxAge = Math.max(1, Math.round(cookieForm.maxAgeDays * ONE_DAY_SECONDS));
          attributes.push(`max-age=${maxAge}`);
        }
        document.cookie = `${encodeURIComponent(trimmedKey)}=${encodeURIComponent(
          cookieForm.value
        )}; ${attributes.join('; ')}`;
      } catch {
        /* noop */
      }
      refreshCookies();
      setCookieForm({ mode: 'idle' });
      return;
    }

    const formState = formStates[tab];
    if (!formState || formState.mode === 'idle') {
      return;
    }
    const trimmedKey = formState.key.trim();
    if (!trimmedKey) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const storage = tab === 'local' ? window.localStorage : window.sessionStorage;
      if (formState.mode === 'edit' && formState.originalKey && formState.originalKey !== trimmedKey) {
        storage.removeItem(formState.originalKey);
      }
      storage.setItem(trimmedKey, formState.value);
    } catch {
      /* noop */
    }
    if (tab === 'local') {
      refreshLocal();
    } else {
      refreshSession();
    }
    setFormStates((prev) => ({ ...prev, [tab]: { mode: 'idle' } }));
  };

  const handleBulkClear = (tab: StorageTab) => {
    if (confirming !== tab) {
      setConfirming(tab);
      return;
    }

    if (tab === 'cookies') {
      if (typeof document === 'undefined') {
        setConfirming(null);
        return;
      }
      cookies.forEach((entry) => {
        try {
          document.cookie = `${encodeURIComponent(entry.key)}=; expires=${new Date(0).toUTCString()}; path=/`;
        } catch {
          /* noop */
        }
      });
      refreshCookies();
    } else if (typeof window !== 'undefined') {
      try {
        const storage = tab === 'local' ? window.localStorage : window.sessionStorage;
        storage.clear();
      } catch {
        /* noop */
      }
      if (tab === 'local') {
        refreshLocal();
      } else {
        refreshSession();
      }
    }
    setConfirming(null);
  };

  const resetConfirmation = () => setConfirming(null);

  return (
    <div className="flex h-full flex-col bg-gray-900 text-sm text-gray-100">
      <nav className="flex border-b border-gray-800">
        {(['cookies', 'local', 'session'] as StorageTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab);
              resetConfirmation();
            }}
            className={`flex-1 px-4 py-2 text-left text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              activeTab === tab ? 'bg-gray-800 text-blue-200' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </nav>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
            <label htmlFor={filterScopeId} className="text-xs font-semibold text-gray-300">
              Filter scope
            </label>
            <select
              id={filterScopeId}
              value={filterModes[activeTab]}
              onChange={(event) => updateFilterMode(activeTab, event.target.value as FilterMode)}
              className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-100 focus:border-blue-400 focus:outline-none"
            >
              {(Object.keys(FILTER_LABELS) as FilterMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {FILTER_LABELS[mode]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-1 items-center gap-2 text-xs font-semibold text-gray-300">
            <label htmlFor={filterValueId} className="text-xs font-semibold text-gray-300">
              Filter value
            </label>
            <input
              id={filterValueId}
              value={filters[activeTab]}
              onChange={(event) => updateFilter(activeTab, event.target.value)}
              placeholder="Type to filter entries"
              aria-label="Filter entries"
              className="flex-1 rounded border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:border-blue-400 focus:outline-none"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => startAdd(activeTab)}
              className="rounded bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              Add entry
            </button>
            <button
              type="button"
              onClick={() => handleBulkClear(activeTab)}
              className="rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              {confirming === activeTab ? 'Confirm clear' : 'Clear all'}
            </button>
            {confirming === activeTab && (
              <button
                type="button"
                onClick={resetConfirmation}
                className="rounded border border-gray-600 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        {(currentFormState?.mode === 'add' || currentFormState?.mode === 'edit') && (
          <form
            onSubmit={(event) => submitForm(activeTab, event)}
            className="flex flex-col gap-3 rounded border border-gray-800 bg-gray-800 p-4"
          >
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-1 min-w-[10rem] flex-col text-xs font-semibold text-gray-300">
                  <label htmlFor={formKeyId} className="text-xs font-semibold text-gray-300">
                    Key
                  </label>
                  <input
                    id={formKeyId}
                    value={currentFormState.key}
                    onChange={(event) => {
                      if (activeTab === 'cookies') {
                        setCookieForm((prev) =>
                          prev.mode === 'idle'
                            ? prev
                            : { ...prev, key: event.target.value }
                        );
                      } else {
                        setFormStates((prev) => ({
                          ...prev,
                          [activeTab]: prev[activeTab].mode === 'idle'
                            ? prev[activeTab]
                            : { ...prev[activeTab], key: event.target.value },
                        }));
                      }
                    }}
                    aria-label="Storage key"
                    className="mt-1 rounded border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-100 focus:border-blue-400 focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-1 min-w-[10rem] flex-col text-xs font-semibold text-gray-300">
                  <label htmlFor={formValueId} className="text-xs font-semibold text-gray-300">
                    Value
                  </label>
                  <textarea
                    id={formValueId}
                    value={currentFormState.value}
                    onChange={(event) => {
                      if (activeTab === 'cookies') {
                        setCookieForm((prev) =>
                          prev.mode === 'idle'
                            ? prev
                            : { ...prev, value: event.target.value }
                        );
                      } else {
                        setFormStates((prev) => ({
                          ...prev,
                          [activeTab]: prev[activeTab].mode === 'idle'
                            ? prev[activeTab]
                            : { ...prev[activeTab], value: event.target.value },
                        }));
                      }
                    }}
                    rows={3}
                    aria-label="Storage value"
                    className="mt-1 rounded border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-100 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
              {activeTab === 'cookies' && cookieForm.mode !== 'idle' && (
                <div className="flex flex-wrap gap-3 text-xs text-gray-200">
                  <div className="flex flex-col">
                    <label htmlFor={cookiePathId} className="text-xs font-semibold text-gray-200">
                      Path
                    </label>
                    <input
                      id={cookiePathId}
                      value={cookieForm.path}
                      onChange={(event) =>
                        setCookieForm((prev) =>
                          prev.mode === 'idle' ? prev : { ...prev, path: event.target.value || '/' }
                        )
                      }
                      aria-label="Cookie path"
                      className="mt-1 w-32 rounded border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-100 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id={cookiePersistentId}
                      type="checkbox"
                      checked={cookieForm.persistent}
                      onChange={(event) =>
                        setCookieForm((prev) =>
                          prev.mode === 'idle' ? prev : { ...prev, persistent: event.target.checked }
                        )
                      }
                      aria-label="Toggle persistent cookie"
                      className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-400"
                    />
                    <label htmlFor={cookiePersistentId} className="cursor-pointer text-xs font-semibold text-gray-200">
                      Persistent cookie
                    </label>
                  </div>
                  {cookieForm.persistent && (
                    <div className="flex items-center gap-2">
                      <label htmlFor={cookieMaxAgeId} className="text-xs font-semibold text-gray-200">
                        Max age (days)
                      </label>
                      <input
                        id={cookieMaxAgeId}
                        type="number"
                        min={1}
                        value={cookieForm.maxAgeDays}
                        onChange={(event) =>
                          setCookieForm((prev) =>
                            prev.mode === 'idle'
                              ? prev
                              : {
                                  ...prev,
                                  maxAgeDays: Number(event.target.value) || 1,
                                }
                          )
                        }
                        aria-label="Cookie max age in days"
                        className="w-24 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-100 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded bg-blue-500 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {currentFormState.mode === 'edit' ? 'Save changes' : 'Create entry'}
              </button>
              <button
                type="button"
                onClick={() => cancelForm(activeTab)}
                className="rounded border border-gray-600 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        <div className="overflow-auto rounded border border-gray-800">
          <table className="min-w-full divide-y divide-gray-800 text-left text-xs">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Key
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Value
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    No entries found for the current scope.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={`${entry.key}-${entry.value}`} className="odd:bg-gray-900 even:bg-gray-800">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-100">
                      {entry.key || <span className="italic text-gray-500">(empty)</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-300">
                      <div className="max-w-xl truncate" title={entry.value}>
                        {entry.value || <span className="italic text-gray-500">(empty)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(activeTab, entry)}
                            aria-label={`Edit ${entry.key || 'storage entry'}`}
                            className="rounded bg-gray-700 px-3 py-1 text-xs font-semibold text-gray-100 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeEntry(activeTab, entry.key)}
                            aria-label={`Delete ${entry.key || 'storage entry'}`}
                            className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
                          >
                            Delete
                          </button>
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Storage;
