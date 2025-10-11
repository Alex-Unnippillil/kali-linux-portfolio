import React, { useEffect, useRef, useState } from 'react';
import * as chrono from 'chrono-node';
import KanbanBoard from '../../apps/todoist/components/KanbanBoard';
import {
  STORAGE_KEY,
  addSection,
  createEmptyState,
  createTask,
  deleteTask,
  deserializeState,
  moveTask,
  serializeState,
  slugifySectionName,
  toggleTaskCompletion,
  updateTask,
} from '../../apps/todoist/utils/taskStore';

function formatDueDate(value) {
  if (!value) return '';
  try {
    const date = new Date(value);
    return date.toLocaleDateString();
  } catch {
    return value;
  }
}

function parseQuickAdd(value) {
  let working = value.trim();
  if (!working) {
    return null;
  }

  let dueDate;
  const parsed = chrono.parse(working, new Date(), { forwardDate: true });
  if (parsed.length > 0) {
    const first = parsed[0];
    dueDate = first.date().toISOString().split('T')[0];
    working = `${working.slice(0, first.index)} ${working.slice(first.index + first.text.length)}`;
  }

  const sectionMatch = working.match(/(?:^|\s)#([\w-]+)/);
  let sectionName;
  if (sectionMatch) {
    sectionName = sectionMatch[1].replace(/-/g, ' ');
    working = working.replace(sectionMatch[0], ' ');
  }

  const title = working.replace(/\s+/g, ' ').trim();

  if (!title) {
    return null;
  }

  return {
    title,
    dueDate,
    sectionName,
  };
}

function TaskCard({
  task,
  onToggle,
  onDelete,
  onDueDateChange,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) {
  return (
    <div
      className="bg-gray-900 border border-gray-700 rounded-md p-2 mb-2 text-sm"
      role="listitem"
      aria-label={task.title}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === ' ') {
          event.preventDefault();
          onToggle();
        }
        if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          onDelete();
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onToggle}
          className={`rounded-full w-4 h-4 border ${task.completed ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}
          aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
        />
        <input
          defaultValue={task.title}
          className="flex-1 bg-transparent focus:outline-none"
          onBlur={(event) => {
            const value = event.target.value.trim();
            if (value && value !== task.title) {
              onRename(value);
            } else if (!value) {
              event.target.value = task.title;
            }
          }}
          aria-label="Task title"
        />
        <button onClick={onDelete} className="text-xs text-red-400" aria-label="Delete task">
          Delete
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <label className="text-xs text-gray-400">
          Due
          <input
            type="date"
            defaultValue={task.dueDate || ''}
            className="ml-2 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-xs"
            onChange={(event) => onDueDateChange(event.target.value || undefined)}
            aria-label="Due date"
          />
        </label>
        {task.dueDate && (
          <span className="text-xs text-gray-300" aria-hidden="true">
            {formatDueDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Todoist() {
  const [state, setState] = useState(() => createEmptyState());
  const [form, setForm] = useState({ title: '', dueDate: '', sectionId: 'today' });
  const [quickText, setQuickText] = useState('');
  const [dragging, setDragging] = useState({ taskId: null, sectionId: null });
  const quickRef = useRef(null);
  const workerRef = useRef(null);
  const stateRef = useRef(state);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const restored = deserializeState(stored);
    setState(restored);
    setForm((prev) => ({
      ...prev,
      sectionId: restored.sections[0]?.id || prev.sectionId,
    }));
  }, []);

  useEffect(() => {
    stateRef.current = state;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeState(state));
    } catch {
      // ignore storage errors
    }
  }, [state]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return undefined;
    const worker = new Worker(new URL('./todoist.worker.js', import.meta.url));
    workerRef.current = worker;
    worker.onmessage = (event) => {
      const { state: next } = event.data || {};
      if (next) {
        setState(next);
      }
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (
        event.key.toLowerCase() === 'q' &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        quickRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!state.sections.some((section) => section.id === form.sectionId)) {
      setForm((prev) => ({
        ...prev,
        sectionId: state.sections[0]?.id || 'today',
      }));
    }
  }, [state.sections, form.sectionId]);

  const handleStateUpdate = (updater) => {
    setState((prev) => updater(prev));
  };

  const handleCreateTask = (event) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    handleStateUpdate((prev) =>
      createTask(prev, {
        title: form.title,
        dueDate: form.dueDate || undefined,
        sectionId: form.sectionId,
      }),
    );
    setForm((prev) => ({ ...prev, title: '', dueDate: '' }));
  };

  const handleQuickSubmit = (event) => {
    event.preventDefault();
    const parsed = parseQuickAdd(quickText);
    if (!parsed) return;
    handleStateUpdate((prev) =>
      createTask(prev, {
        title: parsed.title,
        dueDate: parsed.dueDate,
        sectionName: parsed.sectionName || undefined,
      }),
    );
    setQuickText('');
  };

  const handleAddSection = () => {
    const name = window.prompt('Section name');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    const id = slugifySectionName(trimmed);
    handleStateUpdate((prev) => addSection(prev, { id, name: trimmed }));
  };

  const requestMove = (taskId, sectionId, index) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'move-task',
        payload: {
          state: stateRef.current,
          taskId,
          sectionId,
          index,
        },
      });
    } else {
      handleStateUpdate((prev) => moveTask(prev, taskId, sectionId, index));
    }
  };

  const handleTaskDragStart = (taskId, sectionId) => (event) => {
    setDragging({ taskId, sectionId });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId);
  };

  const handleTaskDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleTaskDrop = (sectionId, index) => (event) => {
    event.preventDefault();
    const transferred = event.dataTransfer.getData('text/plain');
    const taskId = transferred || dragging.taskId;
    if (!taskId) return;
    requestMove(taskId, sectionId, index);
    setDragging({ taskId: null, sectionId: null });
  };

  const columns = state.sections.map((section) => {
    const tasks = section.taskIds
      .map((taskId) => state.tasks[taskId])
      .filter(Boolean);

    return {
      id: section.id,
      title: section.name,
      element: (
        <div className="bg-gray-950/80 border border-gray-800 rounded-md p-3 flex flex-col" role="region" aria-label={section.name}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-100 text-sm">{section.name}</h2>
            <span className="text-xs text-gray-400" aria-label={`${tasks.length} tasks`}>
              {tasks.length}
            </span>
          </div>
          <div role="list" aria-label={`${section.name} tasks`}>
            {tasks.map((task, index) => (
              <React.Fragment key={task.id}>
                <div
                  className="h-2"
                  onDragOver={handleTaskDragOver}
                  onDrop={handleTaskDrop(section.id, index)}
                />
                <TaskCard
                  task={task}
                  onToggle={() => handleStateUpdate((prev) => toggleTaskCompletion(prev, task.id))}
                  onDelete={() => handleStateUpdate((prev) => deleteTask(prev, task.id))}
                  onDueDateChange={(dueDate) =>
                    handleStateUpdate((prev) =>
                      updateTask(prev, task.id, {
                        dueDate,
                      }),
                    )
                  }
                  onRename={(title) =>
                    handleStateUpdate((prev) =>
                      updateTask(prev, task.id, {
                        title,
                      }),
                    )
                  }
                  onDragStart={handleTaskDragStart(task.id, section.id)}
                  onDragOver={handleTaskDragOver}
                  onDrop={handleTaskDrop(section.id, index + 1)}
                  onDragEnd={() => setDragging({ taskId: null, sectionId: null })}
                />
              </React.Fragment>
            ))}
            <div className="h-4" onDragOver={handleTaskDragOver} onDrop={handleTaskDrop(section.id, tasks.length)} />
          </div>
        </div>
      ),
    };
  });

  return (
    <div className="h-full w-full flex flex-col bg-gray-950 text-gray-100" role="application" aria-label="Todoist simulation">
      <header className="border-b border-gray-800 p-3 space-y-3">
        <div className="flex gap-2 items-center">
          <form onSubmit={handleQuickSubmit} className="flex-1 flex gap-2" aria-label="Quick add task">
            <input
              ref={quickRef}
              value={quickText}
              onChange={(event) => setQuickText(event.target.value)}
              placeholder="Quick add: 'Prepare demo tomorrow #launch'"
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2"
              aria-label="Quick add"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 transition-colors rounded px-3 py-2 text-sm">
              Add
            </button>
          </form>
          <button onClick={handleAddSection} className="text-sm border border-gray-700 rounded px-3 py-2" aria-label="Add section">
            + Section
          </button>
        </div>
        <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-4 gap-2" aria-label="Add task">
          <input
            name="title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Task title"
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2"
            aria-label="Task title"
            required
          />
          <input
            type="date"
            name="dueDate"
            value={form.dueDate}
            onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2"
            aria-label="Due date"
          />
          <select
            name="sectionId"
            value={form.sectionId}
            onChange={(event) => setForm({ ...form, sectionId: event.target.value })}
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2"
            aria-label="Section"
          >
            {state.sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 transition-colors rounded px-3 py-2 text-sm">
            Create task
          </button>
        </form>
      </header>
      <main className="flex-1 overflow-auto p-3">
        <KanbanBoard columns={columns} />
      </main>
    </div>
  );
}

export const displayTodoist = () => <Todoist />;
