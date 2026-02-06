'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  patternDescriptions,
  detectSensitiveContent,
  redactRecord,
} from '../../../utils/redaction';
import {
  defaultDraft,
  toCredentialSet,
  validateCredentialDraft,
  type CredentialDraft,
  type CredentialSet,
} from './credsetsLogic';
import { loadHydraCredentialSets, saveHydraCredentialSets } from './credsetsStorage';

const warningFromPattern = (pattern: string): string =>
  patternDescriptions[pattern] || `Sensitive pattern detected: ${pattern}`;

const createDraftFromSet = (set: CredentialSet): CredentialDraft => ({
  label: set.label,
  alias: set.usernameAlias,
  secret: set.passwordSummary,
  notes: set.notes,
  tags: set.tags.join(', '),
});

const CredSets: React.FC = () => {
  const [credentialSets, setCredentialSets] = useState<CredentialSet[]>([]);
  const [draft, setDraft] = useState<CredentialDraft>(defaultDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof CredentialDraft, string>>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;
    loadHydraCredentialSets()
      .then((sets) => {
        if (!alive) return;
        setCredentialSets(sets);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const anonymizedExport = useMemo(
    () =>
      credentialSets.map((set) =>
        redactRecord({ ...set }, ['usernameAlias', 'passwordSummary', 'notes']),
      ),
    [credentialSets],
  );

  const upsertCredentialSet = (next: CredentialSet) => {
    setCredentialSets((prev) => {
      const exists = prev.some((item) => item.id === next.id);
      const updated = exists
        ? prev.map((item) => (item.id === next.id ? next : item))
        : [...prev, next];
      void saveHydraCredentialSets(updated);
      return updated;
    });
  };

  const deleteCredentialSet = (id: string) => {
    setCredentialSets((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      void saveHydraCredentialSets(filtered);
      return filtered;
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateCredentialDraft(draft);
    const errorMap: Partial<Record<keyof CredentialDraft, string>> = {};
    validation.errors.forEach((error) => {
      errorMap[error.field] = error.message;
    });
    setErrors(errorMap);
    setWarnings(validation.warnings);
    if (validation.errors.length > 0) {
      setStatus('Fix the highlighted fields before saving.');
      return;
    }
    const base = editingId
      ? credentialSets.find((item) => item.id === editingId)
      : undefined;
    const record = toCredentialSet(draft, base);
    upsertCredentialSet(record);
    setStatus(editingId ? 'Credential playbook updated.' : 'Credential playbook saved.');
    setDraft(defaultDraft);
    setEditingId(null);
    setErrors({});
  };

  const handleEdit = (set: CredentialSet) => {
    setDraft(createDraftFromSet(set));
    setEditingId(set.id);
    setWarnings([]);
    setErrors({});
    setStatus('Editing existing playbook.');
  };

  const handleDelete = (set: CredentialSet) => {
    const confirmed = window.confirm(
      `Remove "${set.label}"? This only deletes the anonymized playbook.`,
    );
    if (!confirmed) return;
    deleteCredentialSet(set.id);
    if (editingId === set.id) {
      setEditingId(null);
      setDraft(defaultDraft);
    }
    setStatus('Credential playbook removed.');
  };

  const handleCancelEdit = () => {
    setDraft(defaultDraft);
    setEditingId(null);
    setErrors({});
    setWarnings([]);
    setStatus('');
  };

  const handleFieldChange = <K extends keyof CredentialDraft>(
    field: K,
    value: CredentialDraft[K],
  ) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handlePaste = (field: keyof CredentialDraft) =>
    (event: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const text = event.clipboardData?.getData('text') || '';
      if (!text) return;
      const matches = detectSensitiveContent(text);
      if (matches.length) {
        setWarnings((prev) => {
          const merged = new Set(prev);
          matches.forEach((match) => merged.add(warningFromPattern(match)));
          return Array.from(merged);
        });
      }
      if (field !== 'notes' && matches.length) {
        setStatus('We spotted sensitive looking data in the paste. Double-check anonymization.');
      }
    };

  const handleExport = () => {
    if (!credentialSets.length) {
      setStatus('Create at least one playbook before exporting.');
      return;
    }
    const blob = new Blob([JSON.stringify(anonymizedExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hydra-credential-playbooks.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatus('Anonymized credential export generated.');
  };

  return (
    <section className="mt-6 bg-gray-800/60 border border-gray-700 rounded p-4" aria-label="Credential playbooks">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <img
            src="/themes/Yaru/status/dialog-password-symbolic.svg"
            alt=""
            aria-hidden="true"
            className="w-5 h-5"
          />
          <div>
            <h2 className="text-lg font-semibold">Credential playbooks</h2>
            <p className="text-sm text-gray-300">
              Plan login simulations with aliases—never store actual usernames or passwords.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="self-start md:self-auto px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        >
          Export anonymized JSON
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3" noValidate>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="cred-label">
              Playbook label
            </label>
            <input
              id="cred-label"
              type="text"
              value={draft.label}
              onChange={(event) => handleFieldChange('label', event.target.value)}
              onPaste={handlePaste('label')}
              className="w-full rounded bg-gray-900 border border-gray-700 p-2 text-sm"
              placeholder="Internal VPN"
            />
            {errors.label && <p className="text-xs text-red-400 mt-1">{errors.label}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="cred-alias">
              User alias / persona
            </label>
            <input
              id="cred-alias"
              type="text"
              value={draft.alias}
              onChange={(event) => handleFieldChange('alias', event.target.value)}
              onPaste={handlePaste('alias')}
              className="w-full rounded bg-gray-900 border border-gray-700 p-2 text-sm"
              placeholder="Tier1 Analyst"
            />
            {errors.alias && <p className="text-xs text-red-400 mt-1">{errors.alias}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1" htmlFor="cred-secret">
            Authentication summary (no real passwords)
          </label>
          <textarea
            id="cred-secret"
            value={draft.secret}
            onChange={(event) => handleFieldChange('secret', event.target.value)}
            onPaste={handlePaste('secret')}
            className="w-full rounded bg-gray-900 border border-gray-700 p-2 text-sm min-h-[80px]"
            placeholder="8-char seasonal theme + birth year"
          />
          {errors.secret && <p className="text-xs text-red-400 mt-1">{errors.secret}</p>}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="cred-tags">
              Tags
            </label>
            <input
              id="cred-tags"
              type="text"
              value={draft.tags}
              onChange={(event) => handleFieldChange('tags', event.target.value)}
              onPaste={handlePaste('tags')}
              className="w-full rounded bg-gray-900 border border-gray-700 p-2 text-sm"
              placeholder="vpn, okta, privileged"
            />
            <p className="text-xs text-gray-400 mt-1">
              Comma separated labels to group playbooks (max 8).
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="cred-notes">
              Notes
            </label>
            <textarea
              id="cred-notes"
              value={draft.notes}
              onChange={(event) => handleFieldChange('notes', event.target.value)}
              onPaste={handlePaste('notes')}
              className="w-full rounded bg-gray-900 border border-gray-700 p-2 text-sm min-h-[80px]"
              placeholder="MFA required, fallback to service desk social engineering script."
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
          >
            {editingId ? 'Update playbook' : 'Save playbook'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Cancel edit
            </button>
          )}
          <span className="text-xs text-gray-400">
            Clipboard pastes are scanned for secrets to help maintain anonymization.
          </span>
        </div>
      </form>

      {warnings.length > 0 && (
        <div className="mt-4 bg-yellow-900/40 border border-yellow-700 text-yellow-200 rounded p-3 text-sm">
          <p className="font-semibold mb-2">Review anonymization</p>
          <ul className="list-disc pl-4 space-y-1">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-md font-semibold mb-2">Saved playbooks</h3>
        {loading ? (
          <p className="text-sm text-gray-400">Loading saved entries…</p>
        ) : credentialSets.length === 0 ? (
          <p className="text-sm text-gray-400">
            No playbooks yet. Capture credential themes, MFA requirements, or escalation paths—never raw secrets.
          </p>
        ) : (
          <ul className="space-y-3">
            {credentialSets.map((set) => (
              <li key={set.id} className="bg-gray-900/60 border border-gray-700 rounded p-3">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-sm">{set.label}</h4>
                    <p className="text-xs text-gray-400">Alias: {set.usernameAlias}</p>
                    <p className="text-sm text-gray-200 mt-1 whitespace-pre-wrap">
                      {set.passwordSummary}
                    </p>
                    {set.notes && (
                      <p className="text-xs text-gray-300 mt-2 whitespace-pre-wrap">{set.notes}</p>
                    )}
                    {set.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {set.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] uppercase tracking-wide bg-gray-800 border border-gray-700 px-2 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(set)}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(set)}
                      className="px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {status && (
        <p className="mt-4 text-sm text-emerald-400" role="status" aria-live="polite">
          {status}
        </p>
      )}
    </section>
  );
};

export default CredSets;
