#!/usr/bin/env node

import fg from 'fast-glob';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const markdownLinkCheckModule = await import('markdown-link-check');
const markdownLinkCheck = markdownLinkCheckModule.default ?? markdownLinkCheckModule;

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const cliGlobs = process.argv.slice(2);
const patterns = cliGlobs.length > 0 ? cliGlobs : ['README.md', 'CHANGELOG.md', 'docs/**/*.md'];

const ignore = ['**/node_modules/**'];

const markdownFiles = await fg(patterns, {
  cwd: rootDir,
  absolute: true,
  ignore,
  onlyFiles: true,
  unique: true,
  dot: false
});

let config = {};
try {
  const configPath = path.join(rootDir, 'markdown-link-check.json');
  const rawConfig = await readFile(configPath, 'utf8');
  config = JSON.parse(rawConfig);
} catch (error) {
  if (error && error.code !== 'ENOENT') {
    console.error('Failed to read markdown-link-check.json');
    throw error;
  }
}

if (markdownFiles.length === 0) {
  console.warn('No markdown files matched for link checking.');
  process.exit(0);
}

let hasErrors = false;

for (const filePath of markdownFiles.sort()) {
  const relativePath = path.relative(rootDir, filePath);
  try {
    const markdown = await readFile(filePath, 'utf8');
    const directoryUrl = pathToFileURL(path.dirname(filePath) + path.sep).href;
    await new Promise((resolve, reject) => {
      markdownLinkCheck(
        markdown,
        { ...config, baseUrl: directoryUrl },
        (error, results = []) => {
          if (error) {
            reject(error);
            return;
          }

          const deadLinks = results.filter((result) => result.status === 'dead');
          if (deadLinks.length > 0) {
            const summary = deadLinks
              .map((link) => `    - ${link.link} (${link.statusCode ?? link.status})`)
              .join('\n');
            reject(new Error(`Broken links found in ${relativePath}:\n${summary}`));
            return;
          }

          console.log(`✓ ${relativePath}`);
          resolve();
        }
      );
    });
  } catch (error) {
    hasErrors = true;
    console.error(`✖ ${relativePath}`);
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
  }
}

if (hasErrors) {
  console.error('Markdown link check failed.');
  process.exit(1);
}
