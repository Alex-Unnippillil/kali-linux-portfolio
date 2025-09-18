import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSettings } from '../../../hooks/useSettings';
import {
  applyCpuGovernor,
  applyDisplaySleep,
  applyPowerPlan,
  calibrateBattery,
  fetchPowerHistory,
  fetchThermalSummary,
  getBatterySnapshot,
  listApps,
  listDevices,
  subscribeToPowerStream,
  type BatterySnapshot,
  type CalibrationResult,
  type CpuGovernor,
  type DisplaySleep,
  type PowerPlan,
  type PowerSample,
  type ThermalSummary,
} from '../../../utils/powerManager';
import { groupSamplesByHour, toDisplayHour } from './data';
import { logEvent } from '../../../utils/analytics';

interface SummaryItem {
  label: string;
  value: string;
  subLabel?: string;
}

const PLAN_OPTIONS: PowerPlan[] = ['performance', 'balanced', 'battery-saver'];
const GOVERNOR_OPTIONS: CpuGovernor[] = ['performance', 'balanced', 'powersave'];
const DISPLAY_SLEEP_OPTIONS: DisplaySleep[] = [1, 5, 10, 30, 'never'];

const formatPlanLabel = (plan: PowerPlan) => {
  if (plan === 'battery-saver') return 'Battery Saver';
  if (plan === 'balanced') return 'Balanced';
  return 'Performance';
};

const formatGovernorLabel = (governor: CpuGovernor) => {
  if (governor === 'powersave') return 'Power Save';
  if (governor === 'performance') return 'Performance';
  return 'Balanced';
};

const formatDisplaySleepLabel = (sleep: DisplaySleep) => {
  if (sleep === 'never') return 'Never';
  if (sleep === 0) return 'Never';
  if (sleep === 1) return '1 minute';
  return `${sleep} minutes`;
};

const formatRuntime = (minutes: number | undefined): string => {
  if (!minutes || !Number.isFinite(minutes)) {
    return 'n/a';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
};

const drawLineChart = (
  canvas: HTMLCanvasElement | null,
  values: number[],
  options: { color: string; label: string; max?: number; min?: number },
) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i += 1) {
    const y = (i / gridLines) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const filteredValues = values.filter((value) => Number.isFinite(value));
  const maxValue = options.max ?? Math.max(100, Math.max(...filteredValues, 0) + 5);
  const minValue = options.min ?? Math.min(0, Math.min(...filteredValues, 0) - 5);
  const range = maxValue - minValue || 1;

  if (filteredValues.length) {
    ctx.strokeStyle = options.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const percent = (value - minValue) / range;
      const y = height - percent * height;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    const latestValue = values[values.length - 1];
    const percent = (latestValue - minValue) / range;
    const y = height - percent * height;
    const x = width;
    ctx.fillStyle = options.color;
    ctx.beginPath();
    ctx.arc(x - 6, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  const latest = values[values.length - 1];
  const suffix = Number.isFinite(latest) ? latest.toFixed(1) : '--';
  ctx.fillText(`${options.label}: ${suffix}`, 8, 16);
};

const PowerDashboard: React.FC = () => {
  const {
    powerPlan,
    setPowerPlan: updatePowerPlan,
    cpuGovernor,
    setCpuGovernor: updateCpuGovernor,
    displaySleep,
    setDisplaySleep: updateDisplaySleep,
  } = useSettings();
  const [samples, setSamples] = useState<PowerSample[]>([]);
  const [batterySnapshot, setBatterySnapshot] = useState<BatterySnapshot | null>(null);
  const [thermalSummary, setThermalSummary] = useState<ThermalSummary | null>(null);
  const [controlFeedback, setControlFeedback] = useState<string | null>(null);
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [calibrationInput, setCalibrationInput] = useState('');
  const [calibrationResult, setCalibrationResult] = useState<CalibrationResult | null>(null);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);

  const deviceOptions = useMemo(() => listDevices(), []);
  const appOptions = useMemo(() => listApps(), []);

  const deviceLabel = useMemo(() => {
    const map = new Map<string, string>();
    deviceOptions.forEach((device) => {
      map.set(device.id, device.label);
    });
    return map;
  }, [deviceOptions]);

  const [selectedDevices, setSelectedDevices] = useState<string[]>(() =>
    deviceOptions.map((device) => device.id),
  );
  const [selectedApps, setSelectedApps] = useState<string[]>(() => appOptions.map((app) => app.id));

  const batteryCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const thermalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const statusRegion = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [history, snapshot] = await Promise.all([
        fetchPowerHistory(),
        getBatterySnapshot(),
      ]);
      if (!active) return;
      setSamples(history);
      setBatterySnapshot(snapshot);
    })();
    const unsubscribe = subscribeToPowerStream((sample) => {
      setSamples((prev) => {
        const next = [...prev, sample];
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        return next.filter((item) => item.timestamp >= cutoff);
      });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const summary = await fetchThermalSummary(samples);
      if (!cancelled) {
        setThermalSummary(summary);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [samples]);

  const toggleDevice = useCallback((id: string) => {
    setSelectedDevices((current) => {
      if (current.includes(id)) {
        if (current.length === 1) return current;
        return current.filter((device) => device !== id);
      }
      return [...current, id];
    });
  }, []);

  const toggleApp = useCallback((id: string) => {
    setSelectedApps((current) => {
      if (current.includes(id)) {
        if (current.length === 1) return current;
        return current.filter((app) => app !== id);
      }
      return [...current, id];
    });
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedDevices(deviceOptions.map((device) => device.id));
    setSelectedApps(appOptions.map((app) => app.id));
  }, [deviceOptions, appOptions]);

  const selectedDeviceSet = useMemo(() => new Set(selectedDevices), [selectedDevices]);
  const selectedAppSet = useMemo(() => new Set(selectedApps), [selectedApps]);

  const filteredSamples = useMemo(
    () =>
      samples.filter(
        (sample) =>
          selectedDeviceSet.has(sample.deviceId) &&
          (selectedAppSet.size === 0 || selectedAppSet.has(sample.appId)),
      ),
    [samples, selectedDeviceSet, selectedAppSet],
  );

  const hourlyGroups = useMemo(() => groupSamplesByHour(filteredSamples), [filteredSamples]);

  const batterySeries = useMemo(() => hourlyGroups.map((group) => group.averageLevel), [hourlyGroups]);
  const thermalSeries = useMemo(
    () => hourlyGroups.map((group) => group.averageTemperature),
    [hourlyGroups],
  );

  useEffect(() => {
    drawLineChart(batteryCanvasRef.current, batterySeries, {
      color: '#4ade80',
      label: 'Battery',
      max: 100,
      min: 0,
    });
  }, [batterySeries]);

  useEffect(() => {
    const maxTemp = Math.max(50, Math.max(...thermalSeries, 0) + 5);
    drawLineChart(thermalCanvasRef.current, thermalSeries, {
      color: '#60a5fa',
      label: 'Temperature °C',
      max: maxTemp,
      min: 20,
    });
  }, [thermalSeries]);

  const stats = useMemo(() => {
    const lastSample = filteredSamples[filteredSamples.length - 1];
    const currentBattery = lastSample?.batteryLevel ?? batterySnapshot?.level ?? 0;
    const lowestBattery = hourlyGroups.reduce(
      (min, group) => Math.min(min, group.minLevel || min),
      Number.isFinite(currentBattery) ? currentBattery : 0,
    );
    const averageBattery = hourlyGroups.length
      ? hourlyGroups.reduce((sum, group) => sum + group.averageLevel, 0) / hourlyGroups.length
      : currentBattery;
    const maxTemp = hourlyGroups.reduce(
      (max, group) => Math.max(max, group.averageTemperature),
      thermalSummary?.max ?? 0,
    );
    const uniqueDevices = new Set(filteredSamples.map((sample) => sample.deviceId)).size;
    const uniqueApps = new Set(filteredSamples.map((sample) => sample.appId)).size;
    const lastUpdated = lastSample?.timestamp ?? batterySnapshot?.timestamp ?? Date.now();
    return {
      currentBattery,
      lowestBattery,
      averageBattery,
      maxTemp,
      uniqueDevices,
      uniqueApps,
      sampleCount: filteredSamples.length,
      lastUpdated,
    };
  }, [
    filteredSamples,
    hourlyGroups,
    batterySnapshot?.level,
    batterySnapshot?.timestamp,
    thermalSummary?.max,
  ]);

  const summaryItems: SummaryItem[] = [
    {
      label: 'Current Battery',
      value: `${Math.round(stats.currentBattery * 10) / 10}%`,
      subLabel: `Updated ${new Date(stats.lastUpdated).toLocaleTimeString()}`,
    },
    {
      label: 'Average 24h Level',
      value: `${Math.round(stats.averageBattery)}%`,
      subLabel: `${stats.sampleCount} samples`,
    },
    {
      label: 'Peak Temperature',
      value: `${Math.round(stats.maxTemp)}°C`,
      subLabel: thermalSummary?.hottestDevice
        ? `Hottest: ${deviceLabel.get(thermalSummary.hottestDevice) ?? thermalSummary.hottestDevice}`
        : undefined,
    },
    {
      label: 'Fleet Coverage',
      value: `${stats.uniqueDevices} devices / ${stats.uniqueApps} apps`,
      subLabel: stats.uniqueDevices === deviceOptions.length ? 'All devices' : 'Filtered view',
    },
  ];

  const announceStatus = useCallback((message: string) => {
    if (statusRegion.current) {
      statusRegion.current.textContent = message;
    }
    setControlFeedback(message);
  }, []);

  const handlePlanChange = useCallback(
    async (plan: PowerPlan) => {
      try {
        updatePowerPlan(plan);
        await applyPowerPlan(plan);
        announceStatus(`Power plan set to ${formatPlanLabel(plan)}`);
      } catch (error) {
        announceStatus('Failed to update power plan');
        console.error(error);
      }
    },
    [announceStatus, updatePowerPlan],
  );

  const handleGovernorChange = useCallback(
    async (governor: CpuGovernor) => {
      try {
        updateCpuGovernor(governor);
        await applyCpuGovernor(governor);
        announceStatus(`CPU governor switched to ${formatGovernorLabel(governor)}`);
      } catch (error) {
        announceStatus('Failed to update CPU governor');
        console.error(error);
      }
    },
    [announceStatus, updateCpuGovernor],
  );

  const handleDisplaySleepChange = useCallback(
    async (value: DisplaySleep) => {
      try {
        updateDisplaySleep(value);
        await applyDisplaySleep(value);
        announceStatus(`Display sleep set to ${formatDisplaySleepLabel(value)}`);
      } catch (error) {
        announceStatus('Failed to apply display sleep preference');
        console.error(error);
      }
    },
    [announceStatus, updateDisplaySleep],
  );

  const handleCalibration = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const observed = Number(calibrationInput);
      if (Number.isNaN(observed) || observed < 0 || observed > 100) {
        setCalibrationError('Enter a value between 0 and 100.');
        return;
      }
      const result = calibrateBattery(filteredSamples, observed);
      const map = new Map<string, PowerSample>();
      result.adjustedHistory.forEach((sample) => {
        map.set(`${sample.timestamp}:${sample.deviceId}:${sample.appId}`, sample);
      });
      setSamples((prev) =>
        prev.map((sample) => {
          const key = `${sample.timestamp}:${sample.deviceId}:${sample.appId}`;
          return map.get(key) ?? sample;
        }),
      );
      setCalibrationResult(result);
      setCalibrationError(null);
      setCalibrationInput('');
      announceStatus(
        `Calibration applied. Offset ${result.offset.toFixed(1)}%. Runtime ${formatRuntime(
          result.projectedRuntimeMinutes,
        )}.`,
      );
      setBatterySnapshot((snapshot) => ({
        timestamp: Date.now(),
        level: Math.round(result.adjustedHistory[result.adjustedHistory.length - 1]?.batteryLevel ?? observed),
        charging: snapshot?.charging ?? false,
        temperatureC:
          result.adjustedHistory[result.adjustedHistory.length - 1]?.temperatureC ??
          snapshot?.temperatureC ??
          0,
      }));
      logEvent({
        category: 'power-dashboard',
        action: 'calibration',
        label: `offset=${result.offset.toFixed(2)},runtime=${Math.round(
          result.projectedRuntimeMinutes || 0,
        )}`,
        value: Math.round(result.projectedRuntimeMinutes || 0),
      });
    },
    [announceStatus, calibrationInput, filteredSamples],
  );

  const displayedHours = useMemo(
    () =>
      hourlyGroups.filter((_, index) => index === 0 || index === hourlyGroups.length - 1 || index % 6 === 0),
    [hourlyGroups],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ub-cool-grey text-white">
      <header className="p-4">
        <h1 className="text-xl font-semibold">Power Dashboard</h1>
        <p className="text-xs text-ubt-grey">
          Monitor device battery usage and thermal trends across the last 24 hours.
        </p>
      </header>
      <main className="flex-1 space-y-4 overflow-y-auto p-4">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <div key={item.label} className="rounded-md border border-gray-700 bg-ub-dark-grey p-3 shadow-inner">
              <p className="text-xs uppercase tracking-wide text-ubt-grey">{item.label}</p>
              <p className="text-2xl font-semibold">{item.value}</p>
              {item.subLabel ? <p className="text-xs text-ubt-grey">{item.subLabel}</p> : null}
            </div>
          ))}
          {calibrationResult ? (
            <div className="rounded-md border border-gray-700 bg-ub-dark-grey p-3 shadow-inner">
              <p className="text-xs uppercase tracking-wide text-ubt-grey">Calibration</p>
              <p className="text-2xl font-semibold">
                Offset {calibrationResult.offset.toFixed(1)}%
              </p>
              <p className="text-xs text-ubt-grey">
                Projected runtime {formatRuntime(calibrationResult.projectedRuntimeMinutes)}
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-md border border-gray-800 bg-ub-dark-grey p-4 shadow-inner">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Filters</h2>
              <p className="text-xs text-ubt-grey">Choose which devices and apps to visualise.</p>
            </div>
            <button
              onClick={resetFilters}
              className="self-start rounded bg-ub-cool-grey px-3 py-1 text-xs hover:bg-ub-cool-grey/80"
            >
              Reset filters
            </button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <fieldset>
              <legend className="text-sm font-semibold">Devices</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {deviceOptions.map((device) => (
                  <label key={device.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="accent-ub-orange"
                      checked={selectedDevices.includes(device.id)}
                      onChange={() => toggleDevice(device.id)}
                    />
                    <span>{device.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-semibold">Apps</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {appOptions.map((app) => (
                  <label key={app.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="accent-ub-orange"
                      checked={selectedApps.includes(app.id)}
                      onChange={() => toggleApp(app.id)}
                    />
                    <span>{app.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        <section className="rounded-md border border-gray-800 bg-ub-dark-grey p-4 shadow-inner">
          <h2 className="text-lg font-semibold">24 hour telemetry</h2>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div>
              <canvas
                ref={batteryCanvasRef}
                width={420}
                height={180}
                role="img"
                aria-label="Battery level over time"
                className="w-full"
              />
            </div>
            <div>
              <canvas
                ref={thermalCanvasRef}
                width={420}
                height={180}
                role="img"
                aria-label="Temperature over time"
                className="w-full"
              />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[0.65rem] uppercase tracking-wide text-ubt-grey">
            {displayedHours.map((group) => (
              <span key={group.hour}>{toDisplayHour(group.hour)}</span>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-gray-800 bg-ub-dark-grey p-4 shadow-inner">
          <h2 className="text-lg font-semibold">Power controls</h2>
          <p className="text-xs text-ubt-grey">
            Tune performance and standby behaviour. Settings persist via desktop preferences.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-ubt-grey">Plan</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PLAN_OPTIONS.map((plan) => {
                  const active = powerPlan === plan;
                  return (
                    <button
                      key={plan}
                      onClick={() => handlePlanChange(plan)}
                      className={`rounded px-3 py-1 text-xs transition ${
                        active
                          ? 'bg-ub-orange text-black'
                          : 'bg-ub-cool-grey hover:bg-ub-cool-grey/80'
                      }`}
                      aria-pressed={active}
                    >
                      {formatPlanLabel(plan)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-ubt-grey" htmlFor="governor-select">
                CPU Governor
              </label>
              <select
                id="governor-select"
                value={cpuGovernor}
                onChange={(event) => handleGovernorChange(event.target.value as CpuGovernor)}
                className="mt-2 w-full rounded bg-ub-cool-grey p-2 text-sm"
              >
                {GOVERNOR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatGovernorLabel(option)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-ubt-grey" htmlFor="display-sleep">
                Display Sleep
              </label>
              <select
                id="display-sleep"
                value={displaySleep === 'never' ? 'never' : String(displaySleep)}
                onChange={(event) => {
                  const value = event.target.value === 'never' ? 'never' : Number(event.target.value);
                  handleDisplaySleepChange(value as DisplaySleep);
                }}
                className="mt-2 w-full rounded bg-ub-cool-grey p-2 text-sm"
              >
                {DISPLAY_SLEEP_OPTIONS.map((option) => (
                  <option key={option.toString()} value={option.toString()}>
                    {formatDisplaySleepLabel(option)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p ref={statusRegion} role="status" className="mt-3 text-xs text-ubt-grey">
            {controlFeedback}
          </p>
        </section>

        <section className="rounded-md border border-gray-800 bg-ub-dark-grey p-4 shadow-inner">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Battery calibration</h2>
              <p className="text-xs text-ubt-grey">
                Enter the observed state-of-charge to realign simulated estimates.
              </p>
            </div>
            <button
              onClick={() => setCalibrationMode((value) => !value)}
              className="rounded bg-ub-cool-grey px-3 py-1 text-xs hover:bg-ub-cool-grey/80"
            >
              {calibrationMode ? 'Close' : 'Start calibration'}
            </button>
          </div>
          {calibrationMode ? (
            <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={handleCalibration}>
              <label className="text-sm">
                Observed battery %
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={calibrationInput}
                  onChange={(event) => setCalibrationInput(event.target.value)}
                  className="mt-1 w-full rounded bg-ub-cool-grey p-2 text-sm"
                  required
                />
              </label>
              <div className="md:col-span-2">
                <p className="text-xs text-ubt-grey">
                  Calibration adjusts historical samples to better match real usage. Runtime is estimated
                  from the adjusted discharge slope.
                </p>
                {calibrationError ? (
                  <p className="mt-1 text-xs text-red-400">{calibrationError}</p>
                ) : null}
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  className="rounded bg-ub-orange px-4 py-1 text-xs font-semibold text-black"
                >
                  Apply calibration
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </main>
    </div>
  );
};

export const displayPowerDashboard = () => <PowerDashboard />;

export default PowerDashboard;
