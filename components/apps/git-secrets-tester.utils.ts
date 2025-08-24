export interface PatternInfo {
  name: string;
  regex: string;
  severity: string;
  remediation: string;
  whitelist: string;
}

export interface ScanResult {
  file: string;
  pattern: string;
  match: string;
  index: number;
  line: number;
  severity: string;
  confidence: string;
  remediation: string;
  whitelist: string;
}

export interface DiffLine {
  file: string;
  line: string;
  lineNumber: number | null;
  type: 'context' | 'add' | 'remove';
}

export const defaultPatterns: PatternInfo[] = [
  {
    name: 'AWS Access Key',
    regex: 'AKIA[0-9A-Z]{16}',
    severity: 'high',
    remediation: 'Rotate the key and remove from history.',
    whitelist: 'git secrets --add "AKIA[0-9A-Z]{16}"',
  },
  {
    name: 'RSA Private Key',
    regex: '-----BEGIN RSA PRIVATE KEY-----',
    severity: 'critical',
    remediation: 'Remove the private key and generate a new one.',
    whitelist: 'git secrets --add "-----BEGIN RSA PRIVATE KEY-----"',
  },
  {
    name: 'Slack Token',
    regex: 'xox[baprs]-[0-9a-zA-Z]{10,48}',
    severity: 'high',
    remediation: 'Revoke the token and issue a new one.',
    whitelist: 'git secrets --add "xox[baprs]-[0-9a-zA-Z]{10,48}"',
  },
];

export const MAX_SIZE = 1_000_000; // 1MB

export const redactSecret = (secret: string): string => {
  if (secret.length <= 4) return '***';
  return `${secret.slice(0, 2)}***${secret.slice(-2)}`;
};

