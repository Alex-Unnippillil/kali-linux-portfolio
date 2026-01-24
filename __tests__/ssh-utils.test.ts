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
        allocateTTY: true,
        jumpHost: 'bastion.internal',
        strictHostKeyChecking: 'accept-new',
        logLevel: 'VERBOSE',
        serverAliveInterval: '30',
        serverAliveCountMax: '2',
        userKnownHostsFile: '~/.ssh/known_hosts',
        extraOptions: '-o LogLevel=DEBUG -o ServerAliveInterval=30',
      });

      expect(command).toBe(
        'ssh -p 2222 -i ~/.ssh/id_ed25519 -C -A -t -J bastion.internal -o StrictHostKeyChecking=accept-new -o LogLevel=VERBOSE -o ServerAliveInterval=30 -o ServerAliveCountMax=2 -o UserKnownHostsFile=~/.ssh/known_hosts -o LogLevel=DEBUG -o ServerAliveInterval=30 kali@10.0.0.5'
      );
    });

    it('trims and normalises extra options', () => {
      const command = buildSSHCommand({
        ...DEFAULT_SSH_CONFIG,
        host: 'infra.local',
        extraOptions: '   -o   StrictHostKeyChecking=no\n-o UserKnownHostsFile=/dev/null  ',
      });

      expect(command).toBe('ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null infra.local');
    });

    it('removes duplicate ssh prefixes from extra options', () => {
      const command = buildSSHCommand({
        ...DEFAULT_SSH_CONFIG,
        host: 'example.com',
        extraOptions: 'ssh -v -o BatchMode=yes',
      });

      expect(command).toBe('ssh -v -o BatchMode=yes example.com');
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

    it('rejects control characters in the host', () => {
      const errors = validateSSHConfig({
        ...DEFAULT_SSH_CONFIG,
        host: 'example.com\n',
      });

      expect(errors.host).toBe('Host cannot include control characters.');
    });

    it('rejects control characters in the identity file', () => {
      const errors = validateSSHConfig({
        ...DEFAULT_SSH_CONFIG,
        host: 'example.com',
        identityFile: '~/.ssh/id_ed25519\n',
      });

      expect(errors.identityFile).toBe('Identity file cannot include control characters.');
    });

    it('rejects non-numeric keepalive values', () => {
      const errors = validateSSHConfig({
        ...DEFAULT_SSH_CONFIG,
        host: 'example.com',
        serverAliveInterval: 'abc',
        serverAliveCountMax: '0',
      });

      expect(errors.serverAliveInterval).toBe('ServerAliveInterval must be a positive integer.');
      expect(errors.serverAliveCountMax).toBe('ServerAliveCountMax must be a positive integer.');
    });
  });
});
