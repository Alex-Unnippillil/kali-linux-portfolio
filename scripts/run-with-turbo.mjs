#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/run-with-turbo.mjs <task> [turbo options] -- <command>');
  process.exit(1);
}

const separatorIndex = args.indexOf('--');
const turboArgs = separatorIndex === -1 ? args : args.slice(0, separatorIndex);
const commandArgs = separatorIndex === -1 ? [] : args.slice(separatorIndex + 1);

const [task, ...taskOptions] = turboArgs;
if (!task) {
  console.error('Missing task name for turborepo invocation.');
  process.exit(1);
}

const inTurbo = Boolean(
  process.env.TURBO_HASH ||
  process.env.TURBO_TASK_ID ||
  process.env.TURBO_RUN_ID ||
  process.env.TURBO_TEAM
);

const runCommand = (command, label) => {
  const result = spawnSync(command, {
    stdio: 'inherit',
    shell: true,
    env: process.env
  });

  if (result.error) {
    console.error(`Failed to run ${label}:`, result.error.message);
    return 1;
  }

  return result.status ?? 0;
};

if (inTurbo) {
  if (commandArgs.length === 0) {
    console.error('No workspace command provided for turbo execution.');
    process.exit(1);
  }

  const exitCode = runCommand(commandArgs.join(' '), 'workspace task');
  process.exit(exitCode);
} else {
  const turboCommand = ['turbo', 'run', task, ...taskOptions].join(' ');
  const exitCode = runCommand(turboCommand, 'turbo run');
  process.exit(exitCode);
}
