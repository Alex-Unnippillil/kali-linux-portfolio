'use client';

import React, { useState, useMemo } from 'react';
import { diffLines, type Change } from 'diff';

interface Rule {
  selector: string;
  action: 'remove' | 'replace';
  value?: string;
}

const DEFAULT_RULES: Rule[] = [
  { selector: 'script', action: 'remove' },
  { selector: 'h1', action: 'replace', value: 'Rewritten Title' },
];

const DEFAULT_HTML = `<h1>Hello</h1>\n<p>Sample <strong>content</strong>.</p>\n<script>alert("xss")</script>`;

const serialize = (rules: Rule[]) => JSON.stringify(rules, null, 2);

const applyRules = (html: string, rules: Rule[]): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const r of rules) {
    const els = Array.from(doc.querySelectorAll(r.selector));
    if (r.action === 'remove') {
      els.forEach((el) => el.remove());
    } else if (r.action === 'replace') {
      els.forEach((el) => {
        el.textContent = r.value || '';
      });
    }
  }
  return doc.body.innerHTML;
};

const HtmlRewriterApp: React.FC = () => {
  const [ruleText, setRuleText] = useState(serialize(DEFAULT_RULES));
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const { rewritten, diff } = useMemo(() => {
    try {
      const rules = JSON.parse(ruleText) as Rule[];
      setError(null);
      const rewritten = applyRules(html, rules);
      const diff = diffLines(html, rewritten);
      return { rewritten, diff };
    } catch (e: any) {
      setError(e.message);
      return { rewritten: html, diff: diffLines(html, html) };
    }
  }, [ruleText, html]);

  return (
    <div className="h-full w-full overflow-auto bg-gray-900 p-4 text-white space-y-4">
      <h1 className="text-2xl">HTML Rewriter</h1>
      <div className="flex gap-4 flex-col md:flex-row">
        <div className="flex-1 flex flex-col">
          <label className="mb-1">Rewrite Rules (JSON)</label>
          <textarea
            className="flex-1 p-2 rounded bg-gray-800 font-mono text-sm"
            value={ruleText}
            onChange={(e) => setRuleText(e.target.value)}
            aria-label="Rewrite rules JSON"
          />
          {error && <p className="text-red-400 mt-1">{error}</p>}
        </div>
        <div className="flex-1 flex flex-col">
          <label className="mb-1">Sample HTML</label>
          <textarea
            className="flex-1 p-2 rounded bg-gray-800 font-mono text-sm"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            aria-label="Sample HTML"
          />
        </div>
      </div>
      <div>
        <h2 className="text-xl mb-2">Diff</h2>
        <pre className="whitespace-pre-wrap bg-gray-800 p-2 rounded overflow-auto">
          {diff.map((part: Change, i: number) => (
            <span
              key={i}
              className={part.added ? 'bg-green-800' : part.removed ? 'bg-red-800 line-through' : ''}
            >
              {part.value}
            </span>
          ))}
        </pre>
      </div>
      <div>
        <h2 className="text-xl mb-2">Rewritten HTML</h2>
        <pre className="whitespace-pre-wrap bg-gray-800 p-2 rounded overflow-auto">{rewritten}</pre>
      </div>
      <button
        className="mt-4 px-4 py-2 bg-blue-600 rounded"
        onClick={() => setShowHelp(true)}
      >
        Help
      </button>
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4">
          <div className="bg-gray-900 p-4 rounded max-w-lg w-full text-left space-y-4">
            <h2 className="text-xl">Rewrite Rule Examples</h2>
            <p>Rules are objects with a CSS selector and an action.</p>
            <pre className="bg-gray-800 p-2 rounded">
{`[
  { "selector": "script", "action": "remove" },
  { "selector": "img", "action": "replace", "value": "[image]" }
]`}
            </pre>
            <button
              className="mt-2 px-4 py-2 bg-blue-600 rounded"
              onClick={() => setShowHelp(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HtmlRewriterApp;
