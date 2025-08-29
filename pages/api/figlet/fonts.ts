import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const fontsDir = path.join(process.cwd(), 'figlet', 'fonts');
  let fonts: { name: string; data: string }[] = [];
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
