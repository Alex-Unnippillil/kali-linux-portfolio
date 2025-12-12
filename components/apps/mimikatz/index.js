import React, { useMemo, useState } from "react";
import SimulationBanner from "../SimulationBanner";
import SimulationReportExport from "../SimulationReportExport";
import { recordSimulation } from "../../../utils/simulationLog";

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
    accent: "color-mix(in srgb, #ff5c7a 78%, var(--kali-blue) 22%)",
  },
  success: {
    icon: "✅",
    accent: "var(--kali-terminal-green)",
  },
  info: {
    icon: "ℹ️",
    accent: "var(--kali-blue)",
  },
};

const KaliAlert = ({ tone = "info", children }) => {
  const palette = alertPalettes[tone] ?? alertPalettes.info;

  return (
    <div
      role="alert"
      className="mb-2 flex items-center gap-3 rounded-xl border px-3 py-2 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur"
      style={{
        background: "color-mix(in srgb, var(--kali-panel) 88%, rgba(15,148,210,0.08) 12%)",
        borderColor: "color-mix(in srgb, var(--kali-blue) 25%, transparent)",
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
        color: "var(--kali-terminal-green)",
        textShadow:
          "0 0 8px color-mix(in srgb, var(--kali-terminal-green) 55%, transparent)",
      },
      error: {
        color: "color-mix(in srgb, #ff5c7a 82%, var(--kali-blue) 18%)",
        textShadow: "0 0 8px color-mix(in srgb, #ff5c7a 45%, transparent)",
      },
      info: {
        color: "var(--kali-terminal-text)",
        textShadow:
          "0 0 6px color-mix(in srgb, var(--kali-terminal-text) 28%, transparent)",
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
    recordSimulation({
      tool: "mimikatz",
      title: `${active} export`,
      summary: `${output.length} line demo saved (${showSensitive ? "unmasked" : "masked"})`,
      data: { tab: active, entries: output.length, showSensitive },
    });
  };

  return (
    <div className="flex h-full w-full flex-col bg-kali-surface/95 text-kali-text">
      <div className="border-b border-kali-border/60 bg-[var(--kali-panel)] px-3 pt-3">
        <SimulationBanner
          toolName="Mimikatz"
          message="Credential artifacts are mocked and deterministic. No secrets are processed."
        />
        <KaliAlert tone="warning">Demo only. No real credentials are used.</KaliAlert>
        <div
          role="tablist"
          aria-label="Mimikatz modules"
          className="flex gap-2 rounded-xl border border-kali-border/60 bg-kali-surface/80 p-1 shadow-inner shadow-black/30 backdrop-blur"
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
                className={`flex items-center gap-1 rounded-lg border border-transparent px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] ${
                  isActive
                    ? "bg-kali-accent text-kali-inverse shadow-[0_12px_20px_-12px_rgba(15,148,210,0.75)]"
                    : "text-kali-muted hover:border-kali-border/60 hover:bg-kali-surface/90 hover:text-kali-text"
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
        <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wide text-kali-muted">
          <div className="flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              checked={showSensitive}
              onChange={(e) => setShowSensitive(e.target.checked)}
              className="h-4 w-4 rounded border border-kali-border/70 bg-transparent text-kali-accent accent-kali-control"
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
            className="rounded-md border border-kali-border/60 bg-kali-surface/80 px-3 py-1 font-semibold text-kali-text/80 transition-colors duration-200 hover:border-kali-accent/60 hover:bg-kali-accent/15 hover:text-kali-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
            onClick={exportOutput}
          >
            Export
          </button>
        </div>
        <div
          id={consoleId}
          className="space-y-2 rounded-2xl border border-kali-border/60 bg-[color-mix(in_srgb,var(--kali-bg-solid)_85%,rgba(10,15,25,0.9)_15%)] p-3 font-mono text-sm shadow-inner shadow-[0_0_24px_rgba(0,0,0,0.5)] transition-all duration-200"
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
                className="flex items-start gap-2 rounded-lg px-2 py-1 transition-colors duration-200 hover:bg-kali-surface/70"
              >
                <span
                  id={`${active}-line-${idx}`}
                  className="flex-1 whitespace-pre-wrap"
                  style={style}
                >
                  {maskSensitive(line, showSensitive)}
                </span>
                <button
                  className="mt-0.5 text-base text-kali-muted transition-colors duration-200 hover:text-kali-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                  onClick={() => copyLine(line)}
                  aria-label="Copy line"
                >
                  📋
                </button>
              </div>
            );
          })}
        </div>
        <SimulationReportExport dense />
      </div>
    </div>
  );
};

export default MimikatzApp;

export const displayMimikatz = (addFolder, openApp) => {
  return <MimikatzApp addFolder={addFolder} openApp={openApp} />;
};
