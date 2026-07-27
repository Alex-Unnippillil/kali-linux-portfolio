"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import useWorkspaceEnv from '../../hooks/useWorkspaceEnv';
import type { EnvEntry, EnvMutationResult } from '../../utils/envStore';

interface EditableRowProps {
  entry: EnvEntry;
  onSave: (key: string, value: string, previousKey: string) => EnvMutationResult;
  onDelete: (key: string) => EnvMutationResult;
  validateKey: (key: string) => { valid: boolean; normalizedKey: string; message?: string; reserved?: boolean };
}

function EditableRow({ entry, onSave, onDelete, validateKey }: EditableRowProps) {
  const [draftKey, setDraftKey] = useState(entry.key);
  const [draftValue, setDraftValue] = useState(entry.value);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(entry.warning ?? null);

  useEffect(() => {
    setDraftKey(entry.key);
    setDraftValue(entry.value);
    setStatus(entry.warning ?? null);
    setError(null);
  }, [entry.key, entry.value, entry.warning]);

  const resetMessages = () => {
    setError(null);
    setStatus(entry.warning ?? null);
  };

  const persistChanges = () => {
    if (entry.readonly) {
      resetMessages();
      return;
    }

    const trimmedValue = draftValue;
    const validation = validateKey(draftKey);
    if (!validation.valid) {
      setError(validation.message ?? 'Invalid key.');
      return;
    }

    if (validation.normalizedKey === entry.key && trimmedValue === entry.value) {
      resetMessages();
      return;
    }

    const result = onSave(validation.normalizedKey, trimmedValue, entry.key);
    if (!result.success) {
      setError(result.error ?? 'Unable to save variable.');
      if (result.warning) setStatus(result.warning);
      return;
    }

    setError(null);
    setStatus(result.warning ?? entry.warning ?? null);
  };

  const handleDelete = () => {
    const result = onDelete(entry.key);
    if (!result.success) {
      setError(result.error ?? 'Unable to remove variable.');
      if (result.warning) setStatus(result.warning);
    }
  };

  const readOnlyBadge = entry.reserved ? (
    <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70">
      Reserved
    </span>
  ) : null;

  return (
    <div className="flex flex-col gap-1 rounded-md border border-white/10 bg-slate-900/40 p-3 transition-colors hover:border-white/20">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Key</span>
          <input
            id={`env-key-${entry.key}`}
            value={draftKey}
            onChange={(event) => {
              setDraftKey(event.target.value);
              if (error) setError(null);
            }}
            onBlur={persistChanges}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                persistChanges();
              }
            }}
            readOnly={entry.readonly}
            aria-label="Environment variable key"
            className={`w-full rounded border px-3 py-2 font-mono text-sm text-white/90 outline-none transition ${
              entry.readonly
                ? 'cursor-not-allowed border-white/10 bg-white/5'
                : 'border-white/10 bg-[#131a26] focus:border-[var(--kali-blue)] focus:ring-2 focus:ring-[var(--kali-blue)]/40'
            }`}
            aria-readonly={entry.readonly}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Value</span>
          <input
            id={`env-value-${entry.key}`}
            value={draftValue}
            onChange={(event) => {
              setDraftValue(event.target.value);
              if (error) setError(null);
            }}
            onBlur={persistChanges}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                persistChanges();
              }
            }}
            readOnly={entry.readonly}
            aria-label="Environment variable value"
            className={`w-full rounded border px-3 py-2 font-mono text-sm text-white/90 outline-none transition ${
              entry.readonly
                ? 'cursor-not-allowed border-white/10 bg-white/5'
                : 'border-white/10 bg-[#131a26] focus:border-[var(--kali-blue)] focus:ring-2 focus:ring-[var(--kali-blue)]/40'
            }`}
            aria-readonly={entry.readonly}
          />
        </label>
        <div className="flex items-center gap-2 self-start pt-6 md:self-center">
          {readOnlyBadge}
          {!entry.readonly && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded border border-red-500/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-200 transition hover:border-red-400 hover:text-red-100"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
      {!error && status && <p className="text-xs text-white/60">{status}</p>}
    </div>
  );
}

export default function EnvPanel() {
  const { workspaceId, entries, setEntry, deleteEntry, validateKey } = useWorkspaceEnv();
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'error' | 'info' | null>(null);

  const editableEntries = useMemo(() => entries.filter((entry) => !entry.reserved), [entries]);
  const reservedEntries = useMemo(() => entries.filter((entry) => entry.reserved), [entries]);

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setFeedbackType(null);

    const validation = validateKey(newKey);
    if (!validation.valid) {
      setFeedback(validation.message ?? 'Invalid key.');
      setFeedbackType('error');
      return;
    }
    if (validation.reserved) {
      setFeedback(validation.message ?? 'Reserved variable.');
      setFeedbackType('error');
      return;
    }

    const result = setEntry(validation.normalizedKey, newValue);
    if (!result.success) {
      setFeedback(result.error ?? 'Unable to add variable.');
      setFeedbackType('error');
      return;
    }

    setNewKey('');
    setNewValue('');
    setFeedback('Variable added to workspace.');
    setFeedbackType('info');
  };

  const renderRow = (entry: EnvEntry) => (
    <EditableRow
      key={`env-row-${entry.key}`}
      entry={entry}
      onSave={(key, value, previousKey) => setEntry(key, value, { previousKey })}
      onDelete={deleteEntry}
      validateKey={validateKey}
    />
  );

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">Environment Variables</h2>
        <p className="text-xs text-white/60">
          Active workspace: <span className="font-mono">{workspaceId + 1}</span>
        </p>
        <p className="text-xs text-white/50">
          Reserved variables mirror the desktop environment and cannot be edited.
        </p>
      </header>

      <div className="space-y-3">
        {reservedEntries.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">System variables</h3>
            <div className="space-y-2">
              {reservedEntries.map((entry) => renderRow(entry))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Workspace variables</h3>
          {editableEntries.length === 0 ? (
            <p className="rounded border border-dashed border-white/20 bg-white/5 px-3 py-4 text-sm text-white/60">
              No custom variables yet. Use the form below to define one.
            </p>
          ) : (
            <div className="space-y-2">{editableEntries.map((entry) => renderRow(entry))}</div>
          )}
        </div>
      </div>

      <form onSubmit={handleCreate} className="space-y-3 rounded-md border border-white/10 bg-slate-900/60 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Add variable</h3>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Key</span>
            <input
              value={newKey}
              onChange={(event) => setNewKey(event.target.value)}
              className="rounded border border-white/10 bg-[#131a26] px-3 py-2 font-mono text-sm text-white/90 outline-none transition focus:border-[var(--kali-blue)] focus:ring-2 focus:ring-[var(--kali-blue)]/40"
              placeholder="API_URL"
              aria-label="Environment key"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Value</span>
            <input
              value={newValue}
              onChange={(event) => setNewValue(event.target.value)}
              className="rounded border border-white/10 bg-[#131a26] px-3 py-2 font-mono text-sm text-white/90 outline-none transition focus:border-[var(--kali-blue)] focus:ring-2 focus:ring-[var(--kali-blue)]/40"
              placeholder="https://api.internal"
              aria-label="Environment value"
            />
          </label>
          <button
            type="submit"
            className="h-10 rounded bg-[var(--kali-blue)] px-4 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-sky-400"
          >
            Add variable
          </button>
        </div>
        {feedback && (
          <p className={`text-xs ${feedbackType === 'error' ? 'text-red-300' : 'text-white/70'}`}>{feedback}</p>
        )}
      </form>
    </section>
  );
}
