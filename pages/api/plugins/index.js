import fs from '../../../lib/server/fs';
import path from 'path';

export default function handler(_req, res) {
  const catalogDir = path.join(process.cwd(), 'plugins', 'catalog');
  try {
    const files = fs.readdirSync(catalogDir);
    const plugins = files
      .filter((f) => !f.startsWith('.') && f.endsWith('.json'))
      .map((f) => {
        const filePath = path.join(catalogDir, f);
        const stat = fs.statSync(filePath);
        try {
          const manifest = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          return {
            id: manifest.id || path.parse(f).name,
            file: f,
            sandbox: manifest.sandbox || 'worker',
            description: manifest.description || '',
            size: stat.size,
          };
        } catch {
          return {
            id: path.parse(f).name,
            file: f,
            sandbox: 'worker',
            description: '',
            size: stat.size,
          };
        }
      });
    res.status(200).json(plugins);
  } catch {
    res.status(200).json([]);
  }
}
