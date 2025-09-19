"use client";

import { useState } from "react";
import { logRedactionSummary, redactSensitive } from "@/lib/redact";
import type { RedactionStats } from "@/lib/redact";

const emptyStats: RedactionStats = { emails: 0, ipAddresses: 0, ids: 0, total: 0 };

export default function ConsentCenter() {
  const [rawInput, setRawInput] = useState("");
  const [redacted, setRedacted] = useState("");
  const [stats, setStats] = useState<RedactionStats>(emptyStats);
  const [statusMessage, setStatusMessage] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const applyRedaction = (source: string, context?: string) => {
    const { text, stats: summary } = redactSensitive(source);
    logRedactionSummary(summary, "consent-center");
    setRedacted(text);
    setStats(summary);
    if (context) {
      setFileName(context);
    }
    if (!source.trim()) {
      setStatusMessage("Paste log text or upload a file to preview redaction.");
      return;
    }
    if (summary.total === 0) {
      setStatusMessage("No sensitive patterns were found in the supplied text.");
    } else {
      setStatusMessage(
        `Masked ${summary.total} value${summary.total === 1 ? "" : "s"} across emails, IPs, and IDs.`,
      );
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    applyRedaction(rawInput);
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setRawInput(text);
      applyRedaction(text, file.name);
    } catch {
      setStatusMessage("Unable to read that file. Try a plain text or JSON export.");
      setRedacted("");
      setStats(emptyStats);
    } finally {
      // Reset so the same file can be selected again.
      event.target.value = "";
    }
  };

  const copyRedacted = async () => {
    if (!redacted) return;
    try {
      await navigator.clipboard.writeText(redacted);
      setStatusMessage("Copied sanitized text to the clipboard.");
    } catch {
      setStatusMessage("Clipboard is unavailable in this browser context.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Consent Center</h1>
          <p className="text-sm text-gray-300">
            Paste or upload simulated logs to preview how personal data is masked before leaving the
            sandbox. Emails become <code>&lt;email&gt;</code>, IP addresses become <code>&lt;ip&gt;</code>,
            and identifier values are replaced with <code>&lt;id&gt;</code>.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded border border-gray-700 bg-gray-800 p-4"
        >
          <div>
            <label
              id="raw-log-label"
              htmlFor="raw-log"
              className="mb-2 block text-sm font-medium"
            >
              Paste log text
            </label>
            <textarea
              id="raw-log"
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              rows={8}
              className="w-full rounded border border-gray-600 bg-gray-900 p-3 font-mono text-sm text-white focus:border-yellow-400 focus:outline-none"
              placeholder="Drop raw logs, scan exports, or JSON snippets here..."
              aria-labelledby="raw-log-label"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              aria-label="Redact pasted log text"
            >
              Redact pasted text
            </button>
            <label
              className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-400"
              htmlFor="consent-upload"
            >
              Upload export
              <input
                id="consent-upload"
                type="file"
                accept=".txt,.log,.json"
                onChange={handleFile}
                className="sr-only"
                aria-label="Upload log export"
              />
            </label>
            {fileName && (
              <span className="text-xs text-gray-400" aria-live="polite">
                Last file: {fileName}
              </span>
            )}
          </div>
        </form>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Redacted preview</h2>
            <button
              type="button"
              onClick={copyRedacted}
              disabled={!redacted}
              className="rounded border border-gray-600 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Copy redacted text"
            >
              Copy sanitized text
            </button>
          </div>
          <textarea
            readOnly
            value={redacted}
            rows={8}
            className="w-full rounded border border-gray-700 bg-gray-950 p-3 font-mono text-sm text-white"
            aria-label="Redacted output"
          />
          <div className="grid gap-2 rounded border border-gray-700 bg-gray-800 p-3 text-sm">
            <div className="flex justify-between">
              <span>Emails</span>
              <span>{stats.emails}</span>
            </div>
            <div className="flex justify-between">
              <span>IP addresses</span>
              <span>{stats.ipAddresses}</span>
            </div>
            <div className="flex justify-between">
              <span>IDs</span>
              <span>{stats.ids}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total masked</span>
              <span>{stats.total}</span>
            </div>
          </div>
          <p className="text-sm text-gray-300" role="status" aria-live="polite">
            {statusMessage || "Redacted output and counts will appear here."}
          </p>
        </section>
      </div>
    </div>
  );
}
