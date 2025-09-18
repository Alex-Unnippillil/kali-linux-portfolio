'use client';

import React, { useEffect, useMemo, useState } from 'react';
import events from '../events.json';

type Artifact = {
  name: string;
  type: string;
  description: string;
  size?: number;
  plugin?: string;
  timestamp?: string;
  user?: string;
  [key: string]: unknown;
};

type KeywordTerm = {
  raw: string;
  normalized: string;
};

type KeywordGroup = KeywordTerm[];

type MatchedLine = {
  raw: string;
  highlighted: string;
};

type SearchResult = {
  artifact: Artifact;
  hitCount: number;
  matchedLines: MatchedLine[];
};

const escapeHtml = (str: string = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeRegExp = (value: string) =>
  value.replace(/[|\{}()[\]^$+*?.-]/g, '\$&');

const highlightText = (text: string, terms: KeywordTerm[]) => {
  const sanitized = escapeHtml(text);
  return terms.reduce((acc, term) => {
    if (!term.raw) return acc;
    const regex = new RegExp(`(${escapeRegExp(term.raw)})`, 'gi');
    return acc.replace(regex, '<mark>$1</mark>');
  }, sanitized);
};

const parseKeywordText = (text: string): KeywordGroup[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line
        .split(/[\t,;]+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .map((token) => ({ raw: token, normalized: token.toLowerCase() }))
    );

const getArtifactLines = (artifact: Artifact): string[] => {
  const lines: string[] = [
    `Name: ${artifact.name}`,
    `Type: ${artifact.type}`,
    `Description: ${artifact.description}`,
  ];

  if (artifact.user) {
    lines.push(`User: ${artifact.user}`);
  }

  if (artifact.plugin) {
    lines.push(`Plugin: ${artifact.plugin}`);
  }

  if (artifact.timestamp) {
    lines.push(`Timestamp: ${artifact.timestamp}`);
  }

  return lines;
};

const slugify = (value: string) =>
  value
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const artifacts: Artifact[] = Array.isArray(events.artifacts)
  ? (events.artifacts as Artifact[])
  : [];

function KeywordTester() {
  const [keywordGroups, setKeywordGroups] = useState<KeywordGroup[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);

  const allTerms = useMemo(
    () => keywordGroups.flatMap((group) => group),
    [keywordGroups]
  );

  const results = useMemo(() => {
    if (allTerms.length === 0) return [] as SearchResult[];

    return artifacts
      .map((artifact) => {
        const lines = getArtifactLines(artifact);
        let hitCount = 0;
        const matchedLines: MatchedLine[] = [];

        lines.forEach((line) => {
          const matchedTerms = new Map<string, KeywordTerm>();
          allTerms.forEach((term) => {
            if (!term.raw) return;
            const regex = new RegExp(escapeRegExp(term.raw), 'gi');
            const matches = line.match(regex);
            if (matches) {
              hitCount += matches.length;
              matchedTerms.set(term.raw, term);
            }
          });

          if (matchedTerms.size > 0) {
            matchedLines.push({
              raw: line,
              highlighted: highlightText(line, Array.from(matchedTerms.values())),
            });
          }
        });

        if (hitCount === 0) return null;

        return {
          artifact,
          hitCount,
          matchedLines,
        };
      })
      .filter((result): result is SearchResult => result !== null)
      .sort((a, b) => {
        if (b.hitCount !== a.hitCount) return b.hitCount - a.hitCount;
        return a.artifact.name.localeCompare(b.artifact.name);
      });
  }, [allTerms]);

  useEffect(() => {
    if (results.length === 0) {
      setSelectedArtifact(null);
      return;
    }

    if (!selectedArtifact) {
      setSelectedArtifact(results[0].artifact.name);
      return;
    }

    if (!results.some((result) => result.artifact.name === selectedArtifact)) {
      setSelectedArtifact(results[0].artifact.name);
    }
  }, [results, selectedArtifact]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || '';
      const parsed = parseKeywordText(text);
      setKeywordGroups(parsed);
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    if (results.length === 0) return;

    const lines = results.flatMap((result) =>
      result.matchedLines.map((line) => `${result.artifact.name}: ${line.raw}`)
    );

    if (lines.length === 0) return;

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'keyword-hits.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedResult = results.find(
    (result) => result.artifact.name === selectedArtifact
  );

  const listCount = keywordGroups.length;
  const termCount = allTerms.length;
  const totalHits = results.reduce((sum, result) => sum + result.hitCount, 0);

  const renderSummary = () => {
    if (listCount === 0) {
      return (
        <div className="text-xs text-gray-400">
          Upload a keyword text file to begin scanning the mock case artifacts.
        </div>
      );
    }

    return (
      <div className="text-xs text-gray-300" data-testid="keyword-summary">
        Loaded {listCount} {listCount === 1 ? 'list' : 'lists'} covering {termCount}{' '}
        {termCount === 1 ? 'term' : 'terms'} • {results.length}{' '}
        {results.length === 1 ? 'matched artifact' : 'matched artifacts'} ({totalHits}{' '}
        {totalHits === 1 ? 'total hit' : 'total hits'})
      </div>
    );
  };

  const renderResultList = () => {
    if (results.length === 0) {
      return (
        <div
          className="rounded border border-dashed border-ub-grey-light bg-black/30 p-4 text-sm text-gray-400"
          data-testid="results-empty"
        >
          {listCount === 0
            ? 'No keyword hits yet. Load a list to search the mock case artifacts.'
            : 'No hits found in the mock case artifacts.'}
        </div>
      );
    }

    return results.map((result) => {
      const isSelected = result.artifact.name === selectedArtifact;
      const slug = slugify(result.artifact.name);
      return (
        <button
          key={result.artifact.name}
          type="button"
          onClick={() => setSelectedArtifact(result.artifact.name)}
          data-testid={`artifact-result-${slug}`}
          className={`w-full rounded border p-3 text-left transition ${
            isSelected
              ? 'border-ub-orange bg-ub-grey'
              : 'border-transparent bg-black/40 hover:border-ub-grey-light'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">{result.artifact.name}</span>
            <span className="text-xs text-ub-orange">
              {result.hitCount} {result.hitCount === 1 ? 'hit' : 'hits'}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-300">
            {result.matchedLines[0]?.raw || 'Matched lines available'}
          </div>
        </button>
      );
    });
  };

  const renderPreview = () => {
    if (results.length === 0 || !selectedResult) {
      return (
        <div
          className="rounded border border-dashed border-ub-grey-light bg-black/30 p-6 text-sm text-gray-400"
          data-testid="preview-empty"
        >
          {listCount === 0
            ? 'Upload keywords to begin scanning the mock case artifacts.'
            : 'No artifacts matched your keyword lists. Try adjusting the terms.'}
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col gap-4 rounded border border-ub-grey-light bg-black/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-white">
              {selectedResult.artifact.name}
            </div>
            <div className="text-xs text-gray-300">
              {selectedResult.artifact.type}
              {selectedResult.artifact.plugin
                ? ` • Plugin: ${selectedResult.artifact.plugin}`
                : ''}
              {selectedResult.artifact.timestamp
                ? ` • Timestamp: ${selectedResult.artifact.timestamp}`
                : ''}
            </div>
          </div>
          <div className="rounded bg-ub-orange/20 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ub-orange">
            {selectedResult.hitCount} {selectedResult.hitCount === 1 ? 'hit' : 'hits'}
          </div>
        </div>
        <div className="space-y-2" data-testid="preview-content">
          {selectedResult.matchedLines.map((line, index) => (
            <div
              key={`${line.raw}-${index}`}
              className="rounded border border-ub-grey-light/50 bg-black/60 p-2 text-sm text-gray-200"
              dangerouslySetInnerHTML={{ __html: line.highlighted }}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold uppercase tracking-wide text-gray-300">
          Keyword List
        </label>
        <input
          type="file"
          accept=".txt"
          onChange={handleUpload}
          aria-label="Keyword list file"
          className="rounded bg-ub-grey px-3 py-2 text-sm text-white"
        />
        {results.length > 0 && (
          <button
            type="button"
            onClick={handleExport}
            className="rounded bg-ub-orange px-3 py-2 text-sm font-semibold text-black transition hover:bg-ub-orange/80"
            data-testid="export-button"
          >
            Export Hits
          </button>
        )}
      </div>
      {renderSummary()}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">{renderResultList()}</div>
        <div className="md:col-span-2">{renderPreview()}</div>
      </div>
    </div>
  );
}

export default KeywordTester;
