'use client';

import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  getWebVitalsClientId,
  getWebVitalsConfig,
  resetWebVitalsConfig,
  subscribeToWebVitalsConfig,
  updateWebVitalsConfig,
  WebVitalsSamplingConfig,
} from '../../utils/webVitalsConfig';

const METRICS: Array<{ key: string; label: string }> = [
  { key: 'LCP', label: 'Largest Contentful Paint (LCP)' },
  { key: 'INP', label: 'Interaction to Next Paint (INP)' },
];

const rateToPercent = (rate: number): number => Math.round(rate * 100);

const percentToRate = (value: number): number => Math.min(Math.max(value / 100, 0), 1);

const toTextareaValue = (values: string[]): string => values.join('\n');

const parseTextareaValue = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const formatPercentLabel = (percent: number): string => `${percent}%`;

const WebVitalsSamplingSettings = () => {
  const [config, setConfig] = useState<WebVitalsSamplingConfig>(() => getWebVitalsConfig());
  const [clientId, setClientId] = useState('');
  const defaultRateId = 'web-vitals-default-rate';
  const routeAllowlistId = 'web-vitals-route-allowlist';
  const deviceToggleId = 'web-vitals-device-allow';

  useEffect(() => {
    const unsubscribe = subscribeToWebVitalsConfig((next) => {
      setConfig(next);
    });
    setClientId(getWebVitalsClientId());
    return () => {
      unsubscribe();
    };
  }, []);

  const defaultPercent = useMemo(
    () => rateToPercent(config.defaultSampleRate),
    [config.defaultSampleRate]
  );

  const handleDefaultRateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextPercent = Number(event.target.value);
    const next = updateWebVitalsConfig({ defaultSampleRate: percentToRate(nextPercent) });
    setConfig(next);
  };

  const handleMetricRateChange = (
    metric: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const nextPercent = Number(event.target.value);
    const next = updateWebVitalsConfig({ sampleRates: { [metric]: percentToRate(nextPercent) } });
    setConfig(next);
  };

  const handleRoutesChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const routes = parseTextareaValue(event.target.value);
    const next = updateWebVitalsConfig({ allowRoutes: routes });
    setConfig(next);
  };

  const handleClientToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const allow = event.target.checked;
    const nextAllowClients = new Set(config.allowClients);
    if (allow) {
      nextAllowClients.add(clientId);
    } else {
      nextAllowClients.delete(clientId);
    }
    const next = updateWebVitalsConfig({ allowClients: Array.from(nextAllowClients) });
    setConfig(next);
  };

  const handleReset = () => {
    const next = resetWebVitalsConfig();
    setConfig(next);
  };

  const allowlistValue = useMemo(
    () => toTextareaValue(config.allowRoutes),
    [config.allowRoutes]
  );

  const isClientAllowlisted = clientId ? config.allowClients.includes(clientId) : false;

  return (
    <section className="mt-6 rounded border border-ubt-cool-grey bg-ub-cool-grey/40 p-4 text-left text-ubt-grey">
      <h2 className="text-lg font-semibold text-white">Performance Sampling</h2>
      <p className="mt-1 text-xs text-ubt-grey/70">
        Control how often Web Vitals events are sent during preview deployments. Allowlisted routes or this
        device bypass the sampler.
      </p>
      <div className="mt-4">
        <label className="text-sm font-medium" htmlFor={defaultRateId}>
          Default sample rate: {formatPercentLabel(defaultPercent)}
        </label>
        <input
          id={defaultRateId}
          type="range"
          min="0"
          max="100"
          step="5"
          value={defaultPercent}
          onChange={handleDefaultRateChange}
          className="ubuntu-slider mt-2 w-full"
          aria-label="Default sample rate"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={defaultPercent}
          aria-valuetext={formatPercentLabel(defaultPercent)}
        />
      </div>
      <div className="mt-4 space-y-4">
        {METRICS.map(({ key, label }) => {
          const percent = rateToPercent(config.sampleRates[key] ?? config.defaultSampleRate);
          const metricId = `web-vitals-rate-${key.toLowerCase()}`;
          return (
            <div key={key}>
              <label className="text-sm font-medium" htmlFor={metricId}>
                {label}: {formatPercentLabel(percent)}
              </label>
              <input
                id={metricId}
                type="range"
                min="0"
                max="100"
                step="5"
                value={percent}
                onChange={(event) => handleMetricRateChange(key, event)}
                className="ubuntu-slider mt-2 w-full"
                aria-label={`Sample rate for ${label}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-valuetext={formatPercentLabel(percent)}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <label className="text-sm font-medium" htmlFor={routeAllowlistId}>
          Route allowlist
        </label>
        <textarea
          id={routeAllowlistId}
          className="mt-2 w-full rounded border border-ubt-cool-grey bg-black/40 p-2 text-sm text-white"
          rows={3}
          value={allowlistValue}
          onChange={handleRoutesChange}
          placeholder="/apps/*"
          aria-label="Route allowlist"
        />
        <span className="mt-1 block text-xs text-ubt-grey/60">
          Use one pattern per line. The <code className="text-ub-orange">*</code> wildcard matches any characters.
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm">
        <input
          id={deviceToggleId}
          type="checkbox"
          checked={isClientAllowlisted}
          onChange={handleClientToggle}
          aria-label="Always sample on this device"
        />
        <label htmlFor={deviceToggleId} className="select-none">
          Always sample on this device
        </label>
      </div>
      {clientId && (
        <p className="mt-1 break-all text-xs text-ubt-grey/60">Client ID: {clientId}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleReset}
          className="rounded bg-ub-orange px-3 py-1 text-sm font-medium text-white"
        >
          Reset sampling overrides
        </button>
      </div>
    </section>
  );
};

export default WebVitalsSamplingSettings;
