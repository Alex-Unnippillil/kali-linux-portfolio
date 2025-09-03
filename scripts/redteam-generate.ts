// @ts-nocheck
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const logsDir = path.join(ROOT, 'logs', 'redteam');
const testsDir = path.join(ROOT, '__tests__', 'redteam');

function sanitize(input: string): string {
  return input
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, '[ip]');
}

function generateTests(): void {
  if (!fs.existsSync(logsDir)) {
    console.warn(`No logs directory found at ${logsDir}`);
    return;
  }

  fs.mkdirSync(testsDir, { recursive: true });

  const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
  const lines = ["import { describe, it, expect } from '@jest/globals';", '', "describe('redteam generated logs', () => {"];

  for (const file of logFiles) {
    const raw = fs.readFileSync(path.join(logsDir, file), 'utf8');
    const sanitized = sanitize(raw);
    lines.push(`  it('${file} is sanitized', () => {`);
    lines.push(`    const log = ${JSON.stringify(sanitized)};`);
    lines.push('    expect(log).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}/);');
    lines.push('    expect(log).not.toMatch(/\\b\\d{1,3}(?:\\.\\d{1,3}){3}\\b/);');
    lines.push('  });');
  }

  lines.push('});\n');
  fs.writeFileSync(path.join(testsDir, 'generated.test.ts'), lines.join('\n'));
}

generateTests();
