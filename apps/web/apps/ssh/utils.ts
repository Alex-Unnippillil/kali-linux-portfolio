import { SSHConfig } from './config';

export type SSHValidationErrors = Partial<Record<keyof SSHConfig, string>>;

const PORT_RANGE = { min: 1, max: 65535 };

const normaliseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

export const buildSSHCommand = (config: SSHConfig): string => {
  const parts: string[] = ['ssh'];

  if (config.port) {
    parts.push(`-p ${config.port}`);
  }

  if (config.identityFile) {
    parts.push(`-i ${config.identityFile}`);
  }

  if (config.useCompression) {
    parts.push('-C');
  }

  if (config.enableAgentForwarding) {
    parts.push('-A');
  }

  const target = config.host ? `${config.user ? `${config.user}@` : ''}${config.host}` : '';

  if (target) {
    parts.push(target);
  }

  const extra = normaliseWhitespace(config.extraOptions);

  if (extra) {
    parts.push(extra);
  }

  return parts.join(' ').trim();
};

export const validateSSHConfig = (config: SSHConfig): SSHValidationErrors => {
  const errors: SSHValidationErrors = {};

  if (!config.host.trim()) {
    errors.host = 'Host is required.';
  }

  if (config.port.trim()) {
    const parsed = Number(config.port);
    if (!Number.isInteger(parsed) || parsed < PORT_RANGE.min || parsed > PORT_RANGE.max) {
      errors.port = `Port must be an integer between ${PORT_RANGE.min} and ${PORT_RANGE.max}.`;
    }
  }

  return errors;
};

