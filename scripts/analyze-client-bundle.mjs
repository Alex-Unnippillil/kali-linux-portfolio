import fs from 'fs/promises';
import path from 'path';

const REPORT_PATH = path.join(process.cwd(), '.next', 'analyze', 'client.json');
const SUMMARY_PATH = path.join(process.cwd(), '.next', 'analyze', 'summary.md');

const SERVER_ONLY_PATTERNS = [
  { pattern: '/lib/service-client', reason: 'Supabase service client must only run on the server.' },
  { pattern: '/lib/analytics-server', reason: 'Server analytics helpers must not ship to the browser.' },
  { pattern: '/lib/validate', reason: 'Environment validation logic is server-only.' },
  { pattern: '/pages/api/', reason: 'API route handlers must remain server-side.' },
  { pattern: '/middleware', reason: 'Middleware code is evaluated on the server/edge only.' },
];

function collectModules(node, acc) {
  if (!node || typeof node !== 'object') return;
  const groups = Array.isArray(node.groups) ? node.groups : [];
  const modules = Array.isArray(node.modules) ? node.modules : [];
  if (groups.length === 0 && modules.length === 0 && typeof node.path === 'string') {
    acc.push(node);
    return;
  }
  for (const child of groups) {
    collectModules(child, acc);
  }
  for (const child of modules) {
    collectModules(child, acc);
  }
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  if (!Number.isFinite(bytes)) return `${bytes}`;
  const units = ['B', 'kB', 'MB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

async function loadReport() {
  const raw = await fs.readFile(REPORT_PATH, 'utf8');
  return JSON.parse(raw);
}

function findViolations(modules) {
  const findings = [];
  for (const mod of modules) {
    const modulePath = mod.path || mod.label || '';
    for (const rule of SERVER_ONLY_PATTERNS) {
      if (modulePath.includes(rule.pattern)) {
        findings.push({ modulePath, rule });
        break;
      }
    }
  }
  return findings;
}

function createSummary(modules) {
  const totalParsed = modules.reduce((sum, mod) => sum + (mod.parsedSize || 0), 0);
  const totalStat = modules.reduce((sum, mod) => sum + (mod.statSize || 0), 0);
  const sorted = [...modules]
    .sort((a, b) => (b.parsedSize || 0) - (a.parsedSize || 0))
    .slice(0, 10);

  const lines = [
    '### Client bundle analysis',
    '',
    `* Modules analysed: **${modules.length}**`,
    `* Total parsed size: **${formatSize(totalParsed)}**`,
    `* Total stat size: **${formatSize(totalStat)}**`,
    '',
    '| Module | Parsed size |',
    '| --- | --- |',
  ];

  for (const entry of sorted) {
    const pathLabel = entry.path || entry.label || '(unknown)';
    const normalized = pathLabel.replace(/^\.\/?/, '');
    lines.push(`| \`${normalized}\` | ${formatSize(entry.parsedSize || 0)} |`);
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  try {
    const report = await loadReport();
    const modules = [];
    for (const entry of report) {
      collectModules(entry, modules);
    }

    if (modules.length === 0) {
      throw new Error('Bundle analyzer report did not contain any module entries.');
    }

    const violations = findViolations(modules);
    const summary = createSummary(modules);
    await fs.writeFile(SUMMARY_PATH, summary, 'utf8');

    console.log(summary);

    if (violations.length > 0) {
      console.error('Found server-only modules in the client bundle:');
      for (const { modulePath, rule } of violations) {
        console.error(` - ${modulePath} → ${rule.reason}`);
      }
      process.exit(1);
    }
  } catch (err) {
    console.error('Failed to analyse client bundle.');
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
