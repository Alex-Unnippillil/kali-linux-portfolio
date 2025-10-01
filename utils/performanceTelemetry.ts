import { logEvent } from './analytics';
import type { PerformanceGraphTelemetry } from './canvas/performanceGraphRenderer';

interface TelemetryRecord {
  p95: number;
  sampleCount: number;
}

type Mode = 'offscreen' | 'fallback';

const latest: Partial<Record<Mode, TelemetryRecord>> = {};
let comparisonLogged = false;

const logTelemetry = (mode: Mode, record: TelemetryRecord) => {
  logEvent({
    category: 'PerfGraph',
    action: 'frame-p95',
    label: `${mode}:${record.sampleCount}`,
    value: Math.round(record.p95),
  });

  if (typeof console !== 'undefined') {
    console.info(
      `[PerfGraph] ${mode} p95=${record.p95.toFixed(2)}ms from ${record.sampleCount} samples`
    );
  }
};

const compareTelemetry = () => {
  const offscreen = latest.offscreen;
  const fallback = latest.fallback;
  if (!offscreen || !fallback) return;
  if (fallback.p95 <= 0) return;

  const improvement = ((fallback.p95 - offscreen.p95) / fallback.p95) * 100;
  if (Number.isFinite(improvement) && improvement >= 30 && !comparisonLogged) {
    comparisonLogged = true;
    logEvent({
      category: 'PerfGraph',
      action: 'offscreen-improvement',
      value: Math.round(improvement),
    });
  }

  if (typeof console !== 'undefined') {
    console.info(
      `[PerfGraph] Offscreen vs fallback improvement ${improvement.toFixed(1)}%`
    );
  }
};

export const ingestPerformanceTelemetry = (
  payload: PerformanceGraphTelemetry
): void => {
  const { mode, p95, sampleCount } = payload;
  if (mode !== 'offscreen' && mode !== 'fallback') return;

  const record = { p95, sampleCount };
  latest[mode] = record;
  logTelemetry(mode, record);
  compareTelemetry();
};

export default ingestPerformanceTelemetry;
