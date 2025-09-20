'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { diffLines, type Change } from 'diff';
import PasteOptionsMenu from '../../components/ui/PasteOptionsMenu';
import { useSettings } from '../../hooks/useSettings';
import {
  sanitizeClipboardText,
  summarizeSanitization,
  loadTrackingParameterLists,
  PASTE_MODE_METADATA,
  type PasteMode,
} from '../../utils/clipboard/sanitize';

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
  const { pasteMode, setPasteMode } = useSettings();
  const [ruleText, setRuleText] = useState(serialize(DEFAULT_RULES));
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const ruleAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const htmlAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const rulesMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const htmlMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [activeMenu, setActiveMenu] = useState<'rules' | 'html' | null>(null);
  const [undoInfo, setUndoInfo] = useState<{
    field: 'rules' | 'html';
    previous: string;
    message: string;
  } | null>(null);

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

  const applySanitizedPaste = useCallback(
    (target: 'rules' | 'html', mode: PasteMode, source: string, htmlSource?: string) => {
      const textarea = target === 'rules' ? ruleAreaRef.current : htmlAreaRef.current;
      if (!textarea) return;
      const selectionStart = textarea.selectionStart ?? textarea.value.length;
      const selectionEnd = textarea.selectionEnd ?? selectionStart;
      const before = textarea.value.slice(0, selectionStart);
      const after = textarea.value.slice(selectionEnd);
      const previous = textarea.value;
      const result = sanitizeClipboardText(source, mode, {
        trackingParameters: loadTrackingParameterLists(),
        html: htmlSource,
      });
      const next = `${before}${result.sanitized}${after}`;
      if (target === 'rules') setRuleText(next);
      else setHtml(next);
      textarea.value = next;
      const caret = selectionStart + result.sanitized.length;
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = caret;
        textarea.focus();
      });
      const summary = summarizeSanitization(result);
      if (summary) setUndoInfo({ field: target, previous, message: summary });
      else setUndoInfo(null);
    },
    [setRuleText, setHtml],
  );

  const handlePaste = useCallback(
    (target: 'rules' | 'html') =>
      (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        event.preventDefault();
        const plain = event.clipboardData.getData('text/plain');
        const htmlData = event.clipboardData.getData('text/html') || undefined;
        if (!plain && !htmlData) return;
        applySanitizedPaste(target, pasteMode, plain || htmlData || '', htmlData);
      },
    [applySanitizedPaste, pasteMode],
  );

  const handleUndo = useCallback(() => {
    if (!undoInfo) return;
    if (undoInfo.field === 'rules') {
      setRuleText(undoInfo.previous);
      if (ruleAreaRef.current) {
        ruleAreaRef.current.value = undoInfo.previous;
        ruleAreaRef.current.focus();
        ruleAreaRef.current.selectionStart = ruleAreaRef.current.selectionEnd =
          undoInfo.previous.length;
      }
    } else {
      setHtml(undoInfo.previous);
      if (htmlAreaRef.current) {
        htmlAreaRef.current.value = undoInfo.previous;
        htmlAreaRef.current.focus();
        htmlAreaRef.current.selectionStart = htmlAreaRef.current.selectionEnd =
          undoInfo.previous.length;
      }
    }
    setUndoInfo(null);
  }, [undoInfo, setRuleText, setHtml]);

  const pasteFromClipboard = useCallback(
    async (target: 'rules' | 'html', mode?: PasteMode) => {
      try {
        if (!navigator.clipboard?.readText) return;
        const text = await navigator.clipboard.readText();
        if (!text) return;
        applySanitizedPaste(target, mode ?? pasteMode, text);
      } catch (error) {
        console.error('Paste failed', error);
      }
    },
    [applySanitizedPaste, pasteMode],
  );

  return (
    <div className="h-full w-full overflow-auto bg-gray-900 p-4 text-white space-y-4">
      <h1 className="text-2xl">HTML Rewriter</h1>
      <div className="flex gap-4 flex-col md:flex-row">
        <div className="flex-1 flex flex-col">
          <div className="mb-1 flex items-center justify-between gap-2">
            <label htmlFor="rewrite-rules" className="font-semibold text-white">
              Rewrite Rules (JSON)
            </label>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span className="hidden sm:inline">Default: {PASTE_MODE_METADATA[pasteMode].label}</span>
              <button
                type="button"
                onClick={() => pasteFromClipboard('rules')}
                className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                title={`Paste (${PASTE_MODE_METADATA[pasteMode].label})`}
              >
                Paste
              </button>
              <button
                type="button"
                ref={rulesMenuButtonRef}
                onClick={() =>
                  setActiveMenu((current) => (current === 'rules' ? null : 'rules'))
                }
                aria-haspopup="menu"
                aria-expanded={activeMenu === 'rules'}
                className="rounded bg-gray-800 px-1 py-1 text-xs text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-ub-orange"
              >
                <span className="sr-only">Open paste options</span>
                ▼
              </button>
            </div>
          </div>
          <textarea
            id="rewrite-rules"
            ref={ruleAreaRef}
            className="flex-1 rounded bg-gray-800 p-2 font-mono text-sm"
            value={ruleText}
            onChange={(e) => setRuleText(e.target.value)}
            onPaste={handlePaste('rules')}
          />
          {error && <p className="text-red-400 mt-1">{error}</p>}
        </div>
        <div className="flex-1 flex flex-col">
          <div className="mb-1 flex items-center justify-between gap-2">
            <label htmlFor="sample-html" className="font-semibold text-white">
              Sample HTML
            </label>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span className="hidden sm:inline">Default: {PASTE_MODE_METADATA[pasteMode].label}</span>
              <button
                type="button"
                onClick={() => pasteFromClipboard('html')}
                className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                title={`Paste (${PASTE_MODE_METADATA[pasteMode].label})`}
              >
                Paste
              </button>
              <button
                type="button"
                ref={htmlMenuButtonRef}
                onClick={() =>
                  setActiveMenu((current) => (current === 'html' ? null : 'html'))
                }
                aria-haspopup="menu"
                aria-expanded={activeMenu === 'html'}
                className="rounded bg-gray-800 px-1 py-1 text-xs text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-ub-orange"
              >
                <span className="sr-only">Open paste options</span>
                ▼
              </button>
            </div>
          </div>
          <textarea
            id="sample-html"
            ref={htmlAreaRef}
            className="flex-1 rounded bg-gray-800 p-2 font-mono text-sm"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            onPaste={handlePaste('html')}
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
      <PasteOptionsMenu
        anchorRef={activeMenu === 'rules' ? rulesMenuButtonRef : htmlMenuButtonRef}
        open={activeMenu !== null}
        defaultMode={pasteMode}
        onClose={() => setActiveMenu(null)}
        onSelect={(mode) => {
          const target = activeMenu;
          if (!target) return;
          void pasteFromClipboard(target, mode);
        }}
        onSetDefault={setPasteMode}
      />
      {undoInfo && (
        <div className="mt-6 rounded border border-ub-orange bg-gray-900 p-4 text-sm text-gray-200">
          <div className="flex items-start justify-between gap-4">
            <p>{undoInfo.message}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                className="rounded bg-ub-orange px-3 py-1 text-xs font-semibold text-white hover:bg-ub-orange/90 focus:outline-none focus:ring-2 focus:ring-ub-orange"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={() => setUndoInfo(null)}
                className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-ub-orange"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HtmlRewriterApp;
