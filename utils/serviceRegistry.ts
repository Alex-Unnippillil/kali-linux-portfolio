export type ServiceStatus = 'running' | 'stopped' | 'paused';

export type StartupType = 'Automatic' | 'Manual' | 'Disabled';

export type ServiceLogLevel = 'info' | 'warning' | 'error';

export interface ServiceLogEntry {
  timestamp: string;
  message: string;
  level: ServiceLogLevel;
}

export interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  status: ServiceStatus;
  startupType: StartupType;
  recentLogs: ServiceLogEntry[];
}

const registry: ServiceDefinition[] = [
  {
    id: 'network-scanner',
    name: 'Network Scanner',
    description: 'Schedules nightly discovery sweeps across lab segments.',
    status: 'running',
    startupType: 'Automatic',
    recentLogs: [
      {
        timestamp: '2024-05-12T08:30:00Z',
        message: 'Completed nightly discovery job (24 hosts reachable).',
        level: 'info',
      },
      {
        timestamp: '2024-05-11T21:04:00Z',
        message: 'Partial scan due to DNS timeout on segment DMZ-02.',
        level: 'warning',
      },
      {
        timestamp: '2024-05-11T08:30:00Z',
        message: 'Scheduled sweep finished in 3m41s.',
        level: 'info',
      },
    ],
  },
  {
    id: 'log-shipper',
    name: 'Log Shipper',
    description: 'Publishes transformed audit logs to the central ELK index.',
    status: 'running',
    startupType: 'Automatic',
    recentLogs: [
      {
        timestamp: '2024-05-12T09:05:00Z',
        message: 'Forwarded 5.4k events from auth pipeline.',
        level: 'info',
      },
      {
        timestamp: '2024-05-12T09:02:00Z',
        message: 'Recovered from transient queue back-pressure.',
        level: 'warning',
      },
      {
        timestamp: '2024-05-12T08:55:00Z',
        message: 'Rotated log buffers for project devnet.',
        level: 'info',
      },
    ],
  },
  {
    id: 'patch-daemon',
    name: 'Patch Daemon',
    description: 'Applies offline package updates in maintenance windows.',
    status: 'stopped',
    startupType: 'Manual',
    recentLogs: [
      {
        timestamp: '2024-05-10T01:00:00Z',
        message: 'Manual run completed for 12 pending security fixes.',
        level: 'info',
      },
      {
        timestamp: '2024-05-09T23:58:00Z',
        message: 'Detected reboot requirement on host kali-lab-03.',
        level: 'warning',
      },
      {
        timestamp: '2024-05-05T00:45:00Z',
        message: 'Last scheduled window deferred by maintainer.',
        level: 'info',
      },
    ],
  },
  {
    id: 'reporting-agent',
    name: 'Reporting Agent',
    description: 'Generates compliance deltas and emails weekly digests.',
    status: 'paused',
    startupType: 'Disabled',
    recentLogs: [
      {
        timestamp: '2024-05-08T12:15:00Z',
        message: 'Paused after workspace maintenance request.',
        level: 'warning',
      },
      {
        timestamp: '2024-05-08T11:58:00Z',
        message: 'Queued 4 draft compliance reports.',
        level: 'info',
      },
      {
        timestamp: '2024-05-01T12:00:00Z',
        message: 'Generated baseline metrics snapshot.',
        level: 'info',
      },
    ],
  },
];

export const getServiceRegistry = (): ServiceDefinition[] =>
  registry.map((service) => ({
    ...service,
    recentLogs: [...service.recentLogs],
  }));

export default registry;
