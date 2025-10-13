import React, { useMemo, useState } from "react";

// Demo output for each tab
const demoOutput = {
  dump: [
    "[*] lsass.exe (1234)",
    "[+] Dump saved to C:/dumps/lsass.dmp",
    "Token: 0123456789ABCDEF0123456789ABCDEF",
  ],
  tokens: [
    "NTLM hash: 5d41402abc4b2a76b9719d911017c592",
    "Token: FEDCBA9876543210FEDCBA9876543210",
  ],
  tickets: [
    "Kerberos Ticket: 05000000123456789abcdef",
    "Ticket cache: user@EXAMPLE.COM",
  ],
};

const tabs = [
  { id: "dump", label: "Dump", icon: "💾" },
  { id: "tokens", label: "Tokens", icon: "🔑" },
  { id: "tickets", label: "Tickets", icon: "🎫" },
];

// Masks tokens and hashes unless unmasked by user
const maskSensitive = (line, show) => {
  const match = line.match(
    /(Token|NTLM hash|Kerberos Ticket|Ticket cache):\s*(\S+)/i,
  );
  if (!match) return line;
  const [, label, value] = match;

  return (
    <>
      {label}:{" "}
      <span
        className="rounded border border-kali-primary/30 bg-kali-primary/10 px-1.5 py-0.5 font-semibold text-[0.85em] text-kali-primary"
      >
        {show ? value : "********"}
      </span>
    </>
  );
};

const alertPalettes = {
  warning: {
    icon: "⚠️",
    accent: "var(--color-warning)",
  },
  success: {
    icon: "✅",
    accent: "var(--color-success)",
  },
  error: {
    icon: "❌",
    accent: "var(--color-error)",
  },
  info: {
    icon: "ℹ️",
    accent: "var(--color-info)",
  },
};

const KaliAlert = ({ tone = "info", children }) => {
  const palette = alertPalettes[tone] ?? alertPalettes.info;

  return (
    <div
      role="alert"
      className="mb-2 flex items-center gap-3 rounded-xl border border-kali-border/60 bg-kali-surface-muted/80 px-3 py-2 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur"
      style={{
        background: `color-mix(in srgb, var(--kali-surface) 88%, color-mix(in srgb, ${palette.accent} 12%, transparent))`,
        borderColor: `color-mix(in srgb, ${palette.accent} 38%, transparent)`,
        color: "var(--kali-terminal-text)",
        boxShadow: `0 12px 28px -12px color-mix(in srgb, ${palette.accent} 45%, transparent)`,
      }}
    >
      <span
        aria-hidden="true"
        className="text-lg"
        style={{
          textShadow: `0 0 12px color-mix(in srgb, ${palette.accent} 40%, transparent)`,
          color: palette.accent,
        }}
      >
        {palette.icon}
      </span>
      <span className="leading-snug">{children}</span>
    </div>
  );
};

const MimikatzApp = () => {
  const consoleId = "mimikatz-console";
  const showSensitiveId = "mimikatz-show-sensitive";
  const showSensitiveLabelId = "mimikatz-show-sensitive-label";
  const [active, setActive] = useState("dump");
  const [showSensitive, setShowSensitive] = useState(false);

  const output = demoOutput[active];

  const toneStyles = useMemo(
    () => ({
      success: {
        color: "var(--color-success)",
        textShadow:
          "0 0 8px color-mix(in srgb, var(--color-success) 55%, transparent)",
      },
      error: {
        color: "var(--color-error)",
        textShadow: "0 0 8px color-mix(in srgb, var(--color-error) 45%, transparent)",
      },
      info: {
        color: "color-mix(in srgb, var(--kali-terminal-text) 85%, rgba(148,163,184,0.25))",
        textShadow:
          "0 0 6px color-mix(in srgb, var(--kali-terminal-text) 32%, transparent)",
      },
    }),
    [],
  );

  const resolveTone = (line) => {
    if (/^\s*\[\+\]/.test(line)) return "success";
    if (/^\s*\[(?:-|!)\]/.test(line) || /error/i.test(line)) return "error";
    return "info";
  };

  const copyLine = async (line) => {
    try {
      await navigator.clipboard.writeText(line);
    } catch {}
  };

  const exportOutput = () => {
    const blob = new Blob([output.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active}-output.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full w-full flex-col bg-kali-surface/95 text-kali-text">
      <div className="border-b border-kali-border/60 bg-kali-surface-raised/90 px-3 pt-3">
        <KaliAlert tone="warning">Demo only. No real credentials are used.</KaliAlert>
        <div
          role="tablist"
          aria-label="Mimikatz modules"
          className="flex gap-2 rounded-xl border border-kali-border/60 bg-kali-surface-muted/80 p-1 shadow-inner shadow-kali-panel backdrop-blur"
        >
          {tabs.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={consoleId}
                className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] ${
                  isActive
                    ? "bg-kali-accent/90 text-kali-inverse shadow-[0_12px_20px_-12px_color-mix(in_srgb,var(--color-accent)_85%,transparent)]"
                    : "border border-transparent text-kali-text/70 hover:border-kali-border/70 hover:bg-kali-surface/70 hover:text-kali-text"
                }`}
                onClick={() => setActive(t.id)}
              >
                <span aria-hidden="true">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-3 py-4">
        <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wide text-kali-text/60">
          <div className="flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              checked={showSensitive}
              onChange={(e) => setShowSensitive(e.target.checked)}
              className="h-4 w-4 rounded border border-kali-border/60 bg-transparent accent-kali-control"
              id={showSensitiveId}
              aria-labelledby={showSensitiveLabelId}
            />
            <label
              htmlFor={showSensitiveId}
              className="cursor-pointer"
              id={showSensitiveLabelId}
            >
              Show tokens
            </label>
          </div>
          <button
            type="button"
            className="rounded-md border border-kali-border/60 bg-kali-surface-muted/80 px-3 py-1 font-semibold text-kali-text/80 transition-colors duration-200 hover:border-kali-accent/50 hover:bg-kali-accent/15 hover:text-kali-text"
            onClick={exportOutput}
          >
            Export
          </button>
        </div>
        <div
          id={consoleId}
          className="space-y-2 rounded-2xl border border-kali-border/60 bg-kali-surface-muted/80 p-3 font-mono text-sm shadow-inner shadow-[0_0_24px_rgba(0,0,0,0.5)] transition-all duration-200"
          style={{
            color: "var(--kali-terminal-text)",
          }}
        >
          {output.map((line, idx) => {
            const tone = resolveTone(line);
            const style = toneStyles[tone];
            return (
              <div
                key={`${active}-${idx}`}
                className="flex items-start gap-2 rounded-lg px-2 py-1 transition-colors duration-200 hover:bg-kali-surface/60"
              >
                <span
                  id={`${active}-line-${idx}`}
                  className="flex-1 whitespace-pre-wrap"
                  style={style}
                >
                  {maskSensitive(line, showSensitive)}
                </span>
                <button
                  className="mt-0.5 text-base text-kali-text/40 transition-colors duration-200 hover:text-kali-accent"
                  onClick={() => copyLine(line)}
                  aria-label="Copy line"
                >
                  📋
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MimikatzApp;

export const displayMimikatz = (addFolder, openApp) => {
  return <MimikatzApp addFolder={addFolder} openApp={openApp} />;
};
