import React, { useCallback, useEffect, useRef, useState } from 'react';

const SAMPLE_INTERVAL = 2000;
const MAX_POINTS = 30;

const Sparkline = ({ data, color }) => {
  const points = data
    .map((v, i) => `${(i / Math.max(data.length - 1, 1)) * 100},${100 - Math.min(100, v)}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 100" className="w-20 h-5 bg-ub-dark-grey">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
};

const ProcessRow = ({ proc, indent = 0 }) => (
  <tr>
    <td className="p-1">{proc.pid}</td>
    <td className="p-1" style={{ paddingLeft: `${indent * 10}px` }}>
      {proc.name}
    </td>
    <td className="p-1">
      <Sparkline data={proc.cpuHistory} color="#00ff00" />
    </td>
    <td className="p-1">
      <Sparkline data={proc.memHistory} color="#ffd700" />
    </td>
    <td className="p-1">
      <button
        onClick={() => alert(`Terminate ${proc.name} (${proc.pid})`)}
        className="px-2 py-0.5 bg-ub-dark-grey rounded"
      >
        End
      </button>
    </td>
  </tr>
);

const TaskManager = () => {
  const [view, setView] = useState('flat');
  const [filter, setFilter] = useState('');
  const [procs, setProcs] = useState({});
  const intervalRef = useRef();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/processes');
      const json = await res.json();
      setProcs((prev) => {
        const map = {};
        json.processes.forEach((p) => {
          const old = prev[p.pid] || { cpuHistory: [], memHistory: [] };
          const cpuHistory = [...old.cpuHistory, p.cpu].slice(-MAX_POINTS);
          const memHistory = [...old.memHistory, p.mem].slice(-MAX_POINTS);
          map[p.pid] = { ...p, cpuHistory, memHistory };
        });
        return map;
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, SAMPLE_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  const list = Object.values(procs).filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase()),
  );

  const totalCpu = list.reduce((sum, p) => sum + p.cpu, 0);
  const totalMem = list.reduce((sum, p) => sum + p.mem, 0);

  const buildTree = (items) => {
    const map = {};
    items.forEach((p) => (map[p.pid] = { ...p, children: [] }));
    const roots = [];
    Object.values(map).forEach((p) => {
      if (map[p.ppid]) map[p.ppid].children.push(p);
      else roots.push(p);
    });
    return roots;
  };

  const renderTree = (nodes, indent = 0) =>
    nodes.flatMap((n) => [
      <ProcessRow key={n.pid} proc={n} indent={indent} />,
      ...renderTree(n.children || [], indent + 1),
    ]);

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white font-ubuntu">
      <div className="p-2 flex items-center gap-2 bg-ub-dark-grey">
        <button
          onClick={() => setView((v) => (v === 'flat' ? 'tree' : 'flat'))}
          className="px-2 py-1 bg-ub-cool-grey rounded"
        >
          {view === 'flat' ? 'Tree' : 'Flat'} View
        </button>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name"
          className="px-2 py-1 text-black rounded"
        />
        <span className="ml-auto text-sm">
          Processes: {list.length} | CPU: {totalCpu.toFixed(1)}% | Mem:
          {` ${totalMem.toFixed(1)}%`}
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-ub-dark-grey text-left">
              <th className="p-1">PID</th>
              <th className="p-1">Name</th>
              <th className="p-1">CPU</th>
              <th className="p-1">Mem</th>
              <th className="p-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {view === 'flat'
              ? list
                  .sort((a, b) => b.cpu - a.cpu)
                  .map((p) => <ProcessRow key={p.pid} proc={p} />)
              : renderTree(buildTree(list))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskManager;

export const displayTaskManager = (addFolder, openApp) => (
  <TaskManager addFolder={addFolder} openApp={openApp} />
);
