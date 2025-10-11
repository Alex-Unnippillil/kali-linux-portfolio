export interface SSHConfig {
  user: string;
  host: string;
  port: string;
  identityFile: string;
  useCompression: boolean;
  enableAgentForwarding: boolean;
  extraOptions: string;
}

export interface SSHPreset {
  id: string;
  label: string;
  description: string;
  config: SSHConfig;
}

export const DEFAULT_SSH_CONFIG: SSHConfig = {
  user: '',
  host: '',
  port: '',
  identityFile: '',
  useCompression: false,
  enableAgentForwarding: false,
  extraOptions: '',
};

export const SSH_PRESETS: SSHPreset[] = [
  {
    id: 'lab-gateway',
    label: 'Home Lab Gateway',
    description: 'Jump into the home lab bastion with agent forwarding for pivots.',
    config: {
      user: 'kali',
      host: '10.13.37.2',
      port: '22',
      identityFile: '~/.ssh/lab_ed25519',
      useCompression: false,
      enableAgentForwarding: true,
      extraOptions: '-o ForwardAgent=yes',
    },
  },
  {
    id: 'bug-bounty',
    label: 'Bug Bounty Jump Box',
    description: 'Preset for a hardened jump box with verbose logging and compression.',
    config: {
      user: 'pentest',
      host: 'bounty.box',
      port: '2222',
      identityFile: '~/.ssh/bug-bounty',
      useCompression: true,
      enableAgentForwarding: false,
      extraOptions: '-o LogLevel=VERBOSE -o StrictHostKeyChecking=accept-new',
    },
  },
  {
    id: 'ctf',
    label: 'CTF Target Host',
    description: 'Quick connect to a capture-the-flag VM with password auth.',
    config: {
      user: 'ctf',
      host: '172.16.5.10',
      port: '22',
      identityFile: '',
      useCompression: false,
      enableAgentForwarding: false,
      extraOptions: '-o PreferredAuthentications=password',
    },
  },
  {
    id: 'cloud',
    label: 'Cloud Sandbox',
    description: 'Connect to a cloud sandbox VM with compression enabled.',
    config: {
      user: 'devops',
      host: 'sandbox.cloud.internal',
      port: '2201',
      identityFile: '~/.ssh/sandbox_rsa',
      useCompression: true,
      enableAgentForwarding: false,
      extraOptions: '-o ServerAliveInterval=60',
    },
  },
];

