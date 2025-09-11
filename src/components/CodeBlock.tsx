import { useState } from 'react';

interface CodeBlockProps {
  children: string;
}

export default function CodeBlock({ children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative">
      <pre className="p-2">
        <code>{children}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute top-2 right-2 border px-2 py-1 text-xs bg-white"
        aria-label="Copy code"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
