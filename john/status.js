#!/usr/bin/env node

function renderProgressBar(completed, total) {
  const percent = total === 0 ? 0 : (completed / total);
  const barLength = 20;
  const filled = Math.round(barLength * percent);
  const bar = '█'.repeat(filled) + '-'.repeat(barLength - filled);
  return { percent: (percent * 100).toFixed(2), bar };
}

function main() {
  const [completedStr, totalStr] = process.argv.slice(2);
  if (!completedStr || !totalStr) {
    console.error('Usage: node john/status.js <completed> <total>');
    process.exit(1);
  }
  const completed = Number(completedStr);
  const total = Number(totalStr);
  if (Number.isNaN(completed) || Number.isNaN(total)) {
    console.error('Both completed and total must be numbers');
    process.exit(1);
  }
  const { percent, bar } = renderProgressBar(completed, total);
  console.log(`Progress: ${percent}% [${bar}]`);
}

if (require.main === module) {
  main();
}
