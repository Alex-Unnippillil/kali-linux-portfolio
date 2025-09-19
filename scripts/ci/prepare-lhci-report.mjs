import fs from 'fs/promises';
import path from 'path';

const [manifestArg, assertionsArg, outputArg] = process.argv.slice(2);
const manifestPath = path.resolve(manifestArg ?? '.lighthouseci/manifest.json');
const assertionsPath = path.resolve(assertionsArg ?? '.lighthouseci/assertion-results.json');
const outputPath = path.resolve(outputArg ?? 'lhci-summary.md');

const readJsonIfAvailable = async (filePath) => {
  try {
    const contents = await fs.readFile(filePath, 'utf8');
    return JSON.parse(contents);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const formatRoute = (value) => {
  if (!value) {
    return 'unknown route';
  }
  try {
    const url = new URL(value);
    const suffix = `${url.search}${url.hash}`;
    return `${url.pathname}${suffix}` || '/';
  } catch (error) {
    return value;
  }
};

const formatScore = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${Math.round(value * 100)}`;
  }
  return '—';
};

const formatSeconds = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return (value / 1000).toFixed(2);
  }
  return '—';
};

const formatCls = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(2);
  }
  return '—';
};

const manifest = await readJsonIfAvailable(manifestPath);
const manifestEntries = Array.isArray(manifest) ? manifest : [];
const baseDir = path.dirname(manifestPath);

const collectEntriesFromManifest = async () => {
  if (!manifestEntries.length) {
    return [];
  }

  const useRepresentativeRuns = manifestEntries.some((entry) => entry.isRepresentativeRun === true);
  const relevantEntries = useRepresentativeRuns
    ? manifestEntries.filter((entry) => entry.isRepresentativeRun)
    : manifestEntries;

  const entries = [];
  for (const entry of relevantEntries) {
    const jsonPath = entry.jsonPath || entry.lhr || entry.path;
    if (!jsonPath) {
      continue;
    }
    const resolvedPath = path.resolve(jsonPath);
    const lhr = await readJsonIfAvailable(resolvedPath);
    if (!lhr) {
      continue;
    }
    entries.push({
      route: formatRoute(entry.url || lhr.requestedUrl),
      performance: entry.summary?.performance ?? lhr.categories?.performance?.score ?? null,
      lcp: lhr.audits?.['largest-contentful-paint']?.numericValue ?? null,
      tti: lhr.audits?.interactive?.numericValue ?? null,
      cls: lhr.audits?.['cumulative-layout-shift']?.numericValue ?? null,
    });
  }
  return entries;
};

const collectEntriesFromDirectory = async () => {
  const entries = [];
  let files = [];
  try {
    files = await fs.readdir(baseDir);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return entries;
    }
    throw error;
  }

  for (const file of files) {
    if (!/^lhr-\d+\.json$/.test(file)) {
      continue;
    }
    const resolvedPath = path.join(baseDir, file);
    const lhr = await readJsonIfAvailable(resolvedPath);
    if (!lhr) {
      continue;
    }
    entries.push({
      route: formatRoute(lhr.requestedUrl),
      performance: lhr.categories?.performance?.score ?? null,
      lcp: lhr.audits?.['largest-contentful-paint']?.numericValue ?? null,
      tti: lhr.audits?.interactive?.numericValue ?? null,
      cls: lhr.audits?.['cumulative-layout-shift']?.numericValue ?? null,
    });
  }
  return entries;
};

const lighthouseEntries = [
  ...(await collectEntriesFromManifest()),
  ...(await collectEntriesFromDirectory()),
];

const dedupedEntries = new Map();
for (const entry of lighthouseEntries) {
  if (!dedupedEntries.has(entry.route)) {
    dedupedEntries.set(entry.route, entry);
  }
}

const rows = Array.from(dedupedEntries.values()).sort((a, b) => a.route.localeCompare(b.route));

const assertionResultsRaw = await readJsonIfAvailable(assertionsPath);
const assertionResults = Array.isArray(assertionResultsRaw) ? assertionResultsRaw : [];
const warningResults = assertionResults.filter((result) => result && !result.passed && result.level === 'warn');

const assertOutcome = (process.env.LHCI_ASSERT_OUTCOME || '').toLowerCase();
let assertionStatus = 'ℹ️ Lighthouse assertions were not executed';
if (assertOutcome === 'success') {
  assertionStatus = '✅ Lighthouse assertions passed';
} else if (assertOutcome === 'failure') {
  assertionStatus = '❌ Lighthouse assertions failed';
}

const warningStatus = warningResults.length
  ? `⚠️ Lighthouse emitted ${warningResults.length} warning${warningResults.length === 1 ? '' : 's'}`
  : '✅ No Lighthouse warnings';

const table = rows.length
  ? [
      '| Route | Perf | LCP (s) | TTI (s) | CLS |',
      '| --- | --- | --- | --- | --- |',
      ...rows.map(
        (entry) =>
          `| ${entry.route} | ${formatScore(entry.performance)} | ${formatSeconds(entry.lcp)} | ${formatSeconds(entry.tti)} | ${formatCls(entry.cls)} |`,
      ),
    ]
  : ['_No Lighthouse results were found._'];

const commentSections = [
  '### Lighthouse (reference routes)',
  '',
  ...table,
  '',
  `- ${assertionStatus}`,
  `- ${warningStatus}`,
  '- Thresholds: **LCP ≤ 2.0 s**, **TTI ≤ 2.5 s**',
  '- Artifacts: Traces saved to the `lighthouse-traces` workflow artifact.',
];

if (warningResults.length) {
  const items = warningResults.slice(0, 5).map((result) => {
    const route = formatRoute(result.url);
    const auditId = result.auditId || result.name || 'unknown-audit';
    const operator = result.operator || '≤';
    const expected =
      typeof result.expected === 'number' && Number.isFinite(result.expected)
        ? result.expected
        : result.expected ?? 'n/a';
    const actual =
      typeof result.actual === 'number' && Number.isFinite(result.actual)
        ? result.actual
        : result.actual ?? 'n/a';
    return `- ⚠️ ${auditId} on ${route} (${actual} ${operator} ${expected})`;
  });
  commentSections.push('');
  commentSections.push('Warnings:');
  commentSections.push(...items);
  if (warningResults.length > items.length) {
    commentSections.push(`- ⚠️ …and ${warningResults.length - items.length} more warning(s).`);
  }
}

const comment = commentSections.join('\n');
await fs.writeFile(outputPath, `${comment}\n`, 'utf8');

if (process.env.GITHUB_STEP_SUMMARY) {
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${comment}\n`);
}

const appendOutput = async (name, value, multiline = false) => {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) {
    return;
  }
  if (multiline) {
    await fs.appendFile(file, `${name}<<'EOF'\n${value}\nEOF\n`);
  } else {
    await fs.appendFile(file, `${name}=${value}\n`);
  }
};

await appendOutput('comment', comment, true);
await appendOutput('had_warnings', warningResults.length > 0 ? 'true' : 'false');
