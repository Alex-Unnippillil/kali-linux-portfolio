import React, { useEffect, useState } from 'react';
import { getAllTasks, addTask, toggleTask, deleteTask, exportTasks, importTasks } from './db';

function Todoist() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    getAllTasks().then(setTasks);
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const task = {
      id: Date.now(),
      title: title.trim(),
      completed: false,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t),
    };
    await addTask(task);
    setTasks([...tasks, task]);
    setTitle('');
    setTags('');
  };

  const handleToggle = async (id) => {
    await toggleTask(id);
    setTasks(await getAllTasks());
  };

  const handleDelete = async (id) => {
    await deleteTask(id);
    setTasks(await getAllTasks());
  };

  const handleExport = async () => {
    const data = await exportTasks();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    await importTasks(text);
    setTasks(await getAllTasks());
  };

  return (
    <div className="p-2 text-sm text-white bg-ub-grey w-full h-full overflow-auto">
      <form onSubmit={handleAdd} className="mb-2 flex gap-1">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="flex-1 px-1 text-black"
        />
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="tags (comma)"
          className="flex-1 px-1 text-black"
        />
        <button type="submit" className="bg-ub-orange px-2">Add</button>
      </form>
      <div className="mb-2 flex gap-2">
        <button onClick={handleExport} className="bg-ub-orange px-2">Export</button>
        <label className="bg-ub-orange px-2 cursor-pointer">
          Import
          <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
        </label>
      </div>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => handleToggle(task.id)}
            />
            <span className={`flex-1 ${task.completed ? 'line-through' : ''}`}>{task.title}</span>
            {task.tags.length > 0 && (
              <span className="text-ubt-blue">[{task.tags.join(', ')}]</span>
            )}
            <button onClick={() => handleDelete(task.id)} className="bg-ub-red px-1">x</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Todoist;
export const displayTodoist = () => <Todoist />;
export { exportTasks, importTasks } from './db';
