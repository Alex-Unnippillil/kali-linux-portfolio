import fs from 'fs';
import pa11y from 'pa11y';

const configPath = new URL('../pa11yci.json', import.meta.url);
const { defaults = {}, urls = [], scenarios = [{}] } = JSON.parse(
  fs.readFileSync(configPath),
);

const severityRank = {
  minor: 0,
  moderate: 1,
  serious: 2,
  critical: 3,
};

const getImpact = issue => {
  if (issue.runnerExtras?.impact) {
    return issue.runnerExtras.impact;
  }

  switch (issue.type) {
    case 'error':
      return 'serious';
    case 'warning':
      return 'moderate';
    default:
      return 'minor';
  }
};

(async () => {
  let hasCritical = false;
  for (const url of urls) {
    for (const scenario of scenarios) {
      const options = { ...defaults, ...scenario };
      const label = scenario.label ? ` (${scenario.label})` : '';
      console.log(`Testing ${url}${label}`);
      const results = await pa11y(url, options);

      if (results.issues.length === 0) {
        console.log('  No issues found');
        continue;
      }

      const buckets = new Map();
      for (const issue of results.issues) {
        const impact = getImpact(issue);
        const bucketKey = impact in severityRank ? impact : 'minor';
        if (!buckets.has(bucketKey)) {
          buckets.set(bucketKey, []);
        }
        buckets.get(bucketKey).push(issue);
      }

      const orderedBuckets = Array.from(buckets.entries()).sort(
        (a, b) => (severityRank[b[0]] ?? 0) - (severityRank[a[0]] ?? 0),
      );

      for (const [impact, issues] of orderedBuckets) {
        console.log(`  ${impact.toUpperCase()}: ${issues.length}`);
        for (const issue of issues) {
          console.log(
            `    [${issue.code}] ${issue.message} (${issue.selector})`,
          );
        }
        if (impact === 'critical') {
          hasCritical = true;
        }
      }
    }
  }

  if (hasCritical) {
    console.log('\nCritical accessibility violations detected.');
    process.exitCode = 1;
  }
})();

