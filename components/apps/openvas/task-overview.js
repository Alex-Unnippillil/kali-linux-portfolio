import React, { useMemo, useReducer } from 'react';
import FeedStatusCard from './feed-status-card';
import TaskRunChart from './task-run-chart';
import history from './task-history.json';
import {
  applyTaskFilters,
  calculateFilterMetrics,
  createInitialFilterState,
  summarizeFilteredData,
  taskFilterReducer,
} from './taskFilters';

const generateHistory = () => {
  const baseTimestamp = history.length
    ? Date.parse(history[0].time)
    : Date.now();
  const runs = [];
  const batches = 400;
  for (let batch = 0; batch < batches; batch += 1) {
    history.forEach((entry, idx) => {
      const offset = batch * history.length + idx;
      const time = new Date(baseTimestamp + offset * 5 * 60 * 1000).toISOString();
      const jitter = ((offset % 7) - 3) * 12;
      const latency = Math.max(120, entry.latency + jitter);
      const status = offset % 11 === 0 ? 'fail' : entry.status;
      runs.push({
        id: `${time}-${offset}`,
        time,
        status,
        latency,
      });
    });
  }
  return runs;
};

const statusOptions = [
  { id: 'success', label: 'Success' },
  { id: 'fail', label: 'Fail' },
];

const TaskOverview = () => {
  const data = useMemo(generateHistory, []);
  const [filters, dispatch] = useReducer(
    taskFilterReducer,
    undefined,
    createInitialFilterState
  );

  const filteredData = useMemo(
    () => applyTaskFilters(data, filters),
    [data, filters]
  );

  const metrics = useMemo(
    () => calculateFilterMetrics(filteredData),
    [filteredData]
  );

  const summary = useMemo(
    () => summarizeFilteredData(filteredData, metrics),
    [filteredData, metrics]
  );

  const summaryId = 'task-overview-summary';

  return (
    <div className="mb-4 space-y-4">
      <FeedStatusCard />
      <div className="space-y-4 rounded bg-gray-800 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-md font-bold">Demo Task Overview</h3>
            <p className="text-xs text-gray-300">
              Visualize task runs with interactive zoom, panning, and filter controls.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'reset' })}
            className="self-start rounded bg-gray-700 px-3 py-1 text-xs font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-ubt-blue"
          >
            Reset filters
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-white">Status</legend>
            {statusOptions.map((option) => {
              const inputId = `task-status-${option.id}`;
              const labelId = `${inputId}-label`;
              return (
                <label
                  key={option.id}
                  htmlFor={inputId}
                  className="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-200"
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={filters.statuses[option.id]}
                    onChange={(event) =>
                      dispatch({
                        type: 'toggle-status',
                        status: option.id,
                        enabled: event.target.checked,
                      })
                    }
                    aria-labelledby={labelId}
                    className="h-4 w-4 rounded border-gray-500 bg-gray-900 text-ubt-blue focus:ring-ubt-blue"
                  />
                  <span id={labelId}>{option.label}</span>
                </label>
              );
            })}
          </fieldset>

          <div className="flex flex-col gap-2 text-sm text-gray-200" role="group" aria-labelledby="max-latency-label">
            <span id="max-latency-label" className="font-semibold">
              Maximum latency (ms)
            </span>
            <div className="flex items-center gap-2">
              <input
                id="max-latency-slider"
                type="range"
                min="0"
                max="2000"
                step="50"
                value={filters.maxLatency ?? 2000}
                onChange={(event) =>
                  dispatch({
                    type: 'set-max-latency',
                    maxLatency:
                      event.target.valueAsNumber === 2000
                        ? null
                        : event.target.valueAsNumber,
                  })
                }
                aria-describedby="latency-hint"
                aria-labelledby="max-latency-label"
                className="grow"
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="max-latency-input" className="text-xs text-gray-300">
                  Manual entry
                </label>
                <input
                  id="max-latency-input"
                  type="number"
                  min="0"
                  max="2000"
                  step="10"
                  value={filters.maxLatency ?? ''}
                  onChange={(event) =>
                    dispatch({
                      type: 'set-max-latency',
                      maxLatency:
                        event.target.value === ''
                          ? null
                          : Number(event.target.value),
                    })
                  }
                  aria-labelledby="max-latency-label"
                  className="w-24 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-right text-sm text-white focus:border-ubt-blue focus:outline-none"
                />
              </div>
            </div>
            <span id="latency-hint" className="text-xs text-gray-400">
              Leave blank or set to 2000 to include all latencies.
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded border border-gray-700 p-3 text-sm text-gray-200">
            <p className="text-xs uppercase text-gray-400">Runs</p>
            <p className="text-lg font-semibold text-white">{metrics.total}</p>
          </div>
          <div className="rounded border border-gray-700 p-3 text-sm text-gray-200">
            <p className="text-xs uppercase text-gray-400">Success</p>
            <p className="text-lg font-semibold text-white">{metrics.success}</p>
          </div>
          <div className="rounded border border-gray-700 p-3 text-sm text-gray-200">
            <p className="text-xs uppercase text-gray-400">Failures</p>
            <p className="text-lg font-semibold text-white">{metrics.fail}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-white">Run History</h4>
          <TaskRunChart data={filteredData} />
        </div>

        <div
          id={summaryId}
          role="status"
          aria-live="polite"
          className="rounded border border-gray-700 bg-gray-900/50 p-3 text-xs text-gray-200"
        >
          <p className="font-semibold text-white">Filtered summary</p>
          <p>{summary}</p>
          {metrics.total > 0 && (
            <p className="mt-1 text-gray-300">
              Min latency: {Math.round(metrics.minLatency ?? 0)} ms · Max latency:{' '}
              {Math.round(metrics.maxLatency ?? 0)} ms
            </p>
          )}
        </div>

        <p className="text-xs text-gray-400">
          All task data is canned for demonstration purposes and generated locally for performance experiments.
        </p>
      </div>
    </div>
  );
};

export default TaskOverview;
