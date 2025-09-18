'use client';

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getRegistrySnapshot,
  HandlerDescriptor,
  openLink,
} from '../../modules/system/linkHandler';
import {
  DefaultAppKind,
  DEFAULT_APPS_EVENT,
  exportDefaultApps,
  getAllDefaultApps,
  getBuiltinDefault,
  importDefaultApps,
  resetDefaultApps,
  setDefaultApp,
} from '../../utils/settings/defaultApps';

type PreferenceRow = {
  kind: DefaultAppKind;
  type: string;
  handlers: HandlerDescriptor[];
  selected: string;
  builtin?: string;
};

const ASK_VALUE = 'ask';

const friendlyHandlerName = (handlers: HandlerDescriptor[], id?: string) => {
  if (!id) return undefined;
  const match = handlers.find((handler) => handler.id === id);
  return match?.label;
};

const protocolSamples: Record<string, string> = {
  http: 'http://example.com',
  https: 'https://example.com',
  mailto: 'mailto:demo@example.com',
  ssh: 'ssh://demo@example.com',
};

const buildSampleUrl = (type: string) => protocolSamples[type] ?? `${type}://demo`;

const DefaultAppsControlCenter = () => {
  const [protocolRows, setProtocolRows] = useState<PreferenceRow[]>([]);
  const [mimeRows, setMimeRows] = useState<PreferenceRow[]>([]);
  const [status, setStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(() => {
    const snapshot = getRegistrySnapshot();
    const defaults = getAllDefaultApps();
    const buildRows = (
      kind: DefaultAppKind,
      descriptors: Record<string, HandlerDescriptor[]>,
    ): PreferenceRow[] => {
      const defaultMap = defaults[kind];
      const keys = new Set([
        ...Object.keys(descriptors),
        ...Object.keys(defaultMap),
      ]);
      return Array.from(keys)
        .sort((a, b) => a.localeCompare(b))
        .map((type) => ({
          kind,
          type,
          handlers: descriptors[type] || [],
          selected: defaultMap[type] ?? ASK_VALUE,
          builtin: getBuiltinDefault(kind, type),
        }));
    };
    setProtocolRows(buildRows('protocol', snapshot.protocols));
    setMimeRows(buildRows('mime', snapshot.mimes));
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener(DEFAULT_APPS_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(DEFAULT_APPS_EVENT, handler as EventListener);
    };
  }, [refresh]);

  useEffect(() => {
    if (!status) return undefined;
    const timer = window.setTimeout(() => setStatus(''), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const onChangeSelection = useCallback(
    (row: PreferenceRow, value: string) => {
      setDefaultApp(row.kind, row.type, value);
      setProtocolRows((rows) =>
        rows.map((entry) =>
          entry.kind === row.kind && entry.type === row.type
            ? { ...entry, selected: value }
            : entry,
        ),
      );
      setMimeRows((rows) =>
        rows.map((entry) =>
          entry.kind === row.kind && entry.type === row.type
            ? { ...entry, selected: value }
            : entry,
        ),
      );
      setStatus('Preference saved');
    },
    [],
  );

  const handleExport = useCallback(() => {
    const data = exportDefaultApps(true);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'default-apps.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Export complete');
  }, []);

  const handleImport = useCallback(async (file: File) => {
    const text = await file.text();
    if (importDefaultApps(text)) {
      refresh();
      setStatus('Imported preferences');
    } else {
      setStatus('Invalid configuration file');
    }
  }, [refresh]);

  const triggerImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      void handleImport(file);
      event.target.value = '';
    },
    [handleImport],
  );

  const handleReset = useCallback(() => {
    if (!window.confirm('Reset all default app overrides?')) return;
    resetDefaultApps();
    refresh();
    setStatus('Restored built-in defaults');
  }, [refresh]);

  const handleTest = useCallback(async (row: PreferenceRow) => {
    if (row.selected === ASK_VALUE) {
      setStatus('Choose a handler before testing.');
      return;
    }
    if (row.selected === 'system-mail') {
      setStatus('The system email handler opens outside the desktop.');
      return;
    }
    const request = row.kind === 'protocol'
      ? { url: buildSampleUrl(row.type), allowPrompt: false }
      : { mimeType: row.type, allowPrompt: false };
    const success = await openLink(request);
    if (!success) {
      setStatus('Launch was cancelled or blocked.');
    }
  }, []);

  const renderRows = useCallback(
    (rows: PreferenceRow[], title: string, emptyLabel: string) => (
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-ubt-grey">{emptyLabel}</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const activeDescription =
                row.selected !== ASK_VALUE
                  ? row.handlers.find((handler) => handler.id === row.selected)?.description
                  : undefined;
              const builtinLabel = friendlyHandlerName(row.handlers, row.builtin) || row.builtin;
              return (
                <div
                  key={`${row.kind}-${row.type}`}
                  className="rounded border border-black/40 bg-black/30 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <span className="text-xs uppercase tracking-wide text-ubt-grey">
                        {row.kind === 'protocol' ? 'Protocol' : 'MIME type'}
                      </span>
                      <h3 className="text-base md:text-lg font-semibold text-white">
                        {row.type}
                      </h3>
                      {builtinLabel && (
                        <p className="text-xs text-ubt-grey mt-1">
                          Built-in: {builtinLabel}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-2 min-w-[12rem]">
                      <label
                        htmlFor={`${row.kind}-${row.type}-select`}
                        className="text-xs uppercase tracking-wide text-ubt-grey"
                      >
                        Default handler
                      </label>
                      <select
                        id={`${row.kind}-${row.type}-select`}
                        value={row.selected}
                        onChange={(event) => onChangeSelection(row, event.target.value)}
                        className="bg-ub-cool-grey border border-black/40 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ub-orange/60"
                      >
                        <option value={ASK_VALUE}>Ask every time</option>
                        {row.handlers.map((handler) => (
                          <option key={handler.id} value={handler.id}>
                            {handler.label}
                            {row.builtin === handler.id ? ' (built-in)' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleTest(row)}
                        className="text-xs text-ubt-grey underline disabled:text-gray-600"
                        disabled={row.selected === ASK_VALUE}
                      >
                        Test handler
                      </button>
                      {row.selected === ASK_VALUE ? (
                        <p className="text-xs text-ubt-grey">
                          You will be prompted whenever this type is opened.
                        </p>
                      ) : activeDescription ? (
                        <p className="text-xs text-ubt-grey">{activeDescription}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-300 space-y-1">
                    {row.handlers.length ? (
                      row.handlers.map((handler) => (
                        <div key={handler.id}>
                          <span className="font-semibold text-white">{handler.label}</span>
                          {handler.description ? ` — ${handler.description}` : null}
                        </div>
                      ))
                    ) : (
                      <p>No installed apps are registered for this type.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    ),
    [handleTest, onChangeSelection],
  );

  const actionBar = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleExport}
          className="rounded bg-black/30 px-3 py-1 text-sm text-white border border-black/40 hover:bg-black/40"
        >
          Export
        </button>
        <button
          type="button"
          onClick={triggerImport}
          className="rounded bg-black/30 px-3 py-1 text-sm text-white border border-black/40 hover:bg-black/40"
        >
          Import
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded bg-black/30 px-3 py-1 text-sm text-white border border-black/40 hover:bg-black/40"
        >
          Reset overrides
        </button>
        {status && <span className="text-xs text-ubt-grey">{status}</span>}
      </div>
    ),
    [handleExport, handleReset, status, triggerImport],
  );

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-white windowMainScreen overflow-y-auto">
      <header className="border-b border-black/40 px-5 py-4">
        <h1 className="text-xl font-semibold">Default Apps</h1>
        <p className="mt-1 text-sm text-ubt-grey">
          Manage which applications handle links and content types. Choose “Ask every time”
          to require confirmation before launching unfamiliar items.
        </p>
        <div className="mt-3">{actionBar}</div>
      </header>
      <main className="flex-1 overflow-y-auto px-5 py-4 space-y-8">
        {renderRows(protocolRows, 'Protocol handlers', 'No protocols registered.')}
        {renderRows(mimeRows, 'MIME handlers', 'No MIME handlers registered.')}
      </main>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default DefaultAppsControlCenter;

