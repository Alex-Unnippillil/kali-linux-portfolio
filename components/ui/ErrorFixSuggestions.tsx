'use client';

import { useCallback } from 'react';
import { trackEvent } from '@/lib/analytics-client';
import { resolveErrorFixes, ResolvedErrorFix } from '@/utils/errorFixes';

interface ErrorFixSuggestionsProps {
  codes: string[];
  onRunCommand?: (command: string, code?: string) => void;
  className?: string;
  source?: string;
  size?: 'default' | 'compact';
}

const noop = () => {};

const copyToClipboard = async (text: string) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  } catch {
    // ignore clipboard errors
  }
};

const ErrorFixCard = ({
  fix,
  onRunCommand = noop,
  source = 'unknown',
  size = 'default',
}: {
  fix: ResolvedErrorFix;
  onRunCommand?: (command: string, code?: string) => void;
  source?: string;
  size?: 'default' | 'compact';
}) => {
  const { code, title, description, command, docsUrl } = fix;

  const handleCopy = useCallback(() => {
    copyToClipboard(command);
    trackEvent('error_fix_copy', { code, source });
  }, [code, command, source]);

  const handleRun = useCallback(() => {
    onRunCommand?.(command, code);
    trackEvent('error_fix_run', { code, source });
  }, [code, command, onRunCommand, source]);

  return (
    <article
      className={`rounded border border-slate-500/40 bg-slate-900/80 p-3 text-slate-100 shadow-inner ${
        size === 'compact' ? 'text-xs' : 'text-sm'
      }`}
      aria-label={`Suggested fix for ${code}`}
    >
      <header className="mb-1 flex items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-wide text-blue-300">
            {code}
          </p>
          <h3 className={`${size === 'compact' ? 'text-sm' : 'text-base'} font-semibold`}>
            {title}
          </h3>
        </div>
        {docsUrl && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[0.7rem] text-blue-300 underline"
          >
            Docs
          </a>
        )}
      </header>
      <p className="mb-2 text-slate-200">{description}</p>
      <pre
        className={`mb-3 overflow-x-auto rounded bg-black/60 p-2 font-mono ${
          size === 'compact' ? 'text-[0.65rem]' : 'text-xs'
        }`}
      >
        {command}
      </pre>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded bg-slate-800 px-2 py-1 text-[0.7rem] uppercase tracking-wide text-blue-200 transition hover:bg-slate-700"
        >
          Copy
        </button>
        <button
          type="button"
          onClick={handleRun}
          className="rounded bg-blue-600 px-2 py-1 text-[0.7rem] uppercase tracking-wide text-white transition hover:bg-blue-500"
        >
          Run
        </button>
      </div>
    </article>
  );
};

const ErrorFixSuggestions = ({
  codes,
  onRunCommand,
  className = '',
  source = 'unknown',
  size = 'default',
}: ErrorFixSuggestionsProps) => {
  const fixes = resolveErrorFixes(codes);

  if (!fixes.length) return null;

  return (
    <section
      className={`space-y-3 rounded-lg border border-slate-700/40 bg-slate-950/60 p-3 ${className}`}
      aria-label="Suggested fixes"
    >
      <h2 className={`font-semibold text-blue-200 ${size === 'compact' ? 'text-sm' : 'text-base'}`}>
        Suggested fixes
      </h2>
      <div className="space-y-3">
        {fixes.map((fix) => (
          <ErrorFixCard
            key={fix.code}
            fix={fix}
            onRunCommand={onRunCommand}
            source={source}
            size={size}
          />
        ))}
      </div>
    </section>
  );
};

export default ErrorFixSuggestions;
