import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseUrl = process.env.A11Y_BASE_URL ?? 'http://localhost:3000';
const targetPaths = [
  '/',
  '/apps',
  '/apps/chess',
  '/apps/sudoku',
  '/apps/youtube',
  '/apps/vscode',
  '/apps/spotify',
  '/apps/x',
  '/apps/chrome',
  '/apps/trash',
  '/apps/gedit',
  '/apps/todoist',
];

const outputDir = path.join(__dirname, '..', 'reports', 'a11y');
fs.mkdirSync(outputDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(outputDir, `axe-report-${timestamp}.json`);

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultNavigationTimeout(60000);
page.setDefaultTimeout(60000);

const pages = [];
let testEngine = null;

try {
  for (const pathname of targetPaths) {
    const url = new URL(pathname, baseUrl).toString();
    console.log(`Running axe-core scan on ${url}`);
    await page.goto(url, { waitUntil: 'load' });
    try {
      await page.waitForLoadState('networkidle', { timeout: 2000 });
    } catch (error) {
      // Many Next.js dev features keep websocket connections open; ignore the timeout.
      if (process.env.DEBUG_A11Y_REPORT === 'true') {
        console.warn(`networkidle wait timed out for ${url}`, error);
      }
    }
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .withRules(['color-contrast'])
      .analyze();

    testEngine = testEngine ?? results.testEngine;

    const countsByImpact = results.violations.reduce((acc, violation) => {
      const impact = violation.impact ?? 'minor';
      acc[impact] = (acc[impact] ?? 0) + 1;
      return acc;
    }, {});

    pages.push({
      url,
      path: pathname,
      summary: {
        violations: results.violations.length,
        countsByImpact,
      },
      violations: results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact ?? 'minor',
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        tags: violation.tags,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary,
        })),
      })),
    });
  }
} finally {
  await page.close();
  await context.close();
  await browser.close();
}

const totals = pages.reduce(
  (acc, pageResult) => {
    acc.violations += pageResult.summary.violations;
    for (const [impact, count] of Object.entries(pageResult.summary.countsByImpact)) {
      acc.countsByImpact[impact] = (acc.countsByImpact[impact] ?? 0) + count;
    }
    return acc;
  },
  { violations: 0, countsByImpact: {} },
);

const report = {
  metadata: {
    generatedAt: new Date().toISOString(),
    baseUrl,
    targetPaths,
    testEngine,
    ci: {
      runId: process.env.GITHUB_RUN_ID ?? null,
      runNumber: process.env.GITHUB_RUN_NUMBER ?? null,
      sha: process.env.GITHUB_SHA ?? null,
    },
  },
  totals,
  pages,
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outputDir, 'latest.json'), JSON.stringify(report, null, 2));

console.log(`Saved axe-core accessibility report to ${reportPath}`);
console.log(`Total violations detected: ${totals.violations}`);
