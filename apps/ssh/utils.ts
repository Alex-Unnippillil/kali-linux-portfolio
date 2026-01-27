import { SSHConfig } from './config';

export type SSHValidationErrors = Partial<Record<keyof SSHConfig, string>>;

export type SSHCommandSegment = {
  id: string;
  label: string;
  segment: string;
  description: string;
  kind: 'command' | 'option' | 'destination' | 'extra';
  isPlaceholder?: boolean;
};

export type SSHCommandParts = {
  segments: SSHCommandSegment[];
};

const PORT_RANGE = { min: 1, max: 65535 };

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

const normaliseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const stripControlChars = (value: string): string => value.replace(/[\u0000-\u001F\u007F]/g, '');

const sanitizeField = (value: string): string => normaliseWhitespace(stripControlChars(value));

const sanitizeExtraOptions = (value: string): string => {
  const cleaned = normaliseWhitespace(value.replace(/[\u0000-\u001F\u007F]/g, ' '));
  if (!cleaned) {
    return '';
  }
  const withoutPrefix = cleaned.replace(/^ssh\s+/i, '').trim();
  if (withoutPrefix.toLowerCase() === 'ssh') {
    return '';
  }
  return withoutPrefix;
};

const containsControlChars = (value: string): boolean => CONTROL_CHARS.test(value);

const isPositiveInteger = (value: string): boolean => Number.isInteger(Number(value)) && Number(value) > 0;

const addSegment = (
  segments: SSHCommandSegment[],
  segment: SSHCommandSegment
): void => {
  segments.push(segment);
};

export const buildSSHCommandParts = (
  config: SSHConfig,
  options: { includePlaceholder?: boolean } = {}
): SSHCommandParts => {
  const segments: SSHCommandSegment[] = [];
  addSegment(segments, {
    id: 'ssh',
    label: 'SSH client',
    segment: 'ssh',
    description: 'Invoke the OpenSSH client.',
    kind: 'command',
  });

  const port = sanitizeField(config.port);
  const identityFile = sanitizeField(config.identityFile);
  const jumpHost = sanitizeField(config.jumpHost);
  const extraOptions = sanitizeExtraOptions(config.extraOptions);
  const user = sanitizeField(config.user);
  const host = sanitizeField(config.host);

  if (port) {
    addSegment(segments, {
      id: 'port',
      label: 'Port',
      segment: `-p ${port}`,
      description: 'Target SSH port.',
      kind: 'option',
    });
  }

  if (identityFile) {
    addSegment(segments, {
      id: 'identity',
      label: 'Identity file',
      segment: `-i ${identityFile}`,
      description: 'Use a specific private key for authentication.',
      kind: 'option',
    });
  }

  if (config.useCompression) {
    addSegment(segments, {
      id: 'compression',
      label: 'Compression',
      segment: '-C',
      description: 'Enable compression to optimize bandwidth.',
      kind: 'option',
    });
  }

  if (config.enableAgentForwarding) {
    addSegment(segments, {
      id: 'agent-forwarding',
      label: 'Agent forwarding',
      segment: '-A',
      description: 'Forward the local SSH agent to the remote host.',
      kind: 'option',
    });
  }

  if (config.allocateTTY) {
    addSegment(segments, {
      id: 'allocate-tty',
      label: 'Allocate TTY',
      segment: '-t',
      description: 'Force pseudo-terminal allocation.',
      kind: 'option',
    });
  }

  if (jumpHost) {
    addSegment(segments, {
      id: 'jump-host',
      label: 'Jump host',
      segment: `-J ${jumpHost}`,
      description: 'Route traffic through a bastion or jump box.',
      kind: 'option',
    });
  }

  if (config.strictHostKeyChecking) {
    addSegment(segments, {
      id: 'strict-host-key',
      label: 'Host key policy',
      segment: `-o StrictHostKeyChecking=${config.strictHostKeyChecking}`,
      description: 'Control how new host keys are accepted.',
      kind: 'option',
    });
  }

  if (config.logLevel) {
    addSegment(segments, {
      id: 'log-level',
      label: 'Log level',
      segment: `-o LogLevel=${config.logLevel}`,
      description: 'Tune SSH client verbosity for auditing.',
      kind: 'option',
    });
  }

  if (config.serverAliveInterval) {
    addSegment(segments, {
      id: 'server-alive-interval',
      label: 'ServerAliveInterval',
      segment: `-o ServerAliveInterval=${config.serverAliveInterval}`,
      description: 'Send keepalives every N seconds.',
      kind: 'option',
    });
  }

  if (config.serverAliveCountMax) {
    addSegment(segments, {
      id: 'server-alive-count',
      label: 'ServerAliveCountMax',
      segment: `-o ServerAliveCountMax=${config.serverAliveCountMax}`,
      description: 'Disconnect after missing N keepalives.',
      kind: 'option',
    });
  }

  if (config.userKnownHostsFile) {
    addSegment(segments, {
      id: 'known-hosts',
      label: 'Known hosts file',
      segment: `-o UserKnownHostsFile=${sanitizeField(config.userKnownHostsFile)}`,
      description: 'Override the known_hosts file location.',
      kind: 'option',
    });
  }

  if (extraOptions) {
    addSegment(segments, {
      id: 'extra-options',
      label: 'Extra options',
      segment: extraOptions,
      description: 'Additional flags supplied manually.',
      kind: 'extra',
    });
  }

  const target = host ? `${user ? `${user}@` : ''}${host}` : '';
  const placeholder = options.includePlaceholder ? '<host>' : '';
  const destination = target || placeholder;
  if (destination) {
    addSegment(segments, {
      id: 'destination',
      label: 'Destination',
      segment: destination,
      description: 'Remote target in [user@]host format.',
      kind: 'destination',
      isPlaceholder: !target,
    });
  }

  return { segments };
};

export const buildSSHCommand = (config: SSHConfig): string => {
  const { segments } = buildSSHCommandParts(config);
  return segments
    .filter((segment) => !segment.isPlaceholder)
    .map((segment) => segment.segment)
    .join(' ')
    .trim();
};

export const validateSSHConfig = (config: SSHConfig): SSHValidationErrors => {
  const errors: SSHValidationErrors = {};

  if (!config.host.trim()) {
    errors.host = 'Host is required.';
  } else if (containsControlChars(config.host)) {
    errors.host = 'Host cannot include control characters.';
  }

  if (config.user && containsControlChars(config.user)) {
    errors.user = 'Username cannot include control characters.';
  }

  if (config.identityFile && containsControlChars(config.identityFile)) {
    errors.identityFile = 'Identity file cannot include control characters.';
  }

  if (config.jumpHost && containsControlChars(config.jumpHost)) {
    errors.jumpHost = 'Jump host cannot include control characters.';
  }

  if (config.port.trim()) {
    if (containsControlChars(config.port)) {
      errors.port = 'Port cannot include control characters.';
    } else {
      const parsed = Number(config.port);
      if (!Number.isInteger(parsed) || parsed < PORT_RANGE.min || parsed > PORT_RANGE.max) {
        errors.port = `Port must be an integer between ${PORT_RANGE.min} and ${PORT_RANGE.max}.`;
      }
    }
  }

  if (config.serverAliveInterval.trim() && !isPositiveInteger(config.serverAliveInterval)) {
    errors.serverAliveInterval = 'ServerAliveInterval must be a positive integer.';
  }

  if (config.serverAliveCountMax.trim() && !isPositiveInteger(config.serverAliveCountMax)) {
    errors.serverAliveCountMax = 'ServerAliveCountMax must be a positive integer.';
  }

  return errors;
};
