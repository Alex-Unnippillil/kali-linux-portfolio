'use client';

import { useMemo, useState } from 'react';
import useWorkspaces from '../../hooks/useWorkspaces';

const APP_LIBRARY = [
  { id: 'terminal', name: 'Terminal' },
  { id: 'chrome', name: 'Chrome' },
  { id: 'gedit', name: 'Gedit' },
  { id: 'spotify', name: 'Spotify' },
  { id: 'wireshark', name: 'Wireshark' },
];

type Status =
  | { type: 'info' | 'success' | 'error'; message: string; details?: string[] }
  | null;

const statusStyles: Record<'info' | 'success' | 'error', string> = {
  info: 'bg-blue-900 bg-opacity-70',
  success: 'bg-green-900 bg-opacity-70',
  error: 'bg-red-900 bg-opacity-70',
};

const WorkspaceManager = () => {
  const {
    profiles,
    activeProfile,
    activeId,
    createWorkspace,
    switchWorkspace,
    toggleApp,
    setApps,
    exportWorkspaces,
    importWorkspaces,
  } = useWorkspaces();
  const [newName, setNewName] = useState('');
  const [exported, setExported] = useState('');
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState<Status>(null);

  const activeApps = useMemo(
    () => new Set(activeProfile?.apps ?? []),
    [activeProfile],
  );

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const outcome = createWorkspace(newName);
    if (outcome.success) {
      setStatus({
        type: 'success',
        message: `Workspace "${outcome.profile?.name ?? newName}" created.`,
      });
      setNewName('');
    } else if (outcome.reason === 'duplicate') {
      setStatus({
        type: 'error',
        message: 'A workspace with that name already exists.',
      });
    } else {
      setStatus({ type: 'error', message: 'Enter a workspace name to create one.' });
    }
  };

  const handleSwitch = (id: string) => {
    switchWorkspace(id);
    setStatus(null);
  };

  const handleExport = () => {
    setExported(exportWorkspaces());
    setStatus({
      type: 'info',
      message: 'Workspaces exported. Copy the JSON below to save a backup.',
    });
  };

  const handleImport = () => {
    const outcome = importWorkspaces(importText);
    if (outcome.success) {
      const details =
        outcome.conflicts.length > 0
          ? outcome.conflicts.map(({ original, resolved }) => `${original} → ${resolved}`)
          : undefined;
      setStatus({
        type: 'success',
        message: outcome.message,
        details,
      });
      setImportText('');
    } else {
      setStatus({ type: 'error', message: outcome.message });
    }
  };

  const handleClearApps = () => {
    setApps([]);
    setStatus({ type: 'info', message: 'Cleared all apps from the current workspace.' });
  };

  return (
    <div className="min-h-screen bg-ub-cool-grey text-white p-4 space-y-6" data-testid="workspace-manager">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Workspace Profiles</h1>
        <p className="text-sm text-gray-300">
          Save combinations of apps and switch between them instantly.
        </p>
      </header>

      <section className="space-y-3" aria-label="Workspace selection">
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2 items-center">
          <label htmlFor="workspace-name" className="sr-only">
            Workspace name
          </label>
          <input
            id="workspace-name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="New workspace name"
            className="px-3 py-2 rounded text-black min-w-[200px]"
            data-testid="workspace-name-input"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-ub-orange text-black rounded"
            data-testid="create-workspace"
          >
            Create workspace
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => handleSwitch(profile.id)}
              className={`px-3 py-2 rounded border transition-colors ${
                profile.id === activeId
                  ? 'border-ub-orange bg-black bg-opacity-40'
                  : 'border-transparent bg-black bg-opacity-20 hover:bg-opacity-30'
              }`}
              data-testid={`workspace-tab-${profile.id}`}
              aria-pressed={profile.id === activeId}
            >
              {profile.name}
            </button>
          ))}
        </div>
      </section>

      {status && (
        <div
          role="status"
          className={`rounded p-3 text-sm ${statusStyles[status.type]}`}
          data-testid="workspace-status"
        >
          <p>{status.message}</p>
          {status.details && status.details.length > 0 && (
            <ul className="mt-2 list-disc list-inside space-y-1">
              {status.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <section className="space-y-3" aria-label="Workspace apps">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Apps in "{activeProfile?.name ?? 'Workspace'}"
          </h2>
          <button
            type="button"
            onClick={handleClearApps}
            className="px-3 py-1 text-sm border border-gray-500 rounded"
            data-testid="clear-workspace-apps"
          >
            Clear selection
          </button>
        </div>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
          data-testid="app-toggle-grid"
        >
          {APP_LIBRARY.map((app) => (
            <label
              key={app.id}
              htmlFor={`app-toggle-${app.id}`}
              className="flex items-center gap-3 bg-black bg-opacity-20 rounded px-3 py-2 cursor-pointer"
            >
              <input
                id={`app-toggle-${app.id}`}
                type="checkbox"
                checked={activeApps.has(app.id)}
                onChange={() => toggleApp(app.id)}
                data-testid={`app-toggle-${app.id}`}
              />
              <span>{app.name}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-2" aria-label="Backup and restore">
        <h2 className="text-lg font-semibold">Backup &amp; Restore</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-2 rounded border border-gray-600 bg-black bg-opacity-30 hover:bg-opacity-50"
            data-testid="export-workspaces"
          >
            Export
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="px-3 py-2 rounded border border-gray-600 bg-black bg-opacity-30 hover:bg-opacity-50"
            data-testid="import-workspaces"
          >
            Restore
          </button>
        </div>
        <div className="space-y-2">
          <label htmlFor="workspace-export" className="block text-sm text-gray-300">
            Backup JSON
          </label>
          <textarea
            id="workspace-export"
            value={exported}
            readOnly
            rows={4}
            className="w-full rounded bg-black bg-opacity-20 p-2 text-sm"
            data-testid="export-output"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="workspace-import" className="block text-sm text-gray-300">
            Paste a backup to restore
          </label>
          <textarea
            id="workspace-import"
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={4}
            className="w-full rounded bg-black bg-opacity-20 p-2 text-sm"
            placeholder='{"version":1,"profiles":[]}'
            data-testid="import-input"
          />
        </div>
      </section>
    </div>
  );
};

export default WorkspaceManager;
