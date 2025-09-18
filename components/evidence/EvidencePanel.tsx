"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ScrollableTimeline from '../ScrollableTimeline';

export interface EvidencePanelProps {
  open: boolean;
  workspaceId: string;
  onClose: () => void;
  onCaptureDesktop?: () => Promise<void> | void;
  onCaptureWindow?: () => Promise<void> | void;
}

interface CaptureNote {
  id: number;
  text: string;
  timestamp: string;
}

interface MetadataState {
  caseName: string;
  operator: string;
  tags: string;
}

const initialMetadata: MetadataState = {
  caseName: '',
  operator: '',
  tags: '',
};

const EvidencePanel: React.FC<EvidencePanelProps> = ({
  open,
  workspaceId,
  onClose,
  onCaptureDesktop,
  onCaptureWindow,
}) => {
  const [metadata, setMetadata] = useState<MetadataState>(initialMetadata);
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<CaptureNote[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const workspaceLabel = useMemo(() => workspaceId || 'default', [workspaceId]);

  const clearStatus = useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
    setStatus(null);
  }, []);

  const showStatus = useCallback(
    (message: string) => {
      if (!message) return;
      clearStatus();
      setStatus(message);
      dismissTimeoutRef.current = setTimeout(() => {
        setStatus(null);
        dismissTimeoutRef.current = null;
      }, 2500);
    },
    [clearStatus],
  );

  useEffect(() => {
    return () => clearStatus();
  }, [clearStatus]);

  useEffect(() => {
    if (!open) {
      clearStatus();
    }
  }, [open, clearStatus]);

  useEffect(() => {
    setMetadata(initialMetadata);
    setNoteText('');
    setNotes([]);
    clearStatus();
  }, [workspaceId, clearStatus]);

  const handleMetadataChange = useCallback(
    (field: keyof MetadataState) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setMetadata((prev) => ({ ...prev, [field]: value }));
      },
    [],
  );

  const runCaptureAction = useCallback(
    async (
      action: (() => Promise<void> | void) | undefined,
      successMessage: string,
      failureMessage: string,
    ) => {
      if (!action) return;
      try {
        await action();
        showStatus(successMessage);
      } catch (error) {
        if (error instanceof Error && error.message) {
          showStatus(error.message);
        } else {
          showStatus(failureMessage);
        }
      }
    },
    [showStatus],
  );

  const handleCaptureDesktop = useCallback(() => {
    return runCaptureAction(
      onCaptureDesktop,
      'Desktop snapshot captured.',
      'Unable to capture the desktop right now.',
    );
  }, [onCaptureDesktop, runCaptureAction]);

  const handleCaptureWindow = useCallback(() => {
    return runCaptureAction(
      onCaptureWindow,
      'Focused window captured.',
      'No focused window available to capture.',
    );
  }, [onCaptureWindow, runCaptureAction]);

  const handleAddNote = useCallback(() => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    setNotes((prev) => [
      {
        id: Date.now(),
        text: trimmed,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
    setNoteText('');
    showStatus('Note added to capture log.');
  }, [noteText, showStatus]);

  const handleNoteKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleAddNote();
      }
    },
    [handleAddNote],
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition ${
        open ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className={`flex-1 bg-black/40 transition-opacity duration-300 ease-in-out ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal={open}
        aria-label="Evidence workspace"
        className={`pointer-events-auto relative h-full w-full max-w-xl transform bg-gray-950/95 backdrop-blur-sm transition-transform duration-300 ease-in-out border-l border-gray-800 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden text-gray-100">
          <header className="flex items-start justify-between border-b border-gray-800 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Workspace</p>
              <p className="text-sm font-semibold text-white">{workspaceLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              {status && (
                <span className="rounded bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
                  {status}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-700 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-300 transition hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
            <section aria-labelledby="evidence-metadata-heading">
              <h2
                id="evidence-metadata-heading"
                className="text-xs font-semibold uppercase tracking-wide text-gray-400"
              >
                Case metadata
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                These fields stay with the workspace to keep captures organized.
              </p>
              <div className="mt-4 grid gap-4">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs uppercase tracking-wide text-gray-500">
                    Case name
                  </span>
                  <input
                    type="text"
                    value={metadata.caseName}
                    onChange={handleMetadataChange('caseName')}
                    placeholder="e.g. Purple Team Assessment"
                    className="w-full rounded border border-gray-700 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-ubt-blue focus:outline-none focus:ring-2 focus:ring-ubt-blue/40"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs uppercase tracking-wide text-gray-500">
                    Operator
                  </span>
                  <input
                    type="text"
                    value={metadata.operator}
                    onChange={handleMetadataChange('operator')}
                    placeholder="Analyst on duty"
                    className="w-full rounded border border-gray-700 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-ubt-blue focus:outline-none focus:ring-2 focus:ring-ubt-blue/40"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs uppercase tracking-wide text-gray-500">
                    Tags
                  </span>
                  <input
                    type="text"
                    value={metadata.tags}
                    onChange={handleMetadataChange('tags')}
                    placeholder="Add comma separated labels"
                    className="w-full rounded border border-gray-700 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-ubt-blue focus:outline-none focus:ring-2 focus:ring-ubt-blue/40"
                  />
                </label>
              </div>
            </section>

            <section aria-labelledby="timeline-heading">
              <h2
                id="timeline-heading"
                className="text-xs font-semibold uppercase tracking-wide text-gray-400"
              >
                Timeline
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Review notable milestones and drop pins as you collect new artefacts.
              </p>
              <div className="mt-3 rounded-lg border border-gray-800 bg-black/30 p-4">
                <ScrollableTimeline />
              </div>
            </section>

            <section aria-labelledby="capture-controls-heading" className="pb-8">
              <h2
                id="capture-controls-heading"
                className="text-xs font-semibold uppercase tracking-wide text-gray-400"
              >
                Capture controls
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Trigger quick snapshots or jot down observations while the panel is open.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleCaptureDesktop}
                  className="rounded border border-ubt-blue/60 bg-ubt-blue/20 px-4 py-3 text-sm font-medium text-ubt-blue transition hover:bg-ubt-blue/30 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!onCaptureDesktop}
                >
                  Capture desktop
                </button>
                <button
                  type="button"
                  onClick={handleCaptureWindow}
                  className="rounded border border-ubt-blue/40 bg-black/40 px-4 py-3 text-sm font-medium text-gray-200 transition hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!onCaptureWindow}
                >
                  Capture focused window
                </button>
              </div>
              <div className="mt-6">
                <label className="block text-sm text-gray-300" htmlFor="evidence-note">
                  Quick note
                </label>
                <textarea
                  id="evidence-note"
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  onKeyDown={handleNoteKeyDown}
                  rows={3}
                  placeholder="Record observations, commands, or context. Press Ctrl+Enter to save."
                  className="mt-2 w-full rounded border border-gray-700 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-ubt-blue focus:outline-none focus:ring-2 focus:ring-ubt-blue/40"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>{noteText.trim().length} characters</span>
                  <button
                    type="button"
                    onClick={handleAddNote}
                    className="rounded border border-gray-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!noteText.trim()}
                  >
                    Log note
                  </button>
                </div>
              </div>

              {notes.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Recent notes
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-gray-300">
                    {notes.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded border border-gray-800 bg-black/40 p-3"
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                          {entry.text}
                        </p>
                        <time
                          dateTime={entry.timestamp}
                          className="mt-2 block text-xs uppercase tracking-wide text-gray-500"
                        >
                          {new Date(entry.timestamp).toLocaleString()}
                        </time>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default EvidencePanel;
