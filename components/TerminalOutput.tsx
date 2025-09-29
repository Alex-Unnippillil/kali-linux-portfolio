import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface TerminalOutputProps {
  text: string;
  ariaLabel?: string;
}

const lineNumberPatterns = [
  /^\s*\d+[:.)-]\s*/, // 1. output, 1) output, 1- output, 1: output
  /^\s*\d+\s+-\s*/, // 1 - output
  /^\s*\[\d+\]\s*/, // [1] output
];

const promptPatterns = [
  /^\s*(?:[A-Za-z0-9_.-]+@[\w.-]+:[^$#>]+)?[$#>]\s*/, // user@host:~$ output or $ output
  /^\s*PS [^>]+>\s*/, // Powershell style prompt
];

const stripPromptAndLineNumbers = (line: string) => {
  let result = line;

  for (const pattern of lineNumberPatterns) {
    if (pattern.test(result)) {
      result = result.replace(pattern, '');
      break;
    }
  }

  for (const pattern of promptPatterns) {
    if (pattern.test(result)) {
      result = result.replace(pattern, '');
      break;
    }
  }

  return result;
};

export default function TerminalOutput({ text, ariaLabel }: TerminalOutputProps) {
  const [copied, setCopied] = useState(false);

  const sanitizedText = useMemo(() => {
    return text
      .split('\n')
      .map((line) => stripPromptAndLineNumbers(line))
      .join('\n');
  }, [text]);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  const copyBlock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(sanitizedText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [sanitizedText]);

  return (
    <div
      className="bg-black text-green-400 font-mono text-xs p-2 rounded"
      aria-label={ariaLabel}
    >
      <div className="flex items-center justify-end gap-2 mb-2">
        <div
          role="status"
          aria-live="polite"
          className="text-[0.7rem] text-green-300 min-h-[1rem]"
        >
          {copied ? 'Copied!' : ''}
        </div>
        <button
          type="button"
          onClick={copyBlock}
          className="px-2 py-1 bg-ub-grey text-white rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
          aria-label="Copy terminal output"
        >
          Copy
        </button>
      </div>
      <pre className="whitespace-pre-wrap">{text}</pre>
    </div>
  );
}
