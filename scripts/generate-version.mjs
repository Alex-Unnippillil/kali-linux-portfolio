import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

async function getPackageVersion() {
  const packageJsonPath = join(projectRoot, 'package.json');
  const raw = await readFile(packageJsonPath, 'utf8');
  const pkg = JSON.parse(raw);
  return String(pkg.version ?? '0.0.0');
}

async function getCacheVersion() {
  const serviceWorkerPath = join(projectRoot, 'public', 'workers', 'service-worker.js');
  try {
    const sw = await readFile(serviceWorkerPath, 'utf8');
    const match = sw.match(/const\s+CACHE_NAME\s*=\s*['"`]([^'"`]+)['"`]/);
    if (match) {
      return match[1];
    }
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      throw error;
    }
  }
  return 'unknown';
}

async function writeVersionFile({ appVersion, cacheVersion }) {
  const versionPath = join(projectRoot, 'public', 'version.json');
  const data = {
    appVersion,
    cacheVersion,
  };
  const contents = `${JSON.stringify(data, null, 2)}\n`;
  await writeFile(versionPath, contents, 'utf8');
}

async function main() {
  const [appVersion, cacheVersion] = await Promise.all([
    getPackageVersion(),
    getCacheVersion(),
  ]);
  await writeVersionFile({ appVersion, cacheVersion });
}

main().catch((error) => {
  console.error('Failed to generate version manifest', error);
  process.exitCode = 1;
});
