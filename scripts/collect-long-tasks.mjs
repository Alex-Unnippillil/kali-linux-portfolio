import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseUrl = process.argv[2];
if (!baseUrl) {
  console.error('Usage: node scripts/collect-long-tasks.mjs <url>');
  process.exit(1);
}

const outputDir = path.resolve(__dirname, '..', 'artifacts', 'performance');
const tracePath = path.join(outputDir, 'load-trace.zip');
const reportPath = path.join(outputDir, 'long-tasks.json');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  await ensureDir(outputDir);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.tracing.start({ screenshots: false, snapshots: true, sources: true });

  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'load' });
  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  } catch (err) {
    console.warn('networkidle timed out, continuing with captured data');
  }
  await page.waitForTimeout(1000);

  const longTasks = await page.evaluate(() =>
    performance
      .getEntriesByType('longtask')
      .map((entry) => ({ name: entry.name, startTime: entry.startTime, duration: entry.duration })),
  );

  await context.tracing.stop({ path: tracePath });
  await browser.close();

  const summary = {
    url: baseUrl,
    capturedAt: new Date().toISOString(),
    longTasks,
  };

  await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));

  const offenders = longTasks.filter((task) => task.duration >= 50);
  if (offenders.length > 0) {
    console.error('Long tasks detected:', offenders);
    process.exit(1);
  }

  console.log(`Recorded long tasks: ${longTasks.length}`);
  console.log(`Trace saved to ${tracePath}`);
  console.log(`Report saved to ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
