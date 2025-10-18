import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

const argMap = Object.create(null);
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith('--')) continue;
  const key = arg.slice(2);
  const value = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : 'true';
  argMap[key] = value;
  if (value !== 'true') {
    i += 1;
  }
}

const lighthouseDir = argMap['lighthouse-dir'] ?? '.lighthouseci';
const bundleReportPath = argMap['bundle-report'] ?? 'bundle-report.json';
const outputPath = argMap.output ?? 'preview-report.md';
const docsPath = argMap.docs ?? 'docs/preview-report.md';

function formatMs(value) {
  if (value == null) return '—';
  const ms = typeof value === 'number' ? value : Number.parseFloat(value);
  if (Number.isNaN(ms)) return '—';
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)} s`;
  }
  return `${ms.toFixed(0)} ms`;
}

function passIcon(pass) {
  return pass ? '✅' : '❌';
}

function diffSign(value) {
  if (value > 0.5) return `▲ +${value.toFixed(1)} kB`;
  if (value < -0.5) return `▼ ${Math.abs(value).toFixed(1)} kB`;
  if (value > 0) return `+${value.toFixed(1)} kB`;
  return `${value.toFixed(1)} kB`;
}

function formatSize(value) {
  if (value == null) return '—';
  return `${value.toFixed(1)} kB`;
}

async function readBundleReport() {
  const raw = await fs.readFile(bundleReportPath, 'utf8');
  return JSON.parse(raw);
}

async function readLighthouseRuns(directory) {
  try {
    await fs.access(directory);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  const files = await fg('**/lhr-*.json', { cwd: directory });
  const runs = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(directory, file), 'utf8');
    const lhr = JSON.parse(raw);
    runs.push(lhr);
  }
  return runs;
}

function aggregateLighthouse(runs) {
  if (runs.length === 0) return null;
  const totals = {
    lcp: 0,
    inp: 0,
    cls: 0,
    performance: 0
  };
  for (const run of runs) {
    totals.lcp += run.audits['largest-contentful-paint']?.numericValue ?? 0;
    totals.inp += run.audits['experimental-interaction-to-next-paint']?.numericValue ?? 0;
    totals.cls += run.audits['cumulative-layout-shift']?.numericValue ?? 0;
    totals.performance += (run.categories.performance?.score ?? 0) * 100;
  }
  const count = runs.length;
  return {
    count,
    averages: {
      lcp: totals.lcp / count,
      inp: totals.inp / count,
      cls: totals.cls / count,
      performance: totals.performance / count
    }
  };
}

function lighthouseBudgets() {
  return {
    lcp: 3500,
    inp: 200,
    cls: 0.1
  };
}

function formatLighthouseTable(summary) {
  if (!summary) {
    return '| Metric | Avg | Budget | Status |\n| --- | --- | --- | --- |\n| LCP | — | 3.5 s | ⚠️ no runs |\n';
  }
  const budgets = lighthouseBudgets();
  const rows = [
    [
      'LCP',
      formatMs(summary.averages.lcp),
      '3.5 s',
      summary.averages.lcp <= budgets.lcp ? '✅' : '❌'
    ],
    [
      'INP',
      formatMs(summary.averages.inp),
      '200 ms',
      summary.averages.inp <= budgets.inp ? '✅' : '❌'
    ],
    [
      'CLS',
      summary.averages.cls.toFixed(3),
      '0.10',
      summary.averages.cls <= budgets.cls ? '✅' : '❌'
    ]
  ];
  const lines = ['| Metric | Avg | Budget | Status |', '| --- | --- | --- | --- |'];
  for (const row of rows) {
    lines.push(`| ${row[0]} | ${row[1]} | ${row[2]} | ${row[3]} |`);
  }
  return lines.join('\n');
}

function formatBundleTable(report) {
  const baseTotals = report.base?.totals ?? {};
  const diff = report.diff ?? {};
  const hasBase = Boolean(report.base);
  const lines = ['| Group | Base | PR | Δ | Budget | Status |', '| --- | --- | --- | --- | --- | --- |'];

  const entries = [
    {
      label: 'JS (brotli)',
      base: baseTotals.js?.brotliKb,
      head: report.head.totals.js?.brotliKb,
      diff: diff.js?.brotliKb,
      budget: report.budgets?.jsTotalBrotliKb
    },
    {
      label: 'CSS (brotli)',
      base: baseTotals.css?.brotliKb,
      head: report.head.totals.css?.brotliKb,
      diff: diff.css?.brotliKb,
      budget: report.budgets?.cssTotalBrotliKb
    }
  ];

  for (const entry of entries) {
    const budget = entry.budget;
    const status = budget ? passIcon(Boolean(budget.pass)) : '—';
    const budgetText = budget ? `${budget.threshold} kB` : '—';
    const baseText = hasBase && entry.base != null ? formatSize(entry.base) : '—';
    const headText = entry.head != null ? formatSize(entry.head) : '—';
    const diffText = hasBase && entry.diff != null ? `${diffSign(entry.diff)}` : '—';
    lines.push(`| ${entry.label} | ${baseText} | ${headText} | ${diffText} | ${budgetText} | ${status} |`);
  }

  return lines.join('\n');
}

function formatTopAssets(report) {
  if (!report.head.topAssets?.length) {
    return '_No build assets found._';
  }
  const rows = report.head.topAssets.map((asset) => `- ${asset.file} — ${formatSize(asset.brotliKb)} brotli`);
  return rows.join('\n');
}

async function main() {
  const [bundleReport, lighthouseRuns] = await Promise.all([
    readBundleReport(),
    readLighthouseRuns(lighthouseDir)
  ]);
  const lighthouseSummary = aggregateLighthouse(lighthouseRuns);
  const lighthouseTable = formatLighthouseTable(lighthouseSummary);
  const bundleTable = formatBundleTable(bundleReport);
  const topAssets = formatTopAssets(bundleReport);

  const docsExists = await fs
    .access(docsPath)
    .then(() => true)
    .catch(() => false);
  const docsLink = docsExists ? `See [preview report guidelines](${docsPath}).` : '';

  const body = `<!-- preview-report -->\n## ⚡ Preview performance snapshot\n\n### Lighthouse (avg of ${
    lighthouseSummary?.count ?? 0
  } runs)\n${lighthouseTable}\n\n### Bundle size (brotli)\n${bundleTable}\n\n**Top bundled assets**\n${topAssets}\n\n${docsLink}\n`;

  await fs.writeFile(outputPath, body, 'utf8');
}

main().catch((error) => {
  console.error('Failed to compose preview comment:', error);
  process.exitCode = 1;
});
