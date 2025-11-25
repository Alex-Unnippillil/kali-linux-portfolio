'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import * as chrono from 'chrono-node';
import usePersistentState from '../../hooks/usePersistentState';

const ACCENTS = {
  cobalt: {
    name: 'Cobalt',
    header: 'bg-gradient-to-r from-ubt-blue/80 via-slate-900/40 to-slate-900/0',
    ring: 'ring-ubt-blue/60',
    pill: 'bg-ubt-blue/10 text-ubt-blue border-ubt-blue/30',
    glow: 'shadow-[0_18px_40px_-24px] shadow-ubt-blue/40',
  },
  fern: {
    name: 'Fern',
    header: 'bg-gradient-to-r from-ubt-green/70 via-slate-900/30 to-slate-900/0',
    ring: 'ring-ubt-green/60',
    pill: 'bg-ubt-green/10 text-ubt-green border-ubt-green/30',
    glow: 'shadow-[0_18px_40px_-24px] shadow-ubt-green/30',
  },
  sunset: {
    name: 'Sunset',
    header: 'bg-gradient-to-r from-ubt-gedit-orange/70 via-slate-900/30 to-slate-900/0',
    ring: 'ring-ubt-gedit-orange/60',
    pill: 'bg-ubt-gedit-orange/10 text-ubt-gedit-orange border-ubt-gedit-orange/30',
    glow: 'shadow-[0_18px_40px_-24px] shadow-ubt-gedit-orange/40',
  },
};

const PRIORITY_STYLES = {
  high: 'border border-red-500/50 text-red-400 bg-red-500/10',
  medium: 'border border-ubt-gedit-orange/40 text-ubt-gedit-orange bg-ubt-gedit-orange/10',
  low: 'border border-ubt-green/40 text-ubt-green bg-ubt-green/10',
};

const PRIORITY_LABELS = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const PRIORITY_ORDER = ['high', 'medium', 'low'];

const DEFAULT_SECTIONS = [
  { id: 'today', title: 'Today' },
  { id: 'next', title: 'Next Up' },
  { id: 'later', title: 'Someday' },
];

const STORAGE_KEY = 'todoist:state';
const FILTER_KEY = 'todoist:filters';
const SETTINGS_KEY = 'todoist:settings';
const QUICK_KEY = 'todoist:quick-draft';

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `task-${Math.random().toString(16).slice(2)}`;
};

const createInitialState = () => {
  const welcomeId = createId();
  const reviewId = createId();
  const decompressId = createId();
  return {
    tasks: {
      [welcomeId]: {
        id: welcomeId,
        title: 'Review threat reports',
        sectionId: 'today',
        priority: 'high',
        due: new Date().toISOString().split('T')[0],
        completed: false,
        createdAt: Date.now(),
      },
      [reviewId]: {
        id: reviewId,
        title: 'Plan purple-team tabletop',
        sectionId: 'next',
        priority: 'medium',
        due: undefined,
        completed: false,
        createdAt: Date.now(),
      },
      [decompressId]: {
        id: decompressId,
        title: 'Capture learnings in the ops journal',
        sectionId: 'later',
        priority: 'low',
        due: undefined,
        completed: false,
        createdAt: Date.now(),
      },
    },
    buckets: {
      today: { id: 'today', title: 'Today', kind: 'section', taskIds: [welcomeId] },
      next: { id: 'next', title: 'Next Up', kind: 'section', taskIds: [reviewId] },
      later: { id: 'later', title: 'Someday', kind: 'section', taskIds: [decompressId] },
      high: { id: 'high', title: 'High Impact', kind: 'priority', taskIds: [welcomeId] },
      medium: { id: 'medium', title: 'Medium', kind: 'priority', taskIds: [reviewId] },
      low: { id: 'low', title: 'Low Lift', kind: 'priority', taskIds: [decompressId] },
    },
    sectionOrder: DEFAULT_SECTIONS.map((s) => s.id),
    priorityOrder: PRIORITY_ORDER,
  };
};

const validateState = (value) => {
  if (!value || typeof value !== 'object') return false;
  if (!value.tasks || !value.buckets) return false;
  return true;
};

const createInitialFilters = () => ({
  status: 'all',
  priority: 'all',
  due: 'all',
  search: '',
});

const createInitialSettings = () => ({
  grouping: 'sections',
  accent: 'cobalt',
  compact: false,
  defaultSection: DEFAULT_SECTIONS[0].id,
});

const parseQuickTask = (input, availableSections) => {
  const raw = input.trim();
  if (!raw) {
    return { error: 'Add a task description to capture it.' };
  }
  let working = raw;
  let due;
  let priority = 'medium';
  let sectionId;

  const priorityMatch = working.match(/(!|p)(1|2|3|high|med(?:ium)?|low)/i);
  if (priorityMatch) {
    const token = priorityMatch[2].toLowerCase();
    if (token === '1' || token === 'high') priority = 'high';
    else if (token === '3' || token === 'low') priority = 'low';
    else priority = 'medium';
    working = working.replace(priorityMatch[0], '').trim();
  }

  const sectionMatch = working.match(/#([\w-]+)/);
  if (sectionMatch) {
    const tag = sectionMatch[1].toLowerCase();
    const candidate = availableSections.find(
      (sec) => sec.id === tag || sec.title.toLowerCase() === tag,
    );
    sectionId = candidate?.id ?? tag;
    working = working.replace(sectionMatch[0], '').trim();
  }

  try {
    const chronoResult = chrono.parse(working)[0];
    if (chronoResult) {
      const parsedDate = chronoResult.start.date();
      if (parsedDate) {
        due = parsedDate.toISOString().split('T')[0];
        working = working.replace(chronoResult.text, '').trim();
      }
    }
  } catch {
    // ignore parse errors
  }

  const title = working.trim();
  if (!title) {
    return { error: 'Looks like everything was parsed away — add more detail.' };
  }

  return {
    title,
    due,
    priority,
    sectionId,
  };
};

const getDueStatus = (due) => {
  if (!due) return 'none';
  const target = new Date(`${due}T00:00:00`);
  const today = new Date();
  const diff = Math.floor((target - new Date(today.toDateString())) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff <= 7) return 'soon';
  return 'later';
};

const formatDueLabel = (due) => {
  if (!due) return 'No date';
  const status = getDueStatus(due);
  const target = new Date(`${due}T00:00:00`);
  if (status === 'today') return 'Today';
  if (status === 'tomorrow') return 'Tomorrow';
  if (status === 'overdue') return `Overdue · ${target.toLocaleDateString()}`;
  if (status === 'soon') {
    return target.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
  return target.toLocaleDateString();
};

const dueTone = {
  overdue: 'bg-red-500/10 text-red-400 border-red-500/40',
  today: 'bg-ubt-blue/10 text-ubt-blue border-ubt-blue/40',
  tomorrow: 'bg-ubt-gedit-orange/10 text-ubt-gedit-orange border-ubt-gedit-orange/40',
  soon: 'bg-ubt-gedit-blue/10 text-ubt-gedit-blue border-ubt-gedit-blue/40',
  later: 'bg-slate-700/30 text-slate-300 border-slate-500/40',
  none: 'bg-slate-800/60 text-slate-400 border-slate-600/40',
};

function applyFilters(task, filters) {
  if (filters.status === 'open' && task.completed) return false;
  if (filters.status === 'done' && !task.completed) return false;
  if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
  if (filters.search) {
    const haystack = task.title.toLowerCase();
    if (!haystack.includes(filters.search.toLowerCase())) return false;
  }
  if (filters.due !== 'all') {
    const status = getDueStatus(task.due);
    if (filters.due === 'overdue' && status !== 'overdue') return false;
    if (filters.due === 'today' && status !== 'today') return false;
    if (filters.due === 'soon' && !['today', 'tomorrow', 'soon'].includes(status)) {
      return false;
    }
    if (filters.due === 'none' && status !== 'none') return false;
  }
  return true;
}

function SectionColumn({ lane, accent, compact, children, count }) {
  const { setNodeRef, isOver } = useDroppable({
    id: lane.id,
    data: { type: 'section', sectionId: lane.id },
  });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border border-slate-700/60 bg-slate-900/70 backdrop-blur-md transition-shadow ${accent.glow} ${isOver ? 'border-dashed border-ubt-blue/60' : ''}`}
    >
      <div className={`px-4 py-3 border-b border-slate-700/50 ${accent.header}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold tracking-wide text-slate-100 text-sm uppercase">{lane.title}</h2>
          <span className="text-xs text-slate-300 bg-slate-800/80 px-2 py-1 rounded-full border border-slate-600/60">
            {count}
          </span>
        </div>
      </div>
      <div className={`flex-1 space-y-3 p-3 ${compact ? 'min-h-[6rem]' : 'min-h-[10rem]'}`}>
        {children}
      </div>
    </div>
  );
}

function TaskCard({ task, laneId, onToggle, onDelete, celebrating }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', sectionId: laneId },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const priorityClass = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.medium;
  const dueStatus = dueTone[getDueStatus(task.due)] ?? dueTone.none;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border border-slate-700/60 bg-slate-900/80 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-slate-900/50 focus-within:ring-2 focus-within:ring-ubt-blue/50 ${
        isDragging ? 'ring-2 ring-ubt-blue/70 scale-[1.01] bg-slate-900' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(task.id)}
          aria-label={task.completed ? 'Mark task as incomplete' : 'Complete task'}
          className={`relative mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-slate-600/70 transition-colors duration-200 ${
            task.completed ? 'bg-ubt-green/20 border-ubt-green/50' : 'bg-slate-900'
          }`}
        >
          <span
            className={`h-3 w-3 rounded-full bg-ubt-green transition-transform duration-300 ${
              task.completed ? 'scale-100' : 'scale-0'
            }`}
          />
          {celebrating && (
            <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-ubt-green/40" />
          )}
        </button>
        <div className="flex-1 space-y-2">
          <p
            className={`text-sm font-medium leading-5 text-slate-100 transition-colors ${
              task.completed ? 'text-slate-500 line-through' : ''
            }`}
          >
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 ${priorityClass}`}>
              {PRIORITY_LABELS[task.priority] ?? 'Medium'} Priority
            </span>
            <span className={`rounded-full px-2 py-0.5 border ${dueStatus}`}>
              {formatDueLabel(task.due)}
            </span>
          </div>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          aria-label="Remove task"
          className="mt-0.5 hidden rounded-full border border-slate-700/70 p-1 text-xs text-slate-400 transition hover:border-red-500/40 hover:text-red-400 group-hover:inline-flex"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function TodoistWorkspace() {
  const [state, setState] = usePersistentState(STORAGE_KEY, createInitialState, validateState);
  const [filters, setFilters] = usePersistentState(FILTER_KEY, createInitialFilters);
  const [settings, setSettings] = usePersistentState(SETTINGS_KEY, createInitialSettings);
  const [quickDraft, setQuickDraft] = usePersistentState(QUICK_KEY, '');
  const [quickError, setQuickError] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [celebrating, setCelebrating] = useState([]);

  const accent = ACCENTS[settings.accent] ?? ACCENTS.cobalt;

  const availableSections = useMemo(
    () =>
      state.sectionOrder
        .map((id) => state.buckets[id])
        .filter(Boolean)
        .map(({ id, title }) => ({ id, title })),
    [state.sectionOrder, state.buckets],
  );

  useEffect(() => {
    if (quickError) {
      const timer = setTimeout(() => setQuickError(''), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [quickError]);

  const filteredTaskIds = useMemo(() => {
    const allowed = new Set();
    Object.values(state.tasks).forEach((task) => {
      if (applyFilters(task, filters)) {
        allowed.add(task.id);
      }
    });
    return allowed;
  }, [state.tasks, filters]);

  const lanes = useMemo(() => {
    if (settings.grouping === 'priority') {
      return state.priorityOrder
        .map((id) => state.buckets[id])
        .filter(Boolean)
        .map((bucket) => ({
          ...bucket,
          taskIds: bucket.taskIds.filter((taskId) => filteredTaskIds.has(taskId)),
        }));
    }
    return state.sectionOrder
      .map((id) => state.buckets[id])
      .filter(Boolean)
      .map((bucket) => ({
        ...bucket,
        taskIds: bucket.taskIds.filter((taskId) => filteredTaskIds.has(taskId)),
      }));
  }, [state.buckets, state.priorityOrder, state.sectionOrder, settings.grouping, filteredTaskIds]);

  const activeTask = activeId ? state.tasks[activeId] : null;

  const updateTaskPlacement = (taskId, sourceId, destinationId, position) => {
    setState((prev) => {
      const next = {
        ...prev,
        tasks: { ...prev.tasks },
        buckets: { ...prev.buckets },
      };
      const sourceBucket = next.buckets[sourceId];
      const destinationBucket = next.buckets[destinationId];
      if (!sourceBucket || !destinationBucket) return prev;
      const sourceTasks = [...sourceBucket.taskIds];
      const fromIndex = sourceTasks.indexOf(taskId);
      if (fromIndex === -1) return prev;
      sourceTasks.splice(fromIndex, 1);
      next.buckets[sourceId] = { ...sourceBucket, taskIds: sourceTasks };

      const destTasks =
        sourceId === destinationId ? sourceTasks : [...destinationBucket.taskIds];
      const toIndex = position ?? destTasks.length;
      destTasks.splice(toIndex, 0, taskId);
      next.buckets[destinationId] = { ...destinationBucket, taskIds: destTasks };

      const task = { ...next.tasks[taskId] };
      if (destinationBucket.kind === 'section') {
        task.sectionId = destinationBucket.id;
      }
      if (destinationBucket.kind === 'priority') {
        task.priority = destinationBucket.id;
      }
      next.tasks[taskId] = task;

      if (destinationBucket.kind === 'section') {
        const priorityBucket = next.buckets[task.priority];
        if (priorityBucket && !priorityBucket.taskIds.includes(taskId)) {
          next.buckets[task.priority] = {
            ...priorityBucket,
            taskIds: [...priorityBucket.taskIds, taskId],
          };
        }
      } else if (destinationBucket.kind === 'priority') {
        const sectionBucket = next.buckets[task.sectionId];
        if (sectionBucket && !sectionBucket.taskIds.includes(taskId)) {
          next.buckets[task.sectionId] = {
            ...sectionBucket,
            taskIds: [...sectionBucket.taskIds, taskId],
          };
        }
        next.priorityOrder.forEach((pid) => {
          if (pid === destinationBucket.id) return;
          const bucket = next.buckets[pid];
          if (bucket && bucket.taskIds.includes(taskId)) {
            next.buckets[pid] = {
              ...bucket,
              taskIds: bucket.taskIds.filter((id) => id !== taskId),
            };
          }
        });
      }

      return next;
    });
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const activeIdValue = active.id;
    const overIdValue = over.id;
    const activeSection = active.data.current?.sectionId;
    let overSection = over.data.current?.sectionId;
    if (!activeSection || !overSection) return;
    if (over.data.current?.type === 'task') {
      const overTaskId = overIdValue;
      if (overTaskId === activeIdValue) return;
      const overTask = state.tasks[overTaskId];
      if (!overTask) return;
      overSection = over.data.current.sectionId ?? overTask.sectionId;
      const destinationBucket = state.buckets[overSection];
      if (!destinationBucket) return;
      const position = destinationBucket.taskIds.indexOf(overTaskId);
      updateTaskPlacement(activeIdValue, activeSection, overSection, position);
      return;
    }
    updateTaskPlacement(activeIdValue, activeSection, overSection);
  };

  const handleDragCancel = () => setActiveId(null);

  const toggleTask = (taskId) => {
    setState((prev) => {
      const next = {
        ...prev,
        tasks: { ...prev.tasks },
      };
      const task = next.tasks[taskId];
      if (!task) return prev;
      const updated = { ...task, completed: !task.completed };
      next.tasks[taskId] = updated;
      return next;
    });
    setCelebrating((prevCelebrating) => [...prevCelebrating, taskId]);
    setTimeout(() => {
      setCelebrating((prevCelebrating) => prevCelebrating.filter((id) => id !== taskId));
    }, 900);
  };

  const deleteTask = (taskId) => {
    setState((prev) => {
      const next = {
        tasks: { ...prev.tasks },
        buckets: { ...prev.buckets },
        sectionOrder: [...prev.sectionOrder],
        priorityOrder: [...prev.priorityOrder],
      };
      delete next.tasks[taskId];
      Object.keys(next.buckets).forEach((bucketId) => {
        const bucket = next.buckets[bucketId];
        next.buckets[bucketId] = {
          ...bucket,
          taskIds: bucket.taskIds.filter((id) => id !== taskId),
        };
      });
      return next;
    });
  };

  const handleQuickSubmit = (event) => {
    event.preventDefault();
    const parsed = parseQuickTask(quickDraft, availableSections);
    if (parsed.error) {
      setQuickError(parsed.error);
      return;
    }
    const id = createId();
    const sectionId = parsed.sectionId && state.buckets[parsed.sectionId]
      ? parsed.sectionId
      : settings.defaultSection;
    setState((prev) => {
      const next = {
        tasks: { ...prev.tasks },
        buckets: { ...prev.buckets },
        sectionOrder: [...prev.sectionOrder],
        priorityOrder: [...prev.priorityOrder],
      };
      next.tasks[id] = {
        id,
        title: parsed.title,
        due: parsed.due,
        priority: parsed.priority,
        sectionId,
        completed: false,
        createdAt: Date.now(),
      };
      const targetSection = next.buckets[sectionId];
      if (targetSection) {
        next.buckets[sectionId] = {
          ...targetSection,
          taskIds: [...targetSection.taskIds, id],
        };
      } else {
        next.buckets[sectionId] = {
          id: sectionId,
          title: sectionId.replace(/-/g, ' '),
          kind: 'section',
          taskIds: [id],
        };
        if (!next.sectionOrder.includes(sectionId)) {
          next.sectionOrder = [...next.sectionOrder, sectionId];
        }
      }
      const priorityBucket = next.buckets[parsed.priority];
      if (priorityBucket) {
        next.buckets[parsed.priority] = {
          ...priorityBucket,
          taskIds: [...priorityBucket.taskIds, id],
        };
      }
      return next;
    });
    setQuickDraft('');
  };

  const exportData = () => {
    try {
      const blob = new Blob([
        JSON.stringify(
          {
            tasks: state.tasks,
            sections: state.sectionOrder.map((id) => state.buckets[id]),
            priorities: state.priorityOrder.map((id) => state.buckets[id]),
            settings,
            filters,
          },
          null,
          2,
        ),
      ], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'todoist-export.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setQuickError('Export failed — your browser blocked the download.');
    }
  };

  const toggleCompact = () =>
    setSettings((prev) => ({ ...prev, compact: !prev.compact }));

  const cycleGrouping = (value) =>
    setSettings((prev) => ({ ...prev, grouping: value }));

  const changeAccent = (accentKey) =>
    setSettings((prev) => ({ ...prev, accent: accentKey }));

  return (
    <div className="flex h-full w-full flex-col bg-slate-950/80 text-slate-100">
      <header className={`border-b border-slate-800/60 px-6 pb-4 pt-6 ${accent.header}`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-wide text-slate-100">
              Mission Planner
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Drag cards between columns, capture quick thoughts with natural language, and stay on top of priorities.
            </p>
          </div>
          <form
            onSubmit={handleQuickSubmit}
            className={`flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 shadow-inner shadow-slate-950/50 focus-within:ring-2 ${accent.ring}`}
          >
            <label htmlFor="quick-add" className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Quick add
            </label>
            <input
              id="quick-add"
              value={quickDraft}
              onChange={(e) => setQuickDraft(e.target.value)}
              placeholder="Deploy a fix tomorrow 9am !high #today"
              aria-label="Quick add task"
              className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Use !high/!low, natural dates, or #section tags.</span>
              <button
                type="submit"
                className="rounded-full bg-ubt-blue/20 px-3 py-1 font-medium text-ubt-blue transition hover:bg-ubt-blue/30"
              >
                Add task
              </button>
            </div>
            {quickError && (
              <p className="text-xs font-medium text-red-400">{quickError}</p>
            )}
          </form>
        </div>
      </header>
      <div className={`flex flex-1 flex-col gap-6 overflow-hidden p-6 lg:grid ${
        settings.compact ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,3fr)_minmax(0,1.2fr)]'
      }`}>
        <section className="flex h-full flex-col overflow-hidden">
          <FiltersBar filters={filters} setFilters={setFilters} accent={accent} />
          <DndContext
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            modifiers={[restrictToVerticalAxis]}
          >
            <div
              className={`mt-4 grid flex-1 gap-4 overflow-y-auto pb-6 ${
                settings.compact ? 'grid-cols-1' : 'md:grid-cols-2 xl:grid-cols-3'
              }`}
            >
              {lanes.map((lane) => (
                <SortableContext
                  key={lane.id}
                  items={lane.taskIds}
                  strategy={verticalListSortingStrategy}
                >
                  <SectionColumn
                    lane={lane}
                    accent={accent}
                    compact={settings.compact}
                    count={lane.taskIds.length}
                  >
                    {lane.taskIds.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-700/60 bg-slate-900/40 py-6 text-sm text-slate-500">
                        Drop tasks here
                      </div>
                    ) : (
                      lane.taskIds.map((taskId) => (
                        <TaskCard
                          key={taskId}
                          task={state.tasks[taskId]}
                          laneId={lane.id}
                          onToggle={toggleTask}
                          onDelete={deleteTask}
                          celebrating={celebrating.includes(taskId)}
                        />
                      ))
                    )}
                  </SectionColumn>
                </SortableContext>
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <div className="w-72 rounded-xl border border-slate-700/60 bg-slate-900/90 p-4 shadow-xl">
                  <p className="font-medium text-slate-100">{activeTask.title}</p>
                  <div className="mt-2 flex gap-2 text-xs text-slate-400">
                    <span className={`rounded-full px-2 py-0.5 ${PRIORITY_STYLES[activeTask.priority]}`}>
                      {PRIORITY_LABELS[activeTask.priority]}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 border ${
                      dueTone[getDueStatus(activeTask.due)]
                    }`}>
                      {formatDueLabel(activeTask.due)}
                    </span>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </section>

        <aside className="flex flex-col gap-6 overflow-y-auto rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6">
          <SettingsPanel
            settings={settings}
            accent={accent}
            onToggleCompact={toggleCompact}
            onSelectGrouping={cycleGrouping}
            onSelectAccent={changeAccent}
            availableSections={availableSections}
            onDefaultSectionChange={(sectionId) =>
              setSettings((prev) => ({ ...prev, defaultSection: sectionId }))
            }
            exportData={exportData}
          />
          <Snapshot state={state} filters={filters} />
        </aside>
      </div>
    </div>
  );
}
function FiltersBar({ filters, setFilters, accent }) {
  const toggleStatus = (status) => setFilters((prev) => ({ ...prev, status }));
  const togglePriority = (priority) => setFilters((prev) => ({ ...prev, priority }));
  const toggleDue = (due) => setFilters((prev) => ({ ...prev, due }));
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {['all', 'open', 'done'].map((status) => (
          <button
            key={status}
            onClick={() => toggleStatus(status)}
            className={`rounded-full border px-3 py-1 font-medium capitalize transition ${
              filters.status === status
                ? `border-slate-100 text-slate-100 ${accent.glow}`
                : 'border-slate-700/60 text-slate-400 hover:border-slate-500/60'
            }`}
          >
            {status}
          </button>
        ))}
        <span className="mx-2 h-3 w-px bg-slate-700/60" aria-hidden />
        {['all', ...PRIORITY_ORDER].map((priority) => (
          <button
            key={priority}
            onClick={() => togglePriority(priority)}
            className={`rounded-full border px-3 py-1 font-medium capitalize transition ${
              filters.priority === priority
                ? `border-slate-100 text-slate-100 ${accent.glow}`
                : 'border-slate-700/60 text-slate-400 hover:border-slate-500/60'
            }`}
          >
            {priority}
          </button>
        ))}
        <span className="mx-2 h-3 w-px bg-slate-700/60" aria-hidden />
        {['all', 'overdue', 'today', 'soon', 'none'].map((due) => (
          <button
            key={due}
            onClick={() => toggleDue(due)}
            className={`rounded-full border px-3 py-1 font-medium capitalize transition ${
              filters.due === due
                ? `border-slate-100 text-slate-100 ${accent.glow}`
                : 'border-slate-700/60 text-slate-400 hover:border-slate-500/60'
            }`}
          >
            {due}
          </button>
        ))}
      </div>
      <label className="relative flex items-center">
        <span className="sr-only">Search tasks</span>
        <input
          type="search"
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          placeholder="Search tasks"
          aria-label="Search tasks"
          className="w-full rounded-full border border-slate-700/60 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-ubt-blue/40"
        />
      </label>
    </div>
  );
}

function SettingsPanel({
  settings,
  accent,
  onToggleCompact,
  onSelectGrouping,
  onSelectAccent,
  availableSections,
  onDefaultSectionChange,
  exportData,
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Layout</h2>
        <button
          onClick={onToggleCompact}
          className={`mt-2 w-full rounded-xl border border-slate-700/60 px-4 py-3 text-left text-sm transition ${
            settings.compact ? `${accent.glow} border-slate-200/40` : 'hover:border-slate-500/60'
          }`}
        >
          <p className="font-medium text-slate-100">{settings.compact ? 'Expanded view' : 'Compact view'}</p>
          <p className="text-xs text-slate-400">
            {settings.compact
              ? 'Switch back to multi-column mode with more breathing room.'
              : 'Collapse the board into a single column for focus.'}
          </p>
        </button>
      </div>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Grouping</h2>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {[
            { id: 'sections', label: 'Sections' },
            { id: 'priority', label: 'Priority Lanes' },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => onSelectGrouping(option.id)}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                settings.grouping === option.id
                  ? `${accent.glow} border-slate-200/40`
                  : 'border-slate-700/60 hover:border-slate-500/60'
              }`}
            >
              <p className="font-medium text-slate-100">{option.label}</p>
              <p className="text-xs text-slate-400">
                {option.id === 'sections'
                  ? 'Organize tasks by mission lanes such as Today, Next, Someday.'
                  : 'Shift the board to High/Medium/Low buckets to rebalance effort.'}
              </p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Accent</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(ACCENTS).map(([key, value]) => (
            <button
              key={key}
              onClick={() => onSelectAccent(key)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                settings.accent === key
                  ? `${accent.glow} border-slate-200/40`
                  : 'border-slate-700/60 hover:border-slate-500/60'
              }`}
            >
              {value.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Defaults</h2>
        <label className="mt-2 block text-xs text-slate-400">
          Default drop section
          <select
            value={settings.defaultSection}
            onChange={(e) => onDefaultSectionChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-ubt-blue/40"
          >
            {availableSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Data</h2>
        <button
          onClick={exportData}
          className="mt-2 w-full rounded-xl border border-slate-700/60 px-4 py-3 text-left text-sm text-slate-100 transition hover:border-slate-500/60"
        >
          Export board snapshot
        </button>
      </div>
    </div>
  );
}

function Snapshot({ state, filters }) {
  const tasks = Object.values(state.tasks);
  const open = tasks.filter((task) => !task.completed).length;
  const done = tasks.length - open;
  const overdue = tasks.filter((task) => getDueStatus(task.due) === 'overdue' && !task.completed).length;
  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Pulse</h2>
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Open</div>
          <div className="mt-1 text-xl font-semibold text-slate-100">{open}</div>
        </div>
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Done</div>
          <div className="mt-1 text-xl font-semibold text-ubt-green">{done}</div>
        </div>
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Overdue</div>
          <div className="mt-1 text-xl font-semibold text-red-400">{overdue}</div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 text-xs text-slate-400">
        <p className="font-semibold uppercase tracking-[0.2em] text-slate-500">Active filters</p>
        <p className="mt-2">
          Status: <span className="text-slate-200">{filters.status}</span> · Priority: <span className="text-slate-200">{filters.priority}</span>
        </p>
        <p>
          Due: <span className="text-slate-200">{filters.due}</span>
        </p>
        {filters.search ? (
          <p>
            Search: <span className="text-slate-200">{filters.search}</span>
          </p>
        ) : (
          <p>No search query.</p>
        )}
      </div>
    </div>
  );
}
