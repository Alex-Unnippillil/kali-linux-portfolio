import { promises as fs } from 'fs';
import path from 'path';
import Standard from 'figlet/importable-fonts/Standard.js';
import Slant from 'figlet/importable-fonts/Slant.js';
import Big from 'figlet/importable-fonts/Big.js';

let cachedFonts;

const fallbacks = [
  { name: 'Standard', data: Standard },
  { name: 'Slant', data: Slant },
  { name: 'Big', data: Big },
];

export default async function handler(req, res) {
  const fontsDir = path.join(process.cwd(), 'figlet', 'fonts');
  if (!cachedFonts || 'refresh' in req.query) {
    cachedFonts = [];
    try {
      const files = (await fs.readdir(fontsDir)).filter((f) =>
        f.toLowerCase().endsWith('.flf'),
      );
      cachedFonts = await Promise.all(
        files.map(async (file) => ({
          name: file.replace(/\.flf$/i, ''),
          data: await fs.readFile(path.join(fontsDir, file), 'utf8'),
        })),
      );
    } catch {
      // ignore missing dir or read errors
    }
  }
  const fonts = cachedFonts.length ? cachedFonts : fallbacks;
  res.status(200).json({ fonts });
}
