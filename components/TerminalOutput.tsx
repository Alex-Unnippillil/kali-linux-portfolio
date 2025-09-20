import React, { useMemo } from 'react';
import { findExitCodeMatch } from '@/utils/terminal/errorCodeTips';

interface TerminalOutputProps {
  text: string;
  ariaLabel?: string;
  showTips?: boolean;
}

function highlightMatch(text: string, highlight: string) {
  const lowerText = text.toLowerCase();
  const lowerHighlight = highlight.toLowerCase();
  const index = lowerText.indexOf(lowerHighlight);
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <span className="text-rose-300">{text.slice(index, index + highlight.length)}</span>
      {text.slice(index + highlight.length)}
    </>
  );
}

export default function TerminalOutput({
  text,
  ariaLabel,
  showTips = true,
}: TerminalOutputProps) {
  const lines = useMemo(() => text.split('\n'), [text]);
  const copyLine = async (line: string) => {
    try {
      await navigator.clipboard.writeText(line);
    } catch {
      // ignore
    }
  };
  return (
    <div
      className="bg-black text-green-400 font-mono text-xs p-2 rounded"
      aria-label={ariaLabel}
    >
      {lines.map((line, idx) => {
        const match = showTips ? findExitCodeMatch(line) : null;
        const tooltipId = match ? `terminal-output-tip-${idx}` : undefined;
        return (
          <div key={idx} className="relative flex items-start group">
            <span
              className={`flex-1 whitespace-pre-wrap ${
                match
                  ? 'cursor-help underline decoration-dotted decoration-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/80'
                  : ''
              }`}
              tabIndex={match ? 0 : undefined}
              aria-describedby={tooltipId}
            >
              {match ? highlightMatch(line, match.matchedText) : line}
            </span>
            {match && (
              <div
                id={tooltipId}
                role="tooltip"
                className="z-10 hidden w-64 rounded-md border border-slate-700 bg-slate-900 p-3 text-left text-[11px] text-slate-100 shadow-xl group-hover:block group-focus-within:block"
              >
                <p className="font-semibold text-sky-300">
                  Exit code {match.code}: {match.entry.title}
                </p>
                <p className="mt-1 text-slate-200">{match.entry.summary}</p>
                {match.entry.tips?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-300">
                    {match.entry.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                ) : null}
                {match.entry.docs?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {match.entry.docs.map((doc) => (
                      <a
                        key={doc.path}
                        href={doc.path}
                        className="rounded bg-sky-500/20 px-2 py-1 text-sky-200 underline hover:bg-sky-500/30"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {doc.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
            <button
              className="ml-2 text-gray-400 hover:text-white"
              onClick={() => copyLine(line)}
              aria-label="copy line"
            >
              📋
            </button>
          </div>
        );
      })}
    </div>
  );
}
