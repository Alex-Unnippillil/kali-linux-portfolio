import React, { useEffect, useState, useRef } from 'react';
import { getTasks, addTask, updateTask, deleteTask, exportTasks, importTasks } from './db';

function Todoist() {
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState('list');
  const [filterTag, setFilterTag] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newDue, setNewDue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const all = await getTasks();
    setTasks(all);
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    const tags = newTags.split(',').map((t) => t.trim()).filter(Boolean);
    const task = { title, completed: false, tags, dueDate: newDue };
    const id = await addTask(task);
    task.id = id;
    setTasks([...tasks, task]);
    setNewTitle('');
    setNewTags('');
    setNewDue('');
  }

  async function handleToggle(task) {
    const updated = { ...task, completed: !task.completed };
    await updateTask(updated);
    setTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
  }

  async function handleDelete(id) {
    await deleteTask(id);
    setTasks(tasks.filter((t) => t.id !== id));
  }

  async function handleDrop(id, completed) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const updated = { ...task, completed };
    await updateTask(updated);
    setTasks(tasks.map((t) => (t.id === id ? updated : t)));
  }

  async function handleExport() {
    const json = await exportTasks();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await importTasks(text);
    await load();
  }

  const filtered = tasks.filter((t) => {
    const tagOk = !filterTag || t.tags?.includes(filterTag);
    const dateOk = !filterDate || t.dueDate === filterDate;
    return tagOk && dateOk;
  });

  const renderTask = (task) => (
    <div
      key={task.id}
      className="p-1 border mb-1 flex items-center gap-2 bg-white"
      draggable
      data-testid={`task-${task.id}`}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(task.id))}
    >
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => handleToggle(task)}
      />
      <span className="flex-1">{task.title}</span>
      <button onClick={() => handleDelete(task.id)} data-testid={`delete-${task.id}`}>
        ✕
      </button>
    </div>
  );

  const listView = (
    <div>
      {filtered.map(renderTask)}
    </div>
  );

  const kanbanView = (
    <div className="flex gap-4" data-testid="kanban">
      <div
        className="w-1/2 p-2 border"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(Number(e.dataTransfer.getData('text/plain')), false)}
      >
        <h3>Todo</h3>
        {filtered.filter((t) => !t.completed).map(renderTask)}
      </div>
      <div
        className="w-1/2 p-2 border"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(Number(e.dataTransfer.getData('text/plain')), true)}
      >
        <h3>Done</h3>
        {filtered.filter((t) => t.completed).map(renderTask)}
      </div>
    </div>
  );

  return (
    <div className="h-full w-full p-2 bg-white overflow-auto" data-testid="todoist">
      <div className="flex flex-wrap gap-2 mb-2 items-center">
        <input
          ref={inputRef}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Task title"
          className="border px-2"
          data-testid="new-task-title"
        />
        <input
          value={newTags}
          onChange={(e) => setNewTags(e.target.value)}
          placeholder="tags (comma)"
          className="border px-2"
          data-testid="new-task-tags"
        />
        <input
          type="date"
          value={newDue}
          onChange={(e) => setNewDue(e.target.value)}
          className="border px-2"
          data-testid="new-task-date"
        />
        <button onClick={handleAdd} data-testid="add-task">Add</button>
        <button onClick={() => setView(view === 'list' ? 'kanban' : 'list')} data-testid="toggle-view">
          {view === 'list' ? 'Kanban' : 'List'}
        </button>
        <input
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          placeholder="filter tag"
          className="border px-2"
          data-testid="filter-tag"
        />
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="border px-2"
          data-testid="filter-date"
        />
        <button onClick={handleExport} data-testid="export">Export</button>
        <input type="file" onChange={handleImport} data-testid="import" />
      </div>
      {view === 'list' ? listView : kanbanView}
    </div>
  );
}

export default Todoist;
export const displayTodoist = () => <Todoist />;
