"use client";

import { useEffect, useMemo, useState } from 'react';
import useWindowRules, {
  MonitorSnapshot,
  WindowLayoutMode,
  WindowRule,
  readCurrentMonitors,
} from '../../../hooks/useWindowRules';

const layoutLabels: Record<WindowLayoutMode, string> = {
  float: 'Float (free positioning)',
  tile: 'Tile (snap to grid)',
};

const formatBounds = (monitor: MonitorSnapshot) => {
  if (!monitor.bounds) return 'Unspecified size';
  const { width, height } = monitor.bounds;
  return `${width}×${height}`;
};

const toPercent = (value: number | undefined) => {
  if (typeof value !== 'number') return 100;
  return Math.round(value * 100);
};

const fromPercent = (value: number) => {
  const normalized = Number.isFinite(value) ? value : 100;
  return Math.min(1, Math.max(0, normalized / 100));
};

const fieldLabel = 'text-sm font-semibold text-white';
const fieldInput =
  'w-full bg-black bg-opacity-40 border border-white border-opacity-10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ub-orange focus:border-transparent';

function RuleCard({
  rule,
  index,
  total,
  onMove,
  onRemove,
  onUpdate,
}: {
  rule: WindowRule;
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<WindowRule>) => void;
}) {
  const [titlePattern, setTitlePattern] = useState(rule.match.title?.pattern ?? '');
  const [titleFlags, setTitleFlags] = useState(rule.match.title?.flags ?? '');

  useEffect(() => {
    setTitlePattern(rule.match.title?.pattern ?? '');
    setTitleFlags(rule.match.title?.flags ?? '');
  }, [rule.match.title?.pattern, rule.match.title?.flags]);

  return (
    <section className="bg-black bg-opacity-40 border border-white border-opacity-10 rounded-lg p-4 space-y-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>Rule name</span>
            <input
              className={fieldInput}
              type="text"
              value={rule.name}
              onChange={(event) => onUpdate({ name: event.target.value })}
              placeholder="Focus launcher windows"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={(event) => onUpdate({ enabled: event.target.checked })}
              className="h-4 w-4"
            />
            Enabled
          </label>
        </div>
        <div className="flex gap-2 self-start md:self-auto">
          <button
            type="button"
            aria-label="Move rule up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="px-2 py-1 text-xs border border-white border-opacity-20 rounded disabled:opacity-40"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Move rule down"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="px-2 py-1 text-xs border border-white border-opacity-20 rounded disabled:opacity-40"
          >
            ↓
          </button>
          <button
            type="button"
            aria-label="Delete rule"
            onClick={onRemove}
            className="px-2 py-1 text-xs border border-red-400 text-red-300 border-opacity-40 rounded hover:bg-red-500 hover:bg-opacity-20"
          >
            Delete
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>App ID</span>
          <input
            className={fieldInput}
            type="text"
            value={rule.match.appId ?? ''}
            onChange={(event) =>
              onUpdate({
                match: {
                  ...rule.match,
                  appId: event.target.value || undefined,
                },
              })
            }
            placeholder="terminal"
          />
          <span className="text-xs text-white text-opacity-70">
            Matches the application identifier from the launcher.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Monitor ID</span>
          <input
            className={fieldInput}
            type="text"
            list="window-rule-monitors"
            value={rule.match.monitorId ?? ''}
            onChange={(event) =>
              onUpdate({
                match: {
                  ...rule.match,
                  monitorId: event.target.value || undefined,
                },
              })
            }
            placeholder="primary"
          />
          <span className="text-xs text-white text-opacity-70">
            Optional. Leave empty to target any monitor.
          </span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Title pattern (RegExp)</span>
          <input
            className={fieldInput}
            type="text"
            value={titlePattern}
            onChange={(event) => {
              const value = event.target.value;
              setTitlePattern(value);
              onUpdate({
                match: {
                  ...rule.match,
                  title: value
                    ? {
                        pattern: value,
                        flags: titleFlags || undefined,
                      }
                    : undefined,
                },
              });
            }}
            placeholder="ssh session"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Regex flags</span>
          <input
            className={fieldInput}
            type="text"
            value={titleFlags}
            onChange={(event) => {
              const value = event.target.value;
              setTitleFlags(value);
              onUpdate({
                match: {
                  ...rule.match,
                  title: titlePattern
                    ? {
                        pattern: titlePattern,
                        flags: value || undefined,
                      }
                    : undefined,
                },
              });
            }}
            placeholder="gi"
          />
          <span className="text-xs text-white text-opacity-70">
            Optional JavaScript regex modifiers (g, i, m, …).
          </span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Layout action</span>
          <select
            className={fieldInput}
            value={rule.actions.layout ?? ''}
            onChange={(event) =>
              onUpdate({
                actions: {
                  ...rule.actions,
                  layout: (event.target.value as WindowLayoutMode | '') || undefined,
                },
              })
            }
          >
            <option value="">No change</option>
            {Object.entries(layoutLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span className="text-xs text-white text-opacity-70">
            Tile snaps the window to the desktop grid. Float restores the previous free position.
          </span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={rule.actions.alwaysOnTop ?? false}
            onChange={(event) =>
              onUpdate({
                actions: {
                  ...rule.actions,
                  alwaysOnTop: event.target.checked || undefined,
                },
              })
            }
          />
          <span className="text-sm text-white">Keep window above others</span>
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className={fieldLabel}>Opacity</span>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={toPercent(rule.actions.opacity ?? undefined)}
            onChange={(event) =>
              onUpdate({
                actions: {
                  ...rule.actions,
                  opacity: fromPercent(Number(event.target.value)),
                },
              })
            }
            className="flex-1"
          />
          <span className="w-12 text-right text-sm">
            {toPercent(rule.actions.opacity ?? undefined)}%
          </span>
          <button
            type="button"
            className="px-2 py-1 text-xs border border-white border-opacity-20 rounded"
            onClick={() =>
              onUpdate({
                actions: {
                  ...rule.actions,
                  opacity: undefined,
                },
              })
            }
          >
            Reset
          </button>
        </div>
        <span className="text-xs text-white text-opacity-70">
          Applies only when the window is visible. Minimized windows ignore opacity rules.
        </span>
      </label>
    </section>
  );
}

const WindowRulesApp = () => {
  const {
    rules,
    monitors,
    setMonitors,
    addRule,
    updateRule,
    removeRule,
    moveRule,
  } = useWindowRules();

  useEffect(() => {
    setMonitors(readCurrentMonitors());
    const handle = () => setMonitors(readCurrentMonitors());
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, [setMonitors]);

  const monitorOptions = useMemo(
    () =>
      monitors.map((monitor) => (
        <option key={monitor.id} value={monitor.id}>
          {monitor.name || monitor.id}
        </option>
      )),
    [monitors],
  );

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Window rules</h1>
          <p className="text-sm text-white text-opacity-80">
            Automatically tile, float, or pin application windows based on their metadata. Rules run every time
            a window opens and whenever the monitor layout changes.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Detected monitors</h2>
          {monitors.length === 0 ? (
            <p className="text-sm text-white text-opacity-70">
              No monitors detected. Rules will still apply using the primary display identifier.
            </p>
          ) : (
            <ul className="space-y-1 text-sm text-white text-opacity-80">
              {monitors.map((monitor) => (
                <li key={monitor.id}>
                  <span className="font-medium text-white">{monitor.name || monitor.id}</span>
                  <span className="ml-2 text-white text-opacity-70">
                    {monitor.primary ? '(primary)' : null} {formatBounds(monitor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              const id = addRule({ name: `Rule ${rules.length + 1}` });
              updateRule(id, {});
            }}
            className="rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-black hover:bg-orange-400"
          >
            Add rule
          </button>
          <button
            type="button"
            onClick={() => setMonitors(readCurrentMonitors())}
            className="rounded border border-white border-opacity-20 px-4 py-2 text-sm hover:bg-white hover:bg-opacity-10"
          >
            Refresh monitors
          </button>
        </section>

        <datalist id="window-rule-monitors">{monitorOptions}</datalist>

        {rules.length === 0 ? (
          <p className="text-sm text-white text-opacity-70">
            No rules yet. Add a rule to start customizing window behavior.
          </p>
        ) : (
          <div className="space-y-4">
            {rules.map((rule, index) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                index={index}
                total={rules.length}
                onMove={(direction) => moveRule(rule.id, direction)}
                onRemove={() => removeRule(rule.id)}
                onUpdate={(updates) => updateRule(rule.id, updates)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const displayWindowRules = () => <WindowRulesApp />;

export default WindowRulesApp;
