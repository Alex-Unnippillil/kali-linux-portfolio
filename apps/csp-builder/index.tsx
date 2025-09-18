'use client';

import React, { useCallback, useEffect, useState } from 'react';
import DirectiveEditor, {
  type DirectiveEditorState,
} from '../../components/apps/csp-builder/DirectiveEditor';

const emptyState: DirectiveEditorState = {
  directives: [],
  csp: '',
  isValid: false,
  errors: { global: [], byId: {} },
};

type CopyState = 'idle' | 'copied' | 'error';

const CSPBuilderApp: React.FC = () => {
  const [editorState, setEditorState] = useState<DirectiveEditorState>(emptyState);
  const [copyState, setCopyState] = useState<CopyState>('idle');

  const handleStateChange = useCallback((state: DirectiveEditorState) => {
    setEditorState(state);
    setCopyState('idle');
  }, []);

  useEffect(() => {
    if (copyState === 'copied') {
      const timer = window.setTimeout(() => setCopyState('idle'), 2500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [copyState]);

  const handleCopy = useCallback(async () => {
    if (!editorState.isValid || !editorState.csp) {
      return;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(
          `Content-Security-Policy: ${editorState.csp}`,
        );
        setCopyState('copied');
      } else {
        throw new Error('Clipboard unavailable');
      }
    } catch (error) {
      console.error('Failed to copy CSP header', error);
      setCopyState('error');
    }
  }, [editorState]);

  return (
    <div className="flex h-full flex-col bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900 p-4">
        <h1 className="text-2xl font-semibold text-white">Content Security Policy Builder</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-300">
          Assemble a Content-Security-Policy header without sending any requests. Add
          directives, choose allowed sources, and copy the generated header once validation
          passes.
        </p>
      </header>
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 lg:flex-row">
        <section className="flex-1 space-y-6">
          <DirectiveEditor onStateChange={handleStateChange} />
        </section>
        <aside className="lg:w-2/5 lg:max-w-xl space-y-4">
          <div className="rounded border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-lg font-semibold text-white">Policy preview</h2>
            <p className="mt-1 text-xs text-gray-400">
              The header is only available when every directive passes validation.
            </p>
            <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded border border-gray-800 bg-black/60 p-3 text-xs font-mono text-green-300">
              {editorState.csp
                ? `Content-Security-Policy: ${editorState.csp}`
                : '# Add directives and tokens to build a policy'}
            </pre>
            {editorState.errors.global.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-amber-300">
                {editorState.errors.global.map((message, index) => (
                  <li key={index}>• {message}</li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={handleCopy}
              disabled={!editorState.isValid || !editorState.csp}
              className="mt-4 w-full rounded border border-sky-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-sky-200 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-500"
            >
              Copy header
            </button>
            {copyState === 'copied' && (
              <p className="mt-2 text-xs text-emerald-300">Copied to clipboard.</p>
            )}
            {copyState === 'error' && (
              <p className="mt-2 text-xs text-red-400">
                Clipboard copy failed. Copy the header manually instead.
              </p>
            )}
            {!editorState.isValid && editorState.csp.length === 0 && (
              <p className="mt-2 text-xs text-amber-400">
                Resolve the highlighted directive issues to enable the copy action.
              </p>
            )}
          </div>
          <div className="rounded border border-gray-800 bg-gray-900 p-4 text-sm text-gray-300">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
              Tips
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-gray-400">
              <li>
                Use <code className="text-gray-200">Report-Only</code> mode by renaming the
                header if you want to observe enforcement without blocking content.
              </li>
              <li>
                Keywords such as <code className="text-gray-200">&apos;self&apos;</code> and schemes like
                <code className="text-gray-200"> https:</code> are validated against the directive
                rules.
              </li>
              <li>
                Sandbox flags and Trusted Types helpers follow the CSP Level 3 specification so
                you can experiment safely in this simulation.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

const CSPPreview: React.FC = () => {
  return <CSPBuilderApp />;
};

export default CSPPreview;
