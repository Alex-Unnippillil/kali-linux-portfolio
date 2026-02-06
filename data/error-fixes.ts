export interface ErrorFixEntry {
  title: string;
  description: string;
  command: string;
  docsUrl?: string;
}

export type ErrorFixDictionary = Record<string, ErrorFixEntry>;

export const ERROR_FIXES: ErrorFixDictionary = {
  'SIM-001': {
    title: 'Truncated log sample',
    description:
      'The simulator detected a truncated or incomplete log sample. Reload the fixture or pull the latest run from your lab machine before parsing.',
    command: 'scp lab@10.0.5.20:/var/log/simulations/latest.log ./fixtures/',
    docsUrl: 'https://unnippillil.com/docs/simulators#fixtures',
  },
  'NET-042': {
    title: 'Interface in a down state',
    description:
      'Packets are not being captured because the interface is down. Bring the interface back up and restart the capture.',
    command: 'sudo ip link set wlan0 up && sudo systemctl restart NetworkManager',
    docsUrl: 'https://www.kali.org/docs/general-use/using-network-manager/',
  },
  'AUTH-013': {
    title: 'Stale SSH known-host entry',
    description:
      'Authentication failed due to a stale known_hosts entry. Remove the cached host fingerprint and retry the connection.',
    command: 'ssh-keygen -R kali.lab.internal && ssh lab@kali.lab.internal',
    docsUrl: 'https://man.openbsd.org/ssh-keygen',
  },
  'LOG-200': {
    title: 'Persistent journal disabled',
    description:
      'Systemd is logging in volatile storage only. Enable persistent logging to retain evidence across reboots.',
    command: 'sudo mkdir -p /var/log/journal && sudo systemctl restart systemd-journald',
    docsUrl: 'https://www.freedesktop.org/software/systemd/man/journald.conf.html',
  },
  'SCAN-404': {
    title: 'Missing NSE script path',
    description:
      'The requested NSE script path was not found. Refresh the database and verify the script name.',
    command: 'sudo updatedb && locate scripts/vuln/ | grep ssl-heartbleed.nse',
    docsUrl: 'https://nmap.org/book/nse-usage.html',
  },
} as const;

export const ERROR_FIX_CODES = Object.keys(ERROR_FIXES);
