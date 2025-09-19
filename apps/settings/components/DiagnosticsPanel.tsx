"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { runSelfTest, type SelfTestResult } from "../../../lib/selfTest";
import { safeLocalStorage } from "../../../utils/safeStorage";

const STORAGE_KEY = "diagnostics:self-test";

const formatDuration = (ms: number) => `${Math.round(ms)}ms`;

const formatTimestamp = (value: number) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
};

const isSelfTestResult = (value: unknown): value is SelfTestResult => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as SelfTestResult;
  return (
    (candidate.status === "pass" || candidate.status === "fail") &&
    Array.isArray(candidate.steps)
  );
};

export default function DiagnosticsPanel() {
  const [result, setResult] = useState<SelfTestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!safeLocalStorage) return;
    try {
      const stored = safeLocalStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (isSelfTestResult(parsed)) {
        setResult(parsed);
      }
    } catch (error) {
      console.warn("Failed to restore self test result", error);
    }
  }, []);

  const persistResult = useCallback((value: SelfTestResult) => {
    if (!safeLocalStorage) return;
    try {
      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (error) {
      console.warn("Failed to persist self test result", error);
    }
  }, []);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setErrorMessage(null);
    try {
      const outcome = await runSelfTest();
      setResult(outcome);
      persistResult(outcome);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Self test failed";
      setErrorMessage(message);
    } finally {
      setIsRunning(false);
    }
  }, [persistResult]);

  const statusMessage = useMemo(() => {
    if (isRunning) return "Running self test…";
    if (!result) return "Self test has not been run yet.";
    return result.status === "pass" ? "Self test passed" : "Self test failed";
  }, [isRunning, result]);

  return (
    <section className="flex flex-col gap-4 p-4 text-ubt-grey">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleRun}
          className="px-4 py-2 rounded bg-ub-orange text-white disabled:opacity-60"
          disabled={isRunning}
        >
          Run self test
        </button>
        <p role="status" aria-live="polite" className="text-sm">
          {statusMessage}
        </p>
      </div>
      {errorMessage && (
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      )}
      {result && (
        <div className="space-y-2">
          <p className="text-sm">
            Last run: {formatTimestamp(result.finishedAt) || "Unknown"} · Mode:{" "}
            {result.safeMode ? "Safe" : "Standard"} · App: {result.appId || "unknown"}
          </p>
          {result.error && result.status === "fail" && (
            <p className="text-sm text-red-300">{result.error}</p>
          )}
          <ol
            className="list-decimal pl-5 space-y-1 text-sm"
            aria-label="Self test trace"
          >
            {result.steps.map((step) => (
              <li key={step.id}>
                <span className="font-medium">{step.label}</span>: {step.status === "pass" ? "Pass" : "Fail"}
                {` in ${formatDuration(step.durationMs)}`}
                {step.detail ? ` – ${step.detail}` : ""}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
