import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

async function run() {
  const logFile = resolve(
    process.cwd(),
    process.env.CI_NEXT_BUILD_LOG ?? 'artifacts/next-build.log'
  );
  mkdirSync(dirname(logFile), { recursive: true });

  const env = {
    ...process.env,
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
  };

  const child = spawn('yarn', ['build'], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';

  child.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stdout.write(text);
  });

  child.stderr.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stderr.write(text);
  });

  const exitCode = await new Promise((resolveChild, rejectChild) => {
    child.on('error', rejectChild);
    child.on('close', (code) => resolveChild(code ?? 1));
  });

  writeFileSync(logFile, output);

  if (exitCode !== 0) {
    console.error(`next build exited with code ${exitCode}. See ${logFile} for details.`);
    process.exit(exitCode);
  }

  const lines = output.split(/\r?\n/);
  const warningLines = lines.filter((line) => /\bwarn\s+-/i.test(line) || /\bwarning:/i.test(line));
  const deprecationLines = lines.filter((line) => /deprecat/i.test(line));

  if (warningLines.length > 0 || deprecationLines.length > 0) {
    if (warningLines.length > 0) {
      console.error('Warnings detected during next build:');
      for (const warning of warningLines) {
        console.error(`  ${warning}`);
      }
    }

    if (deprecationLines.length > 0) {
      console.error('Deprecation notices detected during next build:');
      for (const deprecation of deprecationLines) {
        console.error(`  ${deprecation}`);
      }
    }

    console.error(`Build log saved to ${logFile}`);
    process.exit(1);
  }

  console.log(`next build completed without warnings. Log saved to ${logFile}`);
}

run().catch((error) => {
  console.error('Failed to run next build', error);
  process.exit(1);
});
