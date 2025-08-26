import React, { useState } from 'react';

const services = ['ssh', 'ftp', 'http-get', 'http-post-form', 'smtp'];

const HydraApp = () => {
  const [target, setTarget] = useState('');
  const [service, setService] = useState('ssh');
  const [users, setUsers] = useState('');
  const [passwords, setPasswords] = useState('');
  const [runAt, setRunAt] = useState('');
  const [message, setMessage] = useState('');
  const [tasks, setTasks] = useState([]);

  const readFile = (file, setter) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setter(e.target.result);
    reader.readAsText(file);
  };

  const runTask = async (task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: 'running' } : t))
    );
    try {
      const res = await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: task.target,
          service: task.service,
          userList: task.users,
          passList: task.passwords,
        }),
      });
      const data = await res.json();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, status: 'completed', output: data.output || data.error || 'No output' }
            : t
        )
      );
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, status: 'failed', output: err.message }
            : t
        )
      );
    }
  };

  const scheduleTask = (task) => {
    const delay = task.runAt - Date.now();
    if (delay <= 0) runTask(task);
    else setTimeout(() => runTask(task), delay);
  };

  const addTask = () => {
    if (!target || !users || !passwords || !runAt) {
      setMessage('Please provide target, user list, password list and run time');
      return;
    }
    setMessage('');
    const newTask = {
      id: Date.now(),
      target,
      service,
      users,
      passwords,
      runAt: new Date(runAt).getTime(),
      status: 'scheduled',
      output: '',
    };
    setTasks((prev) => [...prev, newTask]);
    scheduleTask(newTask);
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="space-y-2">
        <div>
          <label className="block mb-1">Target</label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full p-2 rounded text-black"
            placeholder="192.168.0.1"
          />
        </div>
        <div>
          <label className="block mb-1">Service</label>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full p-2 rounded text-black"
          >
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1">User List</label>
          <input
            type="file"
            accept="text/plain"
            onChange={(e) => readFile(e.target.files[0], setUsers)}
            className="w-full p-2 rounded text-black"
          />
        </div>
        <div>
          <label className="block mb-1">Password List</label>
          <input
            type="file"
            accept="text/plain"
            onChange={(e) => readFile(e.target.files[0], setPasswords)}
            className="w-full p-2 rounded text-black"
          />
        </div>
        <div>
          <label className="block mb-1">Run Time</label>
          <input
            type="datetime-local"
            value={runAt}
            onChange={(e) => setRunAt(e.target.value)}
            className="w-full p-2 rounded text-black"
          />
        </div>
        <button
          onClick={addTask}
          className="px-4 py-2 bg-green-600 rounded"
        >
          Add to Queue
        </button>
        {message && <p className="text-red-400">{message}</p>}
      </div>

      <div className="mt-6">
        <h2 className="text-lg mb-2">Scheduled Tasks</h2>
        {tasks.length === 0 ? (
          <p>No tasks scheduled</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr>
                <th className="border p-2">Target</th>
                <th className="border p-2">Service</th>
                <th className="border p-2">Run Time</th>
                <th className="border p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-2">{t.target}</td>
                  <td className="p-2">{t.service}</td>
                  <td className="p-2">{new Date(t.runAt).toLocaleString()}</td>
                  <td className="p-2">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {tasks.map(
        (t) =>
          t.output && (
            <div key={`out-${t.id}`} className="mt-4">
              <h3 className="font-bold">Output for {t.target}</h3>
              <pre className="bg-black p-2 overflow-auto h-64 whitespace-pre-wrap">
                {t.output}
              </pre>
            </div>
          )
      )}
    </div>
  );
};

export default HydraApp;

export const displayHydra = () => {
  return <HydraApp />;
};

