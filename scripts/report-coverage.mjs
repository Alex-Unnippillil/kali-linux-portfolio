#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const coverageDir = path.join(rootDir, 'coverage');
const coverageSummaryFile = path.join(coverageDir, 'coverage-summary.json');
const packagesConfigPath = path.join(rootDir, 'coverage-packages.json');

const marker = '<!-- coverage-summary -->';

async function loadCoverage() {
  try {
    const raw = await fs.readFile(coverageSummaryFile, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
        ? 'Coverage summary not found. Run `yarn test --coverage` before generating the summary.'
        : 'Failed to read coverage data';
    throw new Error(`${message}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function loadPackages() {
  const raw = await fs.readFile(packagesConfigPath, 'utf8');
  return JSON.parse(raw);
}

function formatPercent(covered, total) {
  if (!total) return '100.00%';
  return `${((covered / total) * 100).toFixed(2)}%`;
}

function buildTable(rows) {
  const header = ['Package', 'Branch %', 'Line %', 'Branches', 'Lines', 'Status'];
  const divider = header.map(() => '---');
  const lines = [header, divider, ...rows];
  return lines.map(row => `| ${row.join(' | ')} |`).join('\n');
}

async function writeSummary(markdown) {
  await fs.mkdir(coverageDir, { recursive: true });
  const summaryPath = path.join(coverageDir, 'coverage-summary.md');
  await fs.writeFile(summaryPath, markdown, 'utf8');
  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  }
  if (process.env.GITHUB_OUTPUT) {
    const output = `coverage_markdown<<'EOF'\n${markdown}\nEOF\n`;
    await fs.appendFile(process.env.GITHUB_OUTPUT, output);
  }
  return summaryPath;
}

async function main() {
  const [coverageData, packages] = await Promise.all([loadCoverage(), loadPackages()]);

  const rows = packages.map(pkg => {
    const normalizedDir = pkg.directory.replace(/\\/g, '/');
    let branchCovered = 0;
    let branchTotal = 0;
    let lineCovered = 0;
    let lineTotal = 0;

    for (const [filePath, metrics] of Object.entries(coverageData)) {
      if (filePath === 'total') continue;
      const relative = path.relative(rootDir, filePath).replace(/\\/g, '/');
      if (!relative.startsWith(`${normalizedDir}/`)) continue;
      const fileBranches = metrics.branches ?? { covered: 0, total: 0 };
      const fileLines = metrics.lines ?? { covered: 0, total: 0 };
      branchCovered += fileBranches.covered ?? 0;
      branchTotal += fileBranches.total ?? 0;
      lineCovered += fileLines.covered ?? 0;
      lineTotal += fileLines.total ?? 0;
    }

    const branchPct = branchTotal ? (branchCovered / branchTotal) * 100 : 100;
    const linePct = lineTotal ? (lineCovered / lineTotal) * 100 : 100;
    const passes = branchPct >= pkg.threshold && linePct >= pkg.threshold;
    const status = passes ? '✅' : '❌';

    return [
      pkg.name,
      formatPercent(branchCovered, branchTotal),
      formatPercent(lineCovered, lineTotal),
      `${branchCovered}/${branchTotal}`,
      `${lineCovered}/${lineTotal}`,
      status,
    ];
  });

  const markdown = `${marker}\n## Coverage summary\n\n${buildTable(rows)}\n`;
  const summaryPath = await writeSummary(markdown);
  console.log(`Coverage summary written to ${summaryPath}`);
  console.log('\n' + markdown);
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
