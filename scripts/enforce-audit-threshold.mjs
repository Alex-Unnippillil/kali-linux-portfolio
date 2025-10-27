#!/usr/bin/env node
const severityOrder = ['info', 'low', 'moderate', 'high', 'critical'];

const [highest, threshold] = process.argv.slice(2).map((value) => (value ?? '').toLowerCase());

if (!threshold) {
  console.error('Usage: node scripts/enforce-audit-threshold.mjs <highest-severity> <threshold>');
  process.exit(1);
}

if (!severityOrder.includes(threshold)) {
  console.error(`Unknown severity threshold "${threshold}". Expected one of: ${severityOrder.join(', ')}`);
  process.exit(1);
}

if (!highest || highest === 'none') {
  console.log('No vulnerabilities detected.');
  process.exit(0);
}

if (!severityOrder.includes(highest)) {
  console.warn(`Highest severity "${highest}" is not recognized. Treating as failure.`);
  process.exit(1);
}

const highestIndex = severityOrder.indexOf(highest);
const thresholdIndex = severityOrder.indexOf(threshold);

if (highestIndex >= thresholdIndex) {
  console.error(
    `npm audit detected ${highest.toUpperCase()} vulnerabilities which meet or exceed the threshold (${threshold.toUpperCase()}).`,
  );
  process.exit(1);
}

console.log(
  `npm audit highest severity ${highest.toUpperCase()} is below the enforcement threshold (${threshold.toUpperCase()}).`,
);
