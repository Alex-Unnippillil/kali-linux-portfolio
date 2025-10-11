'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { diffLines, type Change } from 'diff';
import {
  applyRewriteRules,
  serializeRules,
  type RewriteRule,
} from './transformer';

type RewriteRequest = {
  html: string;
  rules: RewriteRule[];
};

interface DemoPreset {
  id: string;
  label: string;
  description: string;
  rules: RewriteRule[];
}

const DEFAULT_HTML = `<h1>Hello</h1>\n<p>Sample <strong>content</strong> with an <a href="https://example.com" target="_blank">external link</a>.</p>\n<script>alert("xss")</script>`;

const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'removeScripts',
    label: 'Strip <script> tags',
    description: 'Removes potentially unsafe inline scripts from the markup.',
    rules: [
      {
        type: 'remove',
        selector: 'script',
        note: 'Script stripping.',
      },
    ],
  },
  {
    id: 'replaceHeading',
    label: 'Replace main heading text',
    description: 'Rewrites the first level heading to show deterministic output.',
    rules: [
      {
        type: 'replaceText',
        selector: 'h1',
        value: 'Rewritten Title',
        note: 'Heading replacement.',
      },
    ],
  },
  {
    id: 'secureLinks',
    label: 'Add rel="noopener" to external links',
    description:
      'Ensures anchors that open new tabs include rel attributes to prevent tab-nabbing.',
    rules: [
      {
        type: 'setAttribute',
        selector: 'a[target="_blank"]',
        attribute: 'rel',
        value: 'noopener noreferrer',
        note: 'Link hardening.',
      },
    ],
  },
  {
    id: 'stripDataAttributes',
    label: 'Remove data-tracking attributes',
    description: 'Cleans data-* tracking attributes from analytics spans.',
    rules: [
      {
        type: 'removeAttribute',
        selector: '[data-analytics], [data-tracking]',
        attribute: 'data-analytics',
        note: 'Analytics attribute cleanup.',
      },
      {
        type: 'removeAttribute',
        selector: '[data-analytics], [data-tracking]',
        attribute: 'data-tracking',
        note: 'Tracking attribute cleanup.',
      },
    ],
  },
];

const DEFAULT_CUSTOM_RULES = `[]`;

const HtmlRewriterApp: React.FC = () => {
  const workerRef = useRef<Worker | null>(null);
  const lastRequestRef = useRef<RewriteRequest | null>(null);
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([
    'removeScripts',
    'replaceHeading',
    'secureLinks',
  ]);
  const [customRulesText, setCustomRulesText] = useState(DEFAULT_CUSTOM_RULES);
  const [customRuleError, setCustomRuleError] = useState<string | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [diff, setDiff] = useState<Change[]>(diffLines(DEFAULT_HTML, DEFAULT_HTML));
  const [rewritten, setRewritten] = useState(DEFAULT_HTML);
  const [messages, setMessages] = useState<string[]>([]);
  const [appliedCount, setAppliedCount] = useState(0);
  const [runtimeMs, setRuntimeMs] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const runLocally = useCallback((request: RewriteRequest) => {
    const summary = applyRewriteRules(request.html, request.rules);
    setRewritten(summary.html);
    setDiff(diffLines(request.html, summary.html));
    setMessages(summary.messages);
    setAppliedCount(summary.appliedCount);
    setRuntimeMs(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (typeof Worker !== 'function') {
      setWorkerError('Web Workers are unavailable. Falling back to main-thread rewriting.');
      return;
    }

    const worker = new Worker(new URL('./rewrite.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<any>) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'result') {
        setWorkerError(null);
        setRewritten(data.rewrittenHtml);
        setDiff(diffLines(data.originalHtml, data.rewrittenHtml));
        setMessages(data.messages ?? []);
        setAppliedCount(data.appliedCount ?? 0);
        setRuntimeMs(typeof data.runtimeMs === 'number' ? data.runtimeMs : null);
      } else if (data.type === 'error') {
        setWorkerError(data.message || 'Worker failed to apply transformations.');
        if (lastRequestRef.current) {
          runLocally(lastRequestRef.current);
        }
      }
    };

    worker.onerror = (err) => {
      setWorkerError(err.message || 'Worker crashed during rewrite.');
      if (lastRequestRef.current) {
        runLocally(lastRequestRef.current);
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [runLocally]);

  const computation = useMemo(() => {
    const activeRules = DEMO_PRESETS.filter((preset) =>
      selectedPresets.includes(preset.id),
    ).flatMap((preset) => preset.rules);

    const trimmed = customRulesText.trim();
    if (!trimmed) {
      return {
        rules: activeRules,
        serializedRules: serializeRules(activeRules),
        parseError: null,
      };
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        throw new Error('Custom rules must be an array of rule objects.');
      }
      const merged = [...activeRules, ...(parsed as RewriteRule[])];
      return {
        rules: merged,
        serializedRules: serializeRules(merged),
        parseError: null,
      };
    } catch (error: any) {
      const message = error?.message ? String(error.message) : 'Invalid rule JSON.';
      return {
        rules: activeRules,
        serializedRules: serializeRules(activeRules),
        parseError: message,
      };
    }
  }, [customRulesText, selectedPresets]);

  const { rules, serializedRules, parseError } = computation;

  useEffect(() => {
    setCustomRuleError(parseError);
  }, [parseError]);

  useEffect(() => {
    const request: RewriteRequest = {
      html,
      rules,
    };
    lastRequestRef.current = request;

    if (workerRef.current) {
      workerRef.current.postMessage(request);
    } else {
      runLocally(request);
    }
  }, [html, rules, runLocally]);

  const togglePreset = (id: string) => {
    setSelectedPresets((prev) =>
      prev.includes(id) ? prev.filter((presetId) => presetId !== id) : [...prev, id],
    );
  };

  return (
    <div className="h-full w-full overflow-auto bg-gray-900 p-4 text-white space-y-4">
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <h1 className="text-2xl">HTML Rewriter</h1>
        <div className="space-y-1 text-sm text-gray-300 max-w-md">
          <p>
            Run sandboxed HTML transformations in a dedicated worker. Combine the
            presets below or add custom JSON rules to explore text and attribute
            rewrites without touching the live DOM.
          </p>
          {workerError && (
            <p className="text-amber-300">
              Worker note: {workerError}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-3 bg-gray-800/60 rounded border border-gray-800 p-4">
          <h2 className="text-xl">Transformation presets</h2>
          <p className="text-sm text-gray-300">
            Toggle presets to build a transformation pipeline. Presets run in the
            order shown and their selectors are scoped to the sandboxed document.
          </p>
          <div className="space-y-3">
            {DEMO_PRESETS.map((preset) => {
              const checkboxId = `html-rewriter-preset-${preset.id}`;
              return (
                <div
                  key={preset.id}
                  className="flex items-start gap-3 rounded border border-gray-800 bg-gray-900/70 p-3 hover:border-gray-700 transition"
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800"
                    checked={selectedPresets.includes(preset.id)}
                    onChange={() => togglePreset(preset.id)}
                    aria-labelledby={`${checkboxId}-label`}
                  />
                  <label id={`${checkboxId}-label`} htmlFor={checkboxId} className="cursor-pointer">
                    <span className="font-semibold">{preset.label}</span>
                    <span className="block text-sm text-gray-300">{preset.description}</span>
                  </label>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold" htmlFor="html-rewriter-custom-rules">
              Custom rules (JSON array)
            </label>
          <textarea
            id="html-rewriter-custom-rules"
            className="h-32 w-full rounded bg-gray-800 p-2 font-mono text-sm"
            value={customRulesText}
            onChange={(event) => setCustomRulesText(event.target.value)}
            placeholder='[{"type":"replaceText","selector":"p","value":"Example"}]'
            aria-invalid={Boolean(customRuleError)}
            aria-label="Custom HTML rewrite rules"
          />
            {customRuleError ? (
              <p className="text-sm text-red-400" role="alert">
                {customRuleError}
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                Each rule is executed inside the worker sandbox. Unsupported
                properties are ignored.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold">Combined rule preview</span>
            <pre className="max-h-48 overflow-auto rounded bg-gray-800 p-2 text-xs text-gray-100">
              {serializedRules}
            </pre>
          </div>
        </section>

        <section className="flex flex-col gap-3 bg-gray-800/60 rounded border border-gray-800 p-4">
          <label className="font-semibold" htmlFor="html-rewriter-sample">
            Sample HTML input
          </label>
          <textarea
            id="html-rewriter-sample"
            className="min-h-[220px] flex-1 rounded bg-gray-800 p-2 font-mono text-sm"
            value={html}
            onChange={(event) => setHtml(event.target.value)}
            aria-label="Sample HTML"
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <span className="block text-xs uppercase text-gray-400">Applied</span>
              <span className="text-lg font-semibold">{appliedCount}</span>
            </div>
            <div>
              <span className="block text-xs uppercase text-gray-400">Runtime</span>
              <span className="text-lg font-semibold">
                {runtimeMs !== null ? `${runtimeMs} ms` : 'main thread'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold">Execution log</span>
            <ul className="space-y-1 rounded bg-gray-800 p-2 text-sm">
              {messages.length === 0 ? (
                <li className="text-gray-400">No rules executed yet.</li>
              ) : (
                messages.map((message, index) => (
                  <li key={index} className="text-gray-200">
                    {message}
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl">Diff preview</h2>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold"
            onClick={() => setShowHelp(true)}
          >
            Worker constraints
          </button>
        </div>
        <pre className="whitespace-pre-wrap rounded bg-gray-800 p-2 text-sm">
          {diff.map((part: Change, index: number) => (
            <span
              key={index}
              className={
                part.added
                  ? 'bg-green-800/70'
                  : part.removed
                  ? 'bg-red-900/60 line-through'
                  : ''
              }
            >
              {part.value}
            </span>
          ))}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl">Rewritten HTML</h2>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-gray-800 p-2 text-sm">
          {rewritten}
        </pre>
      </section>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xl space-y-4 rounded bg-gray-900 p-5 text-left text-sm">
            <h2 className="text-xl font-semibold">Worker sandbox limitations</h2>
            <ul className="list-disc space-y-2 pl-5 text-gray-200">
              <li>
                The worker operates on serialized HTML only – it never mutates the
                live document or executes inline scripts.
              </li>
              <li>
                Only structural edits covered by the presets (remove, replaceText,
                setAttribute, removeAttribute) are supported. Custom rules must use
                the same shape.
              </li>
              <li>
                Network access, cookies, and DOM APIs that require the main thread
                (like layout or styles) are unavailable inside the sandbox.
              </li>
              <li>
                Large payloads may be truncated to keep worker memory usage in
                check. Prefer targeted snippets when experimenting.
              </li>
            </ul>
            <button
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold"
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
