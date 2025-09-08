import fs from 'node:fs';
import path from 'node:path';

const budgets = JSON.parse(
  fs.readFileSync(new URL('../bundle-budgets.json', import.meta.url), 'utf8'),
);
const statsPath = path.join(process.cwd(), '.next', 'analyze', 'client.json');
if (!fs.existsSync(statsPath)) {
  console.error('Missing build stats at .next/analyze/client.json. Run `ANALYZE=true yarn build` first.');
  process.exit(1);
}
const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

const assets = stats.assets || [];
let failed = false;

for (const [pattern, limit] of Object.entries(budgets)) {
  const regex = new RegExp(pattern);
  const match = assets.find((a) => regex.test(a.name));
  if (!match) {
    console.warn(`No asset matching pattern ${pattern}`);
    continue;
  }
  const size = match.size;
  if (size > limit) {
    console.error(`Asset ${match.name} (${size} bytes) exceeds budget of ${limit} bytes`);
    failed = true;
  } else {
    console.log(`Asset ${match.name} (${size} bytes) within budget (${limit} bytes)`);
  }
}

if (failed) {
  process.exit(1);
}
