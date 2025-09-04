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
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          return {
            id: data.id || path.parse(f).name,
            file: f,
            channel: data.channel || 'stable',
            changelog: data.changelog || '',
          };
        } catch {
          return {
            id: path.parse(f).name,
            file: f,
            channel: 'stable',
            changelog: '',
          };
        }
      });
    res.status(200).json(plugins);
  } catch {
    res.status(200).json([]);
  }
}
