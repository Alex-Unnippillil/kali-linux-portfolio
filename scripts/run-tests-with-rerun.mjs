import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

function run(command) {
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

function failedTests(resultFile) {
  if (!existsSync(resultFile)) return [];
  const data = JSON.parse(readFileSync(resultFile));
  return data.testResults
    .filter((t) => t.status === 'failed')
    .map((t) => t.name);
}

const initialFile = 'jest-results.json';
run(`npm test -- --json --outputFile=${initialFile}`);
const initialFails = failedTests(initialFile);

const report = { flaky: [], failed: [] };

if (initialFails.length) {
  const rerunFile = 'jest-rerun-results.json';
  const paths = initialFails.map((p) => `"${p}"`).join(' ');
  run(`npm test -- ${paths} --json --outputFile=${rerunFile}`);
  const rerunFails = failedTests(rerunFile);
  report.flaky = initialFails.filter((t) => !rerunFails.includes(t));
  report.failed = rerunFails;
  if (report.failed.length) {
    const qFile = path.resolve('tests', 'quarantine.json');
    let current = [];
    if (existsSync(qFile)) {
      current = JSON.parse(readFileSync(qFile));
    }
    const updated = Array.from(new Set([...current, ...report.failed]));
    writeFileSync(qFile, JSON.stringify(updated, null, 2));
  }
}

writeFileSync('flake-report.json', JSON.stringify(report, null, 2));
if (report.failed.length) {
  process.exitCode = 1;
}
