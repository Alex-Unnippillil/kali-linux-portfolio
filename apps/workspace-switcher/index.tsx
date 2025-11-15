'use client';

import { ChangeEvent, useMemo, useRef, useState } from 'react';
import useWorkspaces, {
  ImportMode,
  WorkspaceSnapshot,
  WORKSPACE_SCHEMA_VERSION,
} from '../../hooks/useWorkspaces';

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const WorkspaceSwitcher = () => {
  const {
    workspaces,
    activeWorkspaceId,
    createWorkspace,
    updateWorkspace,
    removeWorkspace,
    setActiveWorkspace,
    exportWorkspaces,
    importWorkspaces,
  } = useWorkspaces();
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeWorkspace = useMemo(
    () => workspaces.find((ws) => ws.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId],
  );

  const handleCreate = () => {
    const name = newName.trim() || `Workspace ${workspaces.length + 1}`;
    setBusy(true);
    try {
      createWorkspace({ name });
      setNewName('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace.');
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (ids?: string[]) => {
    setBusy(true);
    try {
      await exportWorkspaces(ids);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  const closeImport = () => {
    setImportOpen(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportFile = async (file: File) => {
    setBusy(true);
    try {
      await importWorkspaces(file, importMode);
      setError(null);
      closeImport();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Import failed. Ensure the bundle is valid.',
      );
    } finally {
      setBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleImportFile(file);
    }
  };

  const handleRename = (workspace: WorkspaceSnapshot, value: string) => {
    updateWorkspace(workspace.id, { name: value });
  };

  const evidenceCount = (workspace: WorkspaceSnapshot) =>
    workspace.capturedEvidence.length;

  return (
    <div className="flex h-full flex-col gap-4 bg-ub-cool-grey p-4 text-white">
      <header className="flex flex-col gap-3 rounded border border-black/40 bg-black/20 p-4 shadow">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="workspace-name" className="text-sm text-gray-200">
              Workspace name
            </label>
            <input
              id="workspace-name"
              value={newName}
              disabled={busy}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Primary workspace"
              className="rounded border border-black/30 bg-black/40 px-2 py-1 text-sm text-white focus:border-ub-orange focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={busy}
            className="rounded bg-ub-orange px-3 py-1 text-sm font-semibold text-black transition hover:bg-ub-yellow disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add workspace
          </button>
          <button
            type="button"
            onClick={() => handleExport()}
            disabled={busy || workspaces.length === 0}
            className="rounded bg-blue-500 px-3 py-1 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export all
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            disabled={busy}
            className="rounded bg-green-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Import bundle
          </button>
        </div>
        {activeWorkspace && (
          <p className="text-sm text-gray-300">
            Active workspace:
            <span className="ml-2 font-semibold text-white">{activeWorkspace.name}</span>
          </p>
        )}
        {error && (
          <p className="rounded border border-red-700 bg-red-900/60 p-2 text-sm text-red-200">
            {error}
          </p>
        )}
      </header>

      <section className="flex-1 overflow-y-auto rounded border border-black/40 bg-black/20 p-4 shadow">
        {workspaces.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-300">
            No workspaces found. Create one to get started.
          </div>
        ) : (
          <ul className="space-y-3">
            {workspaces.map((workspace) => (
              <li
                key={workspace.id}
                className={`rounded border px-3 py-3 transition ${
                  workspace.id === activeWorkspaceId
                    ? 'border-ub-orange bg-ub-orange/10'
                    : 'border-black/30 bg-black/30'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={workspace.name}
                    onChange={(event) => handleRename(workspace, event.target.value)}
                    className="min-w-[12rem] flex-1 rounded border border-black/30 bg-black/40 px-2 py-1 text-sm focus:border-ub-orange focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveWorkspace(workspace.id)}
                    className={`rounded px-3 py-1 text-sm font-semibold transition ${
                      workspace.id === activeWorkspaceId
                        ? 'bg-ub-orange text-black'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                  >
                    {workspace.id === activeWorkspaceId ? 'Active' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport([workspace.id])}
                    disabled={busy}
                    className="rounded bg-blue-500 px-3 py-1 text-sm text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => removeWorkspace(workspace.id)}
                    disabled={busy}
                    className="rounded bg-red-600 px-3 py-1 text-sm text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
                <dl className="mt-2 grid gap-1 text-xs text-gray-300 sm:grid-cols-3">
                  <div>
                    <dt className="uppercase tracking-wide text-gray-400">Updated</dt>
                    <dd>{formatDate(workspace.updatedAt)}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-gray-400">Wallpaper</dt>
                    <dd>{workspace.wallpaper}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-gray-400">Captured evidence</dt>
                    <dd>{evidenceCount(workspace)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded border border-black/50 bg-ub-cool-grey p-4 text-white shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Import workspaces</h2>
              <button
                type="button"
                className="text-sm text-gray-200 underline"
                onClick={closeImport}
              >
                Cancel
              </button>
            </div>
            <p className="mb-3 text-sm text-gray-300">
              Choose how imported workspaces should be applied.
            </p>
            <fieldset className="mb-3 space-y-2 text-sm">
              <legend className="text-xs uppercase text-gray-400">Import mode</legend>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="workspace-import-mode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                />
                Merge with existing workspaces
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="workspace-import-mode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
                Replace existing workspaces
              </label>
            </fieldset>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
                className="rounded border border-black/40 bg-black/40 px-2 py-1 text-sm file:mr-3 file:rounded file:border-0 file:bg-ub-orange file:px-3 file:py-1 file:text-black"
              />
              <p className="text-xs text-gray-400">
                Schema version {`v${WORKSPACE_SCHEMA_VERSION}`} is required. Exported bundles include evidence and wallpaper assets.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSwitcher;
