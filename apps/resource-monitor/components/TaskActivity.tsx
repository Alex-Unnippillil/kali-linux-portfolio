'use client';

import React from 'react';
import useTasksManager from '../../../hooks/useTasksManager';

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const TaskActivity: React.FC = () => {
  const { tasks } = useTasksManager();

  const statusColor: Record<string, string> = {
    info: 'text-blue-300',
    success: 'text-green-300',
    warning: 'text-yellow-300',
    error: 'text-red-300',
  };

  return (
    <div className="p-2 text-xs text-white bg-[var(--kali-bg)]">
      <h2 className="font-bold mb-1">Tasks Manager</h2>
      <ul className="divide-y divide-gray-700 border border-gray-700 rounded bg-[var(--kali-panel)]">
        {tasks.length === 0 && (
          <li className="p-2 text-gray-400">No background tasks recorded</li>
        )}
        {tasks.map(task => (
          <li key={task.id} className="p-2">
            <div className="flex justify-between">
              <span className="font-medium text-white">{task.message}</span>
              <span className="text-gray-400">{formatTime(task.timestamp)}</span>
            </div>
            <div className={`uppercase tracking-wide text-[11px] ${statusColor[task.status] ?? 'text-gray-300'}`}>
              {task.status}
            </div>
            <div className="text-gray-300">Source: {task.source}</div>
            {task.detail && (
              <div className="text-gray-400 text-[11px] mt-1">{task.detail}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskActivity;
