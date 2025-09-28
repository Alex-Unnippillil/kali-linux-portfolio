import React from 'react';

type Monitor = {
  id: string;
  label: string;
};

type MonitorSwitcherProps = {
  monitors?: Monitor[];
  activeMonitorId?: string | null;
  onSelect?: (id: string) => void;
};

export default function MonitorSwitcher({ monitors = [], activeMonitorId, onSelect }: MonitorSwitcherProps) {
  if (!monitors.length) {
    return null;
  }

  return (
    <div className="flex items-center mr-4" role="radiogroup" aria-label="Monitor selector">
      {monitors.map((monitor) => {
        const isActive = monitor.id === activeMonitorId;
        return (
          <button
            key={monitor.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onSelect?.(monitor.id)}
            className={`mx-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              isActive ? 'bg-white bg-opacity-20 text-white' : 'bg-transparent text-gray-200 hover:bg-white hover:bg-opacity-10'
            }`}
          >
            {monitor.label}
          </button>
        );
      })}
    </div>
  );
}
