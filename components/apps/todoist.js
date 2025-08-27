import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'todoist-data';

const defaultData = {
  sections: [
    { id: 'inbox', name: 'Inbox', tasks: [] },
  ],
};

export default function Todoist() {
  const [data, setData] = useState(defaultData);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTask, setQuickTask] = useState({ text: '', due: '', section: 'inbox' });

  // Load from localStorage
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.sections) setData(parsed);
        if (parsed.sections && parsed.sections[0]) {
          setQuickTask((q) => ({ ...q, section: parsed.sections[0].id }));
        }
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // Global quick-add shortcut (Alt+Q)
  useEffect(() => {
    const handler = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        setShowQuickAdd(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const addSection = () => {
    const name = prompt('Section name');
    if (!name) return;
    setData((prev) => ({
      ...prev,
      sections: [...prev.sections, { id: Date.now().toString(), name, tasks: [] }],
    }));
  };

  const addTask = (sectionId, text, due) => {
    if (!text) return;
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, tasks: [...s.tasks, { id: Date.now().toString(), text, due }] }
          : s
      ),
    }));
  };

  const handleQuickAdd = (e) => {
    e.preventDefault();
    addTask(quickTask.section, quickTask.text, quickTask.due);
    setQuickTask((q) => ({ ...q, text: '', due: '' }));
    setShowQuickAdd(false);
  };

  const onDragStart = (e, taskId, sectionId) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.setData('fromSection', sectionId);
  };

  const onDrop = (e, destSectionId, destTaskId = null) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const fromSection = e.dataTransfer.getData('fromSection');
    if (!taskId || !fromSection) return;
    setData((prev) => {
      const sections = prev.sections.map((s) => ({ ...s, tasks: [...s.tasks] }));
      const source = sections.find((s) => s.id === fromSection);
      const dest = sections.find((s) => s.id === destSectionId);
      if (!source || !dest) return prev;
      const idx = source.tasks.findIndex((t) => t.id === taskId);
      if (idx === -1) return prev;
      const [task] = source.tasks.splice(idx, 1);
      if (destTaskId) {
        const destIdx = dest.tasks.findIndex((t) => t.id === destTaskId);
        dest.tasks.splice(destIdx, 0, task);
      } else {
        dest.tasks.push(task);
      }
      return { ...prev, sections };
    });
  };

  return (
    <div className="h-full w-full p-2 flex gap-4 overflow-auto bg-ub-cool-grey text-white">
      {data.sections.map((section) => (
        <div key={section.id} className="w-64 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">{section.name}</h2>
          </div>
          <ul
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, section.id)}
            className="space-y-2 min-h-[1rem]"
          >
            {section.tasks.map((task) => (
              <li
                key={task.id}
                draggable
                onDragStart={(e) => onDragStart(e, task.id, section.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, section.id, task.id)}
                className="bg-gray-800 p-2 rounded cursor-move"
              >
                <div>{task.text}</div>
                {task.due && (
                  <div className="text-xs text-gray-400">Due {task.due}</div>
                )}
              </li>
            ))}
          </ul>
          <button
            className="mt-2 text-sm text-blue-300"
            onClick={() => {
              setQuickTask((q) => ({ ...q, section: section.id }));
              setShowQuickAdd(true);
            }}
          >
            + Add task
          </button>
        </div>
      ))}
      <button
        className="w-32 flex-shrink-0 bg-gray-800 rounded p-2 h-fit"
        onClick={addSection}
      >
        + Section
      </button>

      {showQuickAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <form
            onSubmit={handleQuickAdd}
            className="bg-gray-800 p-4 rounded flex flex-col gap-2 w-64"
          >
            <input
              autoFocus
              type="text"
              value={quickTask.text}
              onChange={(e) => setQuickTask({ ...quickTask, text: e.target.value })}
              placeholder="Task"
              className="p-1 rounded text-black"
            />
            <input
              type="date"
              value={quickTask.due}
              onChange={(e) => setQuickTask({ ...quickTask, due: e.target.value })}
              className="p-1 rounded text-black"
            />
            <select
              value={quickTask.section}
              onChange={(e) => setQuickTask({ ...quickTask, section: e.target.value })}
              className="p-1 rounded text-black"
            >
              {data.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="px-2 py-1 bg-gray-700 rounded"
              >
                Cancel
              </button>
              <button type="submit" className="px-2 py-1 bg-blue-600 rounded">
                Add
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

