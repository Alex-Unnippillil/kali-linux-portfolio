"use client";

import clsx from "clsx";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import usePersistentState from "../../hooks/usePersistentState";
import { useSettings } from "../../hooks/useSettings";

type ChecklistCompletionSource = "auto" | "manual";

interface ChecklistTaskDefinition {
  id: string;
  title: string;
  description: string;
  hint?: string;
}

interface ChecklistEntryState {
  completedAt: string;
  source: ChecklistCompletionSource;
}

interface ChecklistPersistence {
  version: number;
  completed: Record<string, ChecklistEntryState>;
}

interface ChecklistItem extends ChecklistTaskDefinition {
  completed: boolean;
  completedAt?: string;
  source?: ChecklistCompletionSource;
  canUndo: boolean;
}

interface ChecklistContextValue {
  tasks: ChecklistItem[];
  total: number;
  completedCount: number;
  remainingCount: number;
  markTaskDone: (id: string) => void;
  undoTask: (id: string) => void;
}

const STORAGE_KEY = "onboarding-checklist";
const STORAGE_VERSION = 1;

const TASKS: ChecklistTaskDefinition[] = [
  {
    id: "launch-terminal",
    title: "Launch the Terminal",
    description: "Open the Terminal app to explore the simulated shell.",
    hint: "Find it in the launcher or the shortcuts on the desktop.",
  },
  {
    id: "launch-browser",
    title: "Open the Firefox demo",
    description: "Start the Firefox simulation to browse the internal docs.",
  },
  {
    id: "open-file",
    title: "Open a file",
    description: "Use the Files app to open any file from the virtual workspace.",
  },
  {
    id: "run-nmap-scan",
    title: "Run the Nmap NSE demo",
    description: "Kick off the simulated scan to review parsed findings.",
  },
];

const ChecklistContext = createContext<ChecklistContextValue | null>(null);

const isValidPersistence = (value: unknown): value is ChecklistPersistence => {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<ChecklistPersistence>;
  if (record.version !== STORAGE_VERSION) return false;
  if (!record.completed || typeof record.completed !== "object") return false;
  for (const key of Object.keys(record.completed)) {
    const entry = (record.completed as Record<string, unknown>)[key] as Partial<ChecklistEntryState>;
    if (!entry || typeof entry !== "object") return false;
    if (typeof entry.completedAt !== "string") return false;
    if (entry.source !== "auto" && entry.source !== "manual") return false;
  }
  return true;
};

const buildInitialState = (): ChecklistPersistence => ({
  version: STORAGE_VERSION,
  completed: {},
});

export function ChecklistProvider({ children }: { children: ReactNode }) {
  const { reducedMotion } = useSettings();
  const [state, setState] = usePersistentState<ChecklistPersistence>(
    STORAGE_KEY,
    buildInitialState,
    isValidPersistence,
  );
  const prevCompletedRef = useRef(0);
  const [justCompletedAll, setJustCompletedAll] = useState(false);

  const completeTask = useCallback(
    (id: string, source: ChecklistCompletionSource) => {
      setState((prev) => {
        const current = prev.completed[id];
        if (current) {
          return prev;
        }
        const next: ChecklistPersistence = {
          ...prev,
          completed: {
            ...prev.completed,
            [id]: { completedAt: new Date().toISOString(), source },
          },
        };
        return next;
      });
    },
    [setState],
  );

  const markTaskDone = useCallback(
    (id: string) => {
      completeTask(id, "manual");
    },
    [completeTask],
  );

  const undoTask = useCallback(
    (id: string) => {
      setState((prev) => {
        const entry = prev.completed[id];
        if (!entry || entry.source !== "manual") {
          return prev;
        }
        const nextCompleted = { ...prev.completed };
        delete nextCompleted[id];
        return {
          ...prev,
          completed: nextCompleted,
        };
      });
    },
    [setState],
  );

  useEffect(() => {
    const handleAppOpen = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const appId = typeof detail === "string" ? detail : detail?.id;
      if (appId === "terminal") {
        completeTask("launch-terminal", "auto");
      }
      if (appId === "firefox") {
        completeTask("launch-browser", "auto");
      }
    };

    const handleFileOpened = () => {
      completeTask("open-file", "auto");
    };

    const handleScan = () => {
      completeTask("run-nmap-scan", "auto");
    };

    if (typeof window !== "undefined") {
      window.addEventListener("open-app", handleAppOpen as EventListener);
      window.addEventListener("checklist:file-opened", handleFileOpened);
      window.addEventListener("checklist:nmap-scan", handleScan);
      return () => {
        window.removeEventListener("open-app", handleAppOpen as EventListener);
        window.removeEventListener("checklist:file-opened", handleFileOpened);
        window.removeEventListener("checklist:nmap-scan", handleScan);
      };
    }

    return () => {};
  }, [completeTask]);

  const tasks = useMemo<ChecklistItem[]>(() => {
    return TASKS.map((task) => {
      const entry = state.completed[task.id];
      return {
        ...task,
        completed: Boolean(entry),
        completedAt: entry?.completedAt,
        source: entry?.source,
        canUndo: entry?.source === "manual",
      };
    });
  }, [state.completed]);

  const completedCount = useMemo(
    () => tasks.filter((task) => task.completed).length,
    [tasks],
  );
  const remainingCount = tasks.length - completedCount;

  useEffect(() => {
    if (tasks.length === 0) return;
    if (completedCount === tasks.length && prevCompletedRef.current < tasks.length) {
      setJustCompletedAll(true);
    }
    prevCompletedRef.current = completedCount;
  }, [completedCount, tasks.length]);

  useEffect(() => {
    if (!justCompletedAll) return;
    if (typeof window === "undefined" || reducedMotion) {
      setJustCompletedAll(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const confettiModule = await import("canvas-confetti");
        if (!cancelled) {
          confettiModule.default({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        }
      } catch {
        // ignore failures to load confetti in unsupported environments
      } finally {
        if (!cancelled) {
          setJustCompletedAll(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [justCompletedAll, reducedMotion]);

  const value = useMemo<ChecklistContextValue>(
    () => ({
      tasks,
      total: tasks.length,
      completedCount,
      remainingCount,
      markTaskDone,
      undoTask,
    }),
    [tasks, completedCount, remainingCount, markTaskDone, undoTask],
  );

  return <ChecklistContext.Provider value={value}>{children}</ChecklistContext.Provider>;
}

export const useChecklist = () => {
  const ctx = useContext(ChecklistContext);
  if (!ctx) {
    throw new Error("useChecklist must be used within a ChecklistProvider");
  }
  return ctx;
};

interface ChecklistProps {
  className?: string;
}

const Checklist = ({ className }: ChecklistProps) => {
  const { tasks, total, completedCount, remainingCount, markTaskDone, undoTask } = useChecklist();
  const progress = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  return (
    <section
      aria-labelledby="onboarding-checklist"
      className={clsx(
        "w-80 max-w-full rounded-lg border border-white/10 bg-slate-900/80 p-4 text-white shadow-lg",
        className,
      )}
    >
      <header className="mb-4">
        <h2 id="onboarding-checklist" className="text-sm font-semibold uppercase tracking-wide text-cyan-200">
          Onboarding Checklist
        </h2>
        <p className="mt-1 text-xs text-slate-200">
          {completedCount} of {total} tasks complete
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-cyan-500 transition-all"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label="Onboarding checklist progress"
          />
        </div>
        {remainingCount === 0 ? (
          <p className="mt-2 text-xs font-medium text-emerald-300">All tasks complete. Nice work!</p>
        ) : (
          <p className="mt-2 text-xs text-slate-300">
            {remainingCount === 1 ? "One task left" : `${remainingCount} tasks remaining`}
          </p>
        )}
      </header>
      <ul className="space-y-3">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={clsx(
              "rounded-md border border-white/10 bg-slate-950/40 p-3",
              task.completed && "border-emerald-500/50 bg-emerald-500/10",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-white">{task.title}</h3>
                <p className="mt-1 text-xs text-slate-200">{task.description}</p>
                {task.hint && !task.completed && (
                  <p className="mt-1 text-[11px] text-slate-400">Hint: {task.hint}</p>
                )}
                {task.completed && (
                  <p className="mt-2 text-[11px] text-emerald-200">
                    Completed {task.source === "auto" ? "automatically" : "manually"}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {!task.completed && (
                  <button
                    type="button"
                    onClick={() => markTaskDone(task.id)}
                    className="rounded bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-950 shadow hover:bg-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    Mark as done
                  </button>
                )}
                {task.canUndo && (
                  <button
                    type="button"
                    onClick={() => undoTask(task.id)}
                    className="rounded border border-cyan-400 px-2 py-0.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    Undo
                  </button>
                )}
                {task.completed && !task.canUndo && (
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                    Done
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export const ChecklistStatusBadge = ({ className }: { className?: string }) => {
  const { total, completedCount, remainingCount } = useChecklist();
  if (total === 0) return null;
  const allDone = remainingCount === 0;
  const label = allDone
    ? "Onboarding checklist complete"
    : `${remainingCount} onboarding ${remainingCount === 1 ? "task" : "tasks"} remaining`;
  return (
    <span
      className={clsx(
        "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        allDone ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/80",
        className,
      )}
      aria-label={label}
    >
      {allDone ? "All set" : `${completedCount}/${total}`}
    </span>
  );
};

export default Checklist;
