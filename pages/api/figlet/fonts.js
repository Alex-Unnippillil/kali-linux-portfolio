import fs from 'fs';
import path from 'path';

/**
 * Serve figlet fonts bundled with the app.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default function handler(req, res) {
  const fontsDir = path.join(process.cwd(), 'figlet', 'fonts');
  let fonts = [];
  try {
    const files = fs.readdirSync(fontsDir).filter((f) => f.toLowerCase().endsWith('.flf'));
    fonts = files.map((file) => ({
      name: file.replace(/\.flf$/i, ''),
      data: fs.readFileSync(path.join(fontsDir, file), 'utf8'),
    }));
  } catch {
    // ignore missing dir or read errors
  }
  res.status(200).json({ fonts });
}
