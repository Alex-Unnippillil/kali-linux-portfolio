import { DEFAULT_SSH_CONFIG } from '../apps/ssh/config';
import { buildSSHCommand, validateSSHConfig } from '../apps/ssh/utils';

describe('SSH builder utilities', () => {
  describe('buildSSHCommand', () => {
    it('returns a minimal ssh command when only host is provided', () => {
      const command = buildSSHCommand({
        ...DEFAULT_SSH_CONFIG,
        host: 'example.com',
      });

      expect(command).toBe('ssh example.com');
    });

    it('includes all selected options in a deterministic order', () => {
      const command = buildSSHCommand({
        ...DEFAULT_SSH_CONFIG,
        user: 'kali',
        host: '10.0.0.5',
        port: '2222',
        identityFile: '~/.ssh/id_ed25519',
        useCompression: true,
        enableAgentForwarding: true,
        extraOptions: '-o LogLevel=DEBUG -o ServerAliveInterval=30',
      });

      expect(command).toBe(
        'ssh -p 2222 -i ~/.ssh/id_ed25519 -C -A kali@10.0.0.5 -o LogLevel=DEBUG -o ServerAliveInterval=30'
      );
    });

    it('trims and normalises extra options', () => {
      const command = buildSSHCommand({
        ...DEFAULT_SSH_CONFIG,
        host: 'infra.local',
        extraOptions: '   -o   StrictHostKeyChecking=no\n-o UserKnownHostsFile=/dev/null  ',
      });

      expect(command).toBe('ssh infra.local -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null');
    });
  });

  describe('validateSSHConfig', () => {
    it('requires a host value', () => {
      const errors = validateSSHConfig(DEFAULT_SSH_CONFIG);

      expect(errors.host).toBe('Host is required.');
    });

    it('accepts an empty port', () => {
      const errors = validateSSHConfig({
        ...DEFAULT_SSH_CONFIG,
        host: 'example.com',
        port: '',
      });

      expect(errors.port).toBeUndefined();
    });

    it('rejects invalid ports', () => {
      const errors = validateSSHConfig({
        ...DEFAULT_SSH_CONFIG,
        host: 'example.com',
        port: '70000',
      });

      expect(errors.port).toBe('Port must be an integer between 1 and 65535.');
    });

    it('accepts valid ports', () => {
      const errors = validateSSHConfig({
        ...DEFAULT_SSH_CONFIG,
        host: 'example.com',
        port: '2222',
      });

      expect(errors).toEqual({});
    });
  });
});

