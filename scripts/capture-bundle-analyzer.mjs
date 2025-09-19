#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const [reportArg, outputArg] = process.argv.slice(2);
const reportPath = path.resolve(reportArg ?? 'bundle-analyzer/client.html');
const outputPath = path.resolve(outputArg ?? 'bundle-analyzer/client-treemap.png');

async function ensureReportExists() {
  try {
    await fs.access(reportPath);
  } catch (error) {
    console.error(`Bundle analyzer report not found at ${reportPath}`);
    throw error;
  }
}

async function captureTreemap() {
  await ensureReportExists();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    await page.goto(pathToFileURL(reportPath).toString(), { waitUntil: 'networkidle' });
    // Allow charts and fonts to finish rendering before capturing the screenshot.
    await page.waitForTimeout(1000);
    await page.screenshot({ path: outputPath, fullPage: true });
    console.log(`Saved treemap screenshot to ${outputPath}`);
  } finally {
    await browser.close();
  }
}

captureTreemap().catch((error) => {
  console.error('Failed to capture bundle analyzer treemap.');
  console.error(error);
  process.exitCode = 1;
});
