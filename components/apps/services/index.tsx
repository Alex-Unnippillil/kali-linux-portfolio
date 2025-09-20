import React, { useMemo, useState } from 'react';
import Toast from '../../ui/Toast';
import {
  ServiceDefinition,
  ServiceLogEntry,
  ServiceLogLevel,
  ServiceStatus,
  StartupType,
  getServiceRegistry,
} from '../../../utils/serviceRegistry';

const STATUS_LABELS: Record<ServiceStatus, { label: string; className: string }> = {
  running: { label: 'Running', className: 'bg-green-500/20 text-green-300' },
  stopped: { label: 'Stopped', className: 'bg-gray-500/20 text-gray-200' },
  paused: { label: 'Paused', className: 'bg-yellow-500/20 text-yellow-200' },
};

const LEVEL_STYLES: Record<ServiceLogLevel, string> = {
  info: 'border-blue-400/40 bg-blue-500/10 text-blue-200',
  warning: 'border-yellow-400/40 bg-yellow-500/10 text-yellow-100',
  error: 'border-red-500/40 bg-red-500/10 text-red-200',
};

const MAX_LOGS = 8;

type UpdateResult = {
  next: ServiceDefinition;
  toast?: string;
};

const addLogEntry = (
  service: ServiceDefinition,
  message: string,
  level: ServiceLogLevel = 'info',
): ServiceLogEntry[] => [
  {
    timestamp: new Date().toISOString(),
    message,
    level,
  },
  ...service.recentLogs,
].slice(0, MAX_LOGS);

const ServicesApp: React.FC = () => {
  const [services, setServices] = useState<ServiceDefinition[]>(() =>
    getServiceRegistry(),
  );
  const [expanded, setExpanded] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');

  const normalizedQuery = query.trim().toLowerCase();
  const visibleServices = useMemo(() => {
    if (!normalizedQuery) return services;
    return services.filter((service) => {
      const haystack = `${service.name} ${service.description}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [services, normalizedQuery]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const updateService = (
    id: string,
    mutate: (service: ServiceDefinition) => UpdateResult,
  ) => {
    let message = '';
    setServices((prev) =>
      prev.map((service) => {
        if (service.id !== id) return service;
        const result = mutate(service);
        if (result.toast) {
          message = result.toast;
        }
        return result.next;
      }),
    );
    if (message) setToast(message);
  };

  const handleStart = (id: string) => {
    updateService(id, (service) => {
      if (service.status === 'running') {
        return {
          next: service,
          toast: `${service.name} is already running`,
        };
      }
      return {
        next: {
          ...service,
          status: 'running',
          recentLogs: addLogEntry(service, `${service.name} started.`),
        },
        toast: `${service.name} started`,
      };
    });
  };

  const handleStop = (id: string) => {
    updateService(id, (service) => {
      if (service.status === 'stopped') {
        return {
          next: service,
          toast: `${service.name} is already stopped`,
        };
      }
      return {
        next: {
          ...service,
          status: 'stopped',
          recentLogs: addLogEntry(service, `${service.name} stopped.`),
        },
        toast: `${service.name} stopped`,
      };
    });
  };

  const handleEnable = (id: string) => {
    updateService(id, (service) => {
      const wasDisabled = service.startupType === 'Disabled';
      const newStartup: StartupType = 'Automatic';
      return {
        next: {
          ...service,
          status: wasDisabled ? 'stopped' : service.status,
          startupType: newStartup,
          recentLogs: addLogEntry(
            service,
            `${service.name} set to ${newStartup} startup.`,
          ),
        },
        toast: `${service.name} enabled (${newStartup})`,
      };
    });
  };

  const handleDisable = (id: string) => {
    updateService(id, (service) => {
      if (service.startupType === 'Disabled' && service.status === 'stopped') {
        return {
          next: service,
          toast: `${service.name} is already disabled`,
        };
      }
      return {
        next: {
          ...service,
          status: 'stopped',
          startupType: 'Disabled',
          recentLogs: addLogEntry(
            service,
            `${service.name} disabled and stopped.`,
            'warning',
          ),
        },
        toast: `${service.name} disabled`,
      };
    });
  };

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-white">
      <div className="border-b border-black/40 bg-black/30 px-4 py-3">
        <h1 className="text-lg font-semibold">Service Manager</h1>
        <p className="text-xs text-gray-300">
          Manage simulated Kali services, startup behaviour, and review logs.
        </p>
      </div>
      <div className="px-4 py-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-300">
          Search services
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or description"
            className="mt-2 w-full rounded border border-black/50 bg-black/40 p-2 text-sm text-white placeholder-gray-400 focus:border-ubt-grey focus:outline-none"
          />
        </label>
      </div>
      <div className="flex-1 overflow-auto px-4 pb-6">
        <div className="overflow-hidden rounded border border-black/40 bg-black/20">
          <table className="min-w-full divide-y divide-black/40 text-sm">
            <thead className="bg-black/40 text-left text-xs uppercase tracking-wide text-gray-300">
              <tr>
                <th scope="col" className="px-4 py-2">
                  Service
                </th>
                <th scope="col" className="px-4 py-2">
                  Status
                </th>
                <th scope="col" className="px-4 py-2">
                  Startup
                </th>
                <th scope="col" className="px-4 py-2 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleServices.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-gray-300"
                  >
                    No services match "{query}".
                  </td>
                </tr>
              )}
              {visibleServices.map((service) => {
                const statusMeta = STATUS_LABELS[service.status];
                const isExpanded = expanded.includes(service.id);
                return (
                  <React.Fragment key={service.id}>
                    <tr className="border-b border-black/20">
                      <td className="px-4 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(service.id)}
                          aria-expanded={isExpanded}
                          aria-controls={`${service.id}-logs`}
                          className="w-full text-left focus:outline-none focus:ring-2 focus:ring-ubt-grey"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-base font-semibold">
                                {service.name}
                              </p>
                              <p className="mt-1 text-xs text-gray-300">
                                {service.description}
                              </p>
                            </div>
                            <span className="text-lg" aria-hidden="true">
                              {isExpanded ? '▾' : '▸'}
                            </span>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          data-testid={`status-${service.id}`}
                          className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-gray-200">
                        {service.startupType}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleStart(service.id)}
                            className="rounded bg-ub-green px-3 py-1 font-semibold text-black disabled:opacity-40"
                            disabled={service.status === 'running'}
                            aria-label={`Start ${service.name}`}
                          >
                            Start
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStop(service.id)}
                            className="rounded bg-ub-red px-3 py-1 font-semibold text-white disabled:opacity-40"
                            disabled={service.status === 'stopped'}
                            aria-label={`Stop ${service.name}`}
                          >
                            Stop
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEnable(service.id)}
                            className="rounded bg-ub-yellow px-3 py-1 font-semibold text-black"
                            aria-label={`Enable ${service.name}`}
                          >
                            Enable
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDisable(service.id)}
                            className="rounded bg-gray-600 px-3 py-1 font-semibold text-white"
                            aria-label={`Disable ${service.name}`}
                          >
                            Disable
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td
                          id={`${service.id}-logs`}
                          colSpan={4}
                          className="bg-black/30 px-6 py-4"
                        >
                          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                            Recent Logs
                          </h2>
                          <ul className="mt-3 space-y-2 text-xs">
                            {service.recentLogs.map((log) => (
                              <li
                                key={`${log.timestamp}-${log.message}`}
                                className={`rounded border px-3 py-2 ${LEVEL_STYLES[log.level]}`}
                              >
                                <p className="font-semibold">
                                  <span className="mr-2 text-[10px] uppercase tracking-wide">
                                    {log.level}
                                  </span>
                                  <time
                                    className="text-[10px] uppercase tracking-wide text-gray-300"
                                    dateTime={log.timestamp}
                                  >
                                    {new Date(log.timestamp).toLocaleString()}
                                  </time>
                                </p>
                                <p className="mt-1 text-gray-100">{log.message}</p>
                              </li>
                            ))}
                            {service.recentLogs.length === 0 && (
                              <li className="rounded border border-dashed border-gray-600 px-3 py-2 text-gray-300">
                                No log entries yet.
                              </li>
                            )}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default ServicesApp;

export const displayServices = () => <ServicesApp />;
