import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

import { loadExtensionManifest } from '../../../extensions/loader';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { name } = req.query;
  const filename = Array.isArray(name) ? name.join('/') : name;
  const catalogDir = path.join(process.cwd(), 'plugins', 'catalog');
  const filePath = path.join(catalogDir, filename || '');
  if (!filePath.startsWith(catalogDir)) {
    res.status(400).end('Invalid path');
    return;
  }

  try {
    if (filePath.endsWith('.json')) {
      const result = loadExtensionManifest(filePath);
      if (result.error) {
        const status = result.error.code === 'incompatible-core' ? 412 : 400;
        res.status(status).json({
          error: result.error.code,
          message: result.error.message,
          expected: result.error.expected,
          actual: result.error.actual,
          detail: result.error.detail,
        });
        return;
      }

      if (!result.manifest) {
        res.status(500).json({
          error: 'loader-failure',
          message: 'Extension manifest could not be resolved.',
        });
        return;
      }

      const payload =
        result.warnings.length > 0
          ? { ...result.manifest, warnings: result.warnings }
          : result.manifest;

      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(payload);
      return;
    }

    const data = fs.readFileSync(filePath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      res.status(404).end('Not found');
      return;
    }

    res.status(500).json({
      error: 'loader-failure',
      message:
        error instanceof Error ? error.message : 'Unable to load the requested extension.',
    });
  }
}
