#!/usr/bin/env node
import { chromium } from 'playwright-core';
import fs from 'fs/promises';
import path from 'path';
import postcss from 'postcss';

const [,, urlArg, outArg] = process.argv;
const targetUrl = urlArg ?? 'http://localhost:3000/';
const outputPath = outArg ?? 'docs/css-coverage-report.json';

const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const page = await browser.newPage();
const client = await page.context().newCDPSession(page);

const sheetHeaders = new Map();
client.on('CSS.styleSheetAdded', ({ header }) => {
  sheetHeaders.set(header.styleSheetId, header);
});

await client.send('DOM.enable');
await client.send('CSS.enable');
await client.send('CSS.startRuleUsageTracking');

const routes = new Set(['/']);
try {
  const manifestPath = path.resolve('.next', 'server', 'pages-manifest.json');
  const manifestRaw = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  Object.keys(manifest || {}).forEach((route) => {
    if (
      !route ||
      route.startsWith('/api') ||
      route.startsWith('/_next') ||
      route === '/_document' ||
      route === '/_app' ||
      route === '/_error'
    ) {
      return;
    }
    routes.add(route);
  });
} catch (error) {
  console.warn('Unable to parse pages-manifest.json for routes', error);
}

const sortedRoutes = Array.from(routes).sort((a, b) => {
  if (a === '/') return -1;
  if (b === '/') return 1;
  return a.localeCompare(b);
});

const baseUrl = new URL(targetUrl);
for (const route of sortedRoutes) {
    const visitUrl = new URL(route.replace(/^\/+/, ''), baseUrl);
    try {
      await page.goto(visitUrl.toString(), { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
    } catch (error) {
      console.warn(`Failed to capture ${visitUrl.toString()}:`, error.message);
    }
}

const { ruleUsage } = await client.send('CSS.stopRuleUsageTracking');

const normalizeSelector = (selector) =>
  selector
    ?.replace(/\s+/g, '')
    .replace(/"|'/g, '')
    .replace(/\\/g, '\\');

const customSelectors = new Set();
const customKeyframes = new Set();
try {
  const customCssPath = path.resolve('styles', 'index.css');
  const customCss = await fs.readFile(customCssPath, 'utf8');
  const customAst = postcss.parse(customCss);
  customAst.walkAtRules('keyframes', (atRule) => {
    if (atRule.params) {
      customKeyframes.add(atRule.params.trim());
    }
  });
  customAst.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && rule.parent.name === 'keyframes') {
      return;
    }
    const selectors = rule.selectors ?? [rule.selector];
    selectors.forEach((selector) => {
      const normalized = normalizeSelector(selector);
      if (normalized) {
        customSelectors.add(normalized);
      }
    });
  });
} catch (error) {
  console.warn('Unable to parse styles/index.css', error);
}

const coverageBySheet = new Map();
for (const usage of ruleUsage) {
  if (!coverageBySheet.has(usage.styleSheetId)) {
    coverageBySheet.set(usage.styleSheetId, []);
  }
  coverageBySheet.get(usage.styleSheetId).push(usage);
}

const report = [];
let overallTotalBytes = 0;
let overallUsedBytes = 0;
let customTotalBytes = 0;
let customUsedBytes = 0;

const stylesheetMeta = new Map();

for (const [styleSheetId, usages] of coverageBySheet.entries()) {
  const header = sheetHeaders.get(styleSheetId);
  const { text } = await client.send('CSS.getStyleSheetText', { styleSheetId });
  if (!text) continue;
  const rulesMap = new Map();
  try {
    const ast = postcss.parse(text);
    ast.walkAtRules('keyframes', (atRule) => {
      const start = atRule.source?.start?.offset;
      const end = atRule.source?.end?.offset;
      if (start == null || end == null) return;
      rulesMap.set(`${start}:${end}`, {
        selectors: [],
        keyframe: atRule.params?.trim() ?? null,
      });
    });
    ast.walkRules((rule) => {
      const start = rule.source?.start?.offset;
      const end = rule.source?.end?.offset;
      if (start == null || end == null) return;
      if (rule.parent?.type === 'atrule' && rule.parent.name === 'keyframes') {
        return;
      }
      const selectors = (rule.selectors ?? [rule.selector]).map((sel) => normalizeSelector(sel)).filter(Boolean);
      rulesMap.set(`${start}:${end}`, { selectors, keyframe: null });
    });
  } catch (error) {
    console.warn(`Failed to parse stylesheet ${header?.sourceURL ?? styleSheetId}`, error);
  }
  stylesheetMeta.set(styleSheetId, rulesMap);
  const totalLength = text.length;
  const usedRanges = usages.filter((usage) => usage.used).map((usage) => [usage.startOffset, usage.endOffset]);
  usedRanges.sort((a, b) => a[0] - b[0]);

  let merged = [];
  for (const [start, end] of usedRanges) {
    if (!merged.length) {
      merged.push([start, end]);
      continue;
    }
    const last = merged[merged.length - 1];
    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  let sheetUsed = 0;
  for (const [start, end] of merged) {
    sheetUsed += Math.max(0, end - start);
  }

  const sheetUnused = Math.max(0, totalLength - sheetUsed);

  report.push({
    styleSheetId,
    sourceURL: header?.sourceURL ?? header?.origin ?? 'inline',
    totalBytes: totalLength,
    usedBytes: sheetUsed,
    unusedBytes: sheetUnused,
    unusedPercent: totalLength ? +( (sheetUnused / totalLength) * 100).toFixed(2) : 0,
  });

  for (const usage of usages) {
    const span = Math.max(0, usage.endOffset - usage.startOffset);
    overallTotalBytes += span;
    if (usage.used) {
      overallUsedBytes += span;
    }
    const rulesMapForSheet = stylesheetMeta.get(styleSheetId);
    const ruleInfo = rulesMapForSheet?.get(`${usage.startOffset}:${usage.endOffset}`);
    if (!ruleInfo) continue;
    let isCustom = false;
    if (ruleInfo.keyframe) {
      if (customKeyframes.has(ruleInfo.keyframe)) {
        isCustom = true;
      }
    } else if (ruleInfo.selectors?.length) {
      for (const selector of ruleInfo.selectors) {
        if (customSelectors.has(selector)) {
          isCustom = true;
          break;
        }
      }
    }
    if (isCustom) {
      customTotalBytes += span;
      if (usage.used) {
        customUsedBytes += span;
      }
    }
  }
}

await browser.close();

report.sort((a, b) => (b.totalBytes - a.totalBytes));

const summary = {
  url: targetUrl,
  generatedAt: new Date().toISOString(),
  totalBytes: customTotalBytes,
  usedBytes: customUsedBytes,
  unusedBytes: Math.max(0, customTotalBytes - customUsedBytes),
  unusedPercent: customTotalBytes
    ? +(((customTotalBytes - customUsedBytes) / customTotalBytes) * 100).toFixed(2)
    : 0,
  overall: {
    totalBytes: overallTotalBytes,
    usedBytes: overallUsedBytes,
    unusedBytes: Math.max(0, overallTotalBytes - overallUsedBytes),
    unusedPercent: overallTotalBytes
      ? +(((overallTotalBytes - overallUsedBytes) / overallTotalBytes) * 100).toFixed(2)
      : 0,
  },
  customSelectors: customSelectors.size,
  customKeyframes: customKeyframes.size,
  stylesheets: report,
};

const resolvedPath = path.resolve(outputPath);
await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
await fs.writeFile(resolvedPath, JSON.stringify(summary, null, 2));

console.log(`CSS coverage written to ${resolvedPath}`);
console.log(JSON.stringify(summary, null, 2));
