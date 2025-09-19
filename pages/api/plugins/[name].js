import fs from '../../../lib/server/fs';
import path from 'path';

export default function handler(req, res) {
  const { name } = req.query;
  const filename = Array.isArray(name) ? name.join('/') : name;
  const catalogDir = path.join(process.cwd(), 'plugins', 'catalog');
  const filePath = path.join(catalogDir, filename || '');
  if (!filePath.startsWith(catalogDir)) {
    res.status(400).end('Invalid path');
    return;
  }
  try {
    const data = fs.readFileSync(filePath);
    if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    res.send(data);
  } catch {
    res.status(404).end('Not found');
  }
}
