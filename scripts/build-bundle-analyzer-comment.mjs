#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const statsPath = path.resolve(process.argv[2] ?? 'bundle-analyzer/client-stats.json');
const outputPath = path.resolve(process.argv[3] ?? 'bundle-analyzer/comment.md');

function formatBytes(bytes) {
  const kb = bytes / 1024;
  return `${kb.toFixed(kb > 100 ? 0 : 1)} KB`;
}

async function loadStats() {
  const raw = await fs.readFile(statsPath, 'utf8');
  return JSON.parse(raw);
}

async function buildComment() {
  const stats = await loadStats();
  const assets = Array.isArray(stats?.assets) ? stats.assets : [];
  const filtered = assets
    .filter((asset) => asset?.name && !asset.name.endsWith('.map') && /(js|css)$/i.test(asset.name))
    .map((asset) => ({
      name: asset.name,
      size: typeof asset.size === 'number' ? asset.size : 0,
    }))
    .sort((a, b) => b.size - a.size);

  const totalSize = filtered.reduce((sum, asset) => sum + asset.size, 0);
  const topAssets = filtered.slice(0, 10);

  const artifactUrl = process.env.ANALYZER_ARTIFACT_URL;
  const runUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;

  const lines = [
    '### 📦 Bundle Analyzer',
    '',
    artifactUrl
      ? `- 📁 [Download treemap & HTML report](${artifactUrl})`
      : '- 📁 Treemap artifact failed to upload.',
    `- 🔁 [View workflow run](${runUrl})`,
    '',
    `**Total JS/CSS (uncompressed):** ${formatBytes(totalSize)}`,
  ];

  if (topAssets.length > 0) {
    lines.push('', '| Asset | Size |', '| --- | ---: |');
    for (const asset of topAssets) {
      lines.push(`| ${asset.name} | ${formatBytes(asset.size)} |`);
    }
  } else {
    lines.push('', '_No bundle assets detected in stats file._');
  }

  lines.push('', '_Generated automatically by CI._');

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Bundle analyzer comment written to ${outputPath}`);
}

buildComment().catch((error) => {
  console.error('Failed to build bundle analyzer comment.');
  console.error(error);
  process.exitCode = 1;
});
