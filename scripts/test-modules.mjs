import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIN_NODE_MAJOR = 22;
const nodeVersion = process.versions.node;
const detectedMajor = Number.parseInt(nodeVersion.split('.')[0], 10);

if (Number.isNaN(detectedMajor) || detectedMajor < MIN_NODE_MAJOR) {
  console.error(`node --run requires Node.js ${MIN_NODE_MAJOR}+; detected ${nodeVersion}`);
  process.exitCode = 1;
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

const SAMPLE_SCRIPTS = [
  { name: 'modules:boundary', description: 'ESM/CommonJS boundary smoke test' },
  { name: 'modules:manifest-check', description: 'TypeScript module transpilation smoke test' },
];

const LOG_DIR = path.join(repoRoot, 'test-results', 'module-tests');
const BUILD_LOG_PATH = path.join(LOG_DIR, 'next-build.log');
const MODULE_WARNING_PATTERNS = [
  /Module Warning/i,
  /Module not found/i,
  /Module parse failed/i,
  /Module build failed/i,
];

const runCommand = (command, args = []) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`${command} ${args.join(' ')} exited with code ${code}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });

const runNodeRun = async (scriptName, description, extraArgs = []) => {
  console.log(`\n▶ node --run ${scriptName} (${description})`);
  await runCommand(process.execPath, ['--run', scriptName, ...extraArgs]);
};

const runNextBuild = async () => {
  console.log('\n▶ next build (capturing output)');
  await fs.mkdir(LOG_DIR, { recursive: true });
  await fs.rm(BUILD_LOG_PATH, { force: true });

  const nextBin = path.join(repoRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  const { stdout, stderr } = await runCommand(process.execPath, [nextBin, 'build']);
  const combinedLog = `${stdout}${stderr}`;
  await fs.writeFile(BUILD_LOG_PATH, combinedLog, 'utf8');

  const matched = MODULE_WARNING_PATTERNS.filter((pattern) => pattern.test(combinedLog));
  if (matched.length > 0) {
    const summary = matched.map((pattern) => pattern.toString()).join(', ');
    throw new Error(
      `next build emitted module warnings matching: ${summary}. See ${path.relative(repoRoot, BUILD_LOG_PATH)}`,
    );
  }

  console.log(`next build completed without module warnings. Log saved to ${path.relative(repoRoot, BUILD_LOG_PATH)}`);
};

const main = async () => {
  for (const { name, description } of SAMPLE_SCRIPTS) {
    await runNodeRun(name, description);
  }

  await runNextBuild();
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
