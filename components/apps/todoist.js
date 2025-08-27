import React, { useEffect, useRef, useState } from 'react';
import { get, set } from 'idb-keyval';

const STORAGE_KEY = 'todoist-groups';

const initialGroups = {
  Today: [],
  Upcoming: [],
  Someday: [],
};

export default function Todoist() {
  const [groups, setGroups] = useState(initialGroups);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const dragged = useRef({ group: '', id: null });
  const liveRef = useRef(null);

  // Load from IndexedDB
  useEffect(() => {
    let ignore = false;
    if (typeof window !== 'undefined') {
      get(STORAGE_KEY).then((data) => {
        if (data && !ignore) setGroups(data);
      });
    }
    return () => {
      ignore = true;
    };
  }, []);

  // Persist to IndexedDB
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (async () => {
        try {
          await set(STORAGE_KEY, groups);
        } catch (err) {
          if (err?.name === 'QuotaExceededError') {
            console.error('Storage quota exceeded', err);
          }
        }
      })();
    }
  }, [groups]);

  const announce = (msg) => {
    if (liveRef.current) {
      liveRef.current.textContent = msg;
    }
  };

  const addTask = (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const task = { id: Date.now(), title: t, due: due || null };
    setGroups((g) => ({ ...g, Today: [...g.Today, task] }));
    setTitle('');
    setDue('');
    announce(`Added ${t}`);
  };

  const handleDragStart = (group, id) => (e) => {
    dragged.current = { group, id };
    e.dataTransfer.effectAllowed = 'move';
  };

  const moveTask = (data, from, to, id, beforeId = null) => {
    const newGroups = {
      ...data,
      [from]: [...data[from]],
      [to]: [...data[to]],
    };
    const index = newGroups[from].findIndex((t) => t.id === id);
    if (index > -1) {
      const [task] = newGroups[from].splice(index, 1);
      if (beforeId) {
        const i = newGroups[to].findIndex((t) => t.id === beforeId);
        if (i > -1) newGroups[to].splice(i, 0, task);
        else newGroups[to].push(task);
      } else {
        newGroups[to].push(task);
      }
    }
    return newGroups;
  };

  const handleDropColumn = (group) => (e) => {
    e.preventDefault();
    const { group: from, id } = dragged.current;
    if (!id) return;
    setGroups((g) => moveTask(g, from, group, id));
    announce(`Moved task to ${group}`);
    dragged.current = { group: '', id: null };
  };

  const handleDropTask = (group, beforeId) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { group: from, id } = dragged.current;
    if (!id) return;
    setGroups((g) => moveTask(g, from, group, id, beforeId));
    announce(`Moved task to ${group}`);
    dragged.current = { group: '', id: null };
  };

  const handleKeyDown = (group, index) => (e) => {
    const taskId = groups[group][index].id;
    if (e.key === 'ArrowUp' && index > 0) {
      const beforeId = groups[group][index - 1].id;
      setGroups((g) => moveTask(g, group, group, taskId, beforeId));
      e.preventDefault();
    } else if (e.key === 'ArrowDown' && index < groups[group].length - 1) {
      const beforeId = groups[group][index + 2]?.id;
      setGroups((g) => moveTask(g, group, group, taskId, beforeId));
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const names = Object.keys(groups);
      const gIndex = names.indexOf(group);
      const target = e.key === 'ArrowLeft' ? gIndex - 1 : gIndex + 1;
      if (target >= 0 && target < names.length) {
        const to = names[target];
        setGroups((g) => moveTask(g, group, to, taskId));
        e.preventDefault();
      }
    }
  };

  const handleDueChange = (group, index) => (e) => {
    const value = e.target.value;
    setGroups((g) => {
      const newGroups = { ...g, [group]: [...g[group]] };
      newGroups[group][index] = { ...newGroups[group][index], due: value };
      return newGroups;
    });
  };

  return (
    <div className="flex h-full w-full flex-col" role="application">
      <div aria-live="polite" className="sr-only" ref={liveRef} />
      <form onSubmit={addTask} className="p-2 flex gap-2 border-b border-gray-300">
        <input
          aria-label="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 border px-2 py-1 rounded"
          placeholder="Quick add"
        />
        <input
          type="date"
          aria-label="Due date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="border px-1 rounded"
        />
        <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">
          Add
        </button>
      </form>
      <div className="flex flex-1">
        {Object.keys(groups).map((name) => (
          <div
            key={name}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropColumn(name)}
            className="flex-1 p-2 border-r last:border-r-0 border-gray-300 overflow-y-auto"
            role="list"
            aria-label={name}
          >
            <h2 className="mb-2 font-bold text-lg text-gray-800">{name}</h2>
            {groups[name].map((task, index) => (
              <div
                key={task.id}
                draggable
                onDragStart={handleDragStart(name, task.id)}
                onDrop={handleDropTask(name, task.id)}
                onDragOver={(e) => e.preventDefault()}
                onKeyDown={handleKeyDown(name, index)}
                tabIndex={0}
                className="mb-2 p-2 rounded shadow bg-white text-black"
                role="listitem"
              >
                <div>{task.title}</div>
                <input
                  type="date"
                  value={task.due || ''}
                  onChange={handleDueChange(name, index)}
                  className="mt-1 text-sm text-black border rounded px-1"
                />
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

