export type VictimRecord = {
  id: string;
  name: string;
  ip: string;
  browser: string;
  os: string;
  lastSeen: string;
  status: 'online' | 'offline';
  tags: string[];
};

export const PRELOADED_VICTIMS: VictimRecord[] = [
  {
    id: 'vic-001',
    name: 'Intranet Finance Portal',
    ip: '10.0.5.21',
    browser: 'Chrome 121',
    os: 'Windows 11',
    lastSeen: '2m ago',
    status: 'online',
    tags: ['finance', 'internal', 'priority'],
  },
  {
    id: 'vic-002',
    name: 'Human Resources Tablet',
    ip: '10.0.8.14',
    browser: 'Edge 118',
    os: 'Windows 10',
    lastSeen: '12m ago',
    status: 'online',
    tags: ['hr', 'internal', 'tablet'],
  },
  {
    id: 'vic-003',
    name: 'Executive Laptop',
    ip: '10.0.12.4',
    browser: 'Safari 17',
    os: 'macOS 14',
    lastSeen: '45m ago',
    status: 'offline',
    tags: ['executive', 'travel', 'priority'],
  },
  {
    id: 'vic-004',
    name: 'QA Lab Workstation',
    ip: '10.0.30.16',
    browser: 'Firefox 122',
    os: 'Ubuntu 23.10',
    lastSeen: '5m ago',
    status: 'online',
    tags: ['qa', 'lab'],
  },
];
