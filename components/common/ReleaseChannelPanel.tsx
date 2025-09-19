"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_CHANNEL,
  getChannelReleases,
  performRollback,
  ReleaseMetadata,
} from "../../utils/releases";

interface ReleaseChannelPanelProps {
  channel?: string;
  className?: string;
  variant?: "default" | "compact";
}

type LoadState = "idle" | "loading" | "loaded" | "error";

type ActionState = "idle" | "pending" | "error";

interface ReleaseState {
  current: ReleaseMetadata | null;
  previous: ReleaseMetadata | null;
}

const formatTimestamp = (value?: string) => {
  if (!value) return "Unknown";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return value;
  }
};

const descriptor = (release: ReleaseMetadata | null) => {
  if (!release) return "Unavailable";
  const version = release.version ? `v${release.version}` : "v?.?";
  const build = release.buildId || "unknown";
  return `${version} (${build})`;
};

export default function ReleaseChannelPanel({
  channel = DEFAULT_CHANNEL,
  className = "",
  variant = "default",
}: ReleaseChannelPanelProps) {
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [releases, setReleases] = useState<ReleaseState>({ current: null, previous: null });

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setError(null);
    setReleases({ current: null, previous: null });

    getChannelReleases(channel)
      .then((info) => {
        if (cancelled) return;
        setReleases({ current: info.current ?? null, previous: info.previous ?? null });
        setLoadState("loaded");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Failed to load release metadata");
        setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [channel]);

  const handleRollback = async () => {
    if (!releases.previous || actionState === "pending") return;
    setActionState("pending");
    setActionError(null);
    try {
      await performRollback({ channel });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Rollback failed";
      setActionError(message);
      setActionState("error");
    }
  };

  const baseClasses =
    "rounded-md border border-gray-900 bg-ub-grey text-ubt-grey shadow-inner";
  const variantClasses = variant === "compact" ? "text-xs p-3" : "text-sm p-4";

  return (
    <section
      aria-live="polite"
      className={`${baseClasses} ${variantClasses} ${className}`.trim()}
    >
      <header className="flex items-center justify-between mb-2">
        <div>
          <p className="text-ubt-grey text-xs uppercase tracking-wide">Release Channel</p>
          <h3 className="text-white font-semibold">{channel}</h3>
        </div>
        {releases.current?.exportedAt && (
          <span className="text-ubt-grey text-xs">
            Updated {formatTimestamp(releases.current.exportedAt)}
          </span>
        )}
      </header>

      {loadState === "loading" && <p>Loading release metadata…</p>}
      {loadState === "error" && error && (
        <p className="text-red-400">{error}</p>
      )}

      {loadState === "loaded" && (
        <div className="space-y-3">
          <div>
            <p className="text-white font-medium">Current build</p>
            <p>{descriptor(releases.current)}</p>
            {releases.current?.assets && (
              <p className="text-xs text-ubt-grey">
                {releases.current.assets.length} tracked assets
              </p>
            )}
          </div>

          {releases.previous ? (
            <div className="space-y-2">
              <div>
                <p className="text-white font-medium">Previous build</p>
                <p>{descriptor(releases.previous)}</p>
                {releases.previous.exportedAt && (
                  <p className="text-xs text-ubt-grey">
                    Exported {formatTimestamp(releases.previous.exportedAt)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleRollback}
                disabled={actionState === "pending"}
                className={`px-3 py-2 rounded bg-ub-orange text-white hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-orange transition-colors duration-150 ${
                  actionState === "pending" ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {actionState === "pending"
                  ? "Rolling back…"
                  : "Rollback to previous release"}
              </button>
            </div>
          ) : (
            <p>No previous release is stored for this channel yet.</p>
          )}
        </div>
      )}

      {actionError && (
        <p className="mt-2 text-red-400" role="alert">
          {actionError}
        </p>
      )}
    </section>
  );
}
