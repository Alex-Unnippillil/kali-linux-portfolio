import React from "react";
import copyToClipboard from "../../utils/clipboard";

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode;
}

export default function CodeBlock({
  children,
  className = "",
  ...props
}: CodeBlockProps) {
  const ref = React.useRef<HTMLPreElement>(null);

  const copy = () => {
    const text = ref.current?.innerText || "";
    if (text) copyToClipboard(text);
  };

  return (
    <div className="relative group">
      <pre ref={ref} className={className} {...props}>
        <code>{children}</code>
      </pre>
      <button
        type="button"
        aria-label="Copy code"
        onClick={copy}
        className="absolute top-2 right-2 rounded bg-[var(--color-muted)] text-[var(--color-text)] px-1.5 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-[var(--color-accent)] hover:text-[var(--color-inverse)] focus-visible:opacity-100 focus-visible:bg-[var(--color-accent)] focus-visible:text-[var(--color-inverse)]"
      >
        📋
      </button>
    </div>
  );
}
