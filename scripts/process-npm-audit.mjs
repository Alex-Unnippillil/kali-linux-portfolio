#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const severityOrder = ['info', 'low', 'moderate', 'high', 'critical'];

const inputPath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : path.resolve('npm-audit.ndjson');
const summaryPath = process.argv[3]
  ? path.resolve(process.cwd(), process.argv[3])
  : path.resolve(process.cwd(), 'npm-audit-summary.md');

const readAuditFile = async () => {
  try {
    const raw = await fs.readFile(inputPath, 'utf8');
    return raw
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          console.warn(`Skipping unparsable audit line: ${error.message}`);
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

const normalizeSeverity = (value) => {
  if (!value) {
    return 'unknown';
  }
  const normalized = String(value).toLowerCase();
  if (severityOrder.includes(normalized)) {
    return normalized;
  }
  return 'unknown';
};

const buildSummaryTable = (vulnerabilities) => {
  if (vulnerabilities.length === 0) {
    return 'No vulnerabilities reported.';
  }

  const header = ['| Package | Severity | Advisory | Affected Versions | URL |', '| --- | --- | --- | --- | --- |'];
  const rows = vulnerabilities.map((item) => {
    const pkg = item.package ?? 'unknown';
    const severity = item.severity ?? 'unknown';
    const advisory = item.id ?? 'n/a';
    const versions = item.range ?? 'n/a';
    const url = item.url ? `[link](${item.url})` : 'n/a';
    return `| ${pkg} | ${severity} | ${advisory} | ${versions} | ${url} |`;
  });
  return header.concat(rows).join('\n');
};

const summarize = async () => {
  const records = await readAuditFile();
  const severityCounts = Object.fromEntries(severityOrder.map((level) => [level, 0]));
  let unknownCount = 0;
  const flattened = [];

  for (const record of records) {
    const details = record.children ?? {};
    const severity = normalizeSeverity(details.Severity ?? details.severity);
    const entry = {
      package: record.value ?? details.Module ?? 'unknown',
      severity,
      id: details.ID ?? details.id ?? 'n/a',
      range: details['Vulnerable Versions'] ?? details.range ?? 'n/a',
      url: details.URL ?? details.url ?? '',
    };
    flattened.push(entry);
    if (severity === 'unknown') {
      unknownCount += 1;
    } else {
      severityCounts[severity] += 1;
    }
  }

  const total = flattened.length;
  const highestSeverity = severityOrder
    .slice()
    .reverse()
    .find((level) => severityCounts[level] > 0)
    ?? (unknownCount > 0 ? 'unknown' : 'none');

  const summaryLines = [];
  summaryLines.push('# npm audit summary');
  summaryLines.push('');
  summaryLines.push(`- Source file: \`${path.relative(process.cwd(), inputPath)}\``);
  summaryLines.push(`- Total vulnerabilities: ${total}`);
  summaryLines.push(
    `- Severity breakdown: ${severityOrder
      .map((level) => `${level}: ${severityCounts[level]}`)
      .join(', ')}${unknownCount ? `, unknown: ${unknownCount}` : ''}`,
  );
  summaryLines.push(`- Highest severity observed: ${highestSeverity}`);
  summaryLines.push('');
  summaryLines.push(buildSummaryTable(flattened));

  await fs.writeFile(summaryPath, `${summaryLines.join('\n')}\n`, 'utf8');

  if (process.env.GITHUB_OUTPUT) {
    await fs.appendFile(
      process.env.GITHUB_OUTPUT,
      `highest_severity=${highestSeverity}\n` +
        `total_vulnerabilities=${total}\n`,
      'utf8',
    );
  }

  console.log(`Wrote npm audit summary to ${summaryPath}`);
  console.log(`Highest severity: ${highestSeverity} (total ${total})`);
};

summarize().catch((error) => {
  console.error('Failed to process npm audit output:', error);
  process.exitCode = 1;
});
