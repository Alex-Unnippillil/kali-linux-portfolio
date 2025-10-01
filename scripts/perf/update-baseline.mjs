#!/usr/bin/env node
import { rm, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';
import { execFile } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');
const captureDir = path.join(repoRoot, 'e2e', 'perf', '.captures');

await rm(captureDir, { recursive: true, force: true });
await mkdir(captureDir, { recursive: true });

const exitCode = await runPlaywright(captureDir);
if (exitCode !== 0) {
  process.exit(exitCode);
}

const scenarioFiles = (await readdir(captureDir)).filter((file) => file.endsWith('.json')).sort();
if (!scenarioFiles.length) {
  console.warn('No capture files were produced. Did the performance tests run?');
  process.exit(1);
}

const budgetsPath = path.join(repoRoot, 'e2e', 'perf', 'budgets.json');
const historyPath = path.join(repoRoot, 'e2e', 'perf', 'history.json');

const budgets = JSON.parse(await readFile(budgetsPath, 'utf-8'));
const history = JSON.parse(await readFile(historyPath, 'utf-8'));

const runRecord = {
  timestamp: new Date().toISOString(),
  gitRef: await getGitRef(),
  scenarios: {},
};

for (const fileName of scenarioFiles) {
  const filePath = path.join(captureDir, fileName);
  const payload = JSON.parse(await readFile(filePath, 'utf-8'));
  const scenarioId = payload.scenario;
  const scenarioBudget = budgets.scenarios?.[scenarioId];
  if (!scenarioBudget) {
    console.warn(`Skipping ${scenarioId} because it is not defined in budgets.json`);
    continue;
  }

  runRecord.scenarios[scenarioId] = payload.metrics;

  for (const [metricName, metricValue] of Object.entries(payload.metrics)) {
    if (!scenarioBudget.metrics[metricName]) continue;
    scenarioBudget.metrics[metricName].baseline = Number(metricValue);
  }
}

history.runs = Array.isArray(history.runs) ? history.runs : [];
history.runs.push(runRecord);

await writeFile(budgetsPath, `${JSON.stringify(budgets, null, 2)}\n`, 'utf-8');
await writeFile(historyPath, `${JSON.stringify(history, null, 2)}\n`, 'utf-8');

console.log('Updated performance baselines and history.');
console.log('Run `yarn perf:report` to refresh the markdown dashboard.');

async function runPlaywright(captureDirPath) {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = ['playwright', 'test', '--project=perf'];
  const env = { ...process.env, PERF_CAPTURE_PATH: captureDirPath };

  return await new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env,
      stdio: 'inherit',
    });

    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', (error) => {
      console.error('Failed to launch Playwright:', error);
      resolve(1);
    });
  });
}

async function getGitRef() {
  try {
    const commit = await execFileAsync('git', ['rev-parse', '--short', 'HEAD']);
    return commit.trim();
  } catch (error) {
    console.warn('Unable to read git ref:', error);
    return 'unknown';
  }
}

async function execFileAsync(command, args) {
  return await new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { cwd: repoRoot },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      },
    );
  });
}
