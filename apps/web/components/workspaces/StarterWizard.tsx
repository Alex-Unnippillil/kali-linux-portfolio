import React, { useEffect, useMemo, useState } from 'react';
import {
  HistoryPreview,
  WorkspaceTemplate,
  createWorkspaceFromTemplate,
  getPendingHistoryAction,
  getTemplates,
  undoHistoryAction,
} from '../../utils/workspaces/store';

const formatCountdown = (expiresAt: number): string => {
  const remaining = Math.max(0, expiresAt - Date.now());
  const seconds = Math.ceil(remaining / 1000);
  return `${seconds}s`;
};

const StarterWizard: React.FC = () => {
  const templates = useMemo<WorkspaceTemplate[]>(() => getTemplates(), []);
  const [selectedId, setSelectedId] = useState(() => templates[0]?.id ?? '');
  const [historyPreview, setHistoryPreview] = useState<HistoryPreview | null>(() => getPendingHistoryAction());
  const [countdownLabel, setCountdownLabel] = useState(() =>
    historyPreview ? formatCountdown(historyPreview.expiresAt) : '',
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find(template => template.id === selectedId) ?? null,
    [selectedId, templates],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const preview = getPendingHistoryAction();
      setHistoryPreview(preview);
      setCountdownLabel(preview ? formatCountdown(preview.expiresAt) : '');
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = () => {
    if (!selectedTemplate) return;
    const workspace = createWorkspaceFromTemplate(selectedTemplate.id);
    setStatusMessage(`Workspace "${workspace.name}" created.`);
    const preview = getPendingHistoryAction();
    setHistoryPreview(preview);
    setCountdownLabel(preview ? formatCountdown(preview.expiresAt) : '');
  };

  const handleUndo = () => {
    if (!historyPreview) return;
    const undone = undoHistoryAction(historyPreview.id);
    if (undone) {
      setStatusMessage('Workspace creation undone.');
      const preview = getPendingHistoryAction();
      setHistoryPreview(preview);
      setCountdownLabel(preview ? formatCountdown(preview.expiresAt) : '');
    }
  };

  if (templates.length === 0) {
    return (
      <div className="rounded border border-gray-700 bg-ub-grey/80 p-4 text-sm text-gray-300">
        No workspace templates available.
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded border border-gray-700 bg-ub-grey/80 p-4 text-white">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Workspace Starter Wizard</h2>
        <p className="text-sm text-gray-300">
          Pick a template to seed tabs, layout, and tooling for a new workspace. You can undo for 10 seconds
          after creating one.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Templates</h3>
          <ul className="space-y-2">
            {templates.map(template => {
              const isSelected = template.id === selectedId;
              return (
                <li key={template.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(template.id)}
                    className={`w-full rounded border px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange ${
                      isSelected
                        ? 'border-ub-orange bg-ub-grey text-white'
                        : 'border-gray-700 bg-ub-grey/60 text-gray-200 hover:border-gray-500'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <span className="block text-sm font-semibold">{template.name}</span>
                    <span className="mt-1 block text-xs text-gray-300">{template.description}</span>
                    {template.tags.length > 0 && (
                      <span className="mt-2 block text-[11px] uppercase tracking-wide text-ub-orange">
                        {template.tags.join(' · ')}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="md:col-span-2 space-y-4">
          {selectedTemplate && (
            <div className="rounded border border-gray-700 bg-ub-grey/70 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Preview</h3>
              <div className="mt-3 space-y-3">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tabs</h4>
                  <ul className="mt-2 space-y-2 text-sm">
                    {selectedTemplate.workspace.tabs.map(tab => (
                      <li
                        key={tab.id}
                        className="rounded border border-gray-700 bg-black/20 p-2 text-gray-200"
                      >
                        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
                          <span>{tab.type}</span>
                          {tab.pinned && <span className="text-ub-orange">Pinned</span>}
                        </div>
                        <div className="text-sm font-medium text-white">{tab.title}</div>
                        {tab.data?.command && (
                          <pre className="mt-2 rounded bg-black/30 p-2 text-xs text-ub-orange">
                            {tab.data.command}
                          </pre>
                        )}
                        {tab.data?.body && (
                          <p className="mt-2 text-xs text-gray-300">{tab.data.body}</p>
                        )}
                        {tab.data?.dataSource && (
                          <p className="mt-2 text-xs text-gray-400">Source: {tab.data.dataSource}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Settings</h4>
                  <dl className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-400">Layout</dt>
                      <dd className="text-white">{selectedTemplate.workspace.settings.layout}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-400">Theme</dt>
                      <dd className="text-white">{selectedTemplate.workspace.settings.theme}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-400">Telemetry</dt>
                      <dd className="text-white">
                        {selectedTemplate.workspace.settings.showTelemetry ? 'Enabled' : 'Disabled'}
                      </dd>
                    </div>
                    {selectedTemplate.workspace.settings.pinnedTools && (
                      <div className="md:col-span-2">
                        <dt className="text-xs uppercase tracking-wide text-gray-400">Pinned tools</dt>
                        <dd className="text-white">
                          {selectedTemplate.workspace.settings.pinnedTools.join(', ')}
                        </dd>
                      </div>
                    )}
                    {selectedTemplate.workspace.settings.notebookVisibility && (
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-400">Notebook</dt>
                        <dd className="text-white">
                          {selectedTemplate.workspace.settings.notebookVisibility}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCreate}
              className="rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-black transition hover:bg-ub-orange/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange"
              disabled={!selectedTemplate}
            >
              Create workspace
            </button>
            {historyPreview && (
              <button
                type="button"
                onClick={handleUndo}
                className="rounded border border-gray-600 px-3 py-2 text-sm text-gray-200 transition hover:border-ub-orange hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange"
              >
                Undo ({countdownLabel})
              </button>
            )}
            {statusMessage && <span className="text-sm text-gray-300">{statusMessage}</span>}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StarterWizard;
