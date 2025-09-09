// Generates a precache manifest consumed by next-pwa
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import fg from 'fast-glob';

const publicDir = join(process.cwd(), 'public');
const manifestPath = join(process.cwd(), 'precache-manifest.json');

const files = await fg(['**/*.*'], {
  cwd: publicDir,
  ignore: ['sw.js', 'workbox-*.js', 'service-worker.js'],
});

const manifest = [];
for (const file of files) {
  const filePath = join(publicDir, file);
  const buffer = await fs.readFile(filePath);
  const hash = createHash('sha256').update(buffer).digest('hex');
  manifest.push({ url: '/' + file.replace(/\\/g, '/'), revision: hash });
}

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
console.info(`Generated ${manifest.length} precache entries`);
