import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import reportLib from './module-report-lib.js';

const { aggregateStats, evaluateBudgets, buildMarkdownReport } = reportLib;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePathFromCwd(relativePath) {
  return path.resolve(process.cwd(), relativePath);
}

function parseArgs(argv) {
  const defaults = {
    statsDir: resolvePathFromCwd('.next/analyze'),
    budgetsPath: path.join(__dirname, 'module-budgets.json'),
    markdownPath: null,
    jsonPath: null,
  };

  const args = { ...defaults };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--stats' || token === '--stats-dir') {
      args.statsDir = resolvePathFromCwd(argv[++i]);
    } else if (token === '--budgets') {
      args.budgetsPath = resolvePathFromCwd(argv[++i]);
    } else if (token === '--markdown') {
      args.markdownPath = resolvePathFromCwd(argv[++i]);
    } else if (token === '--json') {
      args.jsonPath = resolvePathFromCwd(argv[++i]);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

async function loadJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function ensureExists(filePath, description) {
  try {
    await fs.access(filePath);
  } catch (error) {
    throw new Error(`${description} not found at ${filePath}`);
  }
}

async function writeIfPath(content, targetPath) {
  if (!targetPath) return;
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await ensureExists(args.statsDir, 'Analyzer output directory');
  await ensureExists(args.budgetsPath, 'Budget configuration');

  const budgets = await loadJson(args.budgetsPath);
  const targets = Object.keys(budgets);

  if (targets.length === 0) {
    throw new Error('No budgets defined.');
  }

  const results = [];

  for (const target of targets) {
    const statsPath = path.join(args.statsDir, `${target}.json`);
    await ensureExists(statsPath, `Stats file for ${target}`);
    const stats = await loadJson(statsPath);
    const metrics = aggregateStats(stats);
    const budgetResults = evaluateBudgets(metrics, budgets[target]);
    results.push({ target, metrics, budgetResults });
  }

  const markdown = buildMarkdownReport(results);
  console.log(markdown);

  await writeIfPath(markdown, args.markdownPath);
  if (args.jsonPath) {
    await writeIfPath(`${JSON.stringify(results, null, 2)}\n`, args.jsonPath);
  }

  const hasFailures = results.some(({ budgetResults }) =>
    budgetResults.some((entry) => !entry.pass),
  );

  if (hasFailures) {
    console.error('Module budgets exceeded. See report above for details.');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
