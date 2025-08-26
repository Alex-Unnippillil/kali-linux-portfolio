import React, { useEffect, useState } from 'react';
import { get, set, createStore } from 'idb-keyval';

const store = createStore('tasks-db', 'tasks');
const hasIndexedDB = typeof indexedDB !== 'undefined';
const persist = (tasks) =>
  hasIndexedDB ? set('tasks', tasks, store) : Promise.resolve();

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState('');

  const registerSync = () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.sync.register('sync-tasks').catch(() => {});
      });
    }
  };

  useEffect(() => {
    if (hasIndexedDB) {
      get('tasks', store).then((val) => {
        const initial = Array.isArray(val) ? val : [];
        setTasks(initial);
        if (initial.some((t) => !t.synced)) {
          registerSync();
        }
      });
    }
  }, []);

  const addTask = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const newTask = { id: Date.now(), text, synced: navigator.onLine };
    const updated = [...tasks, newTask];
    setTasks(updated);
    setText('');
    await persist(updated);
    if (navigator.onLine && hasIndexedDB) {
      try {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTask),
        });
      } catch {
        newTask.synced = false;
        await persist(updated);
        registerSync();
      }
    } else if (hasIndexedDB) {
      registerSync();
    }
  };

  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white overflow-auto">
      <form onSubmit={addTask} className="flex mb-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-grow px-2 py-1 text-black"
          placeholder="New task"
        />
        <button type="submit" className="ml-2 px-4 py-1 bg-blue-600 rounded">
          Add
        </button>
      </form>
      <ul>
        {tasks.map((t) => (
          <li key={t.id} className="mb-2">
            {t.text} {!t.synced && <em>(offline)</em>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const displayTasks = () => <Tasks />;
