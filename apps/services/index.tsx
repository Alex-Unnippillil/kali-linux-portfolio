'use client';

import React, { useState, useRef } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';

interface Service {
  name: string;
  running: boolean;
  enabled: boolean;
}

const ServiceManager: React.FC = () => {
  const [services, setServices] = useState<Service[]>([
    { name: 'ssh', running: false, enabled: false },
    { name: 'apache2', running: false, enabled: false },
    { name: 'mysql', running: false, enabled: false },
  ]);

  const updateService = (index: number, changes: Partial<Service>) => {
    setServices((prev) => prev.map((svc, i) => (i === index ? { ...svc, ...changes } : svc)));
  };

  return (
    <div className="h-full bg-gray-900 p-4 text-white overflow-auto">
      <h1 className="mb-4 text-2xl">Service Manager</h1>
      <ul className="space-y-4">
        {services.map((svc, i) => (
          <li
            key={svc.name}
            className="flex items-center justify-between rounded bg-gray-800 p-4"
          >
            <div>
              <span className="font-semibold capitalize">{svc.name}</span>
              <div className="mt-2 space-x-2">
                <span
                  className={`rounded px-2 py-1 text-xs ${svc.running ? 'bg-green-600' : 'bg-red-600'}`}
                >
                  {svc.running ? 'Running' : 'Stopped'}
                </span>
                <span
                  className={`rounded px-2 py-1 text-xs ${svc.enabled ? 'bg-blue-600' : 'bg-gray-600'}`}
                >
                  {svc.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {svc.running ? (
                <button
                  className="rounded bg-red-500 px-3 py-1 text-sm"
                  onClick={() => updateService(i, { running: false })}
                >
                  Stop
                </button>
              ) : (
                <button
                  className="rounded bg-green-500 px-3 py-1 text-sm"
                  onClick={() => updateService(i, { running: true })}
                >
                  Start
                </button>
              )}
              <button
                className="rounded bg-blue-500 px-3 py-1 text-sm"
                onClick={() => updateService(i, { enabled: !svc.enabled })}
              >
                {svc.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ServicesPreview: React.FC = () => {
  const countRef = useRef(1);
  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    return { id, title: `Services ${countRef.current++}`, content: <ServiceManager /> };
  };
  return (
    <TabbedWindow
      className="min-h-screen bg-gray-900 text-white"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default ServicesPreview;

