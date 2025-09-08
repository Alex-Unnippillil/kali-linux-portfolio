import fs from 'node:fs';
import path from 'node:path';

// Budget thresholds for client bundle chunks are defined in bundle-budgets.json.
// CI uses this script to enforce those limits after a build.
const budgets = JSON.parse(
  fs.readFileSync(new URL('../bundle-budgets.json', import.meta.url), 'utf8'),
);
const statsPath = path.join(process.cwd(), '.next', 'analyze', 'client.json');
const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

const assets = stats.assets || [];
const failures = [];

for (const [pattern, limit] of Object.entries(budgets)) {
  const regex = new RegExp(pattern);
  const matches = assets.filter(
    (a) => regex.test(a.name) && a.name.endsWith('.js'),
  );
  if (matches.length === 0) {
    console.warn(`No asset matching pattern ${pattern}`);
    continue;
  }
  for (const match of matches) {
    const size = match.size;
    if (size > limit) {
      failures.push({ name: match.name, size, limit });
    } else {
      console.log(
        `Asset ${match.name} (${size} bytes) within budget (${limit} bytes)`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error('Bundle budget thresholds exceeded for:');
  for (const { name, size, limit } of failures) {
    console.error(`- ${name} (${size} bytes > ${limit} bytes)`);
  }
  process.exit(1);
} else {
  console.log('All bundle budgets satisfied.');
}
