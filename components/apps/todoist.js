import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as chrono from 'chrono-node';
import {
  loadTasks,
  saveGroups,
  syncWithServer,
} from '../../apps/todoist/utils/db';

const initialGroups = {
  Today: [],
  Upcoming: [],
  Someday: [],
};

const WIP_LIMITS = {
  Today: 0,
  Upcoming: 0,
  Someday: 0,
};

export default function Todoist() {
  const [groups, setGroups] = useState(initialGroups);
  const [animating, setAnimating] = useState('');
  const [form, setForm] = useState({
    title: '',
    due: '',
    priority: 'medium',
    section: '',
    recurring: '',
  });
  const [quick, setQuick] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [view, setView] = useState('all');
  const [conflicts, setConflicts] = useState([]);
  const dragged = useRef({ group: '', id: null, title: '' });
  const liveRef = useRef(null);
  const workerRef = useRef(null);
  const quickRef = useRef(null);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    loadTasks().then((data) => {
      if (data) {
        setGroups({ ...initialGroups, ...data });
      }
    });
  }, []);

  useEffect(() => {
    const handler = async () => {
      const { groups: synced, conflicts: c } = await syncWithServer();
      setGroups(synced);
      setConflicts(c);
    };
    handler();
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (
        e.key.toLowerCase() === 'q' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        quickRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      workerRef.current = new Worker(new URL('./todoist.worker.js', import.meta.url));
      workerRef.current.onmessage = (e) => {
        const { groups: newGroups, taskTitle, to } = e.data || {};
        if (newGroups && taskTitle && to) {
          finalizeMove(newGroups, taskTitle, to);
        }
      };
    }
    return () => workerRef.current?.terminate();
  }, [finalizeMove]);

  const announce = useCallback((task, group) => {
    if (liveRef.current) {
      liveRef.current.textContent = `Moved ${task} to ${group}`;
    }
  }, []);

  const finalizeMove = useCallback(
    (newGroups, taskTitle, to) => {
      setGroups(newGroups);
      saveGroups(newGroups);
      announce(taskTitle, to);
      if (!prefersReducedMotion.current) {
        requestAnimationFrame(() => {
          setAnimating(to);
          setTimeout(() => setAnimating(''), 500);
        });
      }
    },
    [announce],
  );

  const handleDragStart = (group, task) => (e) => {
    dragged.current = { group, id: task.id, title: task.title };
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (group) => (e) => {
    e.preventDefault();
    const { group: from, id, title } = dragged.current;
    if (!id || from === group) return;
    if (WIP_LIMITS[group] && groups[group].length >= WIP_LIMITS[group]) return;
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'move', groups, from, to: group, id });
    } else {
      const newGroups = moveTask(groups, from, group, id);
      finalizeMove(newGroups, title, group);
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const moveTask = (data, from, to, id) => {
    const newGroups = {
      ...data,
      [from]: [...data[from]],
      [to]: [...data[to]],
    };
    const index = newGroups[from].findIndex((t) => t.id === id);
    if (index > -1) {
      const [task] = newGroups[from].splice(index, 1);
      task.updatedAt = Date.now();
      newGroups[to].push(task);
    }
    return newGroups;
  };

  const handleKeyDown = (group, task) => (e) => {
    const names = Object.keys(groups);
    const index = groups[group].findIndex((t) => t.id === task.id);
    if (e.key === ' ' || (e.ctrlKey && e.key.toLowerCase() === 'd')) {
      e.preventDefault();
      toggleCompleted(group, task.id);
      return;
    }
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      const newGroups = { ...groups, [group]: [...groups[group]] };
      [newGroups[group][index - 1], newGroups[group][index]] = [
        newGroups[group][index],
        newGroups[group][index - 1],
      ];
      finalizeMove(newGroups, task.title, group);
    } else if (e.key === 'ArrowDown' && index < groups[group].length - 1) {
      e.preventDefault();
      const newGroups = { ...groups, [group]: [...groups[group]] };
      [newGroups[group][index + 1], newGroups[group][index]] = [
        newGroups[group][index],
        newGroups[group][index + 1],
      ];
      finalizeMove(newGroups, task.title, group);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const dir = e.key === 'ArrowLeft' ? -1 : 1;
      const colIndex = names.indexOf(group);
      const target = names[colIndex + dir];
      if (target && !(WIP_LIMITS[target] && groups[target].length >= WIP_LIMITS[target])) {
        if (workerRef.current) {
          workerRef.current.postMessage({
            type: 'move',
            groups,
            from: group,
            to: target,
            id: task.id,
          });
        } else {
          const newGroups = moveTask(groups, group, target, task.id);
          finalizeMove(newGroups, task.title, target);
        }
      }
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const getNextDue = (task) => {
    if (!task.recurring) return task.due;
    const base = task.due ? new Date(task.due) : new Date();
    const next = chrono.parseDate(`next ${task.recurring}`, base);
    return next ? next.toISOString().split('T')[0] : task.due;
  };

  const toggleCompleted = (group, id) => {
    const newGroups = {
      ...groups,
      [group]: groups[group].map((t) => {
        if (t.id !== id) return t;
        if (t.recurring) {
          return { ...t, due: getNextDue(t), updatedAt: Date.now() };
        }
        return { ...t, completed: !t.completed, updatedAt: Date.now() };
      }),
    };
    setGroups(newGroups);
    saveGroups(newGroups);
  };

  const editTask = (group, id) => {
    const title = typeof window !== 'undefined' ? window.prompt('Edit task') : null;
    if (!title) return;
    const newGroups = {
      ...groups,
      [group]: groups[group].map((t) =>
        t.id === id ? { ...t, title, updatedAt: Date.now() } : t
      ),
    };
    setGroups(newGroups);
    saveGroups(newGroups);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.title) return;
    if (WIP_LIMITS.Today && groups.Today.length >= WIP_LIMITS.Today) return;
    const newTask = {
      id: Date.now(),
      title: form.title,
      due: form.due || undefined,
      priority: form.priority,
      section: form.section || undefined,
      recurring: form.recurring || undefined,
      completed: false,
      updatedAt: Date.now(),
    };
    const newGroups = {
      ...groups,
      Today: [...groups.Today, newTask],
    };
    finalizeMove(newGroups, form.title, 'Today');
    setForm({ title: '', due: '', priority: 'medium', section: '', recurring: '' });
  };

  const handleQuickAdd = (e) => {
    e.preventDefault();
    if (!quick.trim()) return;
    let due;
    try {
      const date = chrono.parseDate(quick);
      if (date) {
        due = date.toISOString().split('T')[0];
      }
    } catch {
      // ignore
    }
    const priorityMatch = quick.match(/!([1-3])/);
    const sectionMatch = quick.match(/#(\w+)/);
    const recurringMatch = quick.match(/every\s+([a-z]+)/i);
    const priorityMap = { '1': 'high', '2': 'medium', '3': 'low' };
    const priority = priorityMatch ? priorityMap[priorityMatch[1]] : 'medium';
    let title = quick;
    if (due) {
      const parsed = chrono.parse(quick)[0];
      if (parsed) {
        title = title.replace(parsed.text, '').trim();
      }
    }
    if (priorityMatch) {
      title = title.replace(priorityMatch[0], '').trim();
    }
    if (sectionMatch) {
      title = title.replace(sectionMatch[0], '').trim();
    }
    if (recurringMatch) {
      title = title.replace(recurringMatch[0], '').trim();
    }
    const section = sectionMatch ? sectionMatch[1] : undefined;
    let recurring = recurringMatch ? recurringMatch[1].toLowerCase() : undefined;
    if (recurring && !due) {
      try {
        const next = chrono.parseDate(`next ${recurring}`);
        if (next) {
          due = next.toISOString().split('T')[0];
        }
      } catch {
        // ignore
      }
    }
    const newTask = {
      id: Date.now(),
      title: title || quick,
      due,
      priority,
      section,
      recurring,
      completed: false,
      updatedAt: Date.now(),
    };
    const newGroups = {
      ...groups,
      Today: [...groups.Today, newTask],
    };
    finalizeMove(newGroups, newTask.title, 'Today');
    setQuick('');
  };

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(groups)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tasks.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        Object.values(parsed).forEach((arr) =>
          arr.forEach((t) => {
            if (!t.updatedAt) t.updatedAt = Date.now();
          })
        );
        const newGroups = { ...initialGroups, ...parsed };
        setGroups(newGroups);
        saveGroups(newGroups);
      } catch {
        // ignore
      }
    };
    reader.readAsText(file);
  };

  const matchesTask = (task) => {
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter === 'completed' && !task.completed) return false;
    if (statusFilter === 'active' && task.completed) return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    return true;
  };

  const renderTask = (group, task) => (
    <div
      key={task.id}
      tabIndex={0}
      draggable
      onDragStart={handleDragStart(group, task)}
      onKeyDown={handleKeyDown(group, task)}
      className="mb-2 p-2 rounded shadow bg-white text-black flex items-center min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
      role="listitem"
      onDoubleClick={() => editTask(group, task.id)}
    >
      <input
        type="checkbox"
        aria-label="Toggle completion"
        checked={!!task.completed}
        onChange={() => toggleCompleted(group, task.id)}
        className="w-6 h-6 mr-2 focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex-1">
        <div className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.title}</div>
        {task.due && <div className="text-xs text-gray-500">{task.due}</div>}
        {task.section && <div className="text-xs text-gray-500">{task.section}</div>}
        <div className="text-xs text-gray-500">Priority: {task.priority}</div>
      </div>
    </div>
  );

  const renderGroup = (name) => {
    const filtered = groups[name].filter(matchesTask);
    const bySection = {};
    filtered.forEach((t) => {
      const sec = t.section || 'General';
      if (!bySection[sec]) bySection[sec] = [];
      bySection[sec].push(t);
    });
    return (
      <div
        key={name}
        onDragOver={handleDragOver}
        onDrop={handleDrop(name)}
        className={`flex-1 p-2 border-r last:border-r-0 border-gray-300 overflow-y-auto ${
          !prefersReducedMotion.current ? 'transition-colors' : ''
        } ${animating === name ? 'bg-blue-200' : ''}`}
        role="list"
        aria-label={name}
      >
        <h2 className="mb-2 font-bold text-lg text-gray-800">
          {name}
          {WIP_LIMITS[name] ? ` (${groups[name].length}/${WIP_LIMITS[name]})` : ''}
        </h2>
        {Object.keys(bySection).map((sec) => (
          <div key={sec} className="mb-4">
            {sec !== 'General' && <h3 className="font-semibold">{sec}</h3>}
            {bySection[sec].map((task) => renderTask(name, task))}
          </div>
        ))}
      </div>
    );
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const flatTasks = Object.entries(groups).flatMap(([g, arr]) =>
    arr.map((t) => ({ ...t, group: g }))
  );
  const todayTasks = flatTasks.filter((t) => t.due === todayStr && matchesTask(t));
  const upcomingTasks = flatTasks
    .filter((t) => t.due && t.due > todayStr && matchesTask(t))
    .sort((a, b) => a.due.localeCompare(b.due));

  return (
    <div className="flex h-full w-full flex-col" role="application">
      {conflicts.length > 0 && (
        <div className="bg-yellow-200 text-black p-2 text-sm">
          {`Conflicts detected for ${conflicts.length} task${
            conflicts.length > 1 ? 's' : ''}.`}
        </div>
      )}
      <div aria-live="polite" className="sr-only" ref={liveRef} />
      <div className="p-2 border-b flex flex-col gap-2">
        <form onSubmit={handleQuickAdd} className="flex gap-2">
          <input
            ref={quickRef}
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            placeholder="Quick add (e.g., 'Pay bills tomorrow !1')"
            className="border p-1 flex-1"
          />
          <button
            type="submit"
            className="px-2 py-1 bg-blue-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add
          </button>
        </form>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd(e)}
            placeholder="Task"
            className="border p-1"
            required
          />
          <input
            type="date"
            name="due"
            value={form.due}
            onChange={handleChange}
            className="border p-1"
          />
          <input
            name="section"
            value={form.section}
            onChange={handleChange}
            placeholder="Section"
            className="border p-1"
          />
          <input
            name="recurring"
            value={form.recurring}
            onChange={handleChange}
            placeholder="Recurring (e.g., every mon)"
            className="border p-1"
          />
          <select
            name="priority"
            value={form.priority}
            onChange={handleChange}
            className="border p-1"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button
            type="submit"
            className="px-2 py-1 bg-blue-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="border p-1 flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border p-1"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border p-1"
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="px-2 py-1 border rounded" onClick={() => setView('all')}>All</button>
          <button className="px-2 py-1 border rounded" onClick={() => setView('today')}>Today</button>
          <button className="px-2 py-1 border rounded" onClick={() => setView('upcoming')}>Upcoming</button>
          <button className="px-2 py-1 border rounded" onClick={handleExport}>Export</button>
          <label className="px-2 py-1 border rounded cursor-pointer">
            Import
            <input type="file" accept="application/json" onChange={handleImport} className="sr-only" />
          </label>
        </div>
      </div>
      <div className="flex flex-1">
        {view === 'all'
          ? Object.keys(groups).map((name) => renderGroup(name))
          : (
            <div
              className="flex-1 p-2 overflow-y-auto"
              role="list"
              aria-label={view === 'today' ? 'Today' : 'Upcoming'}
            >
              <h2 className="mb-2 font-bold text-lg text-gray-800">
                {view === 'today' ? 'Today' : 'Upcoming'}
              </h2>
              {(view === 'today' ? todayTasks : upcomingTasks).map((task) =>
                renderTask(task.group, task)
              )}
            </div>
          )}
      </div>
    </div>
  );
}

export const displayTodoist = () => {
  return <Todoist />;
};

