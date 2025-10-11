export const hookInventory = [
  {
    id: 'hook-lab-01',
    codename: 'Lab Workstation 01',
    browser: 'Firefox 115 ESR (Kali Linux)',
    ip: '10.42.0.21',
    status: 'Online',
    scope: 'Research VLAN',
    note: 'Primary sandbox for running BeEF walkthroughs during workshops.'
  },
  {
    id: 'hook-lab-02',
    codename: 'Analyst Tablet',
    browser: 'Chromium 122 (Android)',
    ip: '10.42.0.44',
    status: 'Idle',
    scope: 'Mobile lab subnet',
    note: 'Used to contrast mobile browser surfaces; executes canned responses only.'
  },
  {
    id: 'hook-lab-03',
    codename: 'Blue Team Observer',
    browser: 'Firefox 115 ESR (Kali Linux)',
    ip: '10.42.1.10',
    status: 'Review',
    scope: 'Training observer VLAN',
    note: 'Displays mirrored output so defenders can analyze simulated telemetry.'
  }
];

export const demoActivity = [
  {
    id: 'activity-01',
    hook: 'hook-lab-01',
    module: 'alert',
    timestamp: '09:01:12',
    outcome: 'Displayed consent banner through alert dialog demo.'
  },
  {
    id: 'activity-02',
    hook: 'hook-lab-02',
    module: 'browser-info',
    timestamp: '09:05:32',
    outcome: 'Collected sandboxed user agent profile for comparison worksheet.'
  },
  {
    id: 'activity-03',
    hook: 'hook-lab-03',
    module: 'fetch-url',
    timestamp: '09:11:03',
    outcome: 'Loaded offline wiki article to discuss command-and-control patterns.'
  },
  {
    id: 'activity-04',
    hook: 'hook-lab-01',
    module: 'port-scan',
    timestamp: '09:18:44',
    outcome: 'Replayed canned port scan heatmap (lab mode required).'
  }
];
