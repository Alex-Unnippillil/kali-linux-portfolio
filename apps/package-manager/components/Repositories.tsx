'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Modal from '@/components/base/Modal';
import repositoriesSource from '@/data/packages/repositories.json';

type KnownSignatureStatus = 'trusted' | 'warning' | 'revoked' | 'unsigned';
type SignatureStatus = KnownSignatureStatus | 'unknown';

interface RepositorySignature {
  status: SignatureStatus;
  summary?: string;
  authority?: string;
  fingerprint?: string;
  lastChecked?: string;
}

interface Repository {
  id: string;
  name: string;
  description?: string;
  url: string;
  enabled: boolean;
  signature: RepositorySignature;
}

interface FormState {
  name: string;
  url: string;
  description: string;
  authority: string;
  fingerprint: string;
  status: KnownSignatureStatus;
  summary: string;
  enabled: boolean;
}

interface FormErrors {
  name?: string;
  url?: string;
}

const STORAGE_KEY = 'package-manager.repositories';

const STATUS_META: Record<SignatureStatus, { label: string; description: string; className: string; badgeClassName: string }>
  = {
    trusted: {
      label: 'Trusted',
      description: 'Repository signed with a known good key.',
      className: 'border-emerald-500/60 bg-emerald-950/60',
      badgeClassName: 'bg-emerald-500 text-black',
    },
    warning: {
      label: 'Expiring Soon',
      description: 'Signature is valid but requires review soon.',
      className: 'border-amber-500/60 bg-amber-950/60',
      badgeClassName: 'bg-amber-400 text-black',
    },
    revoked: {
      label: 'Revoked',
      description: 'Signing key is revoked. Repository should remain disabled.',
      className: 'border-rose-500/50 bg-rose-950/60',
      badgeClassName: 'bg-rose-600 text-white',
    },
    unsigned: {
      label: 'Unsigned',
      description: 'No Release.gpg signature was supplied.',
      className: 'border-slate-500/60 bg-slate-900',
      badgeClassName: 'bg-slate-600 text-slate-100',
    },
    unknown: {
      label: 'Unknown',
      description: 'Signature status is not available.',
      className: 'border-zinc-500/60 bg-zinc-900',
      badgeClassName: 'bg-zinc-600 text-zinc-100',
    },
  };

const defaultFormState: FormState = {
  name: '',
  url: '',
  description: '',
  authority: '',
  fingerprint: '',
  status: 'unsigned',
  summary: 'Custom repository awaiting verification.',
  enabled: true,
};

const normaliseRepository = (repo: Repository): Repository => ({
  ...repo,
  description: repo.description ?? '',
  signature: {
    status: repo.signature.status ?? 'unknown',
    summary: repo.signature.summary,
    authority: repo.signature.authority,
    fingerprint: repo.signature.fingerprint,
    lastChecked: repo.signature.lastChecked,
  },
});

const resolveInitialRepositories = (): Repository[] => {
  const parsed = (repositoriesSource as Repository[]).map(normaliseRepository);
  if (typeof window === 'undefined') {
    return parsed;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return parsed;
    }
    const deserialised = JSON.parse(stored) as Repository[];
    if (!Array.isArray(deserialised)) {
      return parsed;
    }
    return deserialised.map(normaliseRepository);
  } catch {
    return parsed;
  }
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const isValidRepositoryUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const formatDateTime = (value?: string) => {
  if (!value) return 'Not checked';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not checked';
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const Repositories = () => {
  const [repositories, setRepositories] = useState<Repository[]>(resolveInitialRepositories);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Repository | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(repositories));
    } catch {
      // Ignore storage errors in private mode
    }
  }, [repositories]);

  const statusBreakdown = useMemo(() => {
    return repositories.reduce(
      (acc, repo) => {
        const key = (repo.signature.status ?? 'unknown') as SignatureStatus;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {} as Record<SignatureStatus, number>
    );
  }, [repositories]);

  const openAddDialog = () => {
    setFormState(defaultFormState);
    setFormErrors({});
    setIsAddDialogOpen(true);
  };

  const closeAddDialog = () => {
    setIsAddDialogOpen(false);
  };

  const handleToggle = (id: string) => {
    setRepositories((current) =>
      current.map((repo) =>
        repo.id === id
          ? {
              ...repo,
              enabled: !repo.enabled,
            }
          : repo
      )
    );
  };

  const handleFormChange = (field: keyof FormState, value: string | boolean) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = formState.name.trim();
    const trimmedUrl = formState.url.trim();
    const errors: FormErrors = {};

    if (!trimmedName) {
      errors.name = 'Name is required.';
    }
    if (!trimmedUrl) {
      errors.url = 'Repository URL is required.';
    } else if (!isValidRepositoryUrl(trimmedUrl)) {
      errors.url = 'Enter a valid HTTP(S) URL.';
    } else if (
      repositories.some((repo) => repo.url.toLowerCase() === trimmedUrl.toLowerCase())
    ) {
      errors.url = 'A repository with this URL is already listed.';
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const baseId = slugify(trimmedName) || slugify(trimmedUrl);
    const uniqueId = repositories.some((repo) => repo.id === baseId)
      ? `${baseId}-${Date.now()}`
      : baseId;

    const status = formState.status ?? 'unsigned';

    const newRepo: Repository = {
      id: uniqueId,
      name: trimmedName,
      description: formState.description.trim(),
      url: trimmedUrl,
      enabled: formState.enabled,
      signature: {
        status,
        summary: formState.summary.trim() || STATUS_META[status].description,
        authority: formState.authority.trim() || undefined,
        fingerprint: formState.fingerprint.trim() || undefined,
        lastChecked: new Date().toISOString(),
      },
    };

    setRepositories((current) => [...current, newRepo]);
    closeAddDialog();
  };

  const confirmRemoval = () => {
    if (!removeTarget) return;
    setRepositories((current) => current.filter((repo) => repo.id !== removeTarget.id));
    setRemoveTarget(null);
  };

  return (
    <section className="text-gray-200">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Repository Sources</h2>
          <p className="text-sm text-gray-400">
            Manage package sources, verify signatures, and keep untrusted repositories disabled.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddDialog}
          className="mt-2 inline-flex items-center justify-center rounded-md border border-emerald-400/70 bg-emerald-600 px-4 py-2 text-sm font-medium text-black shadow sm:mt-0"
        >
          + Add repository
        </button>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(Object.keys(STATUS_META) as SignatureStatus[]).map((status) => (
          <div
            key={status}
            className={`rounded-lg border px-3 py-2 text-xs ${STATUS_META[status].className}`}
          >
            <p className="font-semibold text-white">
              {STATUS_META[status].label}
            </p>
            <p className="text-gray-300">
              {statusBreakdown[status] ?? 0} source{(statusBreakdown[status] ?? 0) === 1 ? '' : 's'}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {repositories.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-600 bg-gray-900 p-6 text-center text-sm text-gray-400">
            No repositories configured yet. Add one to begin tracking signature status.
          </div>
        )}

        {repositories.map((repo) => {
          const statusKey = (repo.signature.status ?? 'unknown') as SignatureStatus;
          const statusMeta = STATUS_META[statusKey] ?? STATUS_META.unknown;

          return (
            <article
              key={repo.id}
              className="rounded-lg border border-gray-700 bg-gray-900/70 p-4 shadow"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{repo.name}</h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusMeta.badgeClassName}`}
                      title={statusMeta.description}
                    >
                      {statusMeta.label}
                    </span>
                    {!repo.enabled && (
                      <span className="inline-flex items-center rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-200">
                        Disabled
                      </span>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-sm text-gray-300">{repo.description}</p>
                  )}
                  <div className="flex flex-col gap-1 text-xs text-gray-300">
                    <span className="break-all">
                      Source: <span className="text-sky-300">{repo.url}</span>
                    </span>
                    {repo.signature.summary && (
                      <span>{repo.signature.summary}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-[0.7rem] text-gray-300">
                    {repo.signature.authority && (
                      <span className="rounded border border-gray-600 bg-gray-800 px-2 py-1">
                        Authority: {repo.signature.authority}
                      </span>
                    )}
                    {repo.signature.fingerprint && (
                      <span className="rounded border border-gray-600 bg-gray-800 px-2 py-1">
                        Fingerprint: {repo.signature.fingerprint}
                      </span>
                    )}
                    <span className="rounded border border-gray-600 bg-gray-800 px-2 py-1">
                      Last checked: {formatDateTime(repo.signature.lastChecked)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-stretch gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={repo.enabled}
                    onClick={() => handleToggle(repo.id)}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full border border-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                      repo.enabled ? 'bg-emerald-500' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-gray-900 shadow transition ${
                        repo.enabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                    <span className="sr-only">Toggle repository</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoveTarget(repo)}
                    className="rounded-md border border-gray-600 px-3 py-1 text-xs font-medium text-gray-200 transition hover:border-rose-500 hover:text-rose-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Modal isOpen={isAddDialogOpen} onClose={closeAddDialog}>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={closeAddDialog}
            aria-hidden
          />
          <div className="relative w-full max-w-xl rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white">Add repository</h3>
            <p className="mt-1 text-sm text-gray-400">
              Provide the repository source URL and signing metadata so the package manager can track trust state.
            </p>
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label
                  id="repository-name-label"
                  className="block text-sm font-medium text-gray-200"
                  htmlFor="repository-name"
                >
                  Repository name
                </label>
                <input
                  id="repository-name"
                  value={formState.name}
                  onChange={(event) => handleFormChange('name', event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                  placeholder="Example mirror"
                  required
                  aria-labelledby="repository-name-label"
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-rose-400">{formErrors.name}</p>
                )}
              </div>
              <div>
                <label
                  id="repository-url-label"
                  className="block text-sm font-medium text-gray-200"
                  htmlFor="repository-url"
                >
                  Repository URL
                </label>
                <input
                  id="repository-url"
                  type="url"
                  value={formState.url}
                  onChange={(event) => handleFormChange('url', event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                  placeholder="https://mirror.example.org/kali"
                  required
                  aria-labelledby="repository-url-label"
                />
                {formErrors.url && <p className="mt-1 text-xs text-rose-400">{formErrors.url}</p>}
              </div>
              <div>
                <label
                  id="repository-description-label"
                  className="block text-sm font-medium text-gray-200"
                  htmlFor="repository-description"
                >
                  Description <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  id="repository-description"
                  value={formState.description}
                  onChange={(event) => handleFormChange('description', event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                  placeholder="What does this source provide?"
                  aria-labelledby="repository-description-label"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    id="repository-authority-label"
                    className="block text-sm font-medium text-gray-200"
                    htmlFor="repository-authority"
                  >
                    Signing authority <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    id="repository-authority"
                    value={formState.authority}
                    onChange={(event) => handleFormChange('authority', event.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                    placeholder="Key owner or team"
                    aria-labelledby="repository-authority-label"
                  />
                </div>
                <div>
                  <label
                    id="repository-fingerprint-label"
                    className="block text-sm font-medium text-gray-200"
                    htmlFor="repository-fingerprint"
                  >
                    Fingerprint <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    id="repository-fingerprint"
                    value={formState.fingerprint}
                    onChange={(event) => handleFormChange('fingerprint', event.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                    placeholder="XXXX XXXX XXXX XXXX"
                    aria-labelledby="repository-fingerprint-label"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    id="repository-status-label"
                    className="block text-sm font-medium text-gray-200"
                    htmlFor="repository-status"
                  >
                    Signature status
                  </label>
                  <select
                    id="repository-status"
                    value={formState.status}
                    onChange={(event) => handleFormChange('status', event.target.value as KnownSignatureStatus)}
                    className="mt-1 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                    aria-labelledby="repository-status-label"
                  >
                    <option value="trusted">Trusted</option>
                    <option value="warning">Expiring soon</option>
                    <option value="unsigned">Unsigned</option>
                    <option value="revoked">Revoked</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="repository-enabled"
                    type="checkbox"
                    checked={formState.enabled}
                    onChange={(event) => handleFormChange('enabled', event.target.checked)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-950 text-emerald-500 focus:ring-emerald-500"
                    aria-labelledby="repository-enabled-label"
                  />
                  <label id="repository-enabled-label" htmlFor="repository-enabled" className="text-sm text-gray-200">
                    Enable immediately
                  </label>
                </div>
              </div>
              <div>
                <label
                  id="repository-summary-label"
                  className="block text-sm font-medium text-gray-200"
                  htmlFor="repository-summary"
                >
                  Signature notes
                </label>
                <textarea
                  id="repository-summary"
                  value={formState.summary}
                  onChange={(event) => handleFormChange('summary', event.target.value)}
                  className="mt-1 h-20 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                  aria-labelledby="repository-summary-label"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAddDialog}
                  className="rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md border border-emerald-400/70 bg-emerald-600 px-4 py-2 text-sm font-semibold text-black shadow"
                >
                  Save repository
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal>

      <Modal isOpen={removeTarget !== null} onClose={() => setRemoveTarget(null)}>
        {removeTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setRemoveTarget(null)}
              aria-hidden
            />
            <div className="relative w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white">Remove repository</h3>
              <p className="mt-2 text-sm text-gray-300">
                Are you sure you want to remove <span className="font-semibold">{removeTarget.name}</span>? This will delete the
                stored signature metadata for this source.
              </p>
              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRemoveTarget(null)}
                  className="rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRemoval}
                  className="rounded-md border border-rose-400/70 bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};

export default Repositories;
