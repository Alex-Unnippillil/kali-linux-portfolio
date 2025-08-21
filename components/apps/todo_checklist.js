import React, { useState, useEffect, useRef } from 'react';

const TodoChecklist = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('todo-checklist');
      if (saved) setTasks(JSON.parse(saved));
    } catch (err) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('todo-checklist', JSON.stringify(tasks));
    } catch (err) {
      /* ignore */
    }
  }, [tasks]);

  const addTask = (e) => {
    e.preventDefault();
    const text = newTask.trim();
    if (!text) return;
    setTasks([...tasks, { id: Date.now(), text, completed: false }]);
    setNewTask('');
  };

  const toggleTask = (id) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const handleDragStart = (index) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    const from = dragItem.current;
    const to = dragOverItem.current;
    if (from === null || to === null || from === to) return;
    const updated = [...tasks];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setTasks(updated);
    dragItem.current = dragOverItem.current = null;
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-4">
      <form onSubmit={addTask} className="mb-4 flex">
        <input
          className="flex-grow text-black px-2 py-1"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New task"
        />
        <button type="submit" className="ml-2 px-4 py-1 bg-indigo-600 hover:bg-indigo-500">Add</button>
      </form>
      <ul className="flex-1 overflow-y-auto">
        {tasks.map((task, index) => (
          <li
            key={task.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className="flex items-center mb-2 bg-gray-700 px-2 py-1 rounded"
          >
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggleTask(task.id)}
              className="mr-2"
            />
            <span className={`flex-grow ${task.completed ? 'line-through opacity-60' : ''}`}>
              {task.text}
            </span>
            <button
              onClick={() => deleteTask(task.id)}
              className="ml-2 text-red-400 hover:text-red-200"
              aria-label="delete"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodoChecklist;

export const displayTodoChecklist = () => {
  return <TodoChecklist />;
};

