import React, { useEffect, useRef, useState } from 'react';
import { get, set, createStore } from 'idb-keyval';

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
  const [form, setForm] = useState({ title: '', due: '', labels: '', subtasks: '' });
  const [search, setSearch] = useState('');
  const dragged = useRef({ group: '', id: null, title: '' });
  const liveRef = useRef(null);
  const workerRef = useRef(null);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const store = createStore('portfolio-tasks', 'tasks');
  const KEY = 'all';

  useEffect(() => {
    get(KEY, store).then((data) => {
      if (data) {
        setGroups({ ...initialGroups, ...data });
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.Worker === 'function') {
      workerRef.current = new Worker(new URL('./todoist.worker.js', import.meta.url));
      workerRef.current.onmessage = (e) => {
        const { groups: newGroups, taskTitle, to } = e.data || {};
        if (newGroups && taskTitle && to) {
          finalizeMove(newGroups, taskTitle, to);
        }
      };
    }
    return () => workerRef.current?.terminate();
  }, []);

  const announce = (task, group) => {
    if (liveRef.current) {
      liveRef.current.textContent = `Moved ${task} to ${group}`;
    }
  };

  const finalizeMove = (newGroups, taskTitle, to) => {
    setGroups(newGroups);
    set(KEY, newGroups, store).catch(() => {});
    announce(taskTitle, to);
    if (!prefersReducedMotion.current) {
      requestAnimationFrame(() => {
        setAnimating(to);
        setTimeout(() => setAnimating(''), 500);
      });
    }
  };

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

  const handleKeyDown = (group, task) => (e) => {
    const names = Object.keys(groups);
    const index = groups[group].findIndex((t) => t.id === task.id);
    if (e.key === ' ' || (e.ctrlKey && e.key.toLowerCase() === 'd')) {
      e.preventDefault();
      toggleDone(group, task.id);
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

  const toggleDone = (group, id) => {
    const newGroups = {
      ...groups,
      [group]: groups[group].map((t) =>
        t.id === id ? { ...t, done: !t.done } : t
      ),
    };
    setGroups(newGroups);
    set(KEY, newGroups, store).catch(() => {});
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.title) return;
    if (WIP_LIMITS.Today && groups.Today.length >= WIP_LIMITS.Today) return;
    const newTask = {
      id: Date.now(),
      title: form.title,
      due: form.due || undefined,
      labels: form.labels
        ? form.labels.split(',').map((l) => l.trim()).filter(Boolean)
        : [],
      subtasks: form.subtasks
        ? form.subtasks
            .split('\n')
            .map((t, i) => ({ id: i + 1, title: t.trim(), done: false }))
            .filter((t) => t.title)
        : [],
      done: false,
    };
    const newGroups = {
      ...groups,
      Today: [...groups.Today, newTask],
    };
    finalizeMove(newGroups, form.title, 'Today');
    setForm({ title: '', due: '', labels: '', subtasks: '' });
  };

  const matchesSearch = (task) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      task.title.toLowerCase().includes(q) ||
      task.labels.some((l) => l.toLowerCase().includes(q)) ||
      task.subtasks.some((s) => s.title.toLowerCase().includes(q))
    );
  };

  return (
    <div className="flex h-full w-full flex-col" role="application">
      <div aria-live="polite" className="sr-only" ref={liveRef} />
      <div className="p-2 border-b flex flex-col gap-2">
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
            name="labels"
            value={form.labels}
            onChange={handleChange}
            placeholder="labels"
            className="border p-1"
          />
          <textarea
            name="subtasks"
            value={form.subtasks}
            onChange={handleChange}
            placeholder="subtasks"
            className="border p-1"
          />
          <button
            type="submit"
            className="px-2 py-1 bg-blue-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add
          </button>
        </form>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="border p-1"
        />
      </div>
      <div className="flex flex-1">
        {Object.keys(groups).map((name) => (
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
            {groups[name].filter(matchesSearch).map((task) => (
              <div
                key={task.id}
                tabIndex={0}
                draggable
                onDragStart={handleDragStart(name, task)}
                onKeyDown={handleKeyDown(name, task)}
                className="mb-2 p-2 rounded shadow bg-white text-black flex items-center min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                role="listitem"
              >
                <input
                  type="checkbox"
                  aria-label="Toggle completion"
                  checked={!!task.done}
                  onChange={() => toggleDone(name, task.id)}
                  className="w-6 h-6 mr-2 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className={`font-medium ${task.done ? 'line-through text-gray-500' : ''}`}>{task.title}</div>
                  {task.due && (
                    <div className="text-xs text-gray-500">{task.due}</div>
                  )}
                  {task.labels.length > 0 && (
                    <div className="text-xs mt-1">
                      {task.labels.map((l) => (
                        <span
                          key={l}
                          className="mr-1 px-1 bg-gray-200 rounded"
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  )}
                  {task.subtasks.length > 0 && (
                    <ul className="mt-1 text-xs list-disc list-inside">
                      {task.subtasks.map((s) => (
                        <li key={s.id}>{s.title}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export const displayTodoist = () => {
  return <Todoist />;
};

