import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const catalogDir = path.join(rootDir, 'plugins', 'catalog');
const examplesDir = path.join(rootDir, 'extensions', 'examples');

const devModeEnabled =
  process.env.NEXT_PUBLIC_DEV_MODE === 'true' ||
  process.env.NODE_ENV !== 'production';

const contentTypes = new Map([
  ['.json', 'application/json'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript'],
  ['.css', 'text/css'],
]);

function sanitizeRequest(raw) {
  const safeSegments = [];
  for (const part of raw.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') return null;
    safeSegments.push(part);
  }
  return safeSegments;
}

function attachPanelMarkup(manifest, manifestDir, baseDir) {
  if (!manifest?.contributes?.panels) return manifest;
  const updatedPanels = manifest.contributes.panels.map((panel) => {
    if (!panel?.source || typeof panel.source !== 'string') return panel;
    const panelPath = path.join(manifestDir, panel.source);
    if (!panelPath.startsWith(baseDir)) return panel;
    try {
      const html = fs.readFileSync(panelPath, 'utf8');
      return { ...panel, html };
    } catch {
      return panel;
    }
  });
  return {
    ...manifest,
    contributes: {
      ...manifest.contributes,
      panels: updatedPanels,
    },
  };
}

export default function handler(req, res) {
  const { name } = req.query;
  const raw = Array.isArray(name) ? name.join('/') : name || '';
  const segments = sanitizeRequest(raw);
  if (!segments) {
    res.status(400).end('Invalid path');
    return;
  }

  let baseDir = catalogDir;
  let relativeSegments = segments;
  if (segments[0] === 'examples') {
    if (!devModeEnabled) {
      res.status(404).end('Not found');
      return;
    }
    baseDir = examplesDir;
    relativeSegments = segments.slice(1);
  }

  const relativePath = relativeSegments.join(path.sep);
  const absolutePath = path.join(baseDir, relativePath);
  if (!absolutePath.startsWith(baseDir)) {
    res.status(400).end('Invalid path');
    return;
  }

  try {
    const data = fs.readFileSync(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();

    if (ext === '.json') {
      const manifestDir = path.dirname(absolutePath);
      const rawManifest = data.toString('utf8');
      const manifest = JSON.parse(rawManifest);
      if (manifest.entry && typeof manifest.entry === 'string') {
        const entryPath = path.join(manifestDir, manifest.entry);
        if (!entryPath.startsWith(baseDir)) {
          res.status(400).end('Invalid entry path');
          return;
        }
        manifest.code = fs.readFileSync(entryPath, 'utf8');
      }
      const withPanels = attachPanelMarkup(manifest, manifestDir, baseDir);
      const requestPath = segments.join('/');
      const dirPath = requestPath.split('/').slice(0, -1).join('/');
      const assetsBase = `/api/plugins/${dirPath ? `${dirPath}/` : ''}`;
      delete withPanels.entry;
      withPanels.assetsBase = assetsBase;
      if (segments[0] === 'examples') {
        withPanels.devOnly = true;
      }
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(withPanels));
      return;
    }

    res.setHeader('Content-Type', contentTypes.get(ext) || 'application/octet-stream');
    res.send(data);
  } catch {
    res.status(404).end('Not found');
  }
}
