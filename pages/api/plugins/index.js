import fs from 'fs';
import path from 'path';

/**
 * List available plugin catalog entries.
 * @param {import('next').NextApiRequest} _req
 * @param {import('next').NextApiResponse} res
 */
export default function handler(_req, res) {
  const catalogDir = path.join(process.cwd(), 'plugins', 'catalog');
  try {
    const files = fs.readdirSync(catalogDir);
    const plugins = files
      .filter((f) => !f.startsWith('.'))
      .map((f) => ({ id: path.parse(f).name, file: f }));
    res.status(200).json(plugins);
  } catch {
    res.status(200).json([]);
  }
}
