const DEFAULT_TOP_ASSETS = 5;

const BUDGET_KEY_MAP = {
  maxTotalStatBytes: { section: 'total', field: 'statSize', label: 'Total stat size' },
  maxTotalParsedBytes: { section: 'total', field: 'parsedSize', label: 'Total parsed size' },
  maxTotalGzipBytes: { section: 'total', field: 'gzipSize', label: 'Total gzip size' },
  maxInitialStatBytes: { section: 'initial', field: 'statSize', label: 'Initial stat size' },
  maxInitialParsedBytes: { section: 'initial', field: 'parsedSize', label: 'Initial parsed size' },
  maxInitialGzipBytes: { section: 'initial', field: 'gzipSize', label: 'Initial gzip size' },
};

const sumField = (items, field) =>
  items.reduce((total, item) => total + Number(item?.[field] ?? 0), 0);

const isInitialAsset = (asset) =>
  Object.values(asset?.isInitialByEntrypoint || {}).some(Boolean);

function aggregateStats(stats, { topAssets = DEFAULT_TOP_ASSETS } = {}) {
  if (!Array.isArray(stats)) {
    throw new TypeError('Expected stats to be an array.');
  }

  const assets = stats.filter((entry) => entry?.isAsset);
  const initialAssets = assets.filter(isInitialAsset);

  const buildTotals = (items) => ({
    statSize: sumField(items, 'statSize'),
    parsedSize: sumField(items, 'parsedSize'),
    gzipSize: sumField(items, 'gzipSize'),
  });

  const largestAssets = assets
    .map((asset) => ({
      label: asset.label,
      statSize: Number(asset.statSize ?? 0),
      parsedSize: Number(asset.parsedSize ?? 0),
      gzipSize: Number(asset.gzipSize ?? 0),
      isInitial: isInitialAsset(asset),
    }))
    .sort((a, b) => b.parsedSize - a.parsedSize)
    .slice(0, topAssets);

  return {
    assetsCount: assets.length,
    initialAssetsCount: initialAssets.length,
    total: buildTotals(assets),
    initial: buildTotals(initialAssets),
    largestAssets,
  };
}

function evaluateBudgets(metrics, budgets, budgetKeyMap = BUDGET_KEY_MAP) {
  if (!budgets) {
    return [];
  }

  return Object.entries(budgets)
    .filter(([key]) => budgetKeyMap[key])
    .map(([key, limit]) => {
      const { section, field, label } = budgetKeyMap[key];
      const actual = metrics?.[section]?.[field] ?? 0;
      return {
        key,
        label,
        limit: Number(limit),
        actual: Number(actual),
        pass: Number(actual) <= Number(limit),
      };
    });
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  let digits;
  if (Number.isInteger(value) || value >= 100 || unitIndex === 0) {
    digits = 0;
  } else if (value >= 1) {
    digits = 1;
  } else {
    digits = 2;
  }
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function formatTableValue(bytes) {
  return formatBytes(bytes).replace(' ', '\u00a0');
}

function buildMarkdownReport(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return 'No module data available.';
  }

  const header =
    '| Target | Total parsed | Total gzip | Initial parsed | Initial gzip | Status |\n| --- | --- | --- | --- | --- | --- |';

  const summaryRows = results
    .map(({ target, metrics, budgetResults = [] }) => {
      const status = budgetResults.some((entry) => !entry.pass)
        ? '❌ Over budget'
        : '✅ Within budget';
      const totalParsed = formatTableValue(metrics.total.parsedSize);
      const totalGzip = formatTableValue(metrics.total.gzipSize);
      const initialParsed = formatTableValue(metrics.initial.parsedSize);
      const initialGzip = formatTableValue(metrics.initial.gzipSize);
      return `| ${target} | ${totalParsed} | ${totalGzip} | ${initialParsed} | ${initialGzip} | ${status} |`;
    })
    .join('\n');

  const detailSections = results
    .map(({ target, metrics, budgetResults = [] }) => {
      const budgetLines = budgetResults.length
        ? budgetResults
            .map((entry) => {
              const comparison = `${formatBytes(entry.actual)} / ${formatBytes(entry.limit)}`;
              return `${entry.pass ? '✅' : '❌'} ${entry.label}: ${comparison}`;
            })
            .join('\n')
        : 'No budget thresholds defined.';

      const assetLines = metrics.largestAssets.length
        ? metrics.largestAssets
            .map((asset) => {
              const initialPrefix = asset.isInitial ? '**(initial)** ' : '';
              const parsed = formatBytes(asset.parsedSize);
              const gzip = formatBytes(asset.gzipSize);
              return `- ${initialPrefix}\`${asset.label}\` — ${parsed} parsed (${gzip} gzip)`;
            })
            .join('\n')
        : 'No assets found.';

      return `\n### ${target}\n\n**Budgets**\n\n${budgetLines}\n\n**Largest assets**\n\n${assetLines}`;
    })
    .join('\n');

  return `## Module size report\n\n${header}\n${summaryRows}${detailSections}\n`;
}

module.exports = {
  aggregateStats,
  evaluateBudgets,
  buildMarkdownReport,
  formatBytes,
  formatTableValue,
  BUDGET_KEY_MAP,
};
