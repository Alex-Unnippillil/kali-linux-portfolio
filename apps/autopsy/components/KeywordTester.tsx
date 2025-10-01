'use client';

import React, { useMemo, useState } from 'react';
import events from '../events.json';
import {
  ensureLineageCollection,
  formatLineageSummary,
} from '../../../utils/lineage';

const escapeHtml = (str: string = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function KeywordTester() {
  const [keywords, setKeywords] = useState<string[]>([]);

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

  const artifacts = useMemo(
    () =>
      ensureLineageCollection(events.artifacts as any[], {
        source: 'Autopsy Keyword Tester Fixture',
        transforms: ['Loaded from events.json'],
        tags: ['autopsy', 'fixture'],
      }, {
        getExtraTags: (artifact: any) => {
          const tags: string[] = [];
          if (artifact.type) tags.push(`type:${artifact.type}`);
          if ('plugin' in artifact && artifact.plugin) {
            tags.push(`plugin:${artifact.plugin}`);
          }
          if ('user' in artifact && artifact.user) {
            tags.push(`user:${artifact.user}`);
          }
          return tags;
        },
      }),
    []
  );

  const matches = artifacts.filter((artifact) => {
    const content = `${artifact.name} ${artifact.description} ${
      'user' in artifact ? artifact.user : ''
    }`.toLowerCase();
    return keywords.some((k) => content.includes(k.toLowerCase()));
  });

  return (
    <div className="space-y-4">
      <div>
        <input
          type="file"
          accept=".txt"
          onChange={handleUpload}
          className="bg-ub-grey text-white p-2 rounded"
        />
      </div>
      {keywords.length > 0 && (
        <div className="text-sm">Loaded {keywords.length} keywords</div>
      )}
      <div className="grid gap-2 md:grid-cols-2">
        {matches.map((artifact, idx) => {
          const tags = Array.isArray(artifact.tags) ? artifact.tags : [];
          return (
            <div
              key={`${artifact.name}-${idx}`}
              className="p-2 bg-ub-grey rounded text-sm"
            >
              <div
                className="font-bold"
                dangerouslySetInnerHTML={{ __html: highlight(artifact.name) }}
              />
              <div className="text-gray-400">{artifact.type}</div>
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
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tags.map((tag: string) => (
                    <span
                      key={`${artifact.name}-${tag}`}
                      className="px-2 py-0.5 text-xs rounded bg-ub-cool-grey"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 text-xs text-gray-400">
                {formatLineageSummary(artifact.lineage)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default KeywordTester;

