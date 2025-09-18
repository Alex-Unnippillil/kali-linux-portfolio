export interface ConsoleLogEntry {
  /** Timestamp in milliseconds relative to the start of the recording. */
  timestamp: number;
  /** Sanitized log line that is safe to render directly. */
  line: string;
}

export const sanitizedConsoleLogs: ConsoleLogEntry[] = [
  {
    timestamp: 0,
    line: 'msf6 > use exploit/windows/smb/ms17_010_eternalblue',
  },
  {
    timestamp: 700,
    line: '[-] Demo mode active. No network traffic is generated.',
  },
  {
    timestamp: 1400,
    line: '[*] 10.0.0.5:445 - Validating target configuration (simulated)',
  },
  {
    timestamp: 2200,
    line: '[*] 10.0.0.5:445 - Uploading sanitized payload for training',
  },
  {
    timestamp: 3300,
    line: '[+] 10.0.0.5:445 - Session 1 opened (simulation)',
  },
  {
    timestamp: 4300,
    line: 'msf6 exploit(windows/smb/ms17_010_eternalblue) > sessions -i 1',
  },
];
