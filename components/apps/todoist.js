import React, { useState, useRef, useEffect, useCallback } from 'react';
import usePersistentState from '../hooks/usePersistentState';

const FILTERS = ['all', 'today', 'upcoming'];

export default function Todoist() {
  const [tasks, setTasks] = usePersistentState('todoist-tasks', []);
  const [filter, setFilter] = useState('all');
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const dragIndex = useRef(null);
  const titleRef = useRef(null);
  const dateRef = useRef(null);

  const today = new Date().toISOString().slice(0, 10);

  const addTask = useCallback(() => {
    if (!title.trim()) return;
    setTasks([
      ...tasks,
      { id: Date.now(), title: title.trim(), due, completed: false },
    ]);
    setTitle('');
    setDue('');
    titleRef.current?.focus();
  }, [tasks, title, due, setTasks]);

  const toggleTask = useCallback(
    (index) => {
      setTasks((t) => {
        const updated = [...t];
        updated[index].completed = !updated[index].completed;
        return updated;
      });
    },
    [setTasks]
  );

  const handleDragStart = (index) => {
    dragIndex.current = index;
  };

  const handleDrop = (index) => {
    if (dragIndex.current === null) return;
    setTasks((t) => {
      const updated = [...t];
      const [moved] = updated.splice(dragIndex.current, 1);
      updated.splice(index, 0, moved);
      return updated;
    });
    dragIndex.current = null;
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'today') return task.due === today;
    if (filter === 'upcoming') return task.due && task.due > today;
    return true;
  });

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        if (
          document.activeElement === titleRef.current ||
          document.activeElement === dateRef.current
        ) {
          e.preventDefault();
          addTask();
        } else if (document.activeElement?.dataset?.index) {
          e.preventDefault();
          toggleTask(parseInt(document.activeElement.dataset.index, 10));
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addTask, toggleTask]);

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-2">
      <div className="flex mb-2 space-x-2">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="flex-1 p-1 text-black"
        />
        <input
          ref={dateRef}
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="p-1 text-black"
        />
        <button
          onClick={addTask}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Add
        </button>
      </div>
      <div className="flex space-x-2 mb-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-1 rounded ${
              filter === f
                ? 'bg-gray-700'
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <ul className="flex-1 overflow-auto">
        {filteredTasks.map((task) => {
          const index = tasks.findIndex((t) => t.id === task.id);
          return (
            <li
              key={task.id}
              data-index={index}
              tabIndex={0}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className="flex items-center justify-between p-2 border-b border-gray-600 cursor-move"
            >
              <span
                className={`flex-1 ${
                  task.completed ? 'line-through text-gray-400' : ''
                }`}
              >
                {task.title}
                {task.due ? ` (${task.due})` : ''}
              </span>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(index)}
                className="ml-2"
              />
            </li>
          );
        })}
      </ul>
      <div className="text-xs text-gray-400 mt-2">
        Ctrl+Enter to add or complete tasks.
      </div>
    </div>
  );
}

export const displayTodoist = () => <Todoist />;
