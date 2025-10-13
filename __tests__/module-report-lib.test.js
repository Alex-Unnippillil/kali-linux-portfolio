const {
  aggregateStats,
  evaluateBudgets,
  buildMarkdownReport,
  formatBytes,
} = require('../scripts/module-report-lib.js');

describe('module-report-lib', () => {
  const sampleStats = [
    {
      label: 'chunks/app.js',
      isAsset: true,
      statSize: 1500,
      parsedSize: 1000,
      gzipSize: 400,
      isInitialByEntrypoint: { main: true },
    },
    {
      label: 'chunks/vendor.js',
      isAsset: true,
      statSize: 800,
      parsedSize: 600,
      gzipSize: 200,
      isInitialByEntrypoint: {},
    },
    {
      label: 'some-module',
      isAsset: false,
      statSize: 500,
      parsedSize: 300,
      gzipSize: 100,
      isInitialByEntrypoint: {},
    },
  ];

  test('aggregateStats computes totals and top assets', () => {
    const metrics = aggregateStats(sampleStats, { topAssets: 2 });
    expect(metrics.assetsCount).toBe(2);
    expect(metrics.initialAssetsCount).toBe(1);
    expect(metrics.total.parsedSize).toBe(1600);
    expect(metrics.total.gzipSize).toBe(600);
    expect(metrics.initial.parsedSize).toBe(1000);
    expect(metrics.largestAssets).toHaveLength(2);
    expect(metrics.largestAssets[0]).toMatchObject({
      label: 'chunks/app.js',
      parsedSize: 1000,
      isInitial: true,
    });
  });

  test('evaluateBudgets reports pass and fail states', () => {
    const metrics = aggregateStats(sampleStats);
    const budgetResults = evaluateBudgets(metrics, {
      maxTotalParsedBytes: 1500,
      maxInitialParsedBytes: 1200,
    });
    const parsedBudget = budgetResults.find((entry) => entry.key === 'maxTotalParsedBytes');
    const initialBudget = budgetResults.find((entry) => entry.key === 'maxInitialParsedBytes');
    expect(parsedBudget).toMatchObject({
      pass: false,
      actual: 1600,
      limit: 1500,
    });
    expect(initialBudget).toMatchObject({
      pass: true,
      actual: 1000,
      limit: 1200,
    });
  });

  test('buildMarkdownReport renders summary and details', () => {
    const metrics = aggregateStats(sampleStats);
    const budgetResults = evaluateBudgets(metrics, {
      maxTotalParsedBytes: 2000,
      maxInitialParsedBytes: 1500,
    });
    const markdown = buildMarkdownReport([
      { target: 'client', metrics, budgetResults },
    ]);
    expect(markdown).toContain('## Module size report');
    expect(markdown).toContain('| client |');
    expect(markdown).toContain('✅');
    expect(markdown).toContain('chunks/app.js');
  });

  test('formatBytes produces human readable output', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
  });
});
