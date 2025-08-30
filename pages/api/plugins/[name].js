import fs from 'fs';
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
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(data);
  } catch {
    res.status(404).end('Not found');
  }
}
