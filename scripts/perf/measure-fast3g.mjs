#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const KB_IN_BYTES = 1024;
const BITS_PER_BYTE = 8;
const PAINT_WAIT_TIMEOUT_MS = 5000;

const FAST_3G_PROFILE = {
  label: 'Fast 3G',
  latency: 150,
  downloadKbps: 1600,
  uploadKbps: 750,
  cpuSlowdown: 4,
};

const toBytesPerSecond = (kbps) => Math.round((kbps * KB_IN_BYTES) / BITS_PER_BYTE);

const parseArgs = (argv) => {
  const urls = [];
  let outputPath;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--url' && typeof argv[i + 1] === 'string') {
      urls.push(argv[i + 1]);
      i += 1;
    } else if (arg === '--output' && typeof argv[i + 1] === 'string') {
      outputPath = argv[i + 1];
      i += 1;
    }
  }
  return { urls, outputPath };
};

const emulateNetwork = async (client) => {
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await client.send('Emulation.setCPUThrottlingRate', {
    rate: FAST_3G_PROFILE.cpuSlowdown,
  });
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: FAST_3G_PROFILE.latency,
    downloadThroughput: toBytesPerSecond(FAST_3G_PROFILE.downloadKbps),
    uploadThroughput: toBytesPerSecond(FAST_3G_PROFILE.uploadKbps),
    connectionType: 'cellular3g',
  });
};

const collectMetrics = async (page) =>
  page.evaluate(() => {
    const fallbackPaints = performance.getEntriesByType('paint').map(({ name, startTime }) => ({
      name,
      startTime,
    }));
    const paints = Array.isArray(window.__perf?.paints) && window.__perf.paints.length > 0
      ? window.__perf.paints
      : fallbackPaints;
    const navigation = performance.getEntriesByType('navigation')[0];
    const navigationTiming = navigation
      ? {
          domContentLoaded: navigation.domContentLoadedEventEnd,
          load: navigation.loadEventEnd,
          responseStart: navigation.responseStart,
        }
      : null;
    const fallbackLcp = performance.getEntriesByType('largest-contentful-paint').at(-1)?.startTime ?? null;
    const largestContentfulPaint = typeof window.__perf?.lcp === 'number' ? window.__perf.lcp : fallbackLcp;
    return { paints, navigationTiming, largestContentfulPaint };
  });

const initPerformanceObservers = async (context) => {
  await context.addInitScript(() => {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
      return;
    }
    window.__perf = { paints: [], lcp: null };
    try {
      const paintObserver = new PerformanceObserver((list) => {
        window.__perf.paints.push(
          ...list.getEntries().map(({ name, startTime }) => ({ name, startTime }))
        );
      });
      paintObserver.observe({ type: 'paint', buffered: true });
    } catch (err) {
      console.warn('Paint observer unavailable', err);
    }
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1);
        if (last) {
          window.__perf.lcp = last.startTime;
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (err) {
      console.warn('LCP observer unavailable', err);
    }
  });
};

const main = async () => {
  const { urls, outputPath } = parseArgs(process.argv.slice(2));
  const targets = urls.length > 0 ? urls : ['http://localhost:3000/'];

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const target of targets) {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        locale: 'en-US',
        ignoreHTTPSErrors: true,
      });
      await initPerformanceObservers(context);
      const page = await context.newPage();
      const client = await context.newCDPSession(page);
      await emulateNetwork(client);

      const startedAt = Date.now();
      await page.goto(target, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page
        .waitForFunction(
          () => {
            const entries = performance.getEntriesByType('paint');
            return entries.length > 0 || (window.__perf?.paints?.length ?? 0) > 0;
          },
          undefined,
          { timeout: PAINT_WAIT_TIMEOUT_MS }
        )
        .catch(() => {});

      const { paints, navigationTiming, largestContentfulPaint } = await collectMetrics(page);
      const rawFirstPaint = paints.find((entry) => entry.name === 'first-paint')?.startTime ?? null;
      const rawFirstContentfulPaint = paints.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? null;
      const fallbackFirst = navigationTiming?.responseStart ?? null;
      const firstPaint = rawFirstPaint ?? fallbackFirst;
      const firstContentfulPaint = rawFirstContentfulPaint ?? firstPaint;

      results.push({
        url: target,
        measuredAt: new Date().toISOString(),
        profile: FAST_3G_PROFILE,
        firstPaint,
        firstContentfulPaint,
        largestContentfulPaint: largestContentfulPaint ?? navigationTiming?.domContentLoaded ?? null,
        navigationTiming,
        totalElapsedMs: Date.now() - startedAt,
      });

      await context.close();
    }
  } finally {
    await browser.close();
  }

  if (outputPath) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  } else {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  }
};

main().catch((error) => {
  console.error('Failed to collect metrics', error);
  process.exitCode = 1;
});
