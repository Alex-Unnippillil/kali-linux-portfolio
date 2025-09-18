'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import httpEnvironmentStore, {
  extractPlaceholders,
  HttpEnvironment,
  HttpEnvironmentState,
  resolveTemplate,
} from './state/environments';

const escapeSingleQuotes = (value: string) => value.replace(/'/g, "'\\''");

const HTTPBuilder: React.FC = () => {
  const [method, setMethod] = useState('GET');
  const [urlTemplate, setUrlTemplate] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [environmentState, setEnvironmentState] = useState<HttpEnvironmentState>(
    () => httpEnvironmentStore.getState(),
  );
  const [newVariableKey, setNewVariableKey] = useState('');
  const [newVariableValue, setNewVariableValue] = useState('');

  useEffect(() => {
    httpEnvironmentStore.ready();
    const unsubscribe = httpEnvironmentStore.subscribe(setEnvironmentState);
    return () => unsubscribe();
  }, []);

  const activeEnvironment: HttpEnvironment | undefined = useMemo(() => {
    const { environments, activeEnvironmentId } = environmentState;
    return (
      environments.find((env) => env.id === activeEnvironmentId) ?? environments[0]
    );
  }, [environmentState]);

  useEffect(() => {
    if (!environmentState.activeEnvironmentId && activeEnvironment) {
      void httpEnvironmentStore.setActiveEnvironment(activeEnvironment.id);
    }
  }, [environmentState.activeEnvironmentId, activeEnvironment]);

  const resolvedUrl = useMemo(
    () => resolveTemplate(urlTemplate, activeEnvironment ?? null),
    [urlTemplate, activeEnvironment],
  );
  const resolvedBody = useMemo(
    () => resolveTemplate(bodyTemplate, activeEnvironment ?? null),
    [bodyTemplate, activeEnvironment],
  );

  const variableEntries = useMemo(() => {
    if (!activeEnvironment) return [] as Array<[string, string]>;
    return Object.entries(activeEnvironment.variables).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [activeEnvironment]);

  const missingVariables = useMemo(() => {
    if (!activeEnvironment) return [] as string[];
    const required = new Set<string>();
    for (const name of extractPlaceholders(urlTemplate)) required.add(name);
    for (const name of extractPlaceholders(bodyTemplate)) required.add(name);
    return Array.from(required).filter(
      (name) => activeEnvironment.variables[name] === undefined,
    );
  }, [activeEnvironment, urlTemplate, bodyTemplate]);

  const commandPreview = useMemo(() => {
    if (!resolvedUrl) return '# Fill in the form to generate a command';
    const parts = [`curl -X ${method}`, `'${escapeSingleQuotes(resolvedUrl)}'`];
    if (resolvedBody) {
      parts.push(`-d '${escapeSingleQuotes(resolvedBody)}'`);
    }
    return parts.join(' ');
  }, [method, resolvedUrl, resolvedBody]);

  const handleEnvironmentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    void httpEnvironmentStore.setActiveEnvironment(event.target.value);
  };

  const handleAddEnvironment = async () => {
    const created = await httpEnvironmentStore.createEnvironment();
    await httpEnvironmentStore.setActiveEnvironment(created.id);
  };

  const handleRenameEnvironment = () => {
    if (!activeEnvironment) return;
    const nextName = window.prompt('Environment name', activeEnvironment.name);
    if (nextName && nextName.trim()) {
      void httpEnvironmentStore.renameEnvironment(activeEnvironment.id, nextName);
    }
  };

  const handleRemoveEnvironment = () => {
    if (!activeEnvironment) return;
    if (environmentState.environments.length <= 1) return;
    void httpEnvironmentStore.removeEnvironment(activeEnvironment.id);
  };

  const handleVariableValueChange = (key: string, value: string) => {
    if (!activeEnvironment) return;
    void httpEnvironmentStore.setEnvironmentVariable(activeEnvironment.id, key, value);
  };

  const handleVariableRename = (key: string) => {
    if (!activeEnvironment) return;
    const next = window.prompt('Variable name', key);
    if (next && next.trim() && next.trim() !== key) {
      void httpEnvironmentStore.renameEnvironmentVariable(activeEnvironment.id, key, next);
    }
  };

  const handleVariableDelete = (key: string) => {
    if (!activeEnvironment) return;
    void httpEnvironmentStore.deleteEnvironmentVariable(activeEnvironment.id, key);
  };

  const handleAddVariable = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeEnvironment) return;
    const key = newVariableKey.trim();
    if (!key) return;
    void httpEnvironmentStore.setEnvironmentVariable(activeEnvironment.id, key, newVariableValue);
    setNewVariableKey('');
    setNewVariableValue('');
  };

  return (
    <div className="h-full overflow-auto bg-gray-900 p-4 text-white">
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">HTTP Request Composer</h1>
          <p className="mt-2 text-sm text-gray-300">
            Craft mock HTTP requests and curl commands without sending traffic. Use{' '}
            <span className="font-mono text-yellow-300">{'{{variable}}'}</span> placeholders
            in your URL or body to substitute values from the active environment.
          </p>
        </header>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="http-environment" className="text-sm font-medium">
              Active environment
            </label>
            <select
              id="http-environment"
              className="rounded border border-gray-700 bg-gray-800 p-2 text-sm"
              value={activeEnvironment?.id ?? ''}
              onChange={handleEnvironmentChange}
            >
              {environmentState.environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded bg-blue-600 px-3 py-1 text-sm font-medium hover:bg-blue-500"
              onClick={handleAddEnvironment}
            >
              New environment
            </button>
            <button
              type="button"
              className="rounded border border-gray-700 px-3 py-1 text-sm hover:bg-gray-800"
              onClick={handleRenameEnvironment}
              disabled={!activeEnvironment}
            >
              Rename
            </button>
            <button
              type="button"
              className="rounded border border-red-600 px-3 py-1 text-sm text-red-300 hover:bg-red-900/40 disabled:opacity-40"
              onClick={handleRemoveEnvironment}
              disabled={environmentState.environments.length <= 1}
            >
              Delete
            </button>
          </div>

          {activeEnvironment && (
            <div className="rounded border border-gray-800 bg-gray-950 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Variables</h2>
                <span className="text-xs text-gray-400">
                  {variableEntries.length} defined
                </span>
              </div>
              <div className="space-y-2">
                {variableEntries.length === 0 && (
                  <p className="text-sm text-gray-400">
                    No variables yet. Add key/value pairs to reuse them in requests.
                  </p>
                )}
                {variableEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex flex-wrap items-center gap-2 rounded border border-gray-800 bg-gray-900 p-2"
                  >
                    <button
                      type="button"
                      className="rounded bg-gray-800 px-2 py-1 text-xs font-mono text-blue-300 hover:bg-gray-700"
                      onClick={() => handleVariableRename(key)}
                      title="Rename variable"
                    >
                      {key}
                    </button>
                    <input
                      className="min-w-[140px] flex-1 rounded border border-gray-700 bg-gray-950 p-2 text-sm text-white"
                      value={value}
                      onChange={(event) => handleVariableValueChange(key, event.target.value)}
                      placeholder="Value"
                      aria-label={`Value for ${key}`}
                    />
                    <button
                      type="button"
                      className="rounded border border-red-500 px-2 py-1 text-xs text-red-300 hover:bg-red-900/40"
                      onClick={() => handleVariableDelete(key)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <form className="mt-4 flex flex-wrap gap-2" onSubmit={handleAddVariable}>
                <input
                  className="min-w-[160px] flex-1 rounded border border-gray-700 bg-gray-900 p-2 text-sm text-white"
                  placeholder="Variable name"
                  value={newVariableKey}
                  onChange={(event) => setNewVariableKey(event.target.value)}
                  aria-label="New variable name"
                />
                <input
                  className="min-w-[160px] flex-1 rounded border border-gray-700 bg-gray-900 p-2 text-sm text-white"
                  placeholder="Value"
                  value={newVariableValue}
                  onChange={(event) => setNewVariableValue(event.target.value)}
                  aria-label="New variable value"
                />
                <button
                  type="submit"
                  className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium hover:bg-emerald-500"
                  disabled={!newVariableKey.trim()}
                >
                  Add variable
                </button>
              </form>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <form onSubmit={(event) => event.preventDefault()} className="space-y-4">
            <div>
              <label htmlFor="http-method" className="mb-1 block text-sm font-medium">
                Method
              </label>
              <select
                id="http-method"
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label htmlFor="http-url" className="mb-1 block text-sm font-medium">
                URL template
              </label>
              <input
                id="http-url"
                type="text"
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                value={urlTemplate}
                onChange={(event) => setUrlTemplate(event.target.value)}
                placeholder="https://api.example.com/{{version}}/users"
                spellCheck={false}
              />
            </div>
            <div>
              <label htmlFor="http-body" className="mb-1 block text-sm font-medium">
                Body template
              </label>
              <textarea
                id="http-body"
                className="min-h-[120px] w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                value={bodyTemplate}
                onChange={(event) => setBodyTemplate(event.target.value)}
                placeholder='{"token": "{{api_token}}"}'
                spellCheck={false}
              />
            </div>
          </form>
          {missingVariables.length > 0 && (
            <div className="rounded border border-yellow-600 bg-yellow-900/40 p-3 text-sm text-yellow-200">
              Missing values for: {missingVariables.join(', ')}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h2 className="mb-2 text-lg font-semibold">Resolved URL</h2>
              <pre className="min-h-[72px] overflow-auto rounded bg-black p-3 font-mono text-green-300">
                {resolvedUrl || '# Provide a URL template'}
              </pre>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold">Resolved Body</h2>
              <pre className="min-h-[72px] overflow-auto rounded bg-black p-3 font-mono text-green-300">
                {resolvedBody || '# Provide a body template'}
              </pre>
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-lg font-semibold">Command Preview</h2>
            <pre className="overflow-auto rounded bg-black p-3 font-mono text-green-400">
              {commandPreview}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
};

const HTTPPreview: React.FC = () => {
  const countRef = useRef(1);

  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    return { id, title: `Request ${countRef.current++}`, content: <HTTPBuilder /> };
  };

  return (
    <TabbedWindow
      className="min-h-screen bg-gray-900 text-white"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default HTTPPreview;
