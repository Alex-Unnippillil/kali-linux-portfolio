const fs = require('fs/promises');
const path = require('path');
const fg = require('fast-glob');

const ROOT = path.join(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT, 'templates');
const ICON_DIRS = [
  path.join(ROOT, 'public', 'themes', 'Yaru', 'apps'),
  path.join(ROOT, 'public', 'themes', 'Yaru', 'actions'),
];

function extractUseIds(content) {
  const ids = [];
  const regex = /<use[^>]*href=['"]#([^'"#]+)['"]/g;
  let match;
  while ((match = regex.exec(content))) {
    ids.push(match[1]);
  }
  return ids;
}

async function collectIds() {
  try {
    await fs.access(TEMPLATE_DIR);
  } catch {
    return [];
  }
  const files = await fg('**/*', { cwd: TEMPLATE_DIR, absolute: true });
  const idSet = new Set();
  for (const file of files) {
    const text = await fs.readFile(file, 'utf8');
    extractUseIds(text).forEach((id) => idSet.add(id));
  }
  return [...idSet];
}

async function loadIcon(id) {
  for (const dir of ICON_DIRS) {
    const filePath = path.join(dir, `${id}.svg`);
    try {
      const svg = await fs.readFile(filePath, 'utf8');
      const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
      const inner = svg
        .replace(/^[\s\S]*?<svg[^>]*>/, '')
        .replace(/<\/svg>[\s\S]*$/, '');
      const viewBoxAttr = viewBoxMatch ? ` viewBox="${viewBoxMatch[1]}"` : '';
      return `<symbol id="${id}"${viewBoxAttr}>${inner}</symbol>`;
    } catch {
      // continue searching
    }
  }
  console.warn(`Missing icon for id: ${id}`);
  return null;
}

async function buildSprite() {
  const ids = await collectIds();
  const symbols = [];
  for (const id of ids) {
    const symbol = await loadIcon(id);
    if (symbol) symbols.push(symbol);
  }

  const outDir = path.join(ROOT, 'assets', 'icons');
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, 'sprite.svg');
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols.join('')}</svg>\n`;
  await fs.writeFile(outPath, sprite);
  console.log(`Wrote ${symbols.length} icons to ${outPath}`);
}

buildSprite().catch((err) => {
  console.error(err);
  process.exit(1);
});
