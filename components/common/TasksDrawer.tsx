import React, { useEffect, useMemo, useState } from 'react';
import useTaskQueue, { TaskSnapshot } from '../../hooks/useTaskQueue';

const statusStyles: Record<TaskSnapshot['status'], string> = {
  queued: 'bg-sky-500/20 text-sky-200 border border-sky-400/40',
  running: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40',
  paused: 'bg-amber-500/20 text-amber-100 border border-amber-400/40',
  completed: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40',
  failed: 'bg-rose-500/20 text-rose-100 border border-rose-400/50',
  canceled: 'bg-zinc-500/20 text-zinc-200 border border-zinc-400/40',
};

const statusLabel: Record<TaskSnapshot['status'], string> = {
  queued: 'Queued',
  running: 'Running',
  paused: 'Paused',
  completed: 'Completed',
  failed: 'Failed',
  canceled: 'Canceled',
};

const formatEta = (etaMs: number | null) => {
  if (etaMs === null) return '—';
  if (etaMs < 1000) return '<1s';
  const seconds = Math.round(etaMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
  }
  return `${seconds}s`;
};

const formatTimestamp = (timestamp: number) => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return formatter.format(timestamp);
};

const progressWidth = (value: number) => `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%`;

const emptyMetadata = (metadata?: Record<string, unknown> | null) => !metadata || Object.keys(metadata).length === 0;

const TaskRow: React.FC<{
  task: TaskSnapshot;
  active: boolean;
  onSelect: (task: TaskSnapshot) => void;
}> = ({ task, active, onSelect }) => {
  const percent = Math.round(Math.min(Math.max(task.progress, 0), 1) * 100);
  return (
    <button
      type="button"
      onClick={() => onSelect(task)}
      className={`w-full rounded-lg border border-white/5 bg-white/5 px-3 py-3 text-left transition hover:border-white/30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${
        active ? 'ring-2 ring-cyan-400/60 border-cyan-400/40 bg-cyan-500/10' : ''
      }`}
      aria-label={`View details for ${task.title}`}
    >
      <div className="flex items-center justify-between text-sm font-medium text-white/90">
        <span className="truncate">{task.title}</span>
        <span className={`ml-3 rounded-full px-2 py-0.5 text-xs ${statusStyles[task.status]}`}>
          {statusLabel[task.status]}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-cyan-400 transition-all duration-300"
          style={{ width: progressWidth(task.progress) }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-white/60">
        <span>{percent}%</span>
        <span>ETA {formatEta(task.etaMs)}</span>
      </div>
    </button>
  );
};

const MetadataList: React.FC<{ metadata?: Record<string, unknown> | null }> = ({ metadata }) => {
  if (emptyMetadata(metadata)) {
    return (
      <p className="text-sm text-white/60">No additional metadata.</p>
    );
  }

  return (
    <dl className="grid grid-cols-1 gap-2 text-sm text-white/80">
      {Object.entries(metadata as Record<string, unknown>).map(([key, value]) => (
        <div key={key} className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
          <dt className="text-xs uppercase tracking-wide text-white/50">{key}</dt>
          <dd className="mt-1 break-words text-white/90">
            {typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
              ? String(value)
              : JSON.stringify(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
};

const FINAL_STATUSES: TaskSnapshot['status'][] = ['completed', 'failed', 'canceled'];

const TasksDrawer: React.FC = () => {
  const {
    tasks,
    summary,
    pauseTask,
    resumeTask,
    cancelTask,
    removeTask,
  } = useTaskQueue();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedId), [tasks, selectedId]);

  useEffect(() => {
    if (!open) return;
    if (tasks.length === 0) {
      setSelectedId(null);
      return;
    }
    const exists = tasks.find((task) => task.id === selectedId);
    if (!exists) {
      setSelectedId(tasks[0].id);
    }
  }, [open, tasks, selectedId]);

  const handleClose = () => setOpen(false);

  const handlePauseToggle = async (task: TaskSnapshot) => {
    if (task.status === 'running') {
      await pauseTask(task.id);
    } else if (task.status === 'paused') {
      await resumeTask(task.id);
    }
  };

  const handleCancel = async (task: TaskSnapshot) => {
    await cancelTask(task.id, 'Cancelled by user');
  };

  const handleDismiss = (task: TaskSnapshot) => {
    removeTask(task.id);
    if (selectedId === task.id) {
      setSelectedId(null);
    }
  };

  const activeCount = summary.active;
  const averagePercent = Math.round((summary.averageProgress ?? 0) * 100);

  const hasTasks = tasks.length > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 transition hover:border-white/30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
        aria-expanded={open}
        aria-controls="tasks-drawer"
      >
        <span>Tasks</span>
        {activeCount > 0 && (
          <span className="flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-cyan-500/40 px-2 text-[0.7rem] text-white">
            {activeCount}
          </span>
        )}
        <span className="sr-only">Open task queue</span>
      </button>
      {open && (
        <div
          id="tasks-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Task queue"
          className="fixed inset-0 z-[120] flex items-start justify-end bg-slate-950/40 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close task queue"
            className="absolute inset-0 h-full w-full cursor-default"
          >
            <span className="sr-only">Close</span>
          </button>
          <div className="pointer-events-auto mt-[calc(var(--safe-area-top,0px)+4rem)] flex h-[calc(100vh-5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-l-2xl border border-white/10 bg-slate-950/95 shadow-2xl ring-1 ring-white/10">
            <header className="flex flex-col gap-2 border-b border-white/10 bg-white/5 px-6 py-4 text-white/80">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Task Queue</h2>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 transition hover:border-white/30 hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs text-white/70">
                <div>
                  <p className="uppercase tracking-wide text-white/40">Active</p>
                  <p className="text-sm text-white">{activeCount}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wide text-white/40">Average progress</p>
                  <p className="text-sm text-white">{averagePercent}%</p>
                </div>
                <div>
                  <p className="uppercase tracking-wide text-white/40">ETA</p>
                  <p className="text-sm text-white">{formatEta(summary.etaMs)}</p>
                </div>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${averagePercent}%` }}
                />
              </div>
            </header>
            <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[18rem_minmax(0,1fr)]">
              <div className="flex flex-col border-r border-white/10 bg-slate-950/70">
                <div className="flex items-center justify-between px-6 py-3 text-xs text-white/60">
                  <span>{tasks.length} task{tasks.length === 1 ? '' : 's'}</span>
                  {hasTasks && (
                    <span className="text-white/40">Click a task to view details</span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-6">
                  {hasTasks ? (
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          active={selectedTask ? selectedTask.id === task.id : false}
                          onSelect={(next) => setSelectedId(next.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-white/60">
                      No tasks yet. Kick off a scan or export to see progress here.
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col bg-slate-950/60">
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {selectedTask ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{selectedTask.title}</h3>
                        <p className="mt-1 text-sm text-white/70">Status: {statusLabel[selectedTask.status]}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-white/50">
                          Last updated {formatTimestamp(selectedTask.updatedAt)}
                        </p>
                        {selectedTask.description && (
                          <p className="mt-3 text-sm text-white/80">{selectedTask.description}</p>
                        )}
                        {selectedTask.error && (
                          <p className="mt-3 rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                            {selectedTask.error}
                          </p>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-white/50">
                          Metadata
                        </h4>
                        <div className="mt-2">
                          <MetadataList metadata={selectedTask.metadata} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-center text-sm text-white/60">
                      Select a task from the queue to view progress and available actions.
                    </div>
                  )}
                </div>
                {selectedTask && (
                  <footer className="flex flex-col gap-2 border-t border-white/10 bg-white/5 px-6 py-4 text-sm text-white/80 md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-2">
                      {(selectedTask.status === 'running' || selectedTask.status === 'paused') &&
                        (selectedTask.operations?.pause || selectedTask.operations?.resume) && (
                          <button
                            type="button"
                            onClick={() => handlePauseToggle(selectedTask)}
                            className="rounded-full border border-white/10 px-4 py-1 text-xs font-medium text-white transition hover:border-white/30 hover:bg-white/10"
                          >
                            {selectedTask.status === 'running' ? 'Pause' : 'Resume'}
                          </button>
                        )}
                      {selectedTask.operations?.cancel || selectedTask.operations?.rollback ? (
                        <button
                          type="button"
                          onClick={() => handleCancel(selectedTask)}
                          className="rounded-full border border-rose-400/50 px-4 py-1 text-xs font-medium text-rose-100 transition hover:bg-rose-500/20"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                    {FINAL_STATUSES.includes(selectedTask.status) ? (
                      <button
                        type="button"
                        onClick={() => handleDismiss(selectedTask)}
                        className="rounded-full border border-white/10 px-4 py-1 text-xs font-medium text-white transition hover:border-white/30 hover:bg-white/10"
                      >
                        Dismiss
                      </button>
                    ) : null}
                  </footer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksDrawer;
