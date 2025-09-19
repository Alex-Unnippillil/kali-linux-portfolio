import { readFile, writeFile, mkdir, stat, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import fg from 'fast-glob';

const toFilePath = (url) => path.resolve(path.dirname(fileURLToPath(url)));
const rootDir = path.resolve(toFilePath(import.meta.url), '..');
const releasesPath = path.join(rootDir, 'public', 'releases.json');

const readJson = async (filePath) => {
  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    if (err && 'code' in err && err.code === 'ENOENT') {
      return null;
    }
    console.warn(`[release] Failed to read ${filePath}:`, err.message);
    return null;
  }
};

const ensureDir = (dir) => mkdir(dir, { recursive: true });

const pkg = (await readJson(path.join(rootDir, 'package.json'))) ?? { version: '0.0.0' };

const channel = process.env.RELEASE_CHANNEL ?? process.env.NEXT_PUBLIC_RELEASE_CHANNEL ?? 'stable';
const version = process.env.RELEASE_VERSION ?? pkg.version ?? '0.0.0';

let buildId = process.env.RELEASE_BUILD_ID;
if (!buildId) {
  try {
    buildId = (await readFile(path.join(rootDir, '.next', 'BUILD_ID'), 'utf8')).trim();
  } catch {
    buildId = 'development';
  }
}

let commit = process.env.RELEASE_COMMIT;
if (!commit) {
  try {
    commit = execSync('git rev-parse HEAD', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    commit = 'unknown';
  }
}

const baseUrl = process.env.RELEASE_BASE_URL ?? '/';
const exportedAt = new Date().toISOString();

let assets = [];
let assetPrefix = null;
const staticDir = path.join(rootDir, 'out', '_next', 'static');
try {
  await access(staticDir, constants.F_OK);
  const files = await fg('**/*', { cwd: staticDir, onlyFiles: true });
  assets = await Promise.all(
    files.map(async (relativePath) => {
      const fullPath = path.join(staticDir, relativePath);
      const fileStat = await stat(fullPath);
      return {
        path: `/_next/static/${relativePath.replace(/\\\\/g, '/')}`,
        size: fileStat.size,
      };
    }),
  );
  const prefixedDir = path.join(staticDir, buildId);
  try {
    await access(prefixedDir, constants.F_OK);
    assetPrefix = `/_next/static/${buildId}`;
  } catch {
    assetPrefix = `/_next/static/${buildId}`;
  }
} catch (err) {
  console.warn('[release] Unable to enumerate static assets:', err.message);
}

const releases = (await readJson(releasesPath)) ?? { channels: {} };
if (!releases.channels || typeof releases.channels !== 'object') {
  releases.channels = {};
}

const channelEntry = releases.channels[channel] ?? { current: null, previous: null, history: [] };
const previous = channelEntry.current ? { ...channelEntry.current } : null;

const releaseEntry = {
  channel,
  version,
  buildId,
  commit,
  exportedAt,
  baseUrl,
  assetPrefix,
  assets,
};

channelEntry.previous = previous;
channelEntry.current = releaseEntry;

const history = Array.isArray(channelEntry.history) ? channelEntry.history.slice() : [];
const filtered = history.filter((entry) => entry?.buildId !== releaseEntry.buildId);
channelEntry.history = [releaseEntry, ...filtered].slice(0, 10);

releases.channels[channel] = channelEntry;

const channelDir = path.join(rootDir, 'public', 'releases', channel);
await ensureDir(channelDir);

await writeFile(releasesPath, `${JSON.stringify(releases, null, 2)}\n`, 'utf8');
await writeFile(path.join(channelDir, `${buildId}.json`), `${JSON.stringify(releaseEntry, null, 2)}\n`, 'utf8');

if (previous?.buildId) {
  const previousPath = path.join(channelDir, `${previous.buildId}.json`);
  try {
    await access(previousPath, constants.F_OK);
  } catch {
    await writeFile(previousPath, `${JSON.stringify(previous, null, 2)}\n`, 'utf8');
  }
}

console.log(`[release] Updated ${channel} channel to build ${buildId}`);
