import fs from 'fs';
import path from 'path';

export default function handler(_req, res) {
  const catalogDir = path.join(process.cwd(), 'plugins', 'catalog');
  try {
    const files = fs.readdirSync(catalogDir);
    const plugins = files
      .filter((f) => !f.startsWith('.') && f.endsWith('.json'))
      .map((f) => {
        const filePath = path.join(catalogDir, f);
        let meta = {};
        try {
          meta = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch {
          /* ignore */
        }
        return {
          id: path.parse(f).name,
          file: f,
          permission: meta.permission || '',
          sandbox: meta.sandbox,
        };
      });
    res.status(200).json(plugins);
  } catch {
    res.status(200).json([]);
  }
}
