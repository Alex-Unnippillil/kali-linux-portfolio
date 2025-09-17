import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

type HeadingInfo = {
  level: number;
  text: string;
};

const appDirectory = path.join(process.cwd(), 'app');
const propsByComponent: Record<string, Record<string, unknown>> = {
  'app/error.tsx': {
    error: new Error('Test error'),
    reset: () => {},
  },
  'app/global-error.tsx': {
    error: new Error('Test error'),
    reset: () => {},
  },
};

function collectComponentFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'api') {
        continue;
      }
      files.push(...collectComponentFiles(entryPath));
    } else if (entry.isFile() && /\.(jsx?|tsx?)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

function extractHeadings(markup: string): HeadingInfo[] {
  const results: HeadingInfo[] = [];
  const regex = /<h([1-6])\b[^>]*>(.*?)<\/h\1>/gis;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markup)) !== null) {
    const level = Number(match[1]);
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    results.push({ level, text });
  }

  return results;
}

const componentFiles = collectComponentFiles(appDirectory);

test.describe('app directory heading hierarchy', () => {
  for (const filePath of componentFiles) {
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

    test(`${relativePath} uses a single H1 with a consistent hierarchy`, async () => {
      const moduleUrl = pathToFileURL(filePath).href;
      const imported = await import(moduleUrl);
      const componentExport = (imported as { default?: React.ComponentType<unknown> }).default;

      expect(componentExport, `${relativePath} must export a default component`).toBeDefined();

      const normalizedPath = relativePath;
      const props =
        propsByComponent[normalizedPath] ??
        propsByComponent[path.join('app', path.relative(appDirectory, filePath)).replace(/\\/g, '/')] ??
        {};

      const element = React.createElement(componentExport as React.ComponentType<unknown>, props);
      const markup = renderToStaticMarkup(element);
      const headings = extractHeadings(markup);

      expect(headings.length, `Expected at least one heading in ${relativePath}`).toBeGreaterThan(0);

      const h1Count = headings.filter((heading) => heading.level === 1).length;
      expect(h1Count, `Expected exactly one H1 in ${relativePath} but found ${h1Count}`).toBe(1);
      expect(headings[0]?.level, `First heading in ${relativePath} must be an H1`).toBe(1);

      for (let index = 1; index < headings.length; index += 1) {
        const previous = headings[index - 1];
        const current = headings[index];
        const message = `Heading level jumps from H${previous.level} to H${current.level} in ${relativePath}`;
        expect(current.level <= previous.level + 1, message).toBeTruthy();
      }
    });
  }
});
