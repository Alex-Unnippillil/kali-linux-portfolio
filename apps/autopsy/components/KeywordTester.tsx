'use client';

import React, { useEffect, useRef, useState } from 'react';
import events from '../events.json';
import nsrl from '../data/nsrl.json';
import { BloomFilter } from '../utils/bloom';

type NsrlEntry = {
  fileName: string;
  product: string;
  version: string;
  os: string;
  sha1: string;
  sha256: string;
};

type NsrlDataset = {
  metadata: {
    source: string;
    generated: string;
    count: number;
    notes: string;
  };
  entries: NsrlEntry[];
};

const nsrlData = nsrl as NsrlDataset;
const nsrlEntries = nsrlData.entries;
const nsrlHashes = nsrlEntries.flatMap((entry) => [entry.sha1, entry.sha256]);

type LookupState = 'idle' | 'hit' | 'miss' | 'probable';

type Telemetry = {
  datasetSize: number;
  filterSize: number;
  hashCount: number;
  insertedItems: number;
  estimatedFalsePositiveRate: number;
  benchmark: {
    lookups: number;
    duration: number;
    perLookup: number;
    meetsTarget: boolean;
  };
};

const LOOKUP_TARGET_MS = 50;
const BENCHMARK_LOOKUPS = 10_000;

const escapeHtml = (str: string = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function KeywordTester() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [lookupHash, setLookupHash] = useState('');
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [lookupResult, setLookupResult] = useState<NsrlEntry | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const filterRef = useRef<BloomFilter | null>(null);

  useEffect(() => {
    const filter = BloomFilter.from(nsrlHashes, 0.005);
    filterRef.current = filter;

    // Deterministic pseudo-random generator for repeatable benchmark runs.
    let seed = 0xdeadbeef;
    const nextValue = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return `miss-${seed.toString(16)}`;
    };

    const queries: string[] = new Array(BENCHMARK_LOOKUPS);
    for (let i = 0; i < BENCHMARK_LOOKUPS; i += 1) {
      if (i % 10 === 0) {
        queries[i] = nsrlHashes[i % nsrlHashes.length];
      } else {
        queries[i] = nextValue();
      }
    }

    const start = performance.now();
    queries.forEach((value) => {
      filter.has(value);
    });
    const duration = performance.now() - start;

    setTelemetry({
      datasetSize: nsrlHashes.length,
      filterSize: filter.size,
      hashCount: filter.hashCount,
      insertedItems: filter.insertedItems,
      estimatedFalsePositiveRate: filter.estimateFalsePositiveRate(
        nsrlHashes.length
      ),
      benchmark: {
        lookups: BENCHMARK_LOOKUPS,
        duration,
        perLookup: duration / BENCHMARK_LOOKUPS,
        meetsTarget: duration < LOOKUP_TARGET_MS,
      },
    });
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || '';
      const list = text
        .split(/\r?\n/)
        .map((k) => k.trim())
        .filter(Boolean);
      setKeywords(list);
    };
    reader.readAsText(file);
  };

  const highlight = (text: string = '') => {
    let safe = escapeHtml(text);
    if (keywords.length === 0) return safe;
    keywords.forEach((k) => {
      const re = new RegExp(
        `(${k.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')})`,
        'gi'
      );
      safe = safe.replace(re, '<mark>$1</mark>');
    });
    return safe;
  };

  const matches = events.artifacts.filter((a) => {
    const artifact = a as any;
    const content = `${artifact.name} ${artifact.description} ${
      'user' in artifact ? artifact.user : ''
    }`.toLowerCase();
    return keywords.some((k) => content.includes(k.toLowerCase()));
  });

  const handleLookup = (event: React.FormEvent) => {
    event.preventDefault();
    const value = lookupHash.trim().toLowerCase();
    if (!value) {
      setLookupState('idle');
      setLookupResult(null);
      return;
    }

    const filter = filterRef.current;
    if (!filter) {
      return;
    }

    const isKnown = filter.has(value);
    const match = nsrlEntries.find(
      (entry) => entry.sha1 === value || entry.sha256 === value
    );

    if (match) {
      setLookupState('hit');
      setLookupResult(match);
    } else if (isKnown) {
      setLookupState('probable');
      setLookupResult(null);
    } else {
      setLookupState('miss');
      setLookupResult(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-ub-grey/80 rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">NSRL Hash Lookup</h3>
          {telemetry && (
            <span
              className={`text-xs font-mono ${
                telemetry.benchmark.meetsTarget
                  ? 'text-green-300'
                  : 'text-yellow-300'
              }`}
            >
              {telemetry.benchmark.duration.toFixed(2)} ms / {BENCHMARK_LOOKUPS}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-300">
          Paste a SHA-1 or SHA-256 hash to see if it appears in the simulated
          NSRL reference set. Bloom filter lookups run locally so false
          positives are possible but false negatives are not.
        </p>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleLookup}>
          <input
            className="flex-1 rounded border border-ub-grey-dark bg-black/40 p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="e.g. 99a06053205a3436542bfa61d19c557032a1d28c"
            value={lookupHash}
            onChange={(event) => setLookupHash(event.target.value)}
          />
          <button
            type="submit"
            className="rounded bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            Lookup
          </button>
        </form>
        {lookupState !== 'idle' && (
          <div
            className={`rounded border p-3 text-sm ${
              lookupState === 'hit'
                ? 'border-green-600 bg-green-900/30 text-green-200'
                : lookupState === 'probable'
                ? 'border-yellow-600 bg-yellow-900/30 text-yellow-200'
                : 'border-red-600 bg-red-900/30 text-red-200'
            }`}
          >
            {lookupState === 'hit' && lookupResult && (
              <div className="space-y-1">
                <p className="font-semibold">Known good file identified.</p>
                <div className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                  <span>
                    <strong>File:</strong> {lookupResult.fileName}
                  </span>
                  <span>
                    <strong>Product:</strong> {lookupResult.product}
                  </span>
                  <span>
                    <strong>Version:</strong> {lookupResult.version}
                  </span>
                  <span>
                    <strong>OS:</strong> {lookupResult.os}
                  </span>
                </div>
              </div>
            )}
            {lookupState === 'probable' && (
              <p>
                Bloom filter suggests a match, but the hash is not in the mock
                dataset. Treat as a potential false positive.
              </p>
            )}
            {lookupState === 'miss' && (
              <p>No match found in the mock NSRL dataset.</p>
            )}
          </div>
        )}
        {telemetry && (
          <div className="grid gap-2 rounded border border-ub-grey-dark p-3 text-xs text-gray-300 sm:grid-cols-2">
            <div>
              <strong>Hashes indexed:</strong> {telemetry.datasetSize}
            </div>
            <div>
              <strong>Bloom size:</strong> {telemetry.filterSize.toLocaleString()} bits
            </div>
            <div>
              <strong>Hash functions:</strong> {telemetry.hashCount}
            </div>
            <div>
              <strong>Inserted items:</strong> {telemetry.insertedItems}
            </div>
            <div className="sm:col-span-2">
              <strong>Estimated FPR:</strong>{' '}
              {(telemetry.estimatedFalsePositiveRate * 100).toFixed(2)}%
            </div>
            <div className="sm:col-span-2">
              <strong>Avg lookup:</strong>{' '}
              {telemetry.benchmark.perLookup.toFixed(4)} ms ({
                telemetry.benchmark.meetsTarget ? '✓' : '⚠'
              }{' '}
              target &lt; {LOOKUP_TARGET_MS} ms for {BENCHMARK_LOOKUPS} ops)
            </div>
          </div>
        )}
      </div>
      <div>
        <input
          type="file"
          accept=".txt"
          onChange={handleUpload}
          className="rounded border border-kali-border/60 bg-kali-dark p-2 text-kali-text focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus/80"
        />
      </div>
      {keywords.length > 0 && (
        <div className="text-sm">Loaded {keywords.length} keywords</div>
      )}
      <div className="grid gap-2 md:grid-cols-2">
        {matches.map((a, idx) => {
          const artifact = a as any;
          return (
            <div
              key={`${artifact.name}-${idx}`}
              className="rounded border border-kali-border/60 bg-kali-dark/80 p-2 text-sm text-kali-text"
            >
              <div
                className="font-bold"
                dangerouslySetInnerHTML={{ __html: highlight(artifact.name) }}
              />
              <div className="text-kali-text/60">{artifact.type}</div>
              {'user' in artifact && (
                <div
                  className="text-xs"
                  dangerouslySetInnerHTML={{
                    __html: `User: ${highlight(artifact.user)}`,
                  }}
                />
              )}
              <div
                className="text-xs"
                dangerouslySetInnerHTML={{ __html: highlight(artifact.description) }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default KeywordTester;

