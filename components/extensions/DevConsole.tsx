"use client";

import { FormEvent, useMemo, useState } from "react";
import usePersistentState from "../../hooks/usePersistentState";
import { useSandboxHotReload } from "../../hooks/useSandboxHotReload";
import ToggleSwitch from "../ToggleSwitch";

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

type SourceMode = "local" | "remote";

interface SourceConfig {
  mode: SourceMode;
  value: string;
}

const isSourceMode = (value: unknown): value is SourceMode =>
  value === "local" || value === "remote";

const isSourceConfig = (value: unknown): value is SourceConfig | null => {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const candidate = value as { mode?: unknown; value?: unknown };
  return isSourceMode(candidate.mode) && typeof candidate.value === "string";
};

const sanitizeLocalPath = (value: string) =>
  value
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");

const statusAccent: Record<string, string> = {
  idle: "text-ubt-grey-200",
  loading: "text-ub-orange",
  running: "text-ub-green",
  error: "text-red-300",
};

const logColor: Record<"log" | "warn" | "error", string> = {
  log: "text-slate-200",
  warn: "text-amber-200",
  error: "text-red-300",
};

const formatTimestamp = (value: number) =>
  new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function DevConsole() {
  const [developerMode, setDeveloperMode] = usePersistentState<boolean>(
    "extensions:developer-mode",
    false,
    isBoolean,
  );
  const [inputMode, setInputMode] = usePersistentState<SourceMode>(
    "extensions:source-mode",
    "local",
    isSourceMode,
  );
  const [activeSource, setActiveSource, , clearActiveSource] =
    usePersistentState<SourceConfig | null>("extensions:active-source", null, isSourceConfig);

  const [inputValue, setInputValue] = useState(() => activeSource?.value ?? "");
  const [inputError, setInputError] = useState<string | null>(null);

  const manifestContext = useMemo(() => {
    if (!activeSource) return null;
    if (activeSource.mode === "remote") {
      return { url: activeSource.value, display: activeSource.value };
    }
    const sanitized = sanitizeLocalPath(activeSource.value);
    if (!sanitized) return null;
    return {
      url: `/api/plugins/${sanitized}`,
      display: `/api/plugins/${sanitized}`,
    };
  }, [activeSource]);

  const { status, sandboxType, logs, frameUrl, error, manualReload, clearLogs } =
    useSandboxHotReload({
      manifestUrl: developerMode ? manifestContext?.url ?? null : null,
      enabled: developerMode && Boolean(manifestContext?.url),
      pollInterval: 1000,
    });

  const handleModeToggle = (next: boolean) => {
    setDeveloperMode(next);
    if (!next) {
      clearLogs();
    }
  };

  const handleSourceSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!developerMode) return;

    const trimmed = inputValue.trim();
    if (!trimmed) {
      setInputError("Enter a manifest path or URL.");
      return;
    }

    if (inputMode === "remote") {
      try {
        const url = new URL(trimmed);
        if (!/^https?:/.test(url.protocol)) {
          throw new Error("Only HTTP/HTTPS URLs are supported.");
        }
      } catch (err) {
        setInputError(
          err instanceof Error ? err.message : "Remote source must be a valid HTTP or HTTPS URL.",
        );
        return;
      }
      setActiveSource({ mode: "remote", value: trimmed });
    } else {
      const sanitized = sanitizeLocalPath(trimmed);
      if (!sanitized) {
        setInputError("Local paths resolve under plugins/catalog and must not be empty.");
        return;
      }
      setActiveSource({ mode: "local", value: sanitized });
    }

    setInputError(null);
    setInputValue(trimmed);
    clearLogs();
  };

  const handleStop = () => {
    clearLogs();
    clearActiveSource();
  };

  const combinedError = inputError ?? error;
  const statusClass = statusAccent[status] ?? "text-slate-200";

  return (
    <div className="flex h-full flex-col bg-[#090b15] text-slate-100">
      <header className="border-b border-white/10 bg-white/5 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Extension Developer Console</h1>
            <p className="mt-1 max-w-xl text-xs text-ubt-grey-200">
              Load sandboxed extensions from manifests while you iterate locally. Developer Mode is for
              testing only and executes untrusted code under a disposable sandbox.
            </p>
            <a
              href="https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/extension-dev-console.md"
              className="mt-2 inline-flex text-[11px] font-semibold uppercase tracking-wide text-ub-orange hover:text-ubt-yellow"
            >
              Workflow reference ↗
            </a>
          </div>
          <div className="flex items-center gap-3 rounded border border-red-400/30 bg-red-500/10 px-3 py-2">
            <ToggleSwitch
              checked={developerMode}
              onChange={handleModeToggle}
              ariaLabel="Toggle extension developer mode"
            />
            <div className="text-xs leading-tight">
              <div className="font-semibold uppercase tracking-wide text-red-200">Developer Mode</div>
              <div className="text-[10px] text-red-300">Unsafe for production</div>
            </div>
          </div>
        </div>
        {!developerMode && (
          <p className="mt-3 rounded border border-white/10 bg-black/40 p-3 text-xs text-ubt-grey-100">
            Developer Mode is disabled. Enable it to hot-reload manifests from a local catalog or remote
            HTTPS endpoint.
          </p>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden px-4 py-4">
        <form
          onSubmit={handleSourceSubmit}
          className="space-y-3 rounded border border-white/10 bg-black/40 p-4 text-sm"
        >
          <fieldset disabled={!developerMode} className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-ubt-grey-100">
              Manifest Source
            </legend>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setInputMode("local")}
                className={`rounded px-3 py-1 font-semibold uppercase tracking-wide transition ${
                  inputMode === "local"
                    ? "bg-ub-orange text-black"
                    : "border border-white/20 text-ubt-grey-200 hover:border-ub-orange hover:text-ub-orange"
                }`}
              >
                Local path
              </button>
              <button
                type="button"
                onClick={() => setInputMode("remote")}
                className={`rounded px-3 py-1 font-semibold uppercase tracking-wide transition ${
                  inputMode === "remote"
                    ? "bg-ub-orange text-black"
                    : "border border-white/20 text-ubt-grey-200 hover:border-ub-orange hover:text-ub-orange"
                }`}
              >
                Remote URL
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="extension-source" className="sr-only">
                Extension manifest source
              </label>
              <input
                id="extension-source"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder={inputMode === "local" ? "demo.json" : "https://example.com/manifest.json"}
                aria-label="Extension manifest source"
                className="w-full rounded border border-white/20 bg-black/60 px-3 py-2 text-sm font-mono text-slate-100 focus:border-ub-orange focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded bg-ub-green px-3 py-2 text-xs font-semibold uppercase tracking-wide text-black disabled:opacity-40"
                  disabled={!developerMode}
                >
                  Load
                </button>
                {activeSource && (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="rounded border border-white/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ubt-grey-100 hover:border-red-400 hover:text-red-300"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-ubt-grey-200">
              {inputMode === "local"
                ? "Relative to /api/plugins/. Example: catalog/demo.json"
                : "Use HTTPS endpoints that return an extension manifest."
              }
            </p>
            {combinedError && (
              <p className="text-xs font-semibold text-red-300">{combinedError}</p>
            )}
          </fieldset>
        </form>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded border border-white/10 bg-black/40 p-4 text-xs">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-grey-100">
                Runtime Status
              </h2>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-ubt-grey-200">Status</dt>
                  <dd className={`mt-1 font-mono text-sm uppercase ${statusClass}`}>{status}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ubt-grey-200">Sandbox</dt>
                  <dd className="mt-1 font-mono text-sm uppercase text-slate-200">
                    {sandboxType ?? "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-ubt-grey-200">Watching</dt>
                  <dd className="mt-1 font-mono text-xs text-slate-200">
                    {developerMode && manifestContext?.display ? manifestContext.display : "No manifest loaded"}
                  </dd>
                </div>
              </dl>
            </div>

            {sandboxType === "iframe" && frameUrl && (
              <div className="rounded border border-white/10 bg-black/40">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-ubt-grey-100">
                  <span>Sandbox Preview</span>
                  <span className="text-[11px] text-ubt-grey-300">Read-only</span>
                </div>
                <iframe
                  key={frameUrl}
                  src={frameUrl}
                  title="Extension sandbox preview"
                  sandbox="allow-scripts"
                  className="h-56 w-full border-0 bg-black"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>

          <div className="flex h-full flex-col rounded border border-white/10 bg-black/40">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-ubt-grey-100">
              <span>Sandbox Logs</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={manualReload}
                  disabled={!developerMode || !manifestContext?.url}
                  className="rounded border border-white/30 px-2 py-1 font-semibold text-[11px] uppercase tracking-wide text-ubt-grey-100 hover:border-ub-orange hover:text-ub-orange disabled:opacity-40"
                >
                  Reload now
                </button>
                <button
                  type="button"
                  onClick={clearLogs}
                  disabled={logs.length === 0}
                  className="rounded border border-white/30 px-2 py-1 font-semibold text-[11px] uppercase tracking-wide text-ubt-grey-100 hover:border-ub-orange hover:text-ub-orange disabled:opacity-40"
                >
                  Clear logs
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 text-xs">
              {logs.length === 0 ? (
                <p className="text-ubt-grey-200">
                  No sandbox messages yet. Save your extension file to trigger a reload (checks run roughly once per second).
                </p>
              ) : (
                <ul className="space-y-2">
                  {logs.map((entry) => (
                    <li key={entry.id} className="rounded bg-white/5 px-3 py-2">
                      <div className="flex items-center justify-between text-[11px] text-ubt-grey-200">
                        <span>{formatTimestamp(entry.timestamp)}</span>
                        <span className={`font-semibold uppercase ${logColor[entry.level]}`}>{entry.level}</span>
                      </div>
                      <pre className={`mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed ${logColor[entry.level]}`}>
                        {entry.message}
                      </pre>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
