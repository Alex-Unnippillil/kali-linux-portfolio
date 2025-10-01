import React, { useCallback, useEffect, useMemo, useState } from 'react';

type ClipboardEntry = {
  id: string;
  content: string;
  timestamp: number;
  isSensitive: boolean;
  format: 'text' | 'json';
};

type FilterOption = 'all' | 'json' | 'sensitive' | 'nonSensitive';

type PermissionState = 'unknown' | 'granted' | 'denied' | 'prompt';

const MAX_ENTRIES = 20;
const STORAGE_KEY = 'clipboard.history.v1';
const PRIVACY_STORAGE_KEY = 'clipboard.history.privacy';
const HIDDEN_CONTENT_LABEL = 'Hidden content (privacy mode on)';

const sensitivePatterns: RegExp[] = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /bearer\s+[a-z0-9\-.~_+/]+=*/i,
  /-----BEGIN [A-Z ]+-----/,
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b(?:\d[ -]*?){13,16}\b/,
];

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
};

const normalizeText = (value: string) =>
  value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\u2028|\u2029/g, '\n');

const detectSensitive = (value: string) => {
  if (!value) return false;
  const candidate = value.trim();
  if (!candidate) return false;
  return sensitivePatterns.some((pattern) => pattern.test(candidate));
};

const isLikelyJson = (value: string) => {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) {
    return false;
  }

  try {
    JSON.parse(trimmed);
    return true;
  } catch (error) {
    return false;
  }
};

const escapeForHtml = (value: string) =>
  normalizeText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizePlainText = (value: string) => normalizeText(value).replace(/[\u000b\u000c]/gi, '').trimEnd();

const formatJson = (value: string) => {
  const sanitized = sanitizePlainText(value);
  try {
    const parsed = JSON.parse(sanitized);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    return sanitized;
  }
};

const loadStoredEntries = (): ClipboardEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: ClipboardEntry[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_ENTRIES).map((entry) => ({
      ...entry,
      format: entry.format === 'json' ? 'json' : 'text',
      isSensitive: Boolean(entry.isSensitive),
    }));
  } catch (error) {
    return [];
  }
};

const loadStoredPrivacy = () => {
  if (typeof window === 'undefined') return true;
  try {
    const value = window.localStorage.getItem(PRIVACY_STORAGE_KEY);
    if (value === null) return true;
    return value === 'true';
  } catch (error) {
    return true;
  }
};

const saveEntries = (entries: ClipboardEntry[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    // ignore write errors (private mode, quota, etc.)
  }
};

const savePrivacy = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PRIVACY_STORAGE_KEY, String(enabled));
  } catch (error) {
    // ignore
  }
};

const insertTextAtCursor = (text: string) => {
  if (typeof document === 'undefined') return;
  const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
  if (active && typeof active.value === 'string') {
    const start = active.selectionStart ?? active.value.length;
    const end = active.selectionEnd ?? active.value.length;
    const before = active.value.slice(0, start);
    const after = active.value.slice(end);
    const nextValue = `${before}${text}${after}`;

    active.value = nextValue;
    const position = start + text.length;
    if (typeof active.setSelectionRange === 'function') {
      active.setSelectionRange(position, position);
    }
    const inputEvent = new Event('input', { bubbles: true });
    active.dispatchEvent(inputEvent);
    return;
  }

  if (typeof document.execCommand === 'function') {
    document.execCommand('insertText', false, text);
  }
};

const ClipboardHistory: React.FC = () => {
  const [entries, setEntries] = useState<ClipboardEntry[]>([]);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [privacyMode, setPrivacyMode] = useState(true);
  const [search, setSearch] = useState('');
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown');

  useEffect(() => {
    setEntries(loadStoredEntries());
    setPrivacyMode(loadStoredPrivacy());
  }, []);

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  useEffect(() => {
    savePrivacy(privacyMode);
  }, [privacyMode]);

  const addEntry = useCallback((value: string) => {
    const content = value ?? '';
    const normalized = sanitizePlainText(content);
    if (!normalized) return;
    setEntries((current) => {
      const newEntry: ClipboardEntry = {
        id: createId(),
        content: normalized,
        timestamp: Date.now(),
        isSensitive: detectSensitive(normalized),
        format: isLikelyJson(normalized) ? 'json' : 'text',
      };
      const next = [newEntry, ...current];
      return next.slice(0, MAX_ENTRIES);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text/plain');
      if (text) {
        addEntry(text);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addEntry]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) {
      return;
    }

    let isMounted = true;
    let permissionStatus: PermissionStatus | null = null;

    const watchPermission = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        permissionStatus = await navigator.permissions.query({ name: 'clipboard-read' as any });
        if (!isMounted || !permissionStatus) return;
        setPermissionState(permissionStatus.state as PermissionState);

        const handlePermissionChange = () => {
          if (!permissionStatus) return;
          setPermissionState(permissionStatus.state as PermissionState);
        };

        permissionStatus.addEventListener('change', handlePermissionChange);

        if (permissionStatus.state === 'granted' && navigator.clipboard?.readText) {
          try {
            const text = await navigator.clipboard.readText();
            if (isMounted && text) {
              addEntry(text);
            }
          } catch (error) {
            // Permission may still be prompt-based; ignore errors.
          }
        }

        return () => {
          permissionStatus?.removeEventListener('change', handlePermissionChange);
        };
      } catch (error) {
        if (isMounted) {
          setPermissionState('unknown');
        }
      }
    };

    const cleanupPromise = watchPermission();

    return () => {
      isMounted = false;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
      void cleanupPromise;
    };
  }, [addEntry]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filter === 'json' && entry.format !== 'json') return false;
      if (filter === 'sensitive' && !entry.isSensitive) return false;
      if (filter === 'nonSensitive' && entry.isSensitive) return false;
      if (normalizedSearch && !entry.content.toLowerCase().includes(normalizedSearch)) {
        return false;
      }
      return true;
    });
  }, [entries, filter, search]);

  const hasSensitiveEntries = useMemo(() => entries.some((entry) => entry.isSensitive), [entries]);

  const handlePrivacyToggle = () => {
    setPrivacyMode((current) => !current);
  };

  const handleClearSensitive = () => {
    setEntries((current) => current.filter((entry) => !entry.isSensitive));
  };

  const handlePasteAction = (entry: ClipboardEntry, mode: 'plain' | 'escaped' | 'json') => {
    let text = entry.content;
    if (mode === 'plain') {
      text = sanitizePlainText(text);
    } else if (mode === 'escaped') {
      text = escapeForHtml(text);
    } else {
      text = formatJson(text);
    }
    insertTextAtCursor(text);
  };

  const renderContent = (entry: ClipboardEntry) => {
    if (privacyMode) {
      return HIDDEN_CONTENT_LABEL;
    }

    return entry.content;
  };

  return (
    <section className="flex flex-col gap-4" aria-label="Clipboard history">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Clipboard history</h2>
          <p className="text-sm text-gray-500">
            Captures the last {MAX_ENTRIES} text entries copied or pasted in this session.
          </p>
          {permissionState === 'denied' && (
            <p className="text-sm text-red-500" role="status">
              Clipboard access denied. Enable permissions to sync automatically.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handlePrivacyToggle}
          aria-pressed={privacyMode}
          className="rounded bg-ubt-blue-50 px-3 py-1 text-sm font-medium text-white hover:bg-ubt-blue-40"
        >
          {privacyMode ? 'Reveal entries' : 'Hide entries'}
        </button>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search clipboard…"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as FilterOption)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          aria-label="Filter clipboard entries"
        >
          <option value="all">All entries</option>
          <option value="json">JSON only</option>
          <option value="sensitive">Sensitive only</option>
          <option value="nonSensitive">Non-sensitive only</option>
        </select>
        <button
          type="button"
          onClick={handleClearSensitive}
          disabled={!hasSensitiveEntries}
          className="rounded border border-red-400 px-3 py-2 text-sm text-red-500 disabled:border-gray-300 disabled:text-gray-400"
        >
          Clear sensitive entries
        </button>
      </div>

      <ul className="flex flex-col gap-3" aria-live="polite">
        {filteredEntries.length === 0 && (
          <li className="rounded border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
            No clipboard entries to display.
          </li>
        )}
        {filteredEntries.map((entry) => (
          <li
            key={entry.id}
            className="rounded border border-gray-200 bg-white p-3 shadow-sm"
            aria-label={`Clipboard entry from ${new Date(entry.timestamp).toLocaleString()}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm text-gray-800" aria-label={privacyMode ? HIDDEN_CONTENT_LABEL : undefined}>
                {renderContent(entry)}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize">{entry.format}</span>
              {entry.isSensitive && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">Sensitive</span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handlePasteAction(entry, 'plain')}
                className="rounded border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50"
              >
                Paste as plain text
              </button>
              <button
                type="button"
                onClick={() => handlePasteAction(entry, 'escaped')}
                className="rounded border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50"
              >
                Paste escaped
              </button>
              <button
                type="button"
                onClick={() => handlePasteAction(entry, 'json')}
                className="rounded border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50"
              >
                Paste JSON
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ClipboardHistory;
export { escapeForHtml, formatJson, sanitizePlainText };
