import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const dir = path.join(process.cwd(), 'public', 'wallpapers');
  try {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.webp'));
    res.status(200).json(files.map((f) => f.replace('.webp', '')));
  } catch (e) {
    res.status(500).json({ error: 'Unable to load wallpapers' });
  }
}
