'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { GpgKey, TrustLevel } from '../../../utils/gpgMock';
import {
  listKeys,
  createKeyPair,
  importKey,
  signMessage,
  updateTrustLevel,
  exportPublicKey,
  exportRevocationCertificate,
} from '../../../utils/gpgMock';

const trustLevels: Array<{ value: TrustLevel; label: string; helper: string }> = [
  { value: 'unknown', label: 'Unknown', helper: 'Unverified key, treat with caution.' },
  { value: 'marginal', label: 'Marginal', helper: 'Some verification, but still requires manual review.' },
  { value: 'full', label: 'Full', helper: 'Verified owner identity through secondary channel.' },
  { value: 'ultimate', label: 'Ultimate', helper: 'Your own key or one you control completely.' },
];

type Banner = { type: 'success' | 'error' | 'info'; message: string } | null;

type ExportState = { label: string; content: string } | null;

const initialCreateForm = {
  name: '',
  email: '',
  passphrase: '',
  expiresAt: '',
};

const GpgManager: React.FC = () => {
  const [keys, setKeys] = useState<GpgKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [banner, setBanner] = useState<Banner>(null);
  const [exported, setExported] = useState<ExportState>(null);

  const refreshKeys = useCallback(async (preferredId?: string) => {
    const next = await listKeys();
    setKeys(next);
    setSelectedKeyId((current) => {
      if (preferredId) return preferredId;
      if (current && next.some((k) => k.id === current)) {
        return current;
      }
      return next[0]?.id ?? '';
    });
  }, []);

  useEffect(() => {
    void refreshKeys();
  }, [refreshKeys]);

  const showBanner = (type: NonNullable<Banner>['type'], message: string) => {
    setBanner({ type, message });
  };

  const handleCreateChange = (field: keyof typeof initialCreateForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setCreateForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const key = await createKeyPair(
        createForm.name,
        createForm.email,
        createForm.passphrase,
        createForm.expiresAt ? { expiresAt: createForm.expiresAt } : {},
      );
      await refreshKeys(key.id);
      setCreateForm(initialCreateForm);
      showBanner('success', `Created key for ${key.email}.`);
    } catch (error) {
      showBanner('error', (error as Error).message);
    }
  };

  const handleImport = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const key = await importKey(importText);
      await refreshKeys(key.id);
      setImportText('');
      showBanner('success', `Imported key for ${key.email}.`);
    } catch (error) {
      showBanner('error', (error as Error).message);
    }
  };

  const handleTrustChange = async (keyId: string, trust: TrustLevel) => {
    try {
      const updated = await updateTrustLevel(keyId, trust);
      setKeys((prev) => prev.map((key) => (key.id === keyId ? updated : key)));
      showBanner('info', `Set ${updated.email} trust to ${trust}.`);
    } catch (error) {
      showBanner('error', (error as Error).message);
    }
  };

  const handleExport = async (key: GpgKey, type: 'public' | 'revocation') => {
    try {
      const content =
        type === 'public'
          ? await exportPublicKey(key.id)
          : await exportRevocationCertificate(key.id);
      setExported({
        label: `${type === 'public' ? 'Public key' : 'Revocation certificate'} for ${key.email}`,
        content,
      });
      showBanner(
        'info',
        `Exported ${type === 'public' ? 'public key' : 'revocation certificate'} for ${key.email}.`,
      );
    } catch (error) {
      showBanner('error', (error as Error).message);
    }
  };

  const handleSign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedKeyId) {
      showBanner('error', 'Choose a key before signing a message.');
      return;
    }
    try {
      const signed = await signMessage(selectedKeyId, message);
      const key = keys.find((item) => item.id === selectedKeyId);
      setSignature(signed);
      showBanner('success', `Signed message with ${key?.email ?? 'selected key'}.`);
    } catch (error) {
      showBanner('error', (error as Error).message);
    }
  };

  const selectedKey = keys.find((key) => key.id === selectedKeyId) ?? null;

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-white">
      <header className="border-b border-white/10 bg-black/40 px-4 py-3">
        <h1 className="text-lg font-semibold">GPG Key Manager</h1>
        <p className="text-xs text-gray-300">
          Simulated workflows for generating, importing, signing, and trusting keys.
        </p>
      </header>
      {banner && (
        <div
          role="status"
          className={`mx-4 mt-4 rounded border px-3 py-2 text-sm transition-colors ${
            banner.type === 'error'
              ? 'border-red-500/70 bg-red-500/20 text-red-200'
              : banner.type === 'success'
              ? 'border-emerald-500/70 bg-emerald-500/20 text-emerald-100'
              : 'border-sky-500/60 bg-sky-500/20 text-sky-100'
          }`}
        >
          {banner.message}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 md:flex-row">
        <div className="flex w-full flex-col gap-4 md:w-1/2">
          <section className="rounded border border-white/10 bg-black/40 p-4">
            <h2 className="text-base font-semibold">Create a key pair</h2>
            <p className="mt-1 text-xs text-gray-300">
              Provide an identity and optional expiry to generate a mock RSA key pair.
            </p>
            <form className="mt-3 space-y-3" onSubmit={handleCreate}>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-300" htmlFor="gpg-name">
                  Name
                </label>
                <input
                  id="gpg-name"
                  type="text"
                  className="mt-1 w-full rounded border border-white/10 bg-black/60 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                  value={createForm.name}
                  onChange={handleCreateChange('name')}
                  placeholder="Ada Lovelace"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-300" htmlFor="gpg-email">
                  Email
                </label>
                <input
                  id="gpg-email"
                  type="email"
                  className="mt-1 w-full rounded border border-white/10 bg-black/60 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                  value={createForm.email}
                  onChange={handleCreateChange('email')}
                  placeholder="ada@example.com"
                />
              </div>
              <div>
                <label
                  className="text-xs font-semibold uppercase text-gray-300"
                  htmlFor="gpg-passphrase"
                >
                  Passphrase (optional)
                </label>
                <input
                  id="gpg-passphrase"
                  type="password"
                  className="mt-1 w-full rounded border border-white/10 bg-black/60 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                  value={createForm.passphrase}
                  onChange={handleCreateChange('passphrase')}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label
                  className="text-xs font-semibold uppercase text-gray-300"
                  htmlFor="gpg-expires"
                >
                  Expiration (optional)
                </label>
                <input
                  id="gpg-expires"
                  type="date"
                  className="mt-1 w-full rounded border border-white/10 bg-black/60 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                  value={createForm.expiresAt}
                  onChange={handleCreateChange('expiresAt')}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="reset"
                  onClick={() => setCreateForm(initialCreateForm)}
                  className="rounded border border-white/20 px-3 py-1 text-sm text-gray-200 transition hover:border-white/40 hover:text-white"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Generate key pair
                </button>
              </div>
            </form>
          </section>
          <section className="rounded border border-white/10 bg-black/40 p-4">
            <h2 className="text-base font-semibold">Import an existing key</h2>
            <p className="mt-1 text-xs text-gray-300">
              Paste ASCII-armored public key data to simulate importing a contact&apos;s key.
            </p>
            <form className="mt-3 space-y-3" onSubmit={handleImport}>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-300" htmlFor="gpg-import">
                  Armored key block
                </label>
                <textarea
                  id="gpg-import"
                  className="mt-1 h-32 w-full rounded border border-white/10 bg-black/60 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  placeholder={'-----BEGIN PGP PUBLIC KEY-----\nName: Alex Example\nEmail: alex@example.com'}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Only stored in memory for this session.</span>
                <button
                  type="submit"
                  className="rounded bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-500"
                >
                  Import key
                </button>
              </div>
            </form>
          </section>
          {exported && (
            <section className="rounded border border-white/10 bg-black/40 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">{exported.label}</h2>
                <button
                  type="button"
                  onClick={() => setExported(null)}
                  className="rounded border border-white/20 px-2 py-1 text-xs text-gray-200 transition hover:border-white/40 hover:text-white"
                >
                  Clear
                </button>
              </div>
              <textarea
                readOnly
                value={exported.content}
                aria-label="Exported data"
                data-testid="gpg-export-output"
                className="mt-3 h-40 w-full resize-none rounded border border-white/10 bg-black/60 p-3 text-xs text-emerald-200"
              />
            </section>
          )}
        </div>
        <div className="flex w-full flex-col gap-4 md:w-1/2">
          <section className="rounded border border-white/10 bg-black/40 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">Key inventory</h2>
                <p className="mt-1 text-xs text-gray-300">
                  Adjust trust levels and export keys for sharing or safekeeping.
                </p>
              </div>
              <span className="text-xs text-gray-400">{keys.length} keys</span>
            </div>
            <div className="mt-4 space-y-3" data-testid="gpg-keys-table">
              {keys.map((key) => (
                <article key={key.id} className="rounded border border-white/5 bg-white/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div>
                      <p className="font-semibold">{key.name}</p>
                      <p className="text-xs text-gray-200">{key.email}</p>
                    </div>
                    <div className="text-right text-[10px] leading-snug text-gray-300">
                      <p>Fingerprint</p>
                      <code className="font-mono tracking-wider">{key.fingerprint}</code>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <div className="flex flex-col">
                      <label className="sr-only" htmlFor={`trust-${key.id}`}>
                        Trust level
                      </label>
                      <select
                        id={`trust-${key.id}`}
                        value={key.trustLevel}
                        onChange={(event) => handleTrustChange(key.id, event.target.value as TrustLevel)}
                        className="rounded border border-white/10 bg-black/60 px-2 py-1 text-xs text-white focus:border-emerald-400 focus:outline-none"
                      >
                        {trustLevels.map((trust) => (
                          <option key={trust.value} value={trust.value}>
                            {trust.label}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 max-w-xs text-[10px] text-gray-300">
                        {trustLevels.find((item) => item.value === key.trustLevel)?.helper}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExport(key, 'public')}
                      className="rounded border border-white/20 px-2 py-1 text-xs text-gray-200 transition hover:border-white/40 hover:text-white"
                    >
                      Export public key
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport(key, 'revocation')}
                      className="rounded border border-white/20 px-2 py-1 text-xs text-gray-200 transition hover:border-white/40 hover:text-white"
                    >
                      Export revocation cert
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedKeyId(key.id)}
                      className={`rounded px-2 py-1 text-xs font-semibold transition ${
                        selectedKeyId === key.id
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                          : 'border border-white/20 text-gray-200 hover:border-white/40 hover:text-white'
                      }`}
                    >
                      Use for signing
                    </button>
                  </div>
                  {selectedKeyId === key.id && (
                    <div className="mt-2 inline-flex items-center rounded bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-200">
                      Active signing key
                    </div>
                  )}
                </article>
              ))}
              {!keys.length && (
                <p className="rounded border border-dashed border-white/20 bg-black/40 p-4 text-sm text-gray-200">
                  No keys available yet. Create or import one to get started.
                </p>
              )}
            </div>
          </section>
          <section className="rounded border border-white/10 bg-black/40 p-4">
            <h2 className="text-base font-semibold">Sign email text</h2>
            <p className="mt-1 text-xs text-gray-300">
              Choose a key and provide message content to produce a mock detached signature block.
            </p>
            <form className="mt-3 space-y-3" onSubmit={handleSign}>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-300" htmlFor="gpg-key-select">
                  Signing key
                </label>
                <select
                  id="gpg-key-select"
                  value={selectedKeyId}
                  onChange={(event) => setSelectedKeyId(event.target.value)}
                  className="mt-1 w-full rounded border border-white/10 bg-black/60 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                >
                  <option value="" disabled>
                    Select a key
                  </option>
                  {keys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.name} ({key.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-300" htmlFor="gpg-message">
                  Message to sign
                </label>
                <textarea
                  id="gpg-message"
                  className="mt-1 h-32 w-full rounded border border-white/10 bg-black/60 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Hello team, attaching the signed build manifest..."
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMessage('');
                    setSignature('');
                  }}
                  className="rounded border border-white/20 px-3 py-1 text-sm text-gray-200 transition hover:border-white/40 hover:text-white"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Sign message
                </button>
              </div>
            </form>
            {signature && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase text-gray-300">Signature preview</h3>
                  {selectedKey && (
                    <span className="text-[10px] text-gray-300">
                      {selectedKey.email} · trust {selectedKey.trustLevel}
                    </span>
                  )}
                </div>
                <pre
                  data-testid="gpg-signature-output"
                  className="mt-2 max-h-48 overflow-auto rounded border border-white/10 bg-black/60 p-3 text-xs text-emerald-200"
                >
                  {signature}
                </pre>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default GpgManager;
