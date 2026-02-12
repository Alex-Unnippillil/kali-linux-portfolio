'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  useCertStore,
  trustCertificate,
  revokeCertificate,
  importCertificate,
  exportCertificate,
  dismissTlsIssue,
  getStatus,
  type Certificate,
  type CertificateStatus,
  type TlsIssue,
} from '../../../utils/certStore';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRY_WARNING_DAYS = 30;

type ScopeFilter = 'all' | 'system' | 'user';
type IssueFilter = 'all' | 'with' | 'without';

type Message = { type: 'success' | 'error'; text: string } | null;

const statusLabels: Record<CertificateStatus, string> = {
  trusted: 'Trusted',
  untrusted: 'Untrusted',
  revoked: 'Revoked',
};

const statusColors: Record<CertificateStatus, string> = {
  trusted: 'bg-green-700 text-green-100',
  untrusted: 'bg-gray-700 text-gray-200',
  revoked: 'bg-red-800 text-red-100',
};

const issueSeverityStyles: Record<string, string> = {
  info: 'bg-blue-900 text-blue-100',
  warning: 'bg-yellow-800 text-yellow-100',
  critical: 'bg-red-900 text-red-100',
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toISOString().slice(0, 10);
}

function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function computeExpiry(cert: Certificate) {
  const target = new Date(cert.validTo);
  if (Number.isNaN(target.getTime())) {
    return { status: 'unknown', label: 'Unknown expiry' };
  }
  const now = Date.now();
  const diff = target.getTime() - now;
  if (diff < 0) {
    const daysAgo = Math.max(0, Math.ceil(Math.abs(diff) / ONE_DAY_MS));
    return {
      status: 'expired',
      label: daysAgo === 0 ? 'Expired today' : `Expired ${pluralize(daysAgo, 'day')} ago`,
    };
  }
  const daysLeft = Math.ceil(diff / ONE_DAY_MS);
  if (daysLeft <= EXPIRY_WARNING_DAYS) {
    return {
      status: 'expiring',
      label: `Expires in ${pluralize(daysLeft, 'day')}`,
    };
  }
  return {
    status: 'valid',
    label: `Valid until ${formatDate(cert.validTo)}`,
  };
}

function issueMatchesFilter(issueFilter: IssueFilter, issueCount: number): boolean {
  if (issueFilter === 'all') return true;
  if (issueFilter === 'with') return issueCount > 0;
  return issueCount === 0;
}

const CertificatesApp: React.FC = () => {
  const { certificates, tlsIssues } = useCertStore();
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CertificateStatus>('all');
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedFingerprint, setSelectedFingerprint] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState<Message>(null);
  const [exportPreview, setExportPreview] = useState('');

  const filteredCertificates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return certificates.filter((cert) => {
      if (scopeFilter !== 'all' && cert.scope !== scopeFilter) return false;
      const status = getStatus(cert);
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      const issueCount = tlsIssues.filter((issue) =>
        issue.fingerprints.includes(cert.fingerprint)
      ).length;
      if (!issueMatchesFilter(issueFilter, issueCount)) return false;
      if (!query) return true;
      const haystack = `${cert.label} ${cert.subject} ${cert.issuer}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [certificates, scopeFilter, statusFilter, issueFilter, search, tlsIssues]);

  useEffect(() => {
    if (!filteredCertificates.length) {
      setSelectedFingerprint(null);
      return;
    }
    if (!selectedFingerprint) {
      setSelectedFingerprint(filteredCertificates[0].fingerprint);
      return;
    }
    const stillVisible = filteredCertificates.some(
      (cert) => cert.fingerprint === selectedFingerprint
    );
    if (!stillVisible) {
      setSelectedFingerprint(filteredCertificates[0].fingerprint);
    }
  }, [filteredCertificates, selectedFingerprint]);

  const selectedCertificate = useMemo(
    () =>
      certificates.find((cert) => cert.fingerprint === selectedFingerprint) || null,
    [certificates, selectedFingerprint]
  );

  const selectedIssues = useMemo(() => {
    if (!selectedCertificate) return [] as TlsIssue[];
    return tlsIssues.filter((issue) =>
      issue.fingerprints.includes(selectedCertificate.fingerprint)
    );
  }, [selectedCertificate, tlsIssues]);

  const setSuccess = (text: string) => setMessage({ type: 'success', text });
  const setError = (text: string) => setMessage({ type: 'error', text });

  const handleTrust = () => {
    if (!selectedCertificate) return;
    trustCertificate(selectedCertificate.fingerprint);
    setSuccess(`Trusted ${selectedCertificate.label}`);
  };

  const handleRevoke = () => {
    if (!selectedCertificate) return;
    revokeCertificate(selectedCertificate.fingerprint);
    setSuccess(`Revoked ${selectedCertificate.label}`);
  };

  const handleExport = () => {
    if (!selectedCertificate) return;
    const exported = exportCertificate(selectedCertificate.fingerprint);
    if (!exported) {
      setError('Unable to export certificate');
      return;
    }
    setExportPreview(exported);
    setSuccess(`Prepared export for ${selectedCertificate.label}`);
  };

  const handleImport = () => {
    try {
      const cert = importCertificate(importText.trim());
      setSuccess(`Imported ${cert.label}`);
      setImportText('');
      setSelectedFingerprint(cert.fingerprint);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import certificate');
    }
  };

  const handleDismissIssue = (issueId: string) => {
    dismissTlsIssue(issueId);
    setSuccess('Dismissed TLS issue');
  };

  return (
    <div className="flex h-full bg-ub-cool-grey text-white">
      <div className="w-2/5 border-r border-gray-700 flex flex-col">
        <div className="p-3 space-y-2 bg-gray-900">
          <h1 className="text-lg font-semibold">Certificate Store</h1>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex flex-col text-xs uppercase tracking-wide text-gray-300">
              Scope
              <select
                className="mt-1 rounded bg-gray-800 p-1 text-sm text-white"
                value={scopeFilter}
                onChange={(event) =>
                  setScopeFilter(event.target.value as ScopeFilter)
                }
              >
                <option value="all">All</option>
                <option value="system">System</option>
                <option value="user">User</option>
              </select>
            </label>
            <label className="flex flex-col text-xs uppercase tracking-wide text-gray-300">
              Trust state
              <select
                className="mt-1 rounded bg-gray-800 p-1 text-sm text-white"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | CertificateStatus)
                }
              >
                <option value="all">All</option>
                <option value="trusted">Trusted</option>
                <option value="untrusted">Untrusted</option>
                <option value="revoked">Revoked</option>
              </select>
            </label>
            <label className="flex flex-col text-xs uppercase tracking-wide text-gray-300">
              TLS issues
              <select
                className="mt-1 rounded bg-gray-800 p-1 text-sm text-white"
                value={issueFilter}
                onChange={(event) =>
                  setIssueFilter(event.target.value as IssueFilter)
                }
              >
                <option value="all">All</option>
                <option value="with">With TLS issues</option>
                <option value="without">Without TLS issues</option>
              </select>
            </label>
            <label className="flex flex-col text-xs uppercase tracking-wide text-gray-300">
              Search
              <input
                className="mt-1 rounded bg-gray-800 p-1 text-sm text-white"
                type="search"
                placeholder="Search certificates"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search certificates"
              />
            </label>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ul className="divide-y divide-gray-800" aria-label="Certificate list">
            {filteredCertificates.map((cert) => {
              const status = getStatus(cert);
              const expiry = computeExpiry(cert);
              const issueCount = tlsIssues.filter((issue) =>
                issue.fingerprints.includes(cert.fingerprint)
              ).length;
              const isSelected = selectedFingerprint === cert.fingerprint;
              return (
                <li key={cert.fingerprint}>
                  <button
                    type="button"
                    onClick={() => setSelectedFingerprint(cert.fingerprint)}
                    className={`flex w-full flex-col items-start gap-1 p-3 text-left transition hover:bg-gray-800 ${
                      isSelected ? 'bg-gray-800' : ''
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-semibold">{cert.label}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${statusColors[status]}`}
                      >
                        {statusLabels[status]}
                      </span>
                    </div>
                    <div className="text-xs text-gray-300">
                      {cert.scope === 'system' ? 'System' : 'User'} · {cert.type}
                    </div>
                    <div className="text-xs text-gray-400">{cert.issuer}</div>
                    <div
                      className={`text-xs ${
                        expiry.status === 'expired'
                          ? 'text-red-400'
                          : expiry.status === 'expiring'
                            ? 'text-yellow-300'
                            : 'text-gray-300'
                      }`}
                    >
                      {expiry.label}
                    </div>
                    {issueCount > 0 && (
                      <div className="text-xs text-red-300">
                        {pluralize(issueCount, 'TLS issue')} linked
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
            {filteredCertificates.length === 0 && (
              <li className="p-3 text-sm text-gray-300">
                No certificates match the selected filters.
              </li>
            )}
          </ul>
        </div>
        <div className="border-t border-gray-800 p-3 space-y-2 bg-gray-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
            Import certificate
          </h2>
          <textarea
            className="w-full rounded bg-gray-800 p-2 text-xs text-white"
            rows={4}
            placeholder='Paste certificate JSON (e.g. {"label":"New cert",...})'
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            aria-label="Import certificate payload"
          />
          <button
            type="button"
            className="w-full rounded bg-blue-700 px-3 py-2 text-sm font-semibold hover:bg-blue-600 disabled:opacity-50"
            onClick={handleImport}
            disabled={!importText.trim()}
          >
            Import
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {message && (
          <div
            role="status"
            className={`rounded border px-3 py-2 text-sm ${
              message.type === 'success'
                ? 'border-green-600 bg-green-900 text-green-100'
                : 'border-red-700 bg-red-900 text-red-100'
            }`}
          >
            {message.text}
          </div>
        )}
        {selectedCertificate ? (
          <div className="space-y-4">
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold">{selectedCertificate.label}</h2>
                <p className="text-sm text-gray-300">{selectedCertificate.subject}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleTrust}
                  className="rounded bg-green-700 px-3 py-1 text-sm font-semibold hover:bg-green-600"
                >
                  Trust
                </button>
                <button
                  type="button"
                  onClick={handleRevoke}
                  className="rounded bg-red-800 px-3 py-1 text-sm font-semibold hover:bg-red-700"
                >
                  Revoke
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="rounded bg-blue-700 px-3 py-1 text-sm font-semibold hover:bg-blue-600"
                >
                  Export
                </button>
              </div>
            </header>
            <section className="space-y-2" aria-label="Certificate metadata">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                Metadata
              </h3>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-300">Issuer</dt>
                  <dd className="flex-1 text-right text-gray-100 break-all">
                    {selectedCertificate.issuer}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-300">Serial</dt>
                  <dd className="text-gray-100">{selectedCertificate.serialNumber}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-300">Fingerprint</dt>
                  <dd className="flex-1 text-right text-gray-100 break-all">
                    {selectedCertificate.fingerprint}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-300">Valid from</dt>
                  <dd className="text-gray-100">{formatDate(selectedCertificate.validFrom)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-300">Valid to</dt>
                  <dd className="text-gray-100">{formatDate(selectedCertificate.validTo)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-300">Usage</dt>
                  <dd className="text-gray-100">{selectedCertificate.usage.join(', ')}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-300">Algorithm</dt>
                  <dd className="text-gray-100">{selectedCertificate.algorithm}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-300">Scope</dt>
                  <dd className="text-gray-100">
                    {selectedCertificate.scope === 'system' ? 'System' : 'User'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-300">Status</dt>
                  <dd>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        statusColors[getStatus(selectedCertificate)]
                      }`}
                    >
                      {statusLabels[getStatus(selectedCertificate)]}
                    </span>
                  </dd>
                </div>
                {selectedCertificate.notes && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-300">Notes</dt>
                    <dd className="flex-1 text-right text-gray-100">
                      {selectedCertificate.notes}
                    </dd>
                  </div>
                )}
                {Object.entries(selectedCertificate.metadata).map(([key, value]) => (
                  <div className="flex justify-between gap-4" key={key}>
                    <dt className="text-gray-300">{key}</dt>
                    <dd className="flex-1 text-right text-gray-100 break-all">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="space-y-2" aria-label="TLS issues">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                TLS Issues ({selectedIssues.length})
              </h3>
              {selectedIssues.length > 0 ? (
                <ul className="space-y-3">
                  {selectedIssues.map((issue) => (
                    <li
                      key={issue.id}
                      className="rounded border border-gray-700 bg-gray-900 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                issueSeverityStyles[issue.severity] ||
                                issueSeverityStyles.info
                              }`}
                            >
                              {issue.severity.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-300">
                              {issue.source}
                            </span>
                          </div>
                          <p className="font-semibold">{issue.summary}</p>
                          {issue.details && (
                            <p className="text-sm text-gray-300">{issue.details}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            Detected {formatDate(issue.detectedAt)}
                          </p>
                          {issue.remediation && (
                            <p className="text-xs text-gray-300">
                              Remediation: {issue.remediation}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDismissIssue(issue.id)}
                          className="rounded bg-gray-800 px-2 py-1 text-xs font-semibold hover:bg-gray-700"
                        >
                          Dismiss
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-300">
                  No TLS issues linked to this certificate.
                </p>
              )}
            </section>
            {exportPreview && (
              <section className="space-y-2" aria-label="Export preview">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                  Export Preview
                </h3>
                <textarea
                  className="w-full rounded bg-black p-3 font-mono text-xs text-green-200"
                  rows={8}
                  readOnly
                  value={exportPreview}
                  aria-label="Export preview content"
                />
              </section>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-300">
            Select a certificate from the list to view metadata and TLS issues.
          </div>
        )}
      </div>
    </div>
  );
};

export const displayCertificates = () => <CertificatesApp />;

export default CertificatesApp;
