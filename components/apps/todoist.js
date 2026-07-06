import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RRule } from 'rrule';
import { parseRecurring } from '../../apps/todoist/utils/recurringParser';
import EmptyState from '../system/EmptyState';

const STORAGE_KEY = 'portfolio-tasks';

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

const PRIORITY_COLORS = {
  high: 'bg-red-500',
  medium: 'bg-ubt-gedit-orange',
  low: 'bg-ubt-green',
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
  const [recurringPreview, setRecurringPreview] = useState([]);
  const [recurringRule, setRecurringRule] = useState('');
  const [quick, setQuick] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [view, setView] = useState('all');
  const [activeProject, setActiveProject] = useState('all');
  const [editingTask, setEditingTask] = useState({ id: null, group: '', title: '' });
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const dragged = useRef({ group: '', id: null, title: '' });
  const liveRef = useRef(null);
  const workerRef = useRef(null);
  const quickRef = useRef(null);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        try {
          setGroups({ ...initialGroups, ...JSON.parse(data) });
        } catch {
          // ignore bad data
        }
      }
    }
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
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newGroups));
        } catch {
          // ignore
        }
      }
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
      newGroups[to].push(task);
    }
    return newGroups;
  };

  const updateGroups = (newGroups) => {
    setGroups(newGroups);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newGroups));
      } catch {
        // ignore
      }
    }
  };

  const handleDayDrop = (date) => (e) => {
    e.preventDefault();
    const { group, id, title } = dragged.current;
    if (!id) return;
    const newGroups = {
      ...groups,
      [group]: groups[group].map((t) =>
        t.id === id ? { ...t, due: date } : t,
      ),
    };
    setGroups(newGroups);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newGroups));
      } catch {
        // ignore
      }
    }
    announce(title, date);
  };

  const saveEditing = () => {
    const { id, group, title } = editingTask;
    if (!id) return;
    const newGroups = {
      ...groups,
      [group]: [...groups[group]],
    };
    const idx = newGroups[group].findIndex((t) => t.id === id);
    if (idx > -1) {
      newGroups[group][idx] = { ...newGroups[group][idx], title };
      updateGroups(newGroups);
    }
    setEditingTask({ id: null, group: '', title: '' });
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
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (name === 'recurring') {
      const result = parseRecurring(
        value,
        form.due ? new Date(form.due) : new Date(),
      );
      setRecurringRule(result?.rrule || '');
      setRecurringPreview(result?.preview || []);
    }
  };

  useEffect(() => {
    if (form.recurring) {
      const result = parseRecurring(
        form.recurring,
        form.due ? new Date(form.due) : new Date(),
      );
      setRecurringRule(result?.rrule || '');
      setRecurringPreview(result?.preview || []);
    } else {
      setRecurringRule('');
      setRecurringPreview([]);
    }
  }, [form.due, form.recurring]);

  const getNextDue = (task) => {
    const baseDate = task.due ? new Date(task.due) : new Date();
    if (task.rrule) {
      try {
        const rule = RRule.fromString(task.rrule);
        const next = rule.after(baseDate, true);
        return next ? next.toISOString().split('T')[0] : task.due;
      } catch {
        return task.due;
      }
    }
    if (!task.recurring) return task.due;
    const phrase = task.recurring.toLowerCase();
    let nextDate;
    if (phrase.includes('week')) {
      nextDate = new Date(baseDate);
      nextDate.setDate(baseDate.getDate() + 7);
    } else if (phrase.includes('month')) {
      nextDate = new Date(baseDate);
      nextDate.setMonth(baseDate.getMonth() + 1);
    } else if (phrase.includes('year')) {
      nextDate = new Date(baseDate);
      nextDate.setFullYear(baseDate.getFullYear() + 1);
    } else {
      const days = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];
      const foundDay = days.findIndex((d) => phrase.includes(d));
      if (foundDay >= 0) {
        const currentDay = baseDate.getDay();
        let addDays = (foundDay - currentDay + 7) % 7;
        if (addDays === 0) addDays = 7;
        nextDate = new Date(baseDate);
        nextDate.setDate(baseDate.getDate() + addDays);
      }
    }
    if (!nextDate) return task.due;
    return nextDate.toISOString().split('T')[0];
  };

  const toggleCompleted = (group, id) => {
    const newGroups = {
      ...groups,
      [group]: groups[group].map((t) => {
        if (t.id !== id) return t;
        if (t.rrule || t.recurring) {
          return { ...t, due: getNextDue(t) };
        }
        return { ...t, completed: !t.completed };
      }),
    };
    setGroups(newGroups);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newGroups));
      } catch {
        // ignore
      }
    }
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
      rrule: recurringRule || undefined,
      completed: false,
    };
    const newGroups = {
      ...groups,
      Today: [...groups.Today, newTask],
    };
    finalizeMove(newGroups, form.title, 'Today');
    setForm({ title: '', due: '', priority: 'medium', section: '', recurring: '' });
    setRecurringRule('');
    setRecurringPreview([]);
  };

  const handleQuickAdd = (e) => {
    e.preventDefault();
    if (!quick.trim()) return;
    let due;
    let dateText = '';
    const inputLower = quick.toLowerCase();
    if (/\btomorrow\b/.test(inputLower)) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      due = d.toISOString().split('T')[0];
      dateText = 'tomorrow';
    } else if (/\btoday\b/.test(inputLower)) {
      const d = new Date();
      due = d.toISOString().split('T')[0];
      dateText = 'today';
    } else if (/next\s+(\w+)/.test(inputLower)) {
      const match = inputLower.match(/next\s+(\w+)/);
      if (match) {
        const word = match[1];
        if (['week', 'month', 'year'].includes(word)) {
          const d = new Date();
          if (word === 'week') d.setDate(d.getDate() + 7);
          if (word === 'month') d.setMonth(d.getMonth() + 1);
          if (word === 'year') d.setFullYear(d.getFullYear() + 1);
          due = d.toISOString().split('T')[0];
        } else {
          const dayIndex = [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          ].findIndex((day) => day === word);
          if (dayIndex >= 0) {
            const todayIndex = new Date().getDay();
            let add = (dayIndex - todayIndex + 7) % 7;
            if (add === 0) add = 7;
            const d = new Date();
            d.setDate(d.getDate() + add);
            due = d.toISOString().split('T')[0];
          }
        }
        dateText = match[0];
      }
    } else {
      const dayMatch = inputLower.match(
        /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/
      );
      if (dayMatch) {
        const dayIndex = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ].indexOf(dayMatch[1]);
        if (dayIndex >= 0) {
          const todayIndex = new Date().getDay();
          let add = (dayIndex - todayIndex + 7) % 7;
          if (add === 0) add = 7;
          const d = new Date();
          d.setDate(d.getDate() + add);
          due = d.toISOString().split('T')[0];
        }
        dateText = dayMatch[1];
      }
    }
    const priorityMatch = quick.match(/!([1-3])/);
    const sectionMatch = quick.match(/#(\w+)/);
    const recurringMatch = quick.match(/every\s+([a-z0-9\s]+)/i);
    const priorityMap = { '1': 'high', '2': 'medium', '3': 'low' };
    const priority = priorityMatch ? priorityMap[priorityMatch[1]] : 'medium';
    let title = quick;
    if (dateText) {
      title = title.replace(new RegExp(dateText, 'i'), '').trim();
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
    let rrule;
    if (recurringMatch) {
      const parsed = parseRecurring(
        recurringMatch[0],
        due ? new Date(due) : new Date(),
      );
      rrule = parsed?.rrule;
      if (!due && parsed?.preview[0]) {
        due = parsed.preview[0].toISOString().split('T')[0];
      }
    }
    const newTask = {
      id: Date.now(),
      title: title || quick,
      due,
      priority,
      section,
      recurring,
      rrule,
      completed: false,
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
        const newGroups = { ...initialGroups, ...parsed };
        setGroups(newGroups);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newGroups));
        }
      } catch {
        // ignore
      }
    };
    reader.readAsText(file);
  };

  const handleExportCsv = () => {
    try {
      const header = ['title', 'due', 'priority', 'section', 'recurring'];
      const rows = Object.values(groups)
        .flat()
        .map((t) => [
          t.title,
          t.due || '',
          t.priority,
          t.section || '',
          t.recurring || '',
        ]);
      const csv = [header, ...rows]
        .map((r) =>
          r
            .map((c) => `"${String(c).replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tasks.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const parseCsvLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result.map((c) => c.trim());
  };

  const handleImportCsv = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length < 2) return;
        const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
        const idx = {
          title: headers.indexOf('title'),
          due: headers.indexOf('due'),
          priority: headers.indexOf('priority'),
          section: headers.indexOf('section'),
          recurring: headers.indexOf('recurring'),
        };
        const imported = lines.slice(1).map((line) => {
          const cols = parseCsvLine(line);
          let due = cols[idx.due] || '';
          let recurring = cols[idx.recurring] || '';
          let rrule;
          if (recurring) {
            const text = recurring.trim().toLowerCase();
            const full = text.startsWith('every') ? text : `every ${text}`;
            const parsed = parseRecurring(
              full,
              due ? new Date(due) : new Date()
            );
            rrule = parsed?.rrule;
            if (!due && parsed?.preview[0]) {
              due = parsed.preview[0].toISOString().split('T')[0];
            }
          }
          return {
            id: Date.now() + Math.random(),
            title: cols[idx.title] || '',
            due: due || undefined,
            priority: cols[idx.priority] || 'medium',
            section: cols[idx.section] || undefined,
            recurring: recurring || undefined,
            rrule,
            completed: false,
          };
        });
        const newGroups = {
          ...groups,
          Today: [...groups.Today, ...imported],
        };
        setGroups(newGroups);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newGroups));
        }
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

  const renderTask = (group, task) => {
    const isEditing = editingTask.id === task.id;
    const today = new Date().toISOString().split('T')[0];
    let chipColor = 'bg-blue-100 text-blue-700';
    if (task.due) {
      if (task.due < today) chipColor = 'bg-red-100 text-red-700';
      else if (task.due === today) chipColor = 'bg-yellow-100 text-yellow-700';
    }
    return (
      <div key={task.id} className="mb-1.5">
        <div
          tabIndex={0}
          draggable
          onDragStart={handleDragStart(group, task)}
          onKeyDown={handleKeyDown(group, task)}
          className="rounded shadow bg-white text-black flex items-center px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          role="listitem"
        >
          <label className="mr-2 inline-flex items-center">
            <input
              type="checkbox"
              aria-label="Toggle completion"
              checked={!!task.completed}
              onChange={() => toggleCompleted(group, task.id)}
              className="w-6 h-6 focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <div className="flex-1">
            <div className="flex items-center">
              <span
                className={`w-2 h-2 rounded-full mr-2 ${PRIORITY_COLORS[task.priority]}`}
                aria-label={`priority ${task.priority}`}
              />
              <div className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.title}</div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              {task.due && (
                <span className={`inline-flex items-center gap-1 px-2 py-[2px] rounded-full ${chipColor}`}>
                  <span aria-hidden>📅</span>
                  {task.due}
                </span>
              )}
              {task.section && <span>{task.section}</span>}
            </div>
          </div>
          <button
            onClick={() =>
              setEditingTask({ id: task.id, group, title: task.title })
            }
            className="ml-2 text-xs text-blue-600"
          >
            Edit
          </button>
        </div>
        <div
          className={`transition-[max-height] duration-300 overflow-hidden px-2 ${isEditing ? 'max-h-20' : 'max-h-0'}`}
        >
          {isEditing && (
            <input
              value={editingTask.title}
              onChange={(e) =>
                setEditingTask({ ...editingTask, title: e.target.value })
              }
              onBlur={saveEditing}
              onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
              className="mt-1.5 w-full border p-1.5"
              autoFocus
            />
          )}
        </div>
      </div>
    );
  };

  const renderGroup = (name) => {
    const filtered = groups[name].filter(matchesTask);
    const bySection = {};
    filtered.forEach((t) => {
      const sec = t.section || 'General';
      if (!bySection[sec]) bySection[sec] = [];
      bySection[sec].push(t);
    });
    const groupClass = `flex-1 px-2 py-1.5 border-r last:border-r-0 border-gray-300 overflow-y-auto ${
      !prefersReducedMotion.current ? 'transition-colors' : ''
    } ${animating === name ? 'bg-blue-200' : ''}`;
    return (
      <div
        key={name}
        onDragOver={handleDragOver}
        onDrop={handleDrop(name)}
        className={groupClass}
        role="list"
        aria-label={name}
      >
        <h2 className="mb-1.5 font-bold text-lg text-gray-800">
          {name}
          {WIP_LIMITS[name] ? ` (${groups[name].length}/${WIP_LIMITS[name]})` : ''}
        </h2>
        {filtered.length === 0 ? (
          <div className="mt-3 flex justify-center">
            <EmptyState
              className="max-w-sm px-6 py-8"
              title="No tasks yet"
              helperText="Use quick add or drop cards into this column to start planning."
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="6" height="18" rx="1.5" />
                  <rect x="10.5" y="3" width="6" height="18" rx="1.5" />
                  <rect x="18" y="3" width="3" height="18" rx="1.5" />
                </svg>
              }
              iconLabel="Illustration of empty kanban columns"
              action={
                <button
                  type="button"
                  onClick={() => quickRef.current?.focus()}
                  className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-inverse)] transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
                >
                  Add a task
                </button>
              }
            />
          </div>
        ) : (
          Object.keys(bySection).map((sec) => (
            <div key={sec} className="mb-4">
              {sec !== 'General' && <h3 className="font-semibold">{sec}</h3>}
              {bySection[sec].map((task) => renderTask(name, task))}
            </div>
          ))
        )}
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

  const projectNames = Object.keys(groups);

  const renderCalendar = () => {
    const start = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    const end = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
    const tasksByDate = {};
    flatTasks
      .filter((t) => t.due && matchesTask(t))
      .forEach((t) => {
        (tasksByDate[t.due] ||= []).push(t);
      });
    const days = [];
    for (let i = 0; i < start.getDay(); i++) days.push(null);
    for (let d = 1; d <= end.getDate(); d++) {
      const dateStr = new Date(
        calendarDate.getFullYear(),
        calendarDate.getMonth(),
        d,
      )
        .toISOString()
        .split('T')[0];
      days.push({ dateStr, tasks: tasksByDate[dateStr] || [] });
    }
    while (days.length % 7 !== 0) days.push(null);
    const monthLabel = start.toLocaleString('default', { month: 'long', year: 'numeric' });
    return (
      <div className="flex-1 p-2 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => {
              setCalendarDate(
                new Date(
                  calendarDate.getFullYear(),
                  calendarDate.getMonth() - 1,
                  1,
                ),
              );
            }}
            aria-label="Previous month"
          >
            &lt;
          </button>
          <h2 className="font-bold text-lg">{monthLabel}</h2>
          <button
            onClick={() => {
              setCalendarDate(
                new Date(
                  calendarDate.getFullYear(),
                  calendarDate.getMonth() + 1,
                  1,
                ),
              );
            }}
            aria-label="Next month"
          >
            &gt;
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-sm">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center font-semibold">
              {d}
            </div>
          ))}
          {days.map((day, idx) => (
            <div
              key={idx}
              className="border min-h-[80px] p-1"
              onDragOver={handleDragOver}
              onDrop={day ? handleDayDrop(day.dateStr) : undefined}
            >
              {day && (
                <React.Fragment>
                  <div className="text-xs">
                    {parseInt(day.dateStr.split('-')[2], 10)}
                  </div>
                  {day.tasks.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={handleDragStart(t.group, t)}
                      className="mt-1 p-1 bg-white text-black rounded text-xs"
                    >
                      {t.title}
                    </div>
                  ))}
                </React.Fragment>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full" role="application">
      <aside className="w-40 border-r p-1 space-y-1">
        <button
          onClick={() => setActiveProject('all')}
          className={`w-full text-left px-2 py-1 rounded-full transition-colors ${
            activeProject === 'all'
              ? 'bg-gray-800 text-white'
              : 'text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Projects
        </button>
        {projectNames.map((name) => (
          <button
            key={name}
            onClick={() => setActiveProject(name)}
            className={`w-full text-left px-2 py-1 rounded-full transition-colors ${
              activeProject === name
                ? 'bg-gray-800 text-white'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            {name}
          </button>
        ))}
      </aside>
      <div className="flex flex-1 flex-col">
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
          {recurringPreview.length > 0 && (
            <div className="text-xs text-gray-500">
              Next: {recurringPreview
                .map((d) => d.toISOString().split('T')[0])
                .join(', ')}
            </div>
          )}
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
          <button className="px-2 py-1 border rounded" onClick={() => setView('calendar')}>Calendar</button>
          <button className="px-2 py-1 border rounded" onClick={handleExport}>Export</button>
          <button className="px-2 py-1 border rounded" onClick={handleExportCsv}>Export CSV</button>
          <label className="px-2 py-1 border rounded cursor-pointer">
            Import
            <input type="file" accept="application/json" onChange={handleImport} className="sr-only" />
          </label>
          <label className="px-2 py-1 border rounded cursor-pointer">
            Import CSV
            <input type="file" accept="text/csv" onChange={handleImportCsv} className="sr-only" />
          </label>
        </div>
        <div className="flex flex-1">
          {view === 'all'
            ? (activeProject === 'all'
                ? projectNames.map((name) => renderGroup(name))
                : renderGroup(activeProject))
            : view === 'calendar'
              ? renderCalendar()
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
      </div>
    </div>
  );
}

export const displayTodoist = () => {
  return <Todoist />;
};
