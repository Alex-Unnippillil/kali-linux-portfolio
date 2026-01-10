#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import fg from 'fast-glob';
import { ZodError } from 'zod';

import { translationExportSchema } from '../components/i18n/schema.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function validateFile(filePath) {
  const relative = path.relative(rootDir, filePath);
  try {
    const raw = await readFile(filePath, 'utf8');
    const data = JSON.parse(raw);
    translationExportSchema.parse(data);
    console.log(`✔ ${relative}`);
  } catch (error) {
    console.error(`✖ ${relative}`);
    if (error instanceof SyntaxError) {
      console.error(`  • Invalid JSON: ${error.message}`);
    } else if (error instanceof ZodError) {
      for (const issue of error.errors) {
        const location = issue.path.length ? `${issue.path.join('.')}: ` : '';
        console.error(`  • ${location}${issue.message}`);
      }
    } else {
      console.error(`  • ${error instanceof Error ? error.message : error}`);
    }
    throw error;
  }
}

async function main() {
  const globPattern = path
    .join(rootDir, 'data/i18n/**/*.json')
    .replace(/\\/g, '/');
  const files = await fg(globPattern, { absolute: true, dot: false });

  if (files.length === 0) {
    console.log('No translation files found under data/i18n.');
    return;
  }

  const errors = [];
  for (const file of files) {
    try {
      await validateFile(file);
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    process.exitCode = 1;
    console.error(`\nTranslation validation failed for ${errors.length} file(s).`);
  } else {
    console.log('\nAll translation files are valid.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
