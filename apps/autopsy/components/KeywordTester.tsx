'use client';

import React, { useMemo, useState } from 'react';
import events from '../events.json';

type HighlightSnippet = {
  html: string;
  text: string;
};

type HighlightData = {
  html: string;
  text: string;
  count: number;
  snippets: HighlightSnippet[];
};

type ArtifactField = {
  key: string;
  label: string;
  value: string;
  highlight: HighlightData;
};

type ArtifactMatch = {
  artifact: Record<string, any>;
  nameField: ArtifactField;
  otherFields: ArtifactField[];
  totalHits: number;
};

const SNIPPET_CONTEXT = 40;

const escapeHtml = (str: string = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

const buildHighlightedHtml = (
  value: string,
  positions: { index: number; length: number }[]
) => {
  if (positions.length === 0) return escapeHtml(value);
  let result = '';
  let lastIndex = 0;
  positions.forEach((pos) => {
    result += escapeHtml(value.slice(lastIndex, pos.index));
    const matchText = value.slice(pos.index, pos.index + pos.length);
    result += `<mark>${escapeHtml(matchText)}</mark>`;
    lastIndex = pos.index + pos.length;
  });
  result += escapeHtml(value.slice(lastIndex));
  return result;
};

const buildHighlightedText = (
  value: string,
  positions: { index: number; length: number }[]
) => {
  if (positions.length === 0) return value;
  let result = '';
  let lastIndex = 0;
  positions.forEach((pos) => {
    result += value.slice(lastIndex, pos.index);
    const matchText = value.slice(pos.index, pos.index + pos.length);
    result += `**${matchText}**`;
    lastIndex = pos.index + pos.length;
  });
  result += value.slice(lastIndex);
  return result;
};

const getHighlightData = (
  value: string,
  keywords: string[],
  options: { skipSnippets?: boolean } = {}
): HighlightData => {
  const normalized = value ?? '';
  const sanitizedKeywords = keywords.filter((k) => k.trim().length > 0);

  if (normalized.length === 0) {
    return { html: '', text: '', count: 0, snippets: [] };
  }

  if (sanitizedKeywords.length === 0) {
    const escaped = escapeHtml(normalized);
    return { html: escaped, text: normalized, count: 0, snippets: [] };
  }

  const positions: { index: number; length: number }[] = [];

  sanitizedKeywords.forEach((keyword) => {
    const regex = new RegExp(escapeRegExp(keyword), 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(normalized)) !== null) {
      positions.push({ index: match.index, length: match[0].length });
      if (match[0].length === 0) {
        regex.lastIndex += 1;
      }
    }
  });

  positions.sort((a, b) => a.index - b.index);

  const highlightPositions: { index: number; length: number }[] = [];
  let cursor = 0;
  positions.forEach((pos) => {
    if (pos.index >= cursor) {
      highlightPositions.push(pos);
      cursor = pos.index + pos.length;
    }
  });

  const html = buildHighlightedHtml(normalized, highlightPositions);
  const text = buildHighlightedText(normalized, highlightPositions);
  const count = positions.length;

  if (options.skipSnippets) {
    return { html, text, count, snippets: [] };
  }

  const snippetMap = new Map<string, HighlightSnippet>();

  positions.forEach((pos) => {
    const start = Math.max(0, pos.index - SNIPPET_CONTEXT);
    const end = Math.min(normalized.length, pos.index + pos.length + SNIPPET_CONTEXT);
    const prefix = start > 0 ? '…' : '';
    const suffix = end < normalized.length ? '…' : '';
    const snippetRaw = `${prefix}${normalized.slice(start, end)}${suffix}`;

    if (!snippetMap.has(snippetRaw)) {
      const snippetHighlight = getHighlightData(snippetRaw, sanitizedKeywords, {
        skipSnippets: true,
      });
      snippetMap.set(snippetRaw, {
        html: snippetHighlight.html,
        text: snippetHighlight.text,
      });
    }
  });

  return { html, text, count, snippets: Array.from(snippetMap.values()) };
};

const escapeCsvValue = (value: string | number) => {
  const stringValue = `${value}`;
  const escaped = stringValue.replace(/"/g, '""');
  return /[",\n]/.test(stringValue) ? `"${escaped}"` : escaped;
};

const KeywordTester = () => {
  const [keywords, setKeywords] = useState<string[]>([]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || '';
      const list = Array.from(
        new Set(
          text
            .split(/\r?\n/)
            .map((k) => k.trim())
            .filter(Boolean)
        )
      );
      setKeywords(list);
    };
    reader.readAsText(file);
  };

  const matches = useMemo<ArtifactMatch[]>(() => {
    if (keywords.length === 0) return [];

    return (events.artifacts as Record<string, any>[])
      .map((artifact) => {
        const nameField: ArtifactField = {
          key: 'name',
          label: 'Name',
          value: artifact.name ?? '',
          highlight: getHighlightData(artifact.name ?? '', keywords),
        };

        const fieldCandidates: ArtifactField[] = [
          {
            key: 'description',
            label: 'Description',
            value: artifact.description ?? '',
            highlight: getHighlightData(artifact.description ?? '', keywords),
          },
        ];

        if ('user' in artifact && artifact.user) {
          fieldCandidates.push({
            key: 'user',
            label: 'User',
            value: artifact.user,
            highlight: getHighlightData(artifact.user, keywords),
          });
        }

        const otherFields = fieldCandidates.filter(
          (field) => field.highlight.count > 0
        );

        const totalHits =
          nameField.highlight.count +
          fieldCandidates.reduce((sum, field) => sum + field.highlight.count, 0);

        if (totalHits === 0) return null;

        return {
          artifact,
          nameField,
          otherFields,
          totalHits,
        };
      })
      .filter(Boolean) as ArtifactMatch[];
  }, [keywords]);

  const totalHits = useMemo(
    () => matches.reduce((sum, match) => sum + match.totalHits, 0),
    [matches]
  );

  const hasKeywords = keywords.length > 0;
  const hasMatches = matches.length > 0;

  const buildTxtExport = () => {
    const lines: string[] = [];
    const timestamp = new Date().toISOString();
    lines.push('Keyword hits export');
    lines.push(`Generated: ${timestamp}`);
    lines.push(`Total hits: ${totalHits}`);
    lines.push(`Files with hits: ${matches.length}`);
    lines.push('');

    matches.forEach((match) => {
      const fileName = match.artifact.name ?? 'Unknown artifact';
      lines.push(`${fileName} — ${match.totalHits} hit${match.totalHits === 1 ? '' : 's'}`);

      if (match.nameField.highlight.count > 0) {
        const segments =
          match.nameField.highlight.snippets.length > 0
            ? match.nameField.highlight.snippets
            : [
                {
                  html: match.nameField.highlight.html,
                  text: match.nameField.highlight.text,
                },
              ];
        segments.forEach((snippet) => {
          lines.push(`  [Name] ${snippet.text}`);
        });
      }

      match.otherFields.forEach((field) => {
        const segments =
          field.highlight.snippets.length > 0
            ? field.highlight.snippets
            : [
                {
                  html: field.highlight.html,
                  text: field.highlight.text,
                },
              ];
        segments.forEach((snippet) => {
          lines.push(`  [${field.label}] ${snippet.text}`);
        });
      });

      lines.push('');
    });

    return lines.join('\n');
  };

  const buildCsvExport = () => {
    const rows: string[] = [];
    rows.push('File,Field,Snippet,Hits');

    matches.forEach((match) => {
      const fileName = match.artifact.name ?? 'Unknown artifact';

      const pushRow = (label: string, snippetText: string, hits: number) => {
        rows.push(
          [
            escapeCsvValue(fileName),
            escapeCsvValue(label),
            escapeCsvValue(snippetText),
            escapeCsvValue(hits),
          ].join(',')
        );
      };

      if (match.nameField.highlight.count > 0) {
        const segments =
          match.nameField.highlight.snippets.length > 0
            ? match.nameField.highlight.snippets
            : [
                {
                  html: match.nameField.highlight.html,
                  text: match.nameField.highlight.text,
                },
              ];
        segments.forEach((snippet) => {
          pushRow('Name', snippet.text, match.nameField.highlight.count);
        });
      }

      match.otherFields.forEach((field) => {
        const segments =
          field.highlight.snippets.length > 0
            ? field.highlight.snippets
            : [
                {
                  html: field.highlight.html,
                  text: field.highlight.text,
                },
              ];
        segments.forEach((snippet) => {
          pushRow(field.label, snippet.text, field.highlight.count);
        });
      });
    });

    return rows.join('\n');
  };

  const triggerDownload = (content: string, mime: string, extension: string) => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `keyword-hits-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportMatches = (format: 'txt' | 'csv') => {
    if (!hasMatches) return;
    if (format === 'txt') {
      triggerDownload(buildTxtExport(), 'text/plain', 'txt');
    } else {
      triggerDownload(buildCsvExport(), 'text/csv', 'csv');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="keyword-upload"
          className="mb-2 block text-sm font-medium text-gray-200"
        >
          Keyword list
        </label>
        <input
          id="keyword-upload"
          type="file"
          accept=".txt"
          onChange={handleUpload}
          className="bg-ub-grey text-white file:mr-3 file:rounded file:border-0 file:bg-ub-cool file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
      </div>

      {hasKeywords && (
        <div className="space-y-2 rounded bg-ub-grey/60 p-3 text-sm text-gray-200">
          <div>Loaded {keywords.length} keyword{keywords.length === 1 ? '' : 's'}</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => exportMatches('txt')}
              className="rounded bg-ub-cool px-3 py-1 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!hasMatches}
            >
              Export TXT
            </button>
            <button
              type="button"
              onClick={() => exportMatches('csv')}
              className="rounded bg-ub-cool px-3 py-1 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!hasMatches}
            >
              Export CSV
            </button>
          </div>
          <div className="text-xs text-gray-300">
            {hasMatches ? (
              <>Found {totalHits} hit{totalHits === 1 ? '' : 's'} across {matches.length} file{matches.length === 1 ? '' : 's'}.</>
            ) : (
              <>No matches found in the available artifacts.</>
            )}
          </div>
        </div>
      )}

      {hasMatches && (
        <div className="grid gap-3 md:grid-cols-2">
          {matches.map((match, idx) => {
            const { artifact, nameField, otherFields, totalHits: hits } = match;
            return (
              <div key={`${artifact.name}-${idx}`} className="rounded bg-ub-grey p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="font-bold"
                    dangerouslySetInnerHTML={{
                      __html:
                        nameField.highlight.count > 0
                          ? nameField.highlight.html
                          : escapeHtml(nameField.value),
                    }}
                  />
                  <span className="text-xs text-gray-300">
                    {hits} hit{hits === 1 ? '' : 's'}
                  </span>
                </div>
                {artifact.type && (
                  <div className="text-xs text-gray-400">{artifact.type}</div>
                )}
                <div className="mt-3 space-y-3 text-xs text-gray-200">
                  {nameField.highlight.count > 0 && nameField.highlight.snippets.length > 0 && (
                    <div>
                      <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-400">
                        Name snippet
                      </div>
                      <ul className="ml-4 list-disc space-y-1">
                        {nameField.highlight.snippets.map((snippet, snippetIdx) => (
                          <li
                            key={`name-${snippetIdx}`}
                            dangerouslySetInnerHTML={{ __html: snippet.html }}
                          />
                        ))}
                      </ul>
                    </div>
                  )}

                  {otherFields.map((field) => (
                    <div key={`${artifact.name}-${field.key}`}>
                      <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-400">
                        {field.label}
                      </div>
                      {field.highlight.snippets.length > 0 ? (
                        <ul className="ml-4 list-disc space-y-1">
                          {field.highlight.snippets.map((snippet, snippetIdx) => (
                            <li
                              key={`${field.key}-${snippetIdx}`}
                              dangerouslySetInnerHTML={{ __html: snippet.html }}
                            />
                          ))}
                        </ul>
                      ) : (
                        <div
                          dangerouslySetInnerHTML={{ __html: field.highlight.html }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KeywordTester;
