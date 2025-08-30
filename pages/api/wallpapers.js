import fs from 'fs';
import path from 'path';

/**
 * Return available wallpaper filenames.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default function handler(req, res) {
  const dir = path.join(process.cwd(), 'public', 'images', 'wallpapers');
  try {
    const files = fs
      .readdirSync(dir)
      .filter((file) => /\.(?:png|jpe?g|webp|gif)$/i.test(file));
    res.status(200).json(files);
  } catch {
    res.status(200).json([]);
  }
}
