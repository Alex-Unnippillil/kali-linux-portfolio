import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

import iconManifest from '../data/icons/manifest.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const iconsDir = path.join(rootDir, 'public', 'icons');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  preserveOrder: false,
  trimValues: true,
});

const expectedSizes = iconManifest.sizes;
const expectedNames = iconManifest.icons.map((icon) => icon.name);
const expectedNameSet = new Set(expectedNames);
const expectedSizeSet = new Set(expectedSizes.map(String));

const iconSizeMap = new Map(expectedNames.map((name) => [name, new Set()]));

const errors = [];

const ensureDirectory = async (dir) => {
  try {
    const stats = await stat(dir);
    if (!stats.isDirectory()) {
      errors.push(`Expected ${dir} to be a directory.`);
    }
  } catch (error) {
    errors.push(`Missing directory: ${dir}`);
  }
};

const validateAttributes = (name, size, svg) => {
  const width = svg.width ?? svg.WIDTH;
  const height = svg.height ?? svg.HEIGHT;
  const viewBox = svg.viewBox ?? svg.VIEWBOX;
  const fill = svg.fill ?? svg.FILL;
  const stroke = svg.stroke ?? svg.STROKE;
  const strokeWidth = svg['stroke-width'] ?? svg['STROKE-WIDTH'];
  const strokeLinecap = svg['stroke-linecap'] ?? svg['STROKE-LINECAP'];
  const strokeLinejoin = svg['stroke-linejoin'] ?? svg['STROKE-LINEJOIN'];

  const expectedSizeString = String(size);

  if (width !== expectedSizeString || height !== expectedSizeString) {
    errors.push(
      `${name} (${size}): width/height should both be ${expectedSizeString} but received width=${width} height=${height}.`,
    );
  }

  if (viewBox !== '0 0 24 24') {
    errors.push(`${name} (${size}): expected viewBox="0 0 24 24" but found "${viewBox}".`);
  }

  if (fill !== 'none') {
    errors.push(`${name} (${size}): expected fill="none" but found "${fill}".`);
  }

  if (stroke !== 'currentColor') {
    errors.push(`${name} (${size}): expected stroke="currentColor" but found "${stroke}".`);
  }

  if (strokeWidth !== '1.5') {
    errors.push(`${name} (${size}): expected stroke-width="1.5" but found "${strokeWidth}".`);
  }

  if (strokeLinecap !== 'round') {
    errors.push(`${name} (${size}): expected stroke-linecap="round" but found "${strokeLinecap}".`);
  }

  if (strokeLinejoin !== 'round') {
    errors.push(`${name} (${size}): expected stroke-linejoin="round" but found "${strokeLinejoin}".`);
  }
};

(async () => {
  for (const size of expectedSizes) {
    const sizeDir = path.join(iconsDir, String(size));
    await ensureDirectory(sizeDir);

    let entries = [];
    try {
      entries = await readdir(sizeDir);
    } catch (error) {
      errors.push(`Unable to read directory: ${sizeDir}`);
      continue;
    }

    for (const entry of entries) {
      if (!entry.endsWith('.svg')) {
        continue;
      }

      const name = entry.replace(/\.svg$/u, '');

      if (!expectedNameSet.has(name)) {
        errors.push(`Unexpected icon ${entry} in ${sizeDir}.`);
        continue;
      }

      const filePath = path.join(sizeDir, entry);
      const raw = await readFile(filePath, 'utf8');

      let parsed;
      try {
        parsed = parser.parse(raw);
      } catch (error) {
        errors.push(`Failed to parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }

      const svg = parsed?.svg;

      if (!svg) {
        errors.push(`File ${filePath} does not contain a valid <svg> root element.`);
        continue;
      }

      validateAttributes(name, size, svg);

      iconSizeMap.get(name)?.add(size);
    }
  }

  for (const name of expectedNames) {
    const recordedSizes = iconSizeMap.get(name);
    if (!recordedSizes || recordedSizes.size === 0) {
      errors.push(`Icon ${name} is missing all required sizes (${expectedSizes.join(', ')}).`);
      continue;
    }

    for (const expected of expectedSizes) {
      if (!recordedSizes.has(expected)) {
        errors.push(`Icon ${name} is missing size ${expected}.`);
      }
    }
  }

  const directoryEntries = await readdir(iconsDir);
  for (const dirEntry of directoryEntries) {
    const fullPath = path.join(iconsDir, dirEntry);
    try {
      const stats = await stat(fullPath);
      if (stats.isDirectory() && !expectedSizeSet.has(dirEntry)) {
        const contents = await readdir(fullPath);
        if (contents.some((file) => file.endsWith('.svg'))) {
          errors.push(`Directory ${dirEntry} is not tracked in icon manifest but contains SVG assets.`);
        }
      }
    } catch (error) {
      errors.push(`Failed to inspect ${fullPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (errors.length > 0) {
    console.error('Icon validation failed:\n');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Icon validation passed for ${expectedNames.length} icons across sizes ${expectedSizes.join(', ')}.`);
})();
