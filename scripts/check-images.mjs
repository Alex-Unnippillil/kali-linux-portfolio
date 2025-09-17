#!/usr/bin/env node
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const MAX_WIDTH = 2000;
const LARGE_TOKEN = '-large';
const SUPPORTED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);

const runGitCommand = (command) => {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    if (process.env.CI) {
      throw error;
    }

    console.warn(`Failed to run "${command}".`, error.message);
    return '';
  }
};

const parseGitOutput = (output) =>
  output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const getFilesFromArgs = () => {
  const args = process.argv.slice(2);
  const optionArgs = new Set();
  const positional = [];

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/check-images.mjs [options] [files...]\n\nOptions:\n  --staged   Check staged files (default when no files passed)\n  --all      Check all tracked image files\n  -h, --help Show this help message\n`);
      process.exit(0);
    }

    if (arg.startsWith('--')) {
      optionArgs.add(arg);
    } else {
      positional.push(arg);
    }
  }

  if (optionArgs.has('--all')) {
    return parseGitOutput(runGitCommand('git ls-files --full-name'));
  }

  if (positional.length > 0) {
    return positional;
  }

  // Default to staged files when no explicit list was provided.
  if (optionArgs.has('--staged') || positional.length === 0) {
    return parseGitOutput(runGitCommand('git diff --cached --name-only --diff-filter=ACMR'));
  }

  return positional;
};

const isSupportedImage = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
};

const hasLargeToken = (filePath) => {
  const baseName = path.basename(filePath, path.extname(filePath)).toLowerCase();
  return baseName.includes(LARGE_TOKEN);
};

const fileExists = async (filePath) => {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

const getOffendingImages = async (files) => {
  const offenders = [];

  for (const file of files) {
    if (!isSupportedImage(file)) {
      continue;
    }

    // Skip files that are no longer present (e.g., deleted in the same commit).
    if (!(await fileExists(file))) {
      continue;
    }

    try {
      const metadata = await sharp(file).metadata();
      const width = metadata?.width;

      if (typeof width !== 'number') {
        continue;
      }

      if (width > MAX_WIDTH && !hasLargeToken(file)) {
        offenders.push({ file, width });
      }
    } catch (error) {
      console.warn(`Unable to read ${file}: ${error.message}`);
    }
  }

  return offenders;
};

const main = async () => {
  const files = [...new Set(getFilesFromArgs())];

  if (files.length === 0) {
    process.exit(0);
  }

  const offenders = await getOffendingImages(files);

  if (offenders.length === 0) {
    process.exit(0);
  }

  console.error('\nImage policy violation: some assets are wider than 2000px without the "-large" suffix.');
  for (const { file, width } of offenders) {
    console.error(` - ${file} (${width}px wide)`);
  }

  console.error('\nResize the images to 2000px or less, or rename them to include "-large" before the extension.');
  process.exit(1);
};

main().catch((error) => {
  console.error('Unexpected failure while checking images.');
  console.error(error);
  process.exit(1);
});
