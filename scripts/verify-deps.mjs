import { spawnSync } from 'node:child_process';
import path from 'node:path';

const stripAnsi = (value) =>
  typeof value === 'string' ? value.replace(/\u001B\[[0-9;]*m/g, '') : '';

const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    const error = new Error(`${cmd} ${args.join(' ')} exited with code ${result.status}`);
    error.code = result.status ?? 1;
    throw error;
  }
};

const runInstallCheck = () => {
  const primary = spawnSync('yarn', ['install', '--check-files'], {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (primary.status === 0) {
    if (primary.stdout) {
      process.stdout.write(primary.stdout);
    }
    if (primary.stderr) {
      process.stderr.write(primary.stderr);
    }
    return;
  }

  const unsupportedFlag = stripAnsi(primary.stdout).includes('Unsupported option name ("--check-files")') ||
    stripAnsi(primary.stderr).includes('Unsupported option name ("--check-files")');

  if (!unsupportedFlag) {
    if (primary.stdout) {
      process.stdout.write(primary.stdout);
    }
    if (primary.stderr) {
      process.stderr.write(primary.stderr);
    }
    const error = new Error('yarn install --check-files failed');
    error.code = primary.status ?? 1;
    throw error;
  }

  console.log('`yarn install --check-files` is unavailable in this Yarn release; falling back to Berry immutable checks.');
  run('yarn', ['install', '--immutable', '--immutable-cache', '--check-cache']);
};

try {
  runInstallCheck();
  run('yarn', ['tsc', '--noEmit']);
  run('yarn', ['lint']);

  const nextBinary = path.join(
    process.cwd(),
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'next.cmd' : 'next',
  );
  run(nextBinary, ['build']);

  run('yarn', ['npm', 'audit', '--severity', 'high']);
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exit(error?.code ?? 1);
}
