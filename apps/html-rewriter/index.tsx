'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { diffLines, type Change } from 'diff';

interface Rule {
  selector: string;
  action: 'remove' | 'replace';
  value?: string;
}

interface EvaluationState {
  rewritten: string;
  diff: Change[];
  error: string | null;
}

type DiffRow = {
  before: string;
  after: string;
  type: 'added' | 'removed' | 'unchanged';
};

const DEFAULT_RULES: Rule[] = [
  { selector: 'script', action: 'remove' },
  { selector: 'h1', action: 'replace', value: 'Rewritten Title' },
];

const DEFAULT_HTML = `<h1>Hello</h1>\n<p>Sample <strong>content</strong>.</p>\n<script>alert("xss")</script>`;

const EVALUATION_DELAY = 400;

const serialize = (rules: Rule[]) => JSON.stringify(rules, null, 2);

const parseRules = (ruleSource: string): Rule[] => {
  const parsed = JSON.parse(ruleSource);
  if (!Array.isArray(parsed)) {
    throw new Error('Rules must be an array');
  }
  return parsed.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new Error('Each rule must be an object');
    }
    const { selector, action, value } = item as Partial<Rule> & Record<string, unknown>;
    if (typeof selector !== 'string' || selector.trim().length === 0) {
      throw new Error('Each rule requires a selector');
    }
    if (action !== 'remove' && action !== 'replace') {
      throw new Error('Action must be either "remove" or "replace"');
    }
    if (action === 'replace' && typeof value !== 'string') {
      throw new Error('Replace rules require a string "value"');
    }
    return {
      selector,
      action,
      value,
    } as Rule;
  });
};

const applyRules = (html: string, rules: Rule[]): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const rule of rules) {
    const elements = Array.from(doc.querySelectorAll(rule.selector));
    if (rule.action === 'remove') {
      elements.forEach((el) => el.remove());
    } else {
      elements.forEach((el) => {
        el.textContent = rule.value ?? '';
      });
    }
  }
  return doc.body.innerHTML;
};

const evaluate = (inputHtml: string, ruleSource: string): EvaluationState => {
  try {
    const rules = parseRules(ruleSource);
    const rewritten = applyRules(inputHtml, rules);
    return {
      rewritten,
      diff: diffLines(inputHtml, rewritten),
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to parse rules';
    return {
      rewritten: inputHtml,
      diff: diffLines(inputHtml, inputHtml),
      error: message,
    };
  }
};

const buildDiffRows = (changes: Change[]): DiffRow[] => {
  const rows: DiffRow[] = [];
  for (const change of changes) {
    const lines = change.value.split('\n');
    lines.forEach((line, index) => {
      // diffLines keeps a trailing empty string when the change ends with a newline.
      if (index === lines.length - 1 && line.length === 0) {
        return;
      }
      if (change.added) {
        rows.push({ before: '', after: line, type: 'added' });
      } else if (change.removed) {
        rows.push({ before: line, after: '', type: 'removed' });
      } else {
        rows.push({ before: line, after: line, type: 'unchanged' });
      }
    });
  }
  return rows;
};

const HtmlRewriterApp: React.FC = () => {
  const [ruleText, setRuleText] = useState(() => serialize(DEFAULT_RULES));
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [state, setState] = useState<EvaluationState>(() => evaluate(DEFAULT_HTML, serialize(DEFAULT_RULES)));
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const skipInitialEvaluation = useRef(true);

  const ruleInputId = useId();
  const htmlInputId = useId();

  useEffect(() => {
    if (skipInitialEvaluation.current) {
      skipInitialEvaluation.current = false;
      return;
    }

    setIsEvaluating(true);
    const timer = window.setTimeout(() => {
      setState(evaluate(html, ruleText));
      setIsEvaluating(false);
    }, EVALUATION_DELAY);

    return () => {
      window.clearTimeout(timer);
    };
  }, [html, ruleText]);

  const diffRows = useMemo(() => buildDiffRows(state.diff), [state.diff]);

  return (
    <div className="h-full w-full overflow-auto bg-gray-900 p-4 text-white space-y-4" data-testid="html-rewriter-app">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">HTML Rewriter</h1>
        <p className="text-sm text-gray-300">
          Provide HTML and a list of rewrite rules to see how the document changes. Evaluation is debounced to keep typing
          responsive.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col">
          <label className="mb-1 font-medium" htmlFor={ruleInputId}>
            Rewrite Rules (JSON)
          </label>
          <textarea
            id={ruleInputId}
            className="min-h-[200px] flex-1 rounded bg-gray-800 p-2 font-mono text-sm text-gray-100"
            spellCheck={false}
            value={ruleText}
            onChange={(event) => setRuleText(event.target.value)}
            aria-describedby={state.error ? `${ruleInputId}-error` : undefined}
          />
          {state.error && (
            <p id={`${ruleInputId}-error`} className="mt-2 text-sm text-red-400" role="alert">
              {state.error}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <label className="mb-1 font-medium" htmlFor={htmlInputId}>
            Sample HTML
          </label>
          <textarea
            id={htmlInputId}
            className="min-h-[200px] flex-1 rounded bg-gray-800 p-2 font-mono text-sm text-gray-100"
            spellCheck={false}
            value={html}
            onChange={(event) => setHtml(event.target.value)}
          />
        </div>
      </div>
      <section aria-live="polite" className="text-sm text-gray-300">
        {isEvaluating ? 'Updating preview…' : 'Preview is up to date.'}
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="text-xl mb-2">Original HTML</h2>
          <pre
            className="whitespace-pre-wrap rounded bg-gray-800 p-2 font-mono text-sm text-gray-100"
            data-testid="original-output"
          >
            {html}
          </pre>
        </div>
        <div>
          <h2 className="text-xl mb-2">Rewritten HTML</h2>
          <pre
            className="whitespace-pre-wrap rounded bg-gray-800 p-2 font-mono text-sm text-gray-100"
            data-testid="rewritten-output"
          >
            {state.rewritten}
          </pre>
        </div>
      </div>
      <div>
        <h2 className="text-xl mb-2">Diff</h2>
        <div className="overflow-auto rounded bg-gray-800" data-testid="diff-output">
          <table className="min-w-full text-left font-mono text-sm text-gray-100" data-testid="diff-table">
            <thead className="bg-gray-700 uppercase tracking-wide text-xs text-gray-300">
              <tr>
                <th className="px-3 py-2">Before</th>
                <th className="px-3 py-2">After</th>
              </tr>
            </thead>
            <tbody>
              {diffRows.length === 0 ? (
                <tr data-testid="diff-row" data-change-type="unchanged">
                  <td className="px-3 py-3 text-center text-gray-400" colSpan={2}>
                    No differences
                  </td>
                </tr>
              ) : (
                diffRows.map((row, index) => {
                  const highlightClass =
                    row.type === 'added'
                      ? 'bg-green-900/40'
                      : row.type === 'removed'
                      ? 'bg-red-900/40'
                      : 'bg-transparent';

                  return (
                    <tr
                      key={index}
                      data-testid="diff-row"
                      data-change-type={row.type}
                      className={`${highlightClass} border-b border-gray-700 last:border-b-0`}
                    >
                      <td data-testid="diff-before-cell" className="whitespace-pre-wrap px-3 py-2 align-top">
                        {row.before}
                      </td>
                      <td data-testid="diff-after-cell" className="whitespace-pre-wrap px-3 py-2 align-top">
                        {row.after}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <button
        className="mt-4 inline-flex items-center rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        onClick={() => setShowHelp(true)}
      >
        Quick help
      </button>
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg space-y-4 rounded bg-gray-900 p-6 text-left shadow-xl">
            <h2 className="text-xl font-semibold text-white">Rule syntax</h2>
            <p className="text-sm text-gray-200">
              Provide an array of rules. Each rule selects matching elements and either removes them or replaces their text
              content.
            </p>
            <pre className="rounded bg-gray-800 p-3 font-mono text-sm text-gray-100">{`[
  { "selector": "script", "action": "remove" },
  { "selector": "img", "action": "replace", "value": "[removed image]" }
]`}</pre>
            <button
              className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              onClick={() => setShowHelp(false)}
              autoFocus
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
