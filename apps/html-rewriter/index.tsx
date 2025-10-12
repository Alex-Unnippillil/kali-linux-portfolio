'use client';

import React, { useState, useMemo, useId } from 'react';
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

type HelpTab = 'selectors' | 'actions' | 'payloads';

const HELP_TABS: ReadonlyArray<{ id: HelpTab; label: string }> = [
  { id: 'selectors', label: 'Selectors' },
  { id: 'actions', label: 'Actions' },
  { id: 'payloads', label: 'Sample payloads' },
];

const SAMPLE_PAYLOAD = `[
  { "selector": "script", "action": "remove" },
  { "selector": "img", "action": "replace", "value": "[image removed]" }
]`;

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
  const [activeHelpTab, setActiveHelpTab] = useState<HelpTab>('selectors');
  const modalTitleId = useId();
  const modalDescriptionId = useId();

  const quickStartOutput = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return applyRules(DEFAULT_HTML, DEFAULT_RULES);
  }, []);

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
    <div className="h-full w-full overflow-auto bg-gray-950 p-6 text-white space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">HTML Rewriter</h1>
          <p className="text-sm text-gray-300 max-w-3xl">
            Transform markup with CSS selectors and simple rule actions. Edit the rule JSON and
            watch the rewritten output update instantly.
          </p>
        </div>
        <button
          type="button"
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-700 bg-gray-900 text-xl text-blue-300 transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Open rewrite help"
          title="Open rewrite help"
          onClick={() => {
            setActiveHelpTab('selectors');
            setShowHelp(true);
          }}
        >
          <span aria-hidden="true">❓</span>
        </button>
      </div>
      <section className="space-y-4 rounded-lg border border-gray-800 bg-gray-900 p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-gray-100">Quick start</h2>
        <p className="text-sm text-gray-300 max-w-3xl">
          Try the default rules below to remove inline scripts and overwrite headings before
          experimenting with your own selectors.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-200">Rules</h3>
            <pre className="mt-2 whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-950 p-3 text-xs shadow-inner">{serialize(DEFAULT_RULES)}</pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-200">Original HTML</h3>
            <pre className="mt-2 whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-950 p-3 text-xs shadow-inner">{DEFAULT_HTML}</pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-200">Rewritten HTML</h3>
            <pre className="mt-2 whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-950 p-3 text-xs shadow-inner">{quickStartOutput}</pre>
          </div>
        </div>
      </section>
      <section className="space-y-3">
        <details className="rounded-lg border border-gray-800 bg-gray-900/80 p-4 shadow">
          <summary className="cursor-pointer text-sm font-semibold text-gray-100">
            Remove elements
          </summary>
          <div className="mt-2 space-y-2 text-sm text-gray-300">
            <p>
              Use the <code className="rounded bg-gray-950 px-1 py-0.5 text-gray-100">remove</code> action to strip matching nodes
              from the document entirely.
            </p>
            <pre className="whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-950 p-3 text-xs shadow-inner">{`{
  "selector": "script",
  "action": "remove"
}`}</pre>
          </div>
        </details>
        <details className="rounded-lg border border-gray-800 bg-gray-900/80 p-4 shadow">
          <summary className="cursor-pointer text-sm font-semibold text-gray-100">
            Replace text content
          </summary>
          <div className="mt-2 space-y-2 text-sm text-gray-300">
            <p>
              Swap the text content of the selected elements by providing a <code className="rounded bg-gray-950 px-1 py-0.5 text-gray-100">value</code>
              alongside the <code className="rounded bg-gray-950 px-1 py-0.5 text-gray-100">replace</code> action.
            </p>
            <pre className="whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-950 p-3 text-xs shadow-inner">{`{
  "selector": "h1",
  "action": "replace",
  "value": "Rewritten Title"
}`}</pre>
          </div>
        </details>
      </section>
      <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col rounded-lg border border-gray-800 bg-gray-900/80 p-4 shadow-lg">
            <label className="mb-2 text-sm font-semibold text-gray-200" htmlFor="html-rewriter-rules">
              Rewrite Rules (JSON)
            </label>
            <textarea
              id="html-rewriter-rules"
              className="flex-1 resize-y rounded-md border border-gray-700 bg-gray-950 p-3 font-mono text-sm text-gray-100 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={ruleText}
              onChange={(e) => setRuleText(e.target.value)}
              aria-label="Rewrite rules in JSON"
            />
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          </div>
          <div className="flex flex-col rounded-lg border border-gray-800 bg-gray-900/80 p-4 shadow-lg">
            <label className="mb-2 text-sm font-semibold text-gray-200" htmlFor="html-rewriter-sample">
              Sample HTML
            </label>
            <textarea
              id="html-rewriter-sample"
              className="flex-1 resize-y rounded-md border border-gray-700 bg-gray-950 p-3 font-mono text-sm text-gray-100 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              aria-label="Sample HTML"
            />
        </div>
      </div>
      <div className="space-y-3 rounded-lg border border-gray-800 bg-gray-900/80 p-4 shadow-lg">
        <h2 className="text-lg font-semibold text-gray-100">Diff</h2>
        <pre className="whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-950 p-3 text-sm leading-relaxed text-gray-100 shadow-inner overflow-auto">
          {diff.map((part: Change, i: number) => (
            <span
              key={i}
              className={
                part.added
                  ? 'rounded-sm bg-green-900/80 px-1 text-green-100'
                  : part.removed
                  ? 'rounded-sm bg-red-900/70 px-1 text-red-100 line-through'
                  : 'text-gray-200'
              }
            >
              {part.value}
            </span>
          ))}
        </pre>
      </div>
      <div className="space-y-3 rounded-lg border border-gray-800 bg-gray-900/80 p-4 shadow-lg">
        <h2 className="text-lg font-semibold text-gray-100">Rewritten HTML</h2>
        <pre className="whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-950 p-3 text-sm text-gray-100 shadow-inner overflow-auto">{rewritten}</pre>
      </div>
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4"
          role="presentation"
          onClick={() => setShowHelp(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            aria-describedby={modalDescriptionId}
            className="relative w-full max-w-2xl space-y-4 rounded border border-gray-700 bg-gray-900 p-6 text-left text-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={modalTitleId} className="text-xl font-semibold">
                  HTML Rewriter help
                </h2>
                <p id={modalDescriptionId} className="text-sm text-gray-300">
                  Learn which selectors and actions are supported, plus copy a ready-to-use rule set.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close help"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-lg text-gray-200 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setShowHelp(false)}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <div role="tablist" aria-label="Help topics" className="flex flex-wrap gap-2">
              {HELP_TABS.map((tab) => {
                const tabButtonId = `html-rewriter-help-tab-${tab.id}`;
                const tabPanelId = `html-rewriter-help-panel-${tab.id}`;
                const isActive = activeHelpTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={tabButtonId}
                    role="tab"
                    aria-controls={tabPanelId}
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    className={`rounded px-4 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                    }`}
                    onClick={() => setActiveHelpTab(tab.id)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-4 shadow-inner" role="tabpanel" id={`html-rewriter-help-panel-${activeHelpTab}`}
              aria-labelledby={`html-rewriter-help-tab-${activeHelpTab}`}>
              {activeHelpTab === 'selectors' && (
                <div className="space-y-2 text-sm text-gray-300">
                  <p>
                    Target elements with any valid CSS selector. Combine class, id, or attribute selectors
                    to focus the rewrite.
                  </p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li><code className="rounded bg-gray-950 px-1 py-0.5 text-gray-100">p</code> selects every paragraph element.</li>
                    <li>
                      <code className="rounded bg-gray-950 px-1 py-0.5 text-gray-100">main {'>'} h2</code> scopes to headings in the main area.
                    </li>
                    <li>
                      <code className="rounded bg-gray-950 px-1 py-0.5 text-gray-100">[data-track=&quot;outbound&quot;]</code> matches links tagged for tracking.
                    </li>
                  </ul>
                </div>
              )}
              {activeHelpTab === 'actions' && (
                <div className="space-y-3 text-sm text-gray-300">
                  <div>
                    <h3 className="text-base font-semibold text-gray-100">remove</h3>
                    <p>Delete the matched node entirely. Useful for scripts, ads, or injected banners.</p>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-100">replace</h3>
                    <p>
                      Swap the text content of the target. Provide a <code className="rounded bg-gray-950 px-1 py-0.5 text-gray-100">value</code> string
                      to use as the replacement.
                    </p>
                  </div>
                </div>
              )}
              {activeHelpTab === 'payloads' && (
                <div className="space-y-3 text-sm text-gray-300">
                  <p>Copy these starter rules to clean risky markup and annotate media placeholders.</p>
                  <pre className="whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-950 p-3 text-xs shadow-inner">{SAMPLE_PAYLOAD}</pre>
                  <p>
                    Paste the JSON into the rule editor and adjust selectors or values to match your source HTML.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HtmlRewriterApp;
