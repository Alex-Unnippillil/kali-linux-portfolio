import React, { useEffect, useRef, useState } from 'react';

const initialGroups = {
  'To Do': [
    { id: 1, title: 'Write docs', priority: 'high' },
    { id: 2, title: 'Design UI', priority: 'medium' },
  ],
  'In Progress': [
    { id: 3, title: 'Set up CI', priority: 'low' },
  ],
  Done: [],
};

const priorityColors = {
  high: 'bg-red-700 text-white',
  medium: 'bg-yellow-600 text-black',
  low: 'bg-green-700 text-white',
};

export default function Todoist() {
  const [groups, setGroups] = useState(initialGroups);
  const [animating, setAnimating] = useState('');
  const dragged = useRef({ group: '', id: null });
  const liveRef = useRef(null);
  const workerRef = useRef(null);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const announce = (task, group) => {
    if (liveRef.current) {
      liveRef.current.textContent = `Moved ${task} to ${group}`;
    }
  };

  const finalizeMove = (newGroups, taskTitle, to) => {
    setGroups(newGroups);
    announce(taskTitle, to);
    if (!prefersReducedMotion.current) {
      requestAnimationFrame(() => {
        setAnimating(to);
        setTimeout(() => setAnimating(''), 500);
      });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.Worker === 'function') {
      workerRef.current = new Worker(
        new URL('./todoist.worker.js', import.meta.url)
      );
      workerRef.current.onmessage = (e) => {
        const { groups: newGroups, taskTitle, to } = e.data || {};
        finalizeMove(newGroups, taskTitle, to);
      };
    }
    return () => workerRef.current?.terminate();
  }, []);

  const handleDragStart = (group, task) => (e) => {
    dragged.current = { group, id: task.id, title: task.title };
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (group) => (e) => {
    e.preventDefault();
    const { group: from, id, title } = dragged.current;
    if (from === group || !id) return;
    if (workerRef.current) {
      workerRef.current.postMessage({ groups, from, to: group, id });
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

  return (
    <div className="flex h-full w-full" role="application">
      <div aria-live="polite" className="sr-only" ref={liveRef} />
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
          <h2 className="mb-2 font-bold text-lg text-gray-800">{name}</h2>
          {groups[name].map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={handleDragStart(name, task)}
              className={`mb-2 p-2 rounded shadow ${
                priorityColors[task.priority]
              } ${
                !prefersReducedMotion.current
                  ? 'transition-transform duration-300'
                  : ''
              }`}
              role="listitem"
            >
              {task.title}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export const displayTodoist = () => {
  return <Todoist />;
};

