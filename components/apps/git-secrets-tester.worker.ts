import JSZip from 'jszip';
import {
  PatternInfo,
  ScanResult,
  DiffLine,
  MAX_SIZE,
  redactSecret,
} from './git-secrets-tester.utils';

let canceled = false;

const shannonEntropy = (str: string): number => {
  const freq: Record<string, number> = {};
  for (const c of str) freq[c] = (freq[c] || 0) + 1;
  let e = 0;
  const len = str.length;
  Object.values(freq).forEach((f) => {
    const p = f / len;
    e -= p * Math.log2(p);
  });
  return e;
};

const isBinary = (data: Uint8Array): boolean => {
  for (let i = 0; i < data.length && i < 1000; i += 1) {
    if (data[i] === 0) return true;
  }
  return false;
};

const scanLine = (
  file: string,
  lineContent: string,
  lineNumber: number,
  patterns: PatternInfo[],
): { safe: string; results: ScanResult[] } => {
  const lineResults: ScanResult[] = [];
  let safe = lineContent;

  patterns.forEach((pat) => {
    try {
      const re = new RegExp(pat.regex, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(lineContent)) !== null) {
        lineResults.push({
          file,
          pattern: pat.name,
          match: redactSecret(m[0]),
          index: m.index,
          line: lineNumber,
          severity: pat.severity,
          confidence: 'high',
          remediation: pat.remediation,
          whitelist: pat.whitelist,
        });
        safe = safe.replace(m[0], redactSecret(m[0]));
      }
    } catch (e: any) {
      lineResults.push({
        file,
        pattern: pat.regex,
        match: '',
        index: -1,
        line: lineNumber,
        severity: 'error',
        confidence: 'low',
        remediation: e.message,
        whitelist: pat.whitelist,
      });
    }
  });

  const heur = /(password|secret|api[-_]?key|token)\s*[:=]\s*['"]?([^'"\s]+)/i.exec(
    lineContent,
  );
  if (heur) {
    const secret = heur[2];
    lineResults.push({
      file,
      pattern: `Keyword ${heur[1]}`,
      match: redactSecret(secret),
      index: lineContent.indexOf(secret),
      line: lineNumber,
      severity: 'medium',
      confidence: 'low',
      remediation: 'Avoid hardcoding credentials.',
      whitelist: 'git secrets --add -l "pattern"',
    });
    safe = safe.replace(secret, redactSecret(secret));
  }

  const tokens = lineContent.match(/[A-Za-z0-9\/+=]{20,}/g) || [];
  tokens.forEach((token) => {
    const ent = shannonEntropy(token);
    if (ent > 4) {
      lineResults.push({
        file,
        pattern: 'High Entropy String',
        match: redactSecret(token),
        index: lineContent.indexOf(token),
        line: lineNumber,
        severity: 'medium',
        confidence: 'medium',
        remediation: 'Verify this string is not a secret.',
        whitelist: 'git secrets --add -l "pattern"',
      });
      safe = safe.replace(token, redactSecret(token));
    }
  });

  return { safe, results: lineResults };
};

type WorkerMessage =
  | { type: 'scan-text'; text: string; patterns: PatternInfo[] }
  | { type: 'scan-file'; name: string; content: string; patterns: PatternInfo[] }
  | { type: 'scan-patch'; patch: string; patterns: PatternInfo[] }
  | { type: 'scan-archive'; buffer: ArrayBuffer; patterns: PatternInfo[] }
  | { type: 'cancel' };

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;
  if (msg.type === 'cancel') {
    canceled = true;
    return;
  }
  canceled = false;
  switch (msg.type) {
    case 'scan-text': {
      const lines = msg.text.split(/\r?\n/);
      const total = lines.length;
      const results: ScanResult[] = [];
      for (let i = 0; i < lines.length; i += 1) {
        if (canceled) {
          (self as unknown as Worker).postMessage({ type: 'canceled' });
          return;
        }
        const { results: r } = scanLine('input', lines[i], i + 1, msg.patterns);
        results.push(...r);
        if ((i + 1) % 50 === 0 || i + 1 === total) {
          (self as unknown as Worker).postMessage({
            type: 'progress',
            current: i + 1,
            total,
          });
        }
      }
      (self as unknown as Worker).postMessage({ type: 'results', results });
      break;
    }
    case 'scan-file': {
      const lines = msg.content.split(/\r?\n/);
      const total = lines.length;
      const results: ScanResult[] = [];
      for (let i = 0; i < lines.length; i += 1) {
        if (canceled) {
          (self as unknown as Worker).postMessage({ type: 'canceled' });
          return;
        }
        const { results: r } = scanLine(msg.name, lines[i], i + 1, msg.patterns);
        results.push(...r);
        if ((i + 1) % 50 === 0 || i + 1 === total) {
          (self as unknown as Worker).postMessage({
            type: 'progress',
            current: i + 1,
            total,
          });
        }
      }
      (self as unknown as Worker).postMessage({ type: 'results', results });
      break;
    }
    case 'scan-patch': {
      const lines = msg.patch.split(/\r?\n/);
      const total = lines.length;
      const diff: DiffLine[] = [];
      const results: ScanResult[] = [];
      let currentFile = '';
      let ln = 0;
      for (let i = 0; i < lines.length; i += 1) {
        if (canceled) {
          (self as unknown as Worker).postMessage({ type: 'canceled' });
          return;
        }
        const line = lines[i];
        if (line.startsWith('+++')) {
          currentFile = line.replace('+++ b/', '').replace('+++ ', '');
          diff.push({ file: currentFile, line, lineNumber: null, type: 'context' });
        } else if (line.startsWith('@@')) {
          const m = /@@ .* \+(\d+)/.exec(line);
          ln = m ? parseInt(m[1], 10) - 1 : 0;
          diff.push({ file: currentFile, line, lineNumber: null, type: 'context' });
        } else if (line.startsWith('+') && !line.startsWith('+++')) {
          ln += 1;
          const { safe, results: r } = scanLine(currentFile, line.slice(1), ln, msg.patterns);
          diff.push({ file: currentFile, line: `+${safe}`, lineNumber: ln, type: 'add' });
          results.push(...r);
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          const { safe } = scanLine(currentFile, line.slice(1), ln, msg.patterns);
          diff.push({ file: currentFile, line: `-${safe}`, lineNumber: null, type: 'remove' });
        } else {
          ln += 1;
          const { safe } = scanLine(currentFile, line, ln, msg.patterns);
          diff.push({ file: currentFile, line: safe, lineNumber: ln, type: 'context' });
        }
        if ((i + 1) % 50 === 0 || i + 1 === total) {
          (self as unknown as Worker).postMessage({
            type: 'progress',
            current: i + 1,
            total,
          });
        }
      }
      (self as unknown as Worker).postMessage({ type: 'results', results, diff });
      break;
    }
    case 'scan-archive': {
      const zip = await JSZip.loadAsync(msg.buffer);
      const entries = Object.values(zip.files).filter((e) => !e.dir);
      const results: ScanResult[] = [];
      const logs: string[] = [];
      const total = entries.length;
      for (let i = 0; i < entries.length; i += 1) {
        if (canceled) {
          (self as unknown as Worker).postMessage({ type: 'canceled' });
          return;
        }
        const entry = entries[i];
        const data = await entry.async('uint8array');
        if (data.length > MAX_SIZE || isBinary(data)) {
          logs.push(`Skipped ${entry.name}`);
        } else {
          const content = new TextDecoder().decode(data);
          const lines = content.split(/\r?\n/);
          lines.forEach((line, idx) => {
            const { results: r } = scanLine(entry.name, line, idx + 1, msg.patterns);
            results.push(...r);
          });
        }
        (self as unknown as Worker).postMessage({
          type: 'progress',
          current: i + 1,
          total,
        });
      }
      (self as unknown as Worker).postMessage({ type: 'results', results, logs });
      break;
    }
    default:
      break;
  }
};

export default null as any;
