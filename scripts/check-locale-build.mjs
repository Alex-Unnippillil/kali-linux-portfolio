#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';

const locales = ['en', 'es'];

async function runBuild(locale) {
  console.log(`\nChecking build warnings for locale "${locale}"`);
  await rm('.next', { recursive: true, force: true });

  const child = spawn('yarn', ['build'], {
    env: {
      ...process.env,
      NEXT_PUBLIC_DEFAULT_LOCALE: locale,
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    output += text;
    process.stdout.write(text);
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    output += text;
    process.stderr.write(text);
  });

  const exitCode = await new Promise((resolve) => {
    child.on('close', resolve);
  });

  if (exitCode !== 0) {
    throw new Error(`Build failed for locale ${locale}`);
  }

  const warningPattern = /(^|\n)\s*(warn(?:ing)?\b)/i;
  if (warningPattern.test(output)) {
    throw new Error(`Build for locale ${locale} produced warnings.`);
  }
}

(async () => {
  try {
    for (const locale of locales) {
      await runBuild(locale);
    }
    console.log('\nLocale builds completed without warnings.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
})();
