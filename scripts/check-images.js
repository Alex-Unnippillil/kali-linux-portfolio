const path = require('path');
const fg = require('fast-glob');
const sharp = require('sharp');

const IMAGE_DIR = path.join(__dirname, '..', 'public');
const PATTERN = '**/*.{png,jpg,jpeg,webp}';

async function getImages() {
  return fg(PATTERN, { cwd: IMAGE_DIR, onlyFiles: true });
}

function baseKey(file) {
  const parsed = path.parse(file);
  const base = parsed.name.split('@')[0].split('-')[0];
  return path.join(parsed.dir, base);
}

async function checkImages() {
  const files = await getImages();
  const groups = new Map();
  for (const file of files) {
    const key = baseKey(file);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(file);
  }

  const oversized = [];
  for (const file of files) {
    const metadata = await sharp(path.join(IMAGE_DIR, file)).metadata();
    if (metadata.width && metadata.width > 2000) {
      const key = baseKey(file);
      if ((groups.get(key) || []).length === 1) {
        oversized.push(`${file} (${metadata.width}px)`);
      }
    }
  }

  if (oversized.length) {
    console.error('Oversized images without responsive variants:');
    for (const img of oversized) {
      console.error(` - ${img}`);
    }
    process.exit(1);
  } else {
    console.log('No oversized images without responsive variants found.');
  }
}

checkImages();
