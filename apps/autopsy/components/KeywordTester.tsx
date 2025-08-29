'use client';

import React, { useState } from 'react';
import events from '../events.json';
import { Artifact } from '../types';

const escapeHtml = (str: string = '') =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // eslint-disable-next-line no-useless-escape
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

  const matches: Artifact[] = (events.artifacts as Artifact[]).filter((a) => {
    const userPart = 'user' in a ? (a as any).user : '';
    const content = `${a.name} ${a.description} ${userPart}`.toLowerCase();
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
        {matches.map((a, idx) => (
          <div
            key={`${a.name}-${idx}`}
            className="p-2 bg-ub-grey rounded text-sm"
          >
            <div
              className="font-bold"
              dangerouslySetInnerHTML={{ __html: highlight(a.name) }}
            />
            <div className="text-gray-400">{a.type}</div>
            {'user' in a && (
              <div
                className="text-xs"
                dangerouslySetInnerHTML={{
                  __html: `User: ${highlight((a as any).user)}`,
                }}
              />
            )}
            <div
              className="text-xs"
              dangerouslySetInnerHTML={{ __html: highlight(a.description) }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default KeywordTester;

