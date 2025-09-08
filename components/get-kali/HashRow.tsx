import { useState } from 'react';

interface HashRowProps {
  hash: string;
}

export default function HashRow({ hash }: HashRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const truncated = `${hash.slice(0, 12)}…`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <code
        tabIndex={0}
        onFocus={() => setExpanded(true)}
        onBlur={() => setExpanded(false)}
        className="break-all focus:outline-none"
      >
        {expanded ? hash : truncated}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="rounded bg-gray-200 px-1 py-px text-[10px] hover:bg-gray-300 focus:outline-none"
        aria-label="Copy SHA256 hash"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

