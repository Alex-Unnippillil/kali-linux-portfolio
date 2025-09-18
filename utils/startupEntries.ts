export interface StartupEntry {
  id: string;
  name: string;
  description: string;
  source: string;
  impactScore: number;
  defaultEnabled: boolean;
  defaultDelay: number;
  heavy?: boolean;
  warning?: string;
}

export const startupEntries: StartupEntry[] = [
  {
    id: 'threat-monitor',
    name: 'Threat Monitor',
    description:
      'Collects telemetry from the simulated SOC sensors so the desktop feeds dashboards immediately after sign-in.',
    source: 'systemd — /etc/systemd/system/threat-monitor.service',
    impactScore: 9,
    defaultEnabled: true,
    defaultDelay: 0,
    heavy: true,
    warning: 'Threat Monitor primes forensic baselines. Disabling it delays incident response triage.',
  },
  {
    id: 'widget-sync',
    name: 'Widget Sync',
    description:
      'Restores pinned desktop widgets and layout tweaks from the last session.',
    source: 'autostart — ~/.config/autostart/widget-sync.desktop',
    impactScore: 3,
    defaultEnabled: true,
    defaultDelay: 5,
  },
  {
    id: 'update-check',
    name: 'Security Update Check',
    description:
      'Polls the package mirrors for simulator updates and surfaces changelog notifications.',
    source: 'cron @reboot — /opt/portfolio/bin/update-check.sh',
    impactScore: 5,
    defaultEnabled: false,
    defaultDelay: 30,
  },
  {
    id: 'forensic-handoff',
    name: 'Forensic Handoff Prep',
    description:
      'Preloads offline evidence vaults and copies runbooks into RAM for faster lab turnover.',
    source: 'systemd — /etc/systemd/system/forensic-handoff.service',
    impactScore: 8,
    defaultEnabled: true,
    defaultDelay: 0,
    heavy: true,
    warning: 'Forensic Handoff Prep keeps lab exports warm. Disable only if you do not need immediate capture kits.',
  },
];
