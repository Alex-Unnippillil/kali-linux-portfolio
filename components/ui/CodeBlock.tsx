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

  const code = React.useMemo(
    () => React.Children.toArray(children).join("") as string,
    [children]
  );

  const [showLineNumbers, setShowLineNumbers] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("codeblock-line-numbers");
      if (stored) setShowLineNumbers(stored === "true");
    }
  }, []);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "codeblock-line-numbers",
        showLineNumbers.toString()
      );
    }
  }, [showLineNumbers]);

  const lines = React.useMemo(() => code.split("\n"), [code]);

  const copy = () => {
    if (code) copyToClipboard(code);
  };

  return (
    <div className="relative group">
      <pre ref={ref} className={className} {...props}>
        <code>
          {showLineNumbers
            ? lines.map((line, i) => (
                <span key={i} className="block">
                  <span className="select-none opacity-50 mr-4 w-8 inline-block text-right">
                    {i + 1}
                  </span>
                  {line}
                </span>
              ))
            : code}
        </code>
      </pre>
      <div className="absolute top-2 right-2 flex gap-2">
        <button
          type="button"
          aria-label={
            showLineNumbers ? "Hide line numbers" : "Show line numbers"
          }
          aria-pressed={showLineNumbers}
          onClick={() => setShowLineNumbers((v) => !v)}
          className="rounded bg-[var(--color-muted)] text-[var(--color-text)] px-1.5 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-[var(--color-accent)] hover:text-[var(--color-inverse)] focus-visible:opacity-100 focus-visible:bg-[var(--color-accent)] focus-visible:text-[var(--color-inverse)]"
        >
          🔢
        </button>
        <button
          type="button"
          aria-label="Copy code"
          onClick={copy}
          className="rounded bg-[var(--color-muted)] text-[var(--color-text)] px-1.5 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-[var(--color-accent)] hover:text-[var(--color-inverse)] focus-visible:opacity-100 focus-visible:bg-[var(--color-accent)] focus-visible:text-[var(--color-inverse)]"
        >
          📋
        </button>
      </div>
    </div>
  );
}
