import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fg from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SPRITE_PATH = path.join(ICONS_DIR, 'sprite.svg');
const MANIFEST_PATH = path.join(ICONS_DIR, 'sprite-manifest.json');

const HIGH_CONTRAST_PATTERN = /(?:^|[-_.])hc$/i;

const defaultViewBox = '0 0 24 24';

const cleanSvg = (input) => input.replace(/<\?xml[^>]*>/gi, '').replace(/<!DOCTYPE[^>]*>/gi, '').trim();

const extractSvg = (content, filePath) => {
  const svgOpenTagMatch = content.match(/<svg[^>]*>/i);
  const svgCloseIndex = content.lastIndexOf('</svg>');
  if (!svgOpenTagMatch || svgCloseIndex === -1) {
    throw new Error(`File ${filePath} does not contain a valid <svg> element.`);
  }

  const openTag = svgOpenTagMatch[0];
  const inner = content.slice(svgOpenTagMatch.index + openTag.length, svgCloseIndex).trim();
  return { openTag, inner };
};

const parseViewBox = (openTag) => {
  const viewBoxMatch = openTag.match(/viewBox="([^"]+)"/i);
  if (viewBoxMatch) {
    return viewBoxMatch[1];
  }

  const widthMatch = openTag.match(/width="([^"]+)"/i);
  const heightMatch = openTag.match(/height="([^"]+)"/i);
  if (widthMatch && heightMatch) {
    const parseLength = (value) => {
      const numeric = Number.parseFloat(value);
      return Number.isFinite(numeric) ? numeric : null;
    };
    const width = parseLength(widthMatch[1]);
    const height = parseLength(heightMatch[1]);
    if (width && height) {
      return `0 0 ${width} ${height}`;
    }
  }

  return defaultViewBox;
};

const normalizeId = (relPath) => relPath.replace(/\\/g, '/').replace(/\.svg$/i, '').replace(/\//g, '-');

const ensureDir = (dir) => fs.mkdir(dir, { recursive: true });

async function buildSprite() {
  await ensureDir(ICONS_DIR);
  const entries = await fg('**/*.svg', {
    cwd: ICONS_DIR,
    dot: false,
    ignore: ['sprite.svg', 'sprite-manifest.json'],
  });
  entries.sort();

  const icons = new Map();
  const symbolMarkup = [];

  for (const entry of entries) {
    const absolutePath = path.join(ICONS_DIR, entry);
    const raw = await fs.readFile(absolutePath, 'utf8');
    const cleaned = cleanSvg(raw);
    const { openTag, inner } = extractSvg(cleaned, absolutePath);
    const viewBox = parseViewBox(openTag);

    const normalized = normalizeId(entry);
    const isHighContrast = HIGH_CONTRAST_PATTERN.test(normalized);
    const baseName = normalized.replace(HIGH_CONTRAST_PATTERN, '');
    const symbolBaseId = `icon-${baseName}`;
    const symbolId = isHighContrast ? `${symbolBaseId}-hc` : symbolBaseId;

    const existing = icons.get(baseName) ?? {
      id: symbolBaseId,
      viewBox,
      hasHighContrast: false,
      sources: {},
    };

    if (!isHighContrast && existing.sources.regular) {
      throw new Error(`Multiple base icons detected for ${baseName}`);
    }
    if (isHighContrast && existing.sources.highContrast) {
      throw new Error(`Multiple high-contrast icons detected for ${baseName}`);
    }

    existing.viewBox = viewBox;
    if (isHighContrast) {
      existing.hasHighContrast = true;
      existing.highContrastId = symbolId;
      existing.sources.highContrast = entry;
    } else {
      existing.sources.regular = entry;
    }

    icons.set(baseName, existing);

    symbolMarkup.push(
      `  <symbol id="${symbolId}" viewBox="${viewBox}" data-name="${baseName}" data-variant="${
        isHighContrast ? 'high-contrast' : 'regular'
      }">
${inner}
  </symbol>`,
    );
  }

  const sprite = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbolMarkup.join(
    '\n',
  )}\n</svg>\n`;

  for (const [name, meta] of icons.entries()) {
    if (!meta.sources.regular) {
      throw new Error(`Missing base icon for ${name}. Each icon must include a non-high-contrast SVG.`);
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    icons: Object.fromEntries(
      Array.from(icons.entries()).map(([name, meta]) => [
        name,
        {
          id: meta.id,
          viewBox: meta.viewBox ?? defaultViewBox,
          hasHighContrast: meta.hasHighContrast,
          highContrastId: meta.highContrastId,
          sources: meta.sources,
        },
      ]),
    ),
  };

  await Promise.all([
    fs.writeFile(SPRITE_PATH, sprite, 'utf8'),
    fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
  ]);

  const iconCount = icons.size;
  console.log(`Generated sprite with ${iconCount} icon${iconCount === 1 ? '' : 's'}.`);
  if (iconCount === 0) {
    console.warn('No SVG icons were discovered in public/icons; sprite is empty.');
  }
}

buildSprite().catch((error) => {
  console.error(error);
  process.exit(1);
});
