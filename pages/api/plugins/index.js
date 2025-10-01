import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const catalogDir = path.join(rootDir, 'plugins', 'catalog');
const examplesDir = path.join(rootDir, 'extensions', 'examples');

const devModeEnabled =
  process.env.NEXT_PUBLIC_DEV_MODE === 'true' ||
  process.env.NODE_ENV !== 'production';

function readManifestSummary(filePath, fileRef, fallbackId, devOnlyOverride) {
  try {
    const manifest = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const id = manifest.id || fallbackId;
    return {
      id,
      file: fileRef,
      name: manifest.name,
      description: manifest.description,
      version: manifest.version,
      devOnly: devOnlyOverride ?? Boolean(manifest.devOnly),
    };
  } catch {
    return {
      id: fallbackId,
      file: fileRef,
      devOnly: Boolean(devOnlyOverride),
    };
  }
}

export default function handler(_req, res) {
  const catalogEntries = [];
  try {
    const files = fs.readdirSync(catalogDir);
    for (const file of files) {
      if (file.startsWith('.') || !file.endsWith('.json')) continue;
      const filePath = path.join(catalogDir, file);
      catalogEntries.push(
        readManifestSummary(filePath, file, path.parse(file).name, false)
      );
    }
  } catch {
    // ignore – fall through with empty catalog
  }

  const exampleEntries = [];
  if (devModeEnabled) {
    try {
      const entries = fs.readdirSync(examplesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        const manifestPath = path.join(examplesDir, entry.name, 'manifest.json');
        if (!fs.existsSync(manifestPath)) continue;
        const fileRef = path.posix.join('examples', entry.name, 'manifest.json');
        exampleEntries.push(
          readManifestSummary(manifestPath, fileRef, entry.name, true)
        );
      }
    } catch {
      // ignore example discovery failures in production builds
    }
  }

  res.status(200).json([...catalogEntries, ...exampleEntries]);
}
