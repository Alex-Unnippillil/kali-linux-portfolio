'use client';

import React, { useState } from 'react';
import events from '../events.json';
import { trustedHtml } from '../../../utils/security/trusted-types';

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

  const matches = events.artifacts.filter((a) => {
    const artifact = a as any;
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
          className="rounded border border-kali-border/60 bg-kali-dark p-2 text-kali-text focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus/80"
          aria-label="Upload keyword list"
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
                dangerouslySetInnerHTML={trustedHtml(highlight(artifact.name))}
              />
              <div className="text-kali-text/60">{artifact.type}</div>
              {'user' in artifact && (
                <div
                  className="text-xs"
                  dangerouslySetInnerHTML={trustedHtml(
                    `User: ${highlight(artifact.user)}`
                  )}
                />
              )}
              <div
                className="text-xs"
                dangerouslySetInnerHTML={trustedHtml(highlight(artifact.description))}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default KeywordTester;

