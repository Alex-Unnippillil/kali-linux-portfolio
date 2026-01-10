import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const nextDir = path.join(rootDir, '.next');
const manifestPath = path.join(nextDir, 'build-manifest.json');
const baselinePath = path.join(__dirname, 'bundle-baseline.json');
const UPDATE_BASELINE = process.env.UPDATE_BUNDLE_BASELINE === 'true';

const run = (command, options = {}) => {
  execSync(command, {
    stdio: 'inherit',
    cwd: rootDir,
    env: {
      ...process.env,
      CI: '1',
      NEXT_TELEMETRY_DISABLED: '1',
      ...options.env,
    },
  });
};

async function ensureBuild() {
  const skipBuild = process.env.BUNDLE_SKIP_BUILD === 'true';
  if (!skipBuild) {
    console.log('Building project for bundle size verification...');
    run('yarn build');
  } else {
    console.log('Skipping build (BUNDLE_SKIP_BUILD=true).');
  }

  try {
    await fs.access(manifestPath);
  } catch (error) {
    throw new Error('Missing build manifest. Run "yarn build" before executing the bundle budget check.');
  }
}

async function readManifest() {
  const raw = await fs.readFile(manifestPath, 'utf8');
  if (raw.toLowerCase().includes('leaflet')) {
    throw new Error('Leaflet assets are still referenced in the build manifest.');
  }
  return JSON.parse(raw);
}

async function getRootMainSize(manifest) {
  const mainFiles = manifest.rootMainFiles;
  if (!Array.isArray(mainFiles) || mainFiles.length === 0) {
    throw new Error('No root main files were found in the build manifest.');
  }

  const entries = await Promise.all(
    mainFiles.map(async (relativePath) => {
      const filePath = path.join(nextDir, relativePath);
      const stats = await fs.stat(filePath);
      return { file: relativePath, bytes: stats.size };
    }),
  );

  return {
    totalBytes: entries.reduce((acc, entry) => acc + entry.bytes, 0),
    entries,
  };
}

async function readBaseline() {
  try {
    const raw = await fs.readFile(baselinePath, 'utf8');
    const data = JSON.parse(raw);
    if (typeof data.rootMainBytes !== 'number') {
      throw new Error('Invalid bundle baseline: missing rootMainBytes.');
    }
    return {
      rootMainBytes: data.rootMainBytes,
      toleranceBytes: typeof data.toleranceBytes === 'number' ? data.toleranceBytes : 2048,
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (UPDATE_BASELINE) {
        return null;
      }
      throw new Error('Bundle baseline file missing. Run with UPDATE_BUNDLE_BASELINE=true to create one.');
    }
    throw error;
  }
}

async function writeBaseline(bytes, entries) {
  const payload = {
    rootMainBytes: bytes,
    toleranceBytes: 2048,
    files: entries,
  };
  await fs.writeFile(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Updated bundle baseline to ${bytes} bytes.`);
}

(async () => {
  await ensureBuild();
  const manifest = await readManifest();
  const { totalBytes, entries } = await getRootMainSize(manifest);

  console.log('Root main bundle files:');
  for (const entry of entries) {
    console.log(`  ${entry.file} — ${entry.bytes} bytes`);
  }
  console.log(`Total root main bundle size: ${totalBytes} bytes`);

  const baseline = await readBaseline();

  if (UPDATE_BASELINE || !baseline) {
    await writeBaseline(totalBytes, entries);
    return;
  }

  const { rootMainBytes, toleranceBytes } = baseline;
  if (totalBytes > rootMainBytes + toleranceBytes) {
    throw new Error(
      `Root main bundle grew to ${totalBytes} bytes (baseline ${rootMainBytes} + ${toleranceBytes} tolerance).`,
    );
  }

  const delta = totalBytes - rootMainBytes;
  const diffLabel = delta === 0 ? 'unchanged' : delta > 0 ? `+${delta}` : `${delta}`;
  console.log(`Bundle size check passed (${diffLabel} bytes vs baseline).`);
})();
