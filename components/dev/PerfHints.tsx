"use client";

import React, { ChangeEvent, useEffect, useMemo, useState, useId } from "react";
import {
  clearLongTaskData,
  getLongTaskSnapshot,
  setLongTaskDebugLogging,
  setLongTaskThreshold,
  startLongTaskObserver,
  stopLongTaskObserver,
  subscribeToLongTaskInsights,
  type LongTaskInsight,
  type LongTaskSnapshot,
} from "../../utils/longTasks";

const toggleButtonClass = (active: boolean) =>
  `rounded px-3 py-1 text-xs font-semibold transition-colors ${
    active
      ? "bg-emerald-400 text-slate-900 shadow"
      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
  }`;

const secondaryButtonClass =
  "rounded px-3 py-1 text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors";

const candidateHeuristic = (insight: LongTaskInsight) =>
  insight.avgDuration >= 80 || (insight.maxDuration >= 120 && insight.occurrences >= 2);

const stackLink = (stack: string, index: number) =>
  `data:text/plain;charset=utf-8,${encodeURIComponent(stack)}#stack-${index + 1}`;

const PerfHints: React.FC = () => {
  const [snapshot, setSnapshot] = useState<LongTaskSnapshot>(getLongTaskSnapshot);
  const [enabled, setEnabled] = useState(snapshot.observing);
  const [debug, setDebug] = useState(snapshot.debug);
  const [threshold, setThreshold] = useState(snapshot.threshold);
  const thresholdId = useId();

  useEffect(() => {
    return subscribeToLongTaskInsights((next) => {
      setSnapshot(next);
    });
  }, []);

  useEffect(() => {
    if (snapshot.observing !== enabled) {
      setEnabled(snapshot.observing);
    }
  }, [snapshot.observing, enabled]);

  useEffect(() => {
    if (snapshot.debug !== debug) {
      setDebug(snapshot.debug);
    }
  }, [snapshot.debug, debug]);

  useEffect(() => {
    if (snapshot.threshold !== threshold) {
      setThreshold(snapshot.threshold);
    }
  }, [snapshot.threshold, threshold]);

  useEffect(() => {
    if (!enabled) {
      stopLongTaskObserver();
      return;
    }

    const ok = startLongTaskObserver({ threshold });
    if (!ok) {
      setEnabled(false);
    }
  }, [enabled, threshold]);

  useEffect(() => {
    setLongTaskDebugLogging(debug);
  }, [debug]);

  const workerCandidates = useMemo(
    () => snapshot.insights.filter(candidateHeuristic),
    [snapshot.insights],
  );

  const handleThresholdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (!Number.isFinite(next) || next <= 0) return;
    setThreshold(next);
    setLongTaskThreshold(next);
  };

  const insights = snapshot.insights;
  const samples = snapshot.samples;

  return (
    <section className="rounded-lg border border-slate-700/70 bg-slate-950/70 p-4 text-xs text-slate-200 shadow-lg">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-sky-200">Performance hints</h2>
          <p className="text-slate-400">
            Observes main-thread long tasks above {threshold}ms and groups frequent offenders.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={enabled}
            className={toggleButtonClass(enabled)}
            onClick={() => setEnabled((value) => !value)}
            disabled={!snapshot.supported}
          >
            {enabled ? "Tracking" : "Start tracking"}
          </button>
          <button
            type="button"
            aria-pressed={debug}
            className={toggleButtonClass(debug)}
            onClick={() => setDebug((value) => !value)}
            disabled={!snapshot.supported}
          >
            {debug ? "Debug on" : "Enable debug"}
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => clearLongTaskData()}
            disabled={!snapshot.supported}
          >
            Clear data
          </button>
        </div>
      </header>

      {!snapshot.supported ? (
        <p className="mt-4 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200">
          This browser does not expose the PerformanceObserver long task entry type.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-slate-300">
              <label className="text-slate-300" htmlFor={thresholdId}>
                Threshold
              </label>
              <input
                type="number"
                className="w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                min={10}
                step={10}
                id={thresholdId}
                value={threshold}
                onChange={handleThresholdChange}
                aria-label="Long task threshold"
              />
            </div>
            <span className="text-slate-400">
              {insights.length} offender{insights.length === 1 ? "" : "s"} · {samples.length} sample
              {samples.length === 1 ? "" : "s"}
            </span>
            {workerCandidates.length > 0 && (
              <span className="rounded-full bg-amber-500/20 px-3 py-1 text-amber-200">
                {workerCandidates.length} worker candidate{workerCandidates.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {insights.length === 0 ? (
              <p className="rounded border border-slate-800 bg-slate-900/60 p-3 text-slate-400">
                No long tasks recorded yet. Interact with the UI or keep this panel open while navigating.
              </p>
            ) : (
              insights.map((insight) => {
                const candidate = candidateHeuristic(insight);
                return (
                  <article
                    key={insight.key}
                    className={`rounded border p-3 transition-colors ${
                      candidate
                        ? "border-amber-400/60 bg-amber-500/10"
                        : "border-slate-800 bg-slate-900/60"
                    }`}
                  >
                    <header className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">{insight.label}</h3>
                        <p className="text-slate-400">
                          {insight.occurrences} hit{insight.occurrences === 1 ? "" : "s"} · avg {Math.round(insight.avgDuration)}ms ·
                          max {Math.round(insight.maxDuration)}ms · total {Math.round(insight.totalDuration)}ms
                        </p>
                      </div>
                      {candidate && (
                        <span className="rounded-full bg-amber-400/20 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-200">
                          Likely worker candidate
                        </span>
                      )}
                    </header>
                    <div className="mt-2 space-y-2 text-slate-300">
                      {insight.scriptURL && (
                        <a
                          href={insight.scriptURL}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sky-300 hover:text-sky-200"
                        >
                          <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-sky-100">
                            Script
                          </span>
                          <span className="truncate">{insight.scriptURL}</span>
                        </a>
                      )}
                      {insight.stackTraces.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[0.65rem] uppercase tracking-wide text-slate-400">Stack traces</span>
                          <div className="flex flex-wrap gap-2">
                            {insight.stackTraces.map((stack, index) => (
                              <a
                                key={`${insight.key}-stack-${index}`}
                                href={stackLink(stack, index)}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded bg-slate-800 px-2 py-1 text-[0.65rem] text-slate-200 hover:bg-slate-700"
                              >
                                View stack #{index + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {samples.length > 0 && (
            <div className="mt-5">
              <h4 className="text-[0.7rem] font-semibold uppercase tracking-wide text-sky-200">
                Recent samples (latest first)
              </h4>
              <ul className="mt-2 max-h-60 space-y-2 overflow-y-auto pr-1">
                {samples.slice(0, 10).map((sample) => (
                  <li
                    key={sample.id}
                    className="rounded border border-slate-800 bg-slate-900/60 p-2 text-slate-300"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-100">{sample.label}</span>
                      <span className="text-slate-400">{Math.round(sample.duration)}ms @ {Math.round(sample.startTime)}ms</span>
                    </div>
                    {sample.scriptURL && (
                      <div className="mt-1 text-slate-400">
                        <span className="text-[0.65rem] uppercase tracking-wide text-slate-500">Script</span>{" "}
                        <a
                          href={sample.scriptURL}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-300 hover:text-sky-200"
                        >
                          {sample.scriptURL}
                        </a>
                      </div>
                    )}
                    {sample.stack && (
                      <div className="mt-1 text-slate-400">
                        <span className="text-[0.65rem] uppercase tracking-wide text-slate-500">Stack</span>{" "}
                        <a
                          href={stackLink(sample.stack, 0)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-300 hover:text-sky-200"
                        >
                          Open stack trace
                        </a>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default PerfHints;
