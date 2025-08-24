import JSZip from 'jszip';

interface Pattern {
  name: string;
  regex: string;
  severity: string;
  remediation: string;
  tool: string;
}

interface WorkerResult {
  confidence: string;
  file: string;
  line: number;
  index: number;
  pattern: string;
  match: string;
  severity: string;
  remediation: string;
}

const gitleaksPatterns: Omit<Pattern, 'tool'>[] = [
  {
    name: 'AWS Access Key',
    regex: 'AKIA[0-9A-Z]{16}',
    severity: 'high',
    remediation: 'Rotate the key and remove from history.',
  },
  {
    name: 'Generic API Key',
    regex: '[A-Za-z0-9-_]{32,45}',
    severity: 'medium',
    remediation: 'Rotate the key and remove from the repository.',
  },
];

const trufflehogPatterns: Omit<Pattern, 'tool'>[] = [
  {
    name: 'Slack Token',
    regex: 'xox[baprs]-[0-9a-zA-Z]{10,48}',
    severity: 'high',
    remediation: 'Revoke the token and generate a new one.',
  },
  {
    name: 'RSA Private Key',
    regex: '-----BEGIN(?: RSA)? PRIVATE KEY-----',
    severity: 'critical',
    remediation: 'Remove private keys and generate new ones.',
  },
];

const allPatterns: Pattern[] = [
  ...gitleaksPatterns.map((p) => ({ ...p, tool: 'gitleaks' })),
  ...trufflehogPatterns.map((p) => ({ ...p, tool: 'trufflehog' })),
];

const redact = (secret: string): string => {
  if (secret.length <= 4) return '***';
  return `${secret.slice(0, 2)}***${secret.slice(-2)}`;
};

interface ScanMessage {
  type: 'scan-archive';
  buffer: ArrayBuffer;
}

self.onmessage = async (e: MessageEvent<ScanMessage>) => {
  if (e.data.type !== 'scan-archive') return;
  const zip = await JSZip.loadAsync(e.data.buffer);
  const entries = Object.values(zip.files);
  const results: WorkerResult[] = [];
  for (const entry of entries) {
    if (entry.dir) continue;
    const content = await entry.async('string');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      allPatterns.forEach((pat) => {
        const re = new RegExp(pat.regex, 'g');
        let m: RegExpExecArray | null;
        while ((m = re.exec(line)) !== null) {
          results.push({
            file: entry.name,
            line: idx + 1,
            index: m.index,
            pattern: `${pat.tool}: ${pat.name}`,
            match: redact(m[0]),
            severity: pat.severity,
            confidence: 'high',
            remediation: pat.remediation,
          });
        }
      });
    });
  }
  (self as unknown as Worker).postMessage({ results });
};

export default null as any;
