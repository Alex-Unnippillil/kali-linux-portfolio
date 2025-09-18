"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import DiffViewer from "../../../components/apps/settings/DiffViewer";
import {
  BaselineSnapshot,
  captureBaselineSnapshot,
  SettingsDifference,
} from "../../../utils/settings";
import {
  exportSettings as exportSettingsData,
  hasConflicts,
  importSettings as importSettingsData,
  ImportResult,
  parseSettingsExport,
  SettingsExportPayload,
} from "../../../utils/settings/export";

const formatTimestamp = (value?: string) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

export default function SettingsImportPage() {
  const [baseline, setBaseline] = useState<BaselineSnapshot | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [status, setStatus] = useState<"idle" | "ready" | "applied">("idle");

  useEffect(() => {
    let mounted = true;
    captureBaselineSnapshot({ force: true }).then((record) => {
      if (mounted) {
        setBaseline(record);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const differences: SettingsDifference[] = preview?.differences ?? [];
  const incoming: SettingsExportPayload | null = preview?.payload ?? null;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      setError(null);
      const parsed = parseSettingsExport(text);
      const result = await importSettingsData(parsed, {
        baseline,
        dryRun: true,
      });
      setPreview(result);
      setBaseline(result.baseline);
      setStatus("ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed.";
      setError(message);
      setPreview(null);
      setStatus("idle");
    }
  };

  const handleResetSelection = () => {
    setPreview(null);
    setStatus("idle");
    setError(null);
  };

  const handleApply = async () => {
    if (!preview) return;
    setIsApplying(true);
    setError(null);
    try {
      const result = await importSettingsData(preview.payload, {
        baseline: preview.baseline,
      });
      setStatus("applied");
      setPreview(result);
      const updated = await captureBaselineSnapshot({ force: true });
      setBaseline(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed.";
      setError(message);
    } finally {
      setIsApplying(false);
    }
  };

  const downloadCurrentSettings = async () => {
    try {
      const data = await exportSettingsData();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "settings-export.json";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to export.";
      setError(message);
    }
  };

  const conflictSummary = useMemo(() => {
    if (!incoming) return null;
    if (!differences.length)
      return "Imported settings match your current configuration.";
    return `${differences.length} setting${differences.length === 1 ? "" : "s"} will change.`;
  }, [incoming, differences]);

  const applyDisabled = !preview || isApplying;

  return (
    <div className="w-full flex-col flex-grow bg-ub-cool-grey text-ubt-grey overflow-y-auto">
      <div className="max-w-5xl w-full mx-auto p-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">Import Settings</h1>
          <p className="text-sm text-ubt-light-grey">
            Upload a settings export file to preview differences before applying it to this profile.
          </p>
        </header>

        <section className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:gap-4">
            <label
              htmlFor="settings-import"
              className="text-sm font-medium text-white"
            >
              Settings export (.json)
            </label>
            <input
              id="settings-import"
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              className="text-sm"
            />
            <button
              type="button"
              onClick={handleResetSelection}
              className="mt-2 md:mt-0 text-xs uppercase tracking-wide text-ubt-light-grey hover:text-white"
            >
              Clear selection
            </button>
          </div>
          <button
            type="button"
            onClick={downloadCurrentSettings}
            className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded bg-ub-blue text-white hover:bg-ub-blue/90 transition"
          >
            Download current settings
          </button>
          <p className="text-xs text-ubt-light-grey">
            Baseline captured {formatTimestamp(baseline?.capturedAt) || "recently"}. This snapshot is used to compare your current configuration with the imported values.
          </p>
        </section>

        {error && (
          <div className="rounded border border-red-500 bg-red-500/20 text-red-200 px-4 py-3" role="alert">
            {error}
          </div>
        )}

        {incoming && (
          <section className="space-y-4">
            <div className="rounded border border-ubt-cool-grey bg-ub-cool-grey/60 p-4 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-white">Incoming profile</h2>
                  <p className="text-xs text-ubt-light-grey">
                    {incoming.profile.label} ({incoming.profile.id})
                    {incoming.profile.host ? ` · ${incoming.profile.host}` : ""}
                  </p>
                </div>
                <div className="text-xs text-ubt-light-grey">
                  Exported {formatTimestamp(incoming.exportedAt)}
                </div>
              </div>
              <div
                className={`rounded px-3 py-2 text-sm ${
                  hasConflicts({ differences })
                    ? "bg-yellow-600/20 border border-yellow-500 text-yellow-100"
                    : "bg-green-700/20 border border-green-500 text-green-100"
                }`}
              >
                {conflictSummary}
              </div>
              {hasConflicts({ differences }) && (
                <ul className="text-xs text-ubt-light-grey list-disc ml-5 space-y-1">
                  {differences.map((diff) => (
                    <li key={diff.key as string}>
                      <span className="text-white font-medium">{String(diff.key)}</span>
                      {": "}
                      <span className="line-through decoration-ub-red/60 pr-1">
                        {String(diff.before)}
                      </span>
                      <span aria-hidden="true">→</span>
                      <span className="pl-1 text-ubt-light-grey">{String(diff.after)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <DiffViewer
              before={baseline?.settings ?? null}
              after={incoming.settings ?? null}
              beforeLabel="Current profile"
              afterLabel="Imported profile"
            />

            <div className="flex flex-col md:flex-row md:justify-end gap-3">
              <button
                type="button"
                onClick={handleApply}
                disabled={applyDisabled}
                className={`px-4 py-2 rounded text-sm font-semibold transition ${
                  applyDisabled
                    ? "bg-ubt-grey/40 text-ubt-light-grey cursor-not-allowed"
                    : "bg-ub-blue text-white hover:bg-ub-blue/90"
                }`}
              >
                {isApplying ? "Applying..." : "Apply import"}
              </button>
              <button
                type="button"
                onClick={handleResetSelection}
                className="px-4 py-2 rounded text-sm font-semibold border border-ubt-cool-grey text-ubt-light-grey hover:text-white"
              >
                Cancel
              </button>
            </div>

            {status === "applied" && (
              <div className="rounded border border-green-500 bg-green-600/20 px-4 py-3 text-green-100" role="status">
                Settings successfully imported. Baseline refreshed {formatTimestamp(baseline?.capturedAt)}.
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
