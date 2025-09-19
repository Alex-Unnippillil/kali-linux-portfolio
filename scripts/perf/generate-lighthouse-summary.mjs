#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [reportPath, summaryPath, jsonPath] = process.argv.slice(2);

if (!reportPath || !summaryPath || !jsonPath) {
  console.error('Usage: node generate-lighthouse-summary.mjs <report.json> <summary.md> <summary.json>');
  process.exit(1);
}

function readReport(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read Lighthouse report at ${filePath}:`, error);
    process.exit(1);
  }
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.-]+/g, '');
    if (normalized.length === 0) return Number.NaN;
    return Number.parseFloat(normalized);
  }
  return Number.NaN;
}

function formatMs(value) {
  if (!Number.isFinite(value)) return 'n/a';
  return `${Math.round(value)} ms`;
}

function formatKb(value) {
  if (!Number.isFinite(value)) return 'n/a';
  return `${Math.round(value)} KB`;
}

const report = readReport(reportPath);
const categories = report.categories ?? {};

const metricsConfig = [
  { id: 'first-contentful-paint', label: 'First Contentful Paint', formatter: formatMs },
  { id: 'largest-contentful-paint', label: 'Largest Contentful Paint', formatter: formatMs },
  { id: 'speed-index', label: 'Speed Index', formatter: formatMs },
  { id: 'total-blocking-time', label: 'Total Blocking Time', formatter: formatMs },
  { id: 'interactive', label: 'Time to Interactive', formatter: formatMs },
  { id: 'cumulative-layout-shift', label: 'Cumulative Layout Shift', formatter: (value) => (Number.isFinite(value) ? value.toFixed(3) : 'n/a') },
];

const metrics = metricsConfig
  .map((metric) => {
    const audit = report.audits?.[metric.id];
    const numericValue = audit && typeof audit.numericValue === 'number' ? audit.numericValue : Number.NaN;
    return {
      id: metric.id,
      label: metric.label,
      rawValue: numericValue,
      displayValue: metric.formatter(numericValue),
    };
  })
  .filter((metric) => metric.rawValue || metric.displayValue !== 'n/a');

const performanceScoreRaw = categories.performance?.score;
const performanceScore = typeof performanceScoreRaw === 'number' ? Math.round(performanceScoreRaw * 100) : null;

function evaluateBudget(auditId, { label, unitFormatter, overBudgetKey }) {
  const audit = report.audits?.[auditId];
  if (!audit) {
    return {
      id: auditId,
      label,
      status: 'error',
      message: `Missing Lighthouse audit: ${auditId}`,
      items: [],
    };
  }

  if (audit.scoreDisplayMode === 'notApplicable') {
    return {
      id: auditId,
      label,
      status: 'error',
      message: 'Audit was marked not applicable. Check your budgets configuration.',
      items: [],
    };
  }

  const items = Array.isArray(audit.details?.items) ? audit.details.items : [];
  const normalizedItems = items.map((item) => {
    const budget = parseNumber(item.budget ?? item.budgetMiB ?? item.budgetMs);
    const actual = parseNumber(item.usage ?? item.actual ?? item.value);
    const overBudget = parseNumber(item[overBudgetKey] ?? item.overBudget ?? item.overBudgetMs);
    const identifier = item.resourceType || item.metric || item.label || item.url || 'unknown';
    return {
      identifier,
      budget,
      actual,
      overBudget,
      displayBudget: unitFormatter(budget),
      displayActual: unitFormatter(actual),
      displayOverBudget: unitFormatter(overBudget),
    };
  });

  const failingItems = normalizedItems.filter((item) => Number.isFinite(item.overBudget) && item.overBudget > 0);
  const status = failingItems.length > 0 || audit.score === 0 ? 'fail' : 'pass';

  return {
    id: auditId,
    label,
    status,
    message: failingItems.length ? `${failingItems.length} budget${failingItems.length > 1 ? 's' : ''} exceeded.` : undefined,
    items: normalizedItems,
    failingItems,
  };
}

const performanceBudget = evaluateBudget('performance-budget', {
  label: 'Resource budgets',
  unitFormatter: formatKb,
  overBudgetKey: 'overBudget',
});

const timingBudget = evaluateBudget('timing-budget', {
  label: 'Timing budgets',
  unitFormatter: formatMs,
  overBudgetKey: 'overBudgetMs',
});

const budgetResults = [performanceBudget, timingBudget];
const runtimeErrors = [];

if (report.runtimeError && report.runtimeError.message) {
  runtimeErrors.push(report.runtimeError.message);
}

const runWarnings = Array.isArray(report.runWarnings) ? report.runWarnings : [];

const hasBudgetFailures = budgetResults.some((result) => result.status === 'fail' || result.status === 'error');
const hasRuntimeErrors = runtimeErrors.length > 0;
const hasWarnings = runWarnings.length > 0;

let summary = '# Lighthouse performance gate\n\n';

if (performanceScore !== null) {
  summary += `- **Performance score:** ${performanceScore}/100\n`;
}

if (metrics.length > 0) {
  summary += '\n## Key metrics\n\n';
  summary += '| Metric | Value |\n';
  summary += '| --- | --- |\n';
  for (const metric of metrics) {
    summary += `| ${metric.label} | ${metric.displayValue} |\n`;
  }
}

summary += '\n## Budget checks\n\n';
for (const result of budgetResults) {
  if (result.status === 'pass') {
    summary += `- ✅ ${result.label} met\n`;
  } else if (result.status === 'fail') {
    summary += `- ❌ ${result.label} exceeded\n`;
    for (const item of result.failingItems) {
      summary += `  - ${item.identifier}: ${item.displayActual} (budget ${item.displayBudget})\n`;
    }
  } else {
    summary += `- ⚠️ ${result.label}: ${result.message ?? 'Audit unavailable'}\n`;
  }
}

if (hasRuntimeErrors || hasWarnings) {
  summary += '\n## Alerts\n\n';
  for (const warning of runWarnings) {
    summary += `- ⚠️ ${warning}\n`;
  }
  for (const error of runtimeErrors) {
    summary += `- ❌ ${error}\n`;
  }
}

summary += '\nArtifacts include the HTML report, JSON payload, trace, and summary JSON.\n';

ensureDir(summaryPath);
ensureDir(jsonPath);
fs.writeFileSync(summaryPath, summary, 'utf8');

const output = {
  performanceScore,
  metrics,
  budgets: budgetResults.map((result) => ({
    id: result.id,
    label: result.label,
    status: result.status,
    message: result.message,
    failingItems: result.failingItems?.map((item) => ({
      identifier: item.identifier,
      budget: item.budget,
      actual: item.actual,
      overBudget: item.overBudget,
    })) ?? [],
  })),
  warnings: runWarnings,
  runtimeErrors,
};

fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));

if (hasBudgetFailures || hasRuntimeErrors) {
  process.exitCode = 1;
}
