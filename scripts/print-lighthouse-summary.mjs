import fs from 'node:fs';
import path from 'node:path';

const thresholds = {
  performance: 0.9,
  accessibility: 0.95,
  'best-practices': 0.95,
  seo: 0.95,
};

const displayNames = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  'best-practices': 'Best Practices',
  seo: 'SEO',
};

const docAnchors = {
  performance: '#performance',
  accessibility: '#accessibility',
  'best-practices': '#best-practices',
  seo: '#seo',
};

const stepOutcome = process.argv[2] ?? 'success';
let exitCode = 0;

const manifestPath = path.resolve('.lighthouseci', 'reports', 'manifest.json');
const assertionPath = path.resolve('.lighthouseci', 'assertion-results.json');

const readJson = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error(`::warning ::Failed to read ${filePath}: ${error.message}`);
    return null;
  }
};

const manifest = readJson(manifestPath);

if (!manifest || !Array.isArray(manifest) || manifest.length === 0) {
  console.error('::warning ::No Lighthouse manifest found. Did the CI step produce reports?');
  process.exit(stepOutcome === 'failure' ? 1 : 0);
}

const representativeRun =
  manifest.find((run) => Boolean(run.isRepresentativeRun)) ?? manifest[0];
const summary = representativeRun.summary ?? {};

console.log('::group::Lighthouse category summary');
for (const [key, target] of Object.entries(thresholds)) {
  const label = displayNames[key] ?? key;
  const score = summary[key];
  if (typeof score !== 'number') {
    console.log(`⚠️ ${label}: score not available`);
    exitCode = Math.max(exitCode, stepOutcome === 'failure' ? 1 : exitCode);
    continue;
  }

  const percentScore = (score * 100).toFixed(1);
  const targetPercent = (target * 100).toFixed(0);
  const passed = score >= target;
  const statusIcon = passed ? '✅' : '❌';
  console.log(`${statusIcon} ${label}: ${percentScore} (target ≥ ${targetPercent})`);

  if (!passed) {
    exitCode = 1;
    const anchor = docAnchors[key] ?? '';
    const docPath = anchor ? `docs/lighthouse-troubleshooting.md${anchor}` : 'docs/lighthouse-troubleshooting.md';
    console.error(
      `::error ::${label} score ${percentScore} is below the ${targetPercent} target. See ${docPath} for remediation ideas.`,
    );
  }
}
console.log('::endgroup::');

if (manifest.length > 1) {
  console.log('::group::All Lighthouse runs');
  manifest.forEach((run, index) => {
    const summaryValues = run.summary ?? {};
    const label = `Run ${index + 1}${run.isRepresentativeRun ? ' (representative)' : ''}`;
    const parts = Object.keys(thresholds).map((key) => {
      const value = summaryValues[key];
      return `${displayNames[key] ?? key}: ${typeof value === 'number' ? (value * 100).toFixed(1) : 'n/a'}`;
    });
    console.log(`${label} → ${parts.join(', ')}`);
  });
  console.log('::endgroup::');
}

const assertionResults = readJson(assertionPath);
if (Array.isArray(assertionResults) && assertionResults.length > 0) {
  console.log('::group::Assertion details');
  assertionResults.forEach((result) => {
    if (!result || typeof result !== 'object') return;
    const categoryKey = result.auditProperty;
    const label = displayNames[categoryKey] ?? result.auditProperty ?? 'Unknown';
    const allValues = Array.isArray(result.values)
      ? result.values.map((value) => (typeof value === 'number' ? (value * 100).toFixed(1) : value)).join(', ')
      : 'n/a';
    console.log(
      `${label} assertion expected ${result.operator} ${
        typeof result.expected === 'number' ? (result.expected * 100).toFixed(0) : result.expected
      } and received values: ${allValues}.`,
    );
  });
  console.log('::endgroup::');
}

if (stepOutcome === 'failure') {
  exitCode = 1;
}

process.exit(exitCode);
