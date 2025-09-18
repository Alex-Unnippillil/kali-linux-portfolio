'use client';

import React, { useState } from 'react';

import type { ValidationResult } from './validation';
import { validateDnsQuery } from './validation';

const DnsToolkit: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ValidationResult | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateDnsQuery(query);
    setResult(validation);
  };

  const handleReset = () => {
    setQuery('');
    setResult(null);
  };

  const showResult = Boolean(result && !result.error);

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-white">
      <header className="border-b border-ub-gray-dark px-4 py-3">
        <h1 className="text-xl font-semibold">DNS Toolkit</h1>
        <p className="mt-1 text-sm text-ubt-grey">
          Practice safe DNS lookups. Inputs are normalized locally and never trigger live network requests.
        </p>
      </header>
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-3">
          <label className="text-sm font-medium" htmlFor="dns-query">
            Domain or URL
          </label>
          <input
            id="dns-query"
            className="rounded border border-ub-gray-dark bg-black/40 px-3 py-2 text-white outline-none focus:border-ubt-blue"
            placeholder="e.g. täst.de or https://täst.de"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (result?.error) {
                setResult(null);
              }
            }}
            autoComplete="off"
          />
          <p className="text-xs text-ubt-grey">
            Internationalized domains convert to punycode automatically. File and JavaScript URLs are blocked for safety.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded bg-ubt-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-ubt-blue/80"
            >
              Normalize
            </button>
            <button
              type="button"
              className="rounded border border-ub-gray-dark px-4 py-2 text-sm text-white transition hover:bg-black/30"
              onClick={handleReset}
            >
              Clear
            </button>
          </div>
        </form>
        {result?.error && (
          <div
            role="alert"
            className="max-w-xl rounded border border-red-500 bg-red-900/40 px-3 py-2 text-sm text-red-200"
          >
            {result.error}
          </div>
        )}
        {showResult && result && (
          <section className="max-w-xl space-y-3 rounded border border-green-500 bg-green-900/20 px-3 py-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-green-200">
                Normalized {result.kind === 'url' ? 'URL' : 'hostname'}
              </h2>
              <code className="mt-1 block break-all bg-black/40 px-3 py-2 font-mono text-green-200">
                {result.normalizedValue}
              </code>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-green-200/80">ASCII Hostname</p>
              <code className="mt-1 block break-all bg-black/40 px-3 py-2 font-mono text-green-200">
                {result.hostname}
              </code>
            </div>
            <p className="text-xs text-ubt-grey">
              Use the normalized hostname to craft simulated dig, nslookup, or host commands without reaching out to the
              network.
            </p>
          </section>
        )}
        {!result && (
          <section className="max-w-xl rounded border border-ub-gray-dark bg-black/20 px-3 py-3 text-sm text-ubt-grey">
            <p>
              Enter a domain or paste an entire URL to preview its punycode representation before running simulated DNS
              lookups.
            </p>
          </section>
        )}
      </main>
    </div>
  );
};

export default DnsToolkit;
