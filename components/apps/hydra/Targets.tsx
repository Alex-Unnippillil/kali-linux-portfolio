import React, { useEffect, useMemo, useState } from 'react';

type TaskStatus = 'pending' | 'active' | 'done';

type HostTask = {
  id: string;
  host: string;
  status: TaskStatus;
  remaining: number;
  duration: number;
};

type HostGroupDefinition = {
  id: string;
  name: string;
  hosts: string[];
  defaultCap: number;
  accent: string;
};

type HostGroupState = {
  id: string;
  name: string;
  accent: string;
  tasks: HostTask[];
};

type TargetsProps = {
  runId: number;
  running: boolean;
  paused: boolean;
};

const HOST_GROUPS: HostGroupDefinition[] = [
  {
    id: 'internal',
    name: 'Internal Servers',
    hosts: ['10.10.0.11', '10.10.0.19', '10.10.0.27', '10.10.0.35'],
    defaultCap: 2,
    accent: 'bg-blue-500',
  },
  {
    id: 'dmz',
    name: 'DMZ Gateways',
    hosts: ['172.16.10.4', '172.16.10.8', '172.16.10.15'],
    defaultCap: 1,
    accent: 'bg-purple-500',
  },
  {
    id: 'cloud',
    name: 'Cloud Targets',
    hosts: ['52.21.14.88', '52.21.14.102', '52.21.14.115', '52.21.14.143'],
    defaultCap: 3,
    accent: 'bg-emerald-500',
  },
];

const STEP_MS = 600;

const getDurationForHost = (host: string) => {
  const seed = host.split('').reduce((acc, ch, idx) => acc + ch.charCodeAt(0) * (idx + 1), 0);
  return 1500 + (seed % 2200);
};

const buildInitialState = (): HostGroupState[] =>
  HOST_GROUPS.map((group) => ({
    id: group.id,
    name: group.name,
    accent: group.accent,
    tasks: group.hosts.map((host, index) => {
      const duration = getDurationForHost(`${host}-${index}`);
      return {
        id: `${group.id}-${index}`,
        host,
        status: 'pending',
        remaining: duration,
        duration,
      };
    }),
  }));

const deriveDefaultBudgets = () =>
  HOST_GROUPS.reduce<Record<string, number>>((acc, group) => {
    acc[group.id] = group.defaultCap;
    return acc;
  }, {});

const statusChipStyles: Record<TaskStatus, string> = {
  pending: 'bg-gray-700 text-gray-200',
  active: 'bg-yellow-500 text-black',
  done: 'bg-green-500 text-black',
};

const Targets: React.FC<TargetsProps> = ({ runId, running, paused }) => {
  const [groupState, setGroupState] = useState<HostGroupState[]>(() => buildInitialState());
  const [budgets, setBudgets] = useState<Record<string, number>>(() => deriveDefaultBudgets());

  useEffect(() => {
    setGroupState(buildInitialState());
  }, [runId]);

  useEffect(() => {
    if (!running || paused) {
      return;
    }

    const timer = setInterval(() => {
      setGroupState((prev) =>
        prev.map((group) => {
          const cap = Math.max(0, budgets[group.id] ?? 0);

          let tasks = group.tasks.map((task) => {
            if (task.status !== 'active') {
              return task;
            }
            const remaining = Math.max(task.remaining - STEP_MS, 0);
            if (remaining === 0) {
              return { ...task, status: 'done', remaining };
            }
            return { ...task, remaining };
          });

          let activeCount = tasks.filter((task) => task.status === 'active').length;

          if (cap > activeCount) {
            let scheduled = 0;
            const slots = cap - activeCount;
            tasks = tasks.map((task) => {
              if (scheduled < slots && task.status === 'pending') {
                scheduled += 1;
                return { ...task, status: 'active' };
              }
              return task;
            });
            activeCount += scheduled;
          }

          return { ...group, tasks };
        })
      );
    }, STEP_MS);

    return () => clearInterval(timer);
  }, [running, paused, budgets, runId]);

  const totals = useMemo(() => {
    return groupState.reduce(
      (acc, group) => {
        group.tasks.forEach((task) => {
          acc.total += 1;
          if (task.status === 'done') {
            acc.done += 1;
          }
          if (task.status === 'active') {
            acc.active += 1;
          }
        });
        return acc;
      },
      { total: 0, done: 0, active: 0 }
    );
  }, [groupState]);

  const overallProgress = totals.total
    ? Math.round((totals.done / totals.total) * 100)
    : 0;

  const updateBudget = (id: string, value: number) => {
    setBudgets((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="mt-6 rounded-lg bg-gray-800 p-4 border border-gray-800">
      <h3 className="text-lg font-semibold">Target Queue Planner</h3>
      <p className="mt-1 text-sm text-gray-300">
        Group hosts by environment, tune concurrency budgets, and watch the scheduler enforce per-group caps in real time.
      </p>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-gray-300">
          <span>Status: {running ? (paused ? 'Paused — dispatch halted' : 'Running — honoring group caps') : 'Idle'}</span>
          <span>
            Queue Progress: {totals.done} / {totals.total || 0} ({overallProgress}% complete)
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-700">
          <div
            className="h-2 bg-green-500 transition-all"
            style={{ width: `${overallProgress}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {groupState.map((group) => {
          const total = group.tasks.length;
          const active = group.tasks.filter((task) => task.status === 'active').length;
          const done = group.tasks.filter((task) => task.status === 'done').length;
          const pending = total - active - done;
          const progress = total ? Math.round((done / total) * 100) : 0;
          const budget = budgets[group.id] ?? 0;
          const capRangeMax = Math.max(1, Math.min(5, total));
          const capReached = budget <= active && pending > 0;

          return (
            <div key={group.id} className="rounded border border-gray-800 bg-gray-900 p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${group.accent}`} aria-hidden="true" />
                    <h4 className="font-semibold">{group.name}</h4>
                  </div>
                  <p className="text-xs text-gray-400">
                    Pending {pending} · Active {active} / {budget} · Completed {done}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <span>Concurrency budget</span>
                  <input
                    type="range"
                    min={0}
                    max={capRangeMax}
                    step={1}
                    value={budget}
                    onChange={(event) => updateBudget(group.id, Number(event.target.value))}
                    className="h-2 w-32 cursor-pointer"
                    aria-label={`Set concurrency for ${group.name}`}
                  />
                  <span className="w-5 text-right font-mono">{budget}</span>
                </label>
              </div>

              <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-700">
                <div
                  className={`${group.accent} h-2 transition-all`}
                  style={{ width: `${progress}%` }}
                  aria-hidden="true"
                />
              </div>
              {capReached && (
                <div className="mt-1 text-xs text-yellow-300">
                  Cap reached — additional hosts queued until slots free up.
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-1">
                {group.tasks.map((task) => (
                  <span
                    key={task.id}
                    className={`rounded px-2 py-1 text-xs font-mono ${statusChipStyles[task.status]}`}
                  >
                    {task.host}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Try dropping a budget to zero to observe a stalled queue, or increasing capacity to see hosts drain faster. Caps apply per
        group so noisy targets do not starve other environments.
      </p>
    </div>
  );
};

export default Targets;
