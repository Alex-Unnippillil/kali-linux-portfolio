"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  SecretVaultProvider,
  useSecretVault,
} from '../../../hooks/useSecretVault';
import {
  cancelClipboardWipe,
  scheduleClipboardWipe,
  type SecretVaultDecryptedItem,
} from '../../../utils/secretVault';
import { logVaultCopy } from '../../../utils/analytics';

type FormState = {
  id?: string;
  label: string;
  username: string;
  password: string;
  notes: string;
  scopes: string;
  tags: string;
  expiresAt: string;
  restrictCopy: boolean;
};

const emptyForm: FormState = {
  label: '',
  username: '',
  password: '',
  notes: '',
  scopes: '',
  tags: '',
  expiresAt: '',
  restrictCopy: false,
};

interface TagNode {
  path: string;
  children: Record<string, TagNode>;
}

const buildTagTree = (items: SecretVaultDecryptedItem[]): Record<string, TagNode> => {
  const root: Record<string, TagNode> = {};
  items.forEach((item) => {
    item.metadata.tags.forEach((tag) => {
      const segments = tag
        .split('/')
        .map((segment) => segment.trim())
        .filter(Boolean);
      let cursor = root;
      let currentPath = '';
      segments.forEach((segment) => {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        if (!cursor[segment]) {
          cursor[segment] = { path: currentPath, children: {} };
        }
        cursor = cursor[segment].children;
      });
    });
  });
  return root;
};

const TagTree: React.FC<{
  data: Record<string, TagNode>;
  selected: string | null;
  onSelect: (tag: string) => void;
}> = ({ data, selected, onSelect }) => {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-xs text-gray-500">No tags defined.</p>;
  }
  return (
    <ul className="pl-3 space-y-1 text-sm">
      {Object.entries(data).map(([name, node]) => (
        <TagTreeNode
          key={node.path}
          name={name}
          node={node}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
};

const TagTreeNode: React.FC<{
  name: string;
  node: TagNode;
  selected: string | null;
  onSelect: (tag: string) => void;
}> = ({ name, node, selected, onSelect }) => {
  const hasChildren = Object.keys(node.children).length > 0;
  const isSelected = selected === node.path;
  return (
    <li className="mb-1">
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        className={`text-left hover:underline focus:outline-none ${
          isSelected ? 'text-blue-300' : ''
        }`}
      >
        {name}
      </button>
      {hasChildren && (
        <TagTree data={node.children} selected={selected} onSelect={onSelect} />
      )}
    </li>
  );
};

const parseListInput = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const formatDateForInput = (timestamp: number | null): string => {
  if (!timestamp) return '';
  const iso = new Date(timestamp).toISOString();
  return iso.slice(0, 10);
};

const formatExpiryDisplay = (timestamp: number | null): string => {
  if (!timestamp) return 'No expiry';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 'No expiry' : date.toLocaleString();
};

const maskPassword = (password: string): string => {
  if (!password) return '';
  return '•'.repeat(Math.min(password.length, 8));
};

const CredentialsVaultPanel: React.FC = () => {
  const {
    locked,
    unlock,
    loading,
    error,
    items,
    activeItems,
    expiredItems,
    expiryWarnings,
    saveSecret,
    deleteSecret,
  } = useSecretVault();
  const [selectedScope, setSelectedScope] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>({ ...emptyForm });

  useEffect(() => {
    return () => {
      void cancelClipboardWipe({ wipe: true });
    };
  }, []);

  const scopes = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      item.metadata.scopes.forEach((scope) => set.add(scope));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const tagTree = useMemo(() => buildTagTree(items), [items]);

  const handleTagSelect = useCallback((tag: string) => {
    setSelectedTag((prev) => (prev === tag ? null : tag));
  }, []);

  const matchesFilters = useCallback(
    (item: SecretVaultDecryptedItem) => {
      const scopeMatch = !selectedScope || item.metadata.scopes.includes(selectedScope);
      const tagMatch = !selectedTag || item.metadata.tags.includes(selectedTag);
      return scopeMatch && tagMatch;
    },
    [selectedScope, selectedTag]
  );

  const filteredActive = useMemo(
    () => activeItems.filter(matchesFilters),
    [activeItems, matchesFilters]
  );
  const filteredExpired = useMemo(
    () => expiredItems.filter(matchesFilters),
    [expiredItems, matchesFilters]
  );

  const handleCopy = useCallback(
    async (item: SecretVaultDecryptedItem, value: string, label: string) => {
      if (item.metadata.restrictCopy) {
        setStatus('Copy is disabled for this credential.');
        return;
      }
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        setStatus('Clipboard access is unavailable.');
        return;
      }
      try {
        await navigator.clipboard.writeText(value);
        scheduleClipboardWipe();
        logVaultCopy(label);
        setStatus(`${label} copied. Clipboard will clear in 20 seconds.`);
      } catch {
        setStatus('Failed to copy to clipboard.');
      }
    },
    []
  );

  const handleEdit = useCallback((item: SecretVaultDecryptedItem) => {
    setFormState({
      id: item.id,
      label: item.label,
      username: item.username,
      password: item.password,
      notes: item.notes ?? '',
      scopes: item.metadata.scopes.join(', '),
      tags: item.metadata.tags.join(', '),
      expiresAt: formatDateForInput(item.metadata.expiresAt),
      restrictCopy: item.metadata.restrictCopy,
    });
    setFormError(null);
    setStatus(null);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const confirmed =
        typeof window === 'undefined' ? true : window.confirm('Delete this credential?');
      if (!confirmed) return;
      await deleteSecret(id);
      setStatus('Credential removed.');
      if (formState.id === id) {
        setFormState({ ...emptyForm });
      }
    },
    [deleteSecret, formState.id]
  );

  const handleFieldChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type, checked } = event.target;
      setFormState((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    },
    []
  );

  const handleFormReset = useCallback(() => {
    setFormState({ ...emptyForm });
    setFormError(null);
    setStatus(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);
      setStatus(null);

      if (!formState.label.trim() || !formState.username.trim() || !formState.password) {
        setFormError('Label, username, and password are required.');
        return;
      }

      const expiryValue = formState.expiresAt
        ? Date.parse(formState.expiresAt)
        : null;
      if (formState.expiresAt && Number.isNaN(expiryValue)) {
        setFormError('Enter a valid expiration date.');
        return;
      }

      const saved = await saveSecret({
        id: formState.id,
        label: formState.label.trim(),
        username: formState.username,
        password: formState.password,
        notes: formState.notes,
        metadata: {
          scopes: parseListInput(formState.scopes),
          tags: parseListInput(formState.tags),
          restrictCopy: formState.restrictCopy,
          expiresAt: expiryValue,
        },
      });

      if (saved) {
        setStatus('Credential saved.');
        setFormState({ ...emptyForm });
      }
    },
    [formState, saveSecret]
  );

  if (locked) {
    return (
      <div className="h-full w-full bg-gray-900 text-white p-6 flex flex-col items-center justify-center text-center space-y-3">
        <h2 className="text-xl font-semibold">Credentials Vault</h2>
        <p className="text-sm text-gray-300">
          Unlock the vault to access encrypted credentials stored in IndexedDB.
        </p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={unlock}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded"
        >
          Unlock Vault
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col">
      {status && <div className="mb-2 text-xs text-green-400">{status}</div>}
      {error && <div className="mb-2 text-xs text-red-400">{error}</div>}
      {loading && <div className="mb-2 text-xs text-gray-300">Loading vault data…</div>}
      {expiryWarnings.length > 0 && (
        <div className="mb-3 text-xs text-yellow-300">
          {expiryWarnings.length} credential{expiryWarnings.length === 1 ? '' : 's'} expiring soon.
        </div>
      )}
      <div className="flex flex-1 gap-4 overflow-hidden">
        <aside className="w-1/3 border-r border-gray-700 pr-4 overflow-auto space-y-4">
          <section>
            <h3 className="text-sm font-semibold mb-2">Scopes</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedScope(null)}
                  className={`hover:underline ${selectedScope === null ? 'text-blue-300' : ''}`}
                >
                  All scopes
                </button>
              </li>
              {scopes.map((scope) => (
                <li key={scope}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedScope((prev) => (prev === scope ? null : scope))
                    }
                    className={`hover:underline ${selectedScope === scope ? 'text-blue-300' : ''}`}
                  >
                    {scope}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold mb-2">Tags</h3>
            {selectedTag && (
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className="mb-2 text-xs text-blue-300 hover:underline"
              >
                Clear tag filter
              </button>
            )}
            <TagTree data={tagTree} selected={selectedTag} onSelect={handleTagSelect} />
          </section>
        </aside>
        <section className="flex-1 overflow-hidden flex flex-col gap-4">
          <form
            onSubmit={handleSubmit}
            onReset={handleFormReset}
            className="bg-gray-800 rounded p-4 space-y-3"
          >
            <h3 className="text-sm font-semibold">Add or edit credential</h3>
            {formError && <p className="text-xs text-red-300">{formError}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col space-y-1">
                <span>Label</span>
                <input
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                  name="label"
                  value={formState.label}
                  onChange={handleFieldChange}
                  required
                />
              </label>
              <label className="flex flex-col space-y-1">
                <span>Username</span>
                <input
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                  name="username"
                  value={formState.username}
                  onChange={handleFieldChange}
                  required
                />
              </label>
              <label className="flex flex-col space-y-1">
                <span>Password</span>
                <input
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                  name="password"
                  type="password"
                  value={formState.password}
                  onChange={handleFieldChange}
                  required
                />
              </label>
              <label className="flex flex-col space-y-1">
                <span>Expiry</span>
                <input
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                  name="expiresAt"
                  type="date"
                  value={formState.expiresAt}
                  onChange={handleFieldChange}
                />
              </label>
              <label className="flex flex-col space-y-1 md:col-span-2">
                <span>Scopes (comma separated)</span>
                <input
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                  name="scopes"
                  value={formState.scopes}
                  onChange={handleFieldChange}
                  placeholder="e.g. work, personal"
                />
              </label>
              <label className="flex flex-col space-y-1 md:col-span-2">
                <span>Tags (comma separated, use / for hierarchy)</span>
                <input
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                  name="tags"
                  value={formState.tags}
                  onChange={handleFieldChange}
                  placeholder="finance/banking, identity"
                />
              </label>
              <label className="flex flex-col space-y-1 md:col-span-2">
                <span>Notes</span>
                <textarea
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                  name="notes"
                  rows={2}
                  value={formState.notes}
                  onChange={handleFieldChange}
                />
              </label>
            </div>
            <label className="flex items-center space-x-2 text-xs">
              <input
                type="checkbox"
                name="restrictCopy"
                checked={formState.restrictCopy}
                onChange={handleFieldChange}
              />
              <span>Disable clipboard copy for this credential</span>
            </label>
            <div className="flex gap-2 text-xs">
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded"
                disabled={loading}
              >
                Save Credential
              </button>
              <button
                type="reset"
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Reset
              </button>
            </div>
          </form>
          <div className="flex-1 overflow-auto space-y-4 pb-2">
            <section>
              <header className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Active credentials</h3>
                <span className="text-xs text-gray-400">{filteredActive.length}</span>
              </header>
              {filteredActive.length === 0 ? (
                <p className="text-xs text-gray-500">No active credentials match the current filters.</p>
              ) : (
                <ul className="space-y-3">
                  {filteredActive.map((item) => (
                    <li key={item.id} className="bg-gray-800 rounded p-3 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="font-semibold text-sm">{item.label}</h4>
                        <span className="text-xs text-gray-400">
                          Expires: {formatExpiryDisplay(item.metadata.expiresAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Scopes: {item.metadata.scopes.length ? item.metadata.scopes.join(', ') : 'None'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Tags: {item.metadata.tags.length ? item.metadata.tags.join(', ') : 'None'}
                      </p>
                      <p className="text-xs text-gray-300">Username: {item.username}</p>
                      <p className="text-xs text-gray-300">Password: {maskPassword(item.password)}</p>
                      {item.notes && (
                        <p className="text-xs text-gray-300 whitespace-pre-wrap">{item.notes}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs pt-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(item, item.username, `${item.label} username`)}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                          disabled={item.metadata.restrictCopy}
                        >
                          Copy username
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(item, item.password, `${item.label} password`)}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                          disabled={item.metadata.restrictCopy}
                        >
                          Copy password
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="px-2 py-1 bg-blue-700 hover:bg-blue-600 rounded"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="px-2 py-1 bg-red-700 hover:bg-red-600 rounded"
                        >
                          Delete
                        </button>
                      </div>
                      {item.metadata.restrictCopy && (
                        <p className="text-[0.65rem] text-yellow-300">
                          Copying is disabled. Update the credential to allow clipboard export.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <header className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Expired credentials</h3>
                <span className="text-xs text-gray-400">{filteredExpired.length}</span>
              </header>
              {filteredExpired.length === 0 ? (
                <p className="text-xs text-gray-500">No expired credentials.</p>
              ) : (
                <ul className="space-y-3">
                  {filteredExpired.map((item) => (
                    <li key={item.id} className="bg-gray-800 rounded p-3 space-y-2 border border-red-800">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="font-semibold text-sm">{item.label}</h4>
                        <span className="text-xs text-red-300">
                          Expired: {formatExpiryDisplay(item.metadata.expiresAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300">Username: {item.username}</p>
                      {item.notes && (
                        <p className="text-xs text-gray-300 whitespace-pre-wrap">{item.notes}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs pt-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="px-2 py-1 bg-blue-700 hover:bg-blue-600 rounded"
                        >
                          Renew
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="px-2 py-1 bg-red-700 hover:bg-red-600 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
};

const CredentialsVaultApp: React.FC = () => (
  <SecretVaultProvider>
    <CredentialsVaultPanel />
  </SecretVaultProvider>
);

export const displayCredentialsVault = () => <CredentialsVaultApp />;

export default CredentialsVaultApp;
