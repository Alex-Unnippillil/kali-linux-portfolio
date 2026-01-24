export interface SSHConfig {
  user: string;
  host: string;
  port: string;
  identityFile: string;
  useCompression: boolean;
  enableAgentForwarding: boolean;
  allocateTTY: boolean;
  jumpHost: string;
  strictHostKeyChecking: '' | 'ask' | 'accept-new' | 'yes' | 'no';
  logLevel: '' | 'QUIET' | 'FATAL' | 'ERROR' | 'INFO' | 'VERBOSE' | 'DEBUG' | 'DEBUG1' | 'DEBUG2' | 'DEBUG3';
  serverAliveInterval: string;
  serverAliveCountMax: string;
  userKnownHostsFile: string;
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
  allocateTTY: false,
  jumpHost: '',
  strictHostKeyChecking: '',
  logLevel: '',
  serverAliveInterval: '',
  serverAliveCountMax: '',
  userKnownHostsFile: '',
  extraOptions: '',
};

export const SSH_PRESETS: SSHPreset[] = [
  {
    id: 'custom',
    label: 'Start from scratch',
    description: 'Reset every field to defaults and build a fresh SSH command.',
    config: { ...DEFAULT_SSH_CONFIG },
  },
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
      allocateTTY: true,
      jumpHost: 'bastion.lab.internal',
      strictHostKeyChecking: 'accept-new',
      logLevel: 'INFO',
      serverAliveInterval: '45',
      serverAliveCountMax: '3',
      userKnownHostsFile: '~/.ssh/known_hosts',
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
      allocateTTY: false,
      jumpHost: '',
      strictHostKeyChecking: 'accept-new',
      logLevel: 'VERBOSE',
      serverAliveInterval: '60',
      serverAliveCountMax: '2',
      userKnownHostsFile: '~/.ssh/known_hosts',
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
      allocateTTY: true,
      jumpHost: '',
      strictHostKeyChecking: 'ask',
      logLevel: '',
      serverAliveInterval: '',
      serverAliveCountMax: '',
      userKnownHostsFile: '',
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
      allocateTTY: false,
      jumpHost: 'jump.cloud.internal:22',
      strictHostKeyChecking: 'yes',
      logLevel: 'INFO',
      serverAliveInterval: '60',
      serverAliveCountMax: '3',
      userKnownHostsFile: '~/.ssh/known_hosts',
      extraOptions: '-o ServerAliveInterval=60',
    },
  },
];
