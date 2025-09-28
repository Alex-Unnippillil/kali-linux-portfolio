import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const dir = path.join(process.cwd(), 'public', 'wallpapers');
  try {
    const files = fs
      .readdirSync(dir)
      .filter((file) => /\.(?:png|jpe?g|webp|gif|avif)$/i.test(file))
      .map((file) => ({
        id: path.parse(file).name,
        file,
      }));

    const unique = Array.from(new Map(files.map((item) => [item.id, item])).values());
    unique.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

    res.status(200).json(unique);
  } catch {
    res.status(200).json([]);
  }
}
