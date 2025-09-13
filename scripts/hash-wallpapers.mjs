import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const dirs = [
  path.join(process.cwd(), 'public', 'wallpapers'),
  path.join(process.cwd(), 'public', 'images', 'wallpapers'),
];
const manifestPath = path.join(process.cwd(), 'public', 'wallpapers-manifest.json');

async function main() {
  const manifest = {};
  const baseDir = dirs[0];
  const files = await fs.readdir(baseDir);

  for (const file of files) {
    const ext = path.extname(file);
    const base = path.basename(file, ext);
    const simpleBase = base.split('.')[0];

    // Skip already hashed files
    if (simpleBase !== base) {
      manifest[simpleBase] = file;
      continue;
    }

    const buf = await fs.readFile(path.join(baseDir, file));
    const hash = createHash('md5').update(buf).digest('hex').slice(0, 8);
    const hashedName = `${simpleBase}.${hash}${ext}`;
    manifest[simpleBase] = hashedName;

    for (const dir of dirs) {
      const src = path.join(dir, file);
      const dest = path.join(dir, hashedName);
      try {
        await fs.rename(src, dest);
      } catch {
        // ignore missing files in secondary directories
      }
    }
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
