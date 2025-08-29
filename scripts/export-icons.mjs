import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '..', 'public', 'themes', 'Yaru', 'apps');
const OUT_DIR = path.join(__dirname, '..', 'public', 'icons');
const SIZES = [48, 64, 128, 256];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function exportIcon(file) {
  const name = path.basename(file, '.svg');
  const svgPath = path.join(SRC_DIR, file);

  for (const size of SIZES) {
    const sizeDir = path.join(OUT_DIR, String(size));
    await ensureDir(sizeDir);
    const outPath = path.join(sizeDir, `${name}.png`);
    await sharp(svgPath).resize(size, size).png().toFile(outPath);
  }

  for (const size of SIZES) {
    const outPath = path.join(OUT_DIR, String(size), `${name}.png`);
    try {
      await fs.access(outPath);
    } catch {
      throw new Error(`Missing ${size}px icon for ${name}`);
    }
  }
}

async function run() {
  const files = await fs.readdir(SRC_DIR);
  const svgs = files.filter((f) => f.endsWith('.svg'));
  if (svgs.length === 0) {
    throw new Error('No SVG icons found');
  }
  for (const svg of svgs) {
    await exportIcon(svg);
    console.log(`Exported ${svg}`);
  }
  console.log('All icons exported and validated.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
