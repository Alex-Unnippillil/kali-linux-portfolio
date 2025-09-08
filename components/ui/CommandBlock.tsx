import React from "react";
import CodeBlock from "./CodeBlock";

interface CommandBlockProps {
  bash: string;
  zsh: string;
  powershell: string;
  className?: string;
}

export default function CommandBlock({
  bash,
  zsh,
  powershell,
  className = "",
}: CommandBlockProps) {
  const [active, setActive] = React.useState("bash");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const refs = React.useRef<Record<string, HTMLDivElement | null>>({
    bash: null,
    zsh: null,
    powershell: null,
  });

  React.useEffect(() => {
    const heights = [
      refs.current.bash?.offsetHeight || 0,
      refs.current.zsh?.offsetHeight || 0,
      refs.current.powershell?.offsetHeight || 0,
    ];
    const max = Math.max(...heights);
    if (containerRef.current) {
      containerRef.current.style.height = `${max}px`;
    }
  }, [bash, zsh, powershell]);

  return (
    <div className="not-prose">
      <div className="flex gap-2 mb-2">
        {[
          { key: "bash", label: "Bash" },
          { key: "zsh", label: "Zsh" },
          { key: "powershell", label: "PowerShell" },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActive(key)}
            className={`px-2 py-1 text-sm rounded ${
              active === key
                ? "bg-[var(--color-accent)] text-[var(--color-inverse)]"
                : "bg-[var(--color-muted)] text-[var(--color-text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div ref={containerRef} className="relative">
        {(
          [
            { key: "bash", code: bash },
            { key: "zsh", code: zsh },
            { key: "powershell", code: powershell },
          ] as const
        ).map(({ key, code }) => (
          <div
            key={key}
            ref={(el) => (refs.current[key] = el)}
            className={`${
              active === key
                ? "relative"
                : "absolute inset-0 opacity-0 pointer-events-none"
            } w-full`}
          >
            <CodeBlock className={`h-full ${className}`.trim()}>{code}</CodeBlock>
          </div>
        ))}
      </div>
    </div>
  );
}

